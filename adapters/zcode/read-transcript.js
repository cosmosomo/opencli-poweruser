// zcode read-transcript — 读 ZCode 会话 rollout 日志最近内容（model-io-<sess>.jsonl）
// 磁盘直读，不碰 ZCode 进程。Strategy.LOCAL。
// 注意：rollout model_io 行可能只有 type 元数据（内容分片在其他字段/文件），此命令返回原始行便于排查。
import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError, CommandExecutionError, EmptyResultError } from '@jackwener/opencli/errors';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';

const ROLLOUT_ROOT = path.join(os.homedir(), '.zcode', 'cli', 'rollout');

cli({
    site: 'zcode',
    name: 'read-transcript',
    access: 'read',
    description: '[read] 读 ZCode 会话 rollout 日志最近内容（主会话传 sess_...，子智能体传 sess_subagent_agent_...）',
    example: 'opencli zcode read-transcript sess_92f8c7e2-d860-4409-b6d2-a4df71cdddee --last 5',
    domain: 'localhost',
    strategy: Strategy.LOCAL,
    browser: false,
    args: [
        { name: 'session', positional: true, required: true, help: '会话 id（sess_ 或 sess_subagent_agent_）' },
        { name: 'last', type: 'int', required: false, default: 5, help: '读取最后 N 条' },
        { name: 'raw', required: false, help: '输出完整原始 JSON 行（默认截断到 400 字符）' },
    ],
    columns: ['line', 'type', 'content'],
    func: async (args) => {
        const session = String(args?.session || '').trim();
        if (!session) throw new ArgumentError('session', 'is required');
        const file = path.join(ROLLOUT_ROOT, `model-io-${session}.jsonl`);
        if (!fs.existsSync(file)) {
            // 尝试子智能体前缀
            const alt = path.join(ROLLOUT_ROOT, `model-io-sess_subagent_${session}.jsonl`);
            if (!fs.existsSync(alt)) {
                throw new EmptyResultError('zcode read-transcript', `rollout not found for ${session}. Checked:\n  ${file}\n  ${alt}`);
            }
            return readLines(alt, args);
        }
        return readLines(file, args);
    },
});

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
