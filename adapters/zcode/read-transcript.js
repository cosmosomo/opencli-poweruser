// zcode read-transcript — 读 ZCode 会话最近内容（优先 rollout 日志 model-io-<sess>.jsonl，主会话回退 cli/log/zcode-<date>.jsonl）
// 磁盘直读，不碰 ZCode 进程。Strategy.LOCAL。
// 注意：rollout model_io 行可能只有 type 元数据（内容分片在其他字段/文件），此命令返回原始行便于排查。
// 2026-09-23 修正（实测核证）：主会话（interactive）不在 rollout 目录写 model-io-sess_<id>.jsonl；
//   全量会话轨迹在 ~/.zcode/cli/log/zcode-<date>.jsonl（每行 JSON 带 sessionId，覆盖主会话/旧式子智能体/DWF actor）。
//   子智能体 rollout 文件名通用规则 = model-io-<childSessionId>.jsonl（sess_subagent_agent_<id> 与 sess_dwf-dwfrun-...-actor_... 同规则）。
import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError, CommandExecutionError, EmptyResultError } from '@jackwener/opencli/errors';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';

const ROLLOUT_ROOT = path.join(os.homedir(), '.zcode', 'cli', 'rollout');
const LOG_ROOT = path.join(os.homedir(), '.zcode', 'cli', 'log');

cli({
    site: 'zcode',
    name: 'read-transcript',
    access: 'read',
    description: '[read] 读 ZCode 会话最近内容（主会话/子智能体/DWF actor 均可；rollout 优先，主会话回退 log）',
    example: 'opencli zcode read-transcript sess_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx --last 5',
    domain: 'localhost',
    strategy: Strategy.LOCAL,
    browser: false,
    args: [
        { name: 'session', positional: true, required: true, help: '会话 id（sess_... / sess_subagent_agent_... / sess_dwf-...-actor_...）' },
        { name: 'last', type: 'int', required: false, default: 5, help: '读取最后 N 条' },
        { name: 'raw', required: false, help: '输出完整原始 JSON 行（默认截断到 400 字符）' },
    ],
    columns: ['line', 'type', 'content'],
    func: async (args) => {
        const session = String(args?.session || '').trim();
        if (!session) throw new ArgumentError('session', 'is required');
        // ① rollout 优先（子智能体/DWF actor 在此；文件名通用规则 model-io-<sessionId>.jsonl）
        const file = path.join(ROLLOUT_ROOT, `model-io-${session}.jsonl`);
        if (fs.existsSync(file)) return readLines(file, args);
        // ② 子智能体前缀兼容（旧式传 agent_<id> 而非完整 sess_subagent_agent_<id>）
        const alt = path.join(ROLLOUT_ROOT, `model-io-sess_subagent_${session}.jsonl`);
        if (fs.existsSync(alt)) return readLines(alt, args);
        // ③ 主会话回退：今日 log 按 sessionId 过滤（主会话不写 rollout）
        const logFile = path.join(LOG_ROOT, `zcode-${today()}.jsonl`);
        if (fs.existsSync(logFile)) {
            const rows = readLogSession(logFile, session, args);
            if (rows.length) return rows;
        }
        throw new EmptyResultError('zcode read-transcript', `no transcript found for ${session}.\nChecked rollout:\n  ${file}\n  ${alt}\nChecked log:\n  ${logFile}`);
    },
});

function today() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// 从每日 log 尾部取 sessionId 匹配的最后 N 行（文件可能几十 MB，只读尾部 8MB 足够覆盖近窗口）
function readLogSession(file, session, args) {
    const last = Math.min(Math.max(Number(args?.last ?? 5), 1), 50);
    const raw = !!args?.raw;
    const size = fs.statSync(file).size;
    const TAIL_BYTES = 8 * 1024 * 1024;
    const start = Math.max(0, size - TAIL_BYTES);
    const fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(size - start);
    fs.readSync(fd, buf, 0, buf.length, start);
    fs.closeSync(fd);
    const needle = `"sessionId":"${session}"`;
    const lines = buf.toString('utf-8').split('\n').filter((l) => l.includes(needle));
    const out = [];
    for (const line of lines.slice(-last)) {
        let type = '';
        let content = line;
        try {
            const j = JSON.parse(line);
            type = j.event || j.type || j.level || '';
            if (!raw) {
                const msg = j.message || '';
                const meta = [];
                if (j.timestamp) meta.push(`ts=${String(j.timestamp).slice(0, 19)}`);
                if (j.traceId) meta.push(`trace=${j.traceId.slice(0, 8)}`);
                content = `${meta.length ? meta.join(' ') + ' | ' : ''}${String(msg).slice(0, 400)}`;
                if (!msg && Object.keys(j).length > 1) content = JSON.stringify(j).slice(0, 400);
            }
        } catch { /* keep raw line */ }
        out.push({ line: '-', type, content });
    }
    return out;
}

function readLines(file, args) {
    const last = Math.min(Math.max(Number(args?.last ?? 5), 1), 50);
    const raw = !!args?.raw;
    const lines = fs.readFileSync(file, 'utf-8').split('\n').filter(Boolean);
    const tail = lines.slice(-last);
    const out = [];
    for (let i = 0; i < tail.length; i++) {
        const line = tail[i];
        let type = '';
        let content = line;
        try {
            const j = JSON.parse(line);
            type = j.type || j.role || '';
            if (!raw) {
                const c = j.content || j.text || '';
                const tool = j.toolName || j.tool || '';
                const meta = [];
                if (j.timestamp || j.createdAt) meta.push(`ts=${(j.timestamp || j.createdAt).slice(0, 19)}`);
                if (j.toolCallId || j.parentToolUseId) meta.push(`call=${(j.toolCallId || j.parentToolUseId).slice(0, 12)}`);
                content = `${meta.length ? meta.join(' ') + ' | ' : ''}${tool ? `[${tool}] ` : ''}${String(c).slice(0, 400)}`;
                if (!c && Object.keys(j).length > 1) content = JSON.stringify(j).slice(0, 400);
            }
        } catch { /* keep raw line */ }
        out.push({ line: i + 1, type, content });
    }
    return out;
}
