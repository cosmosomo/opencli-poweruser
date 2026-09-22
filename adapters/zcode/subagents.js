// zcode subagents — 列某父会话派发的子智能体（cli/agents/<父会话>/*/metadata.json + rollout 活跃判定）
// 磁盘直读，不碰 ZCode 进程。Strategy.LOCAL。
// 2026-09-22 修正：活跃度以 rollout 日志 mtime 为金标准（metadata.status 僵尸不可信：异常中断的 agent 永远停 running）
import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError, CommandExecutionError } from '@jackwener/opencli/errors';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';

const AGENTS_ROOT = path.join(os.homedir(), '.zcode', 'cli', 'agents');
const ROLLOUT_ROOT = path.join(os.homedir(), '.zcode', 'cli', 'rollout');

function localTs(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function rolloutFile(agentId) {
    // 文件名形如 model-io-sess_subagent_agent_8b47aac3-....jsonl，即前缀 model-io-sess_subagent_ + agentId
    return path.join(ROLLOUT_ROOT, `model-io-sess_subagent_${agentId}.jsonl`);
}

cli({
    site: 'zcode',
    name: 'subagents',
    access: 'read',
    description: '[read] 列 ZCode 父会话派发的子智能体（读 metadata.json + rollout 日志判活跃；status=running 不可信，活跃看 rollout mtime）',
    example: 'opencli zcode subagents --session sess_92f8c7e2-d860-4409-b6d2-a4df71cdddee',
    domain: 'localhost',
    strategy: Strategy.LOCAL,
    browser: false,
    args: [
        { name: 'session', positional: true, required: true, help: '父会话 task_id（sess_...）' },
        { name: 'active', required: false, help: '只看指定状态: running|completed|stopped|failed（留空=全部）' },
        { name: 'limit', type: 'int', required: false, default: 50, help: '返回条数上限（默认按最后活跃时间倒序取最新）' },
        { name: 'minutes', type: 'int', required: false, help: '只看最近 N 分钟内有活动的（按 rollout 日志 mtime，无 rollout 则按目录 mtime）' },
        { name: 'alive', required: false, help: '只看真正在跑的（rollout 日志最近 N 分钟内有写入；配合 --alive-minutes，默认 30 分钟）' },
        { name: 'alive-minutes', type: 'int', required: false, default: 30, help: 'alive 判定窗口（分钟），默认 30' },
    ],
    columns: ['agentId', 'status', 'alive', 'lastRollout', 'description', 'created', 'cwd', 'outputSize'],
    func: async (args) => {
        const session = String(args?.session || '').trim();
        if (!session) throw new ArgumentError('session', 'is required (父会话 task_id, 如 sess_...)');
        const sessDir = path.join(AGENTS_ROOT, session);
        if (!fs.existsSync(sessDir)) {
            throw new CommandExecutionError(`No agents dir for session ${session}: ${sessDir}`, 'List sessions with `opencli zcode list` first.');
        }
        const statusFilter = args?.active ? String(args.active).trim() : '';
        const minutes = args?.minutes ? Number(args.minutes) : 0;
        const aliveOnly = args?.alive ? true : false;
        const aliveWindowMin = Math.max(Number(args?.['alive-minutes'] ?? 30), 1);
        const limit = Math.min(Math.max(Number(args?.limit ?? 50), 1), 200);
        const now = Date.now();

        const agents = [];
        for (const dir of fs.readdirSync(sessDir)) {
            const agDir = path.join(sessDir, dir);
            if (!fs.statSync(agDir).isDirectory()) continue;
            const metaPath = path.join(agDir, 'metadata.json');
            if (!fs.existsSync(metaPath)) continue;
            let meta = {};
            try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')); } catch { /* skip malformed */ }
            const status = meta.status || '';
            if (statusFilter && status !== statusFilter) continue;

            const agentId = meta.agentId || dir;
            // 金标准：rollout 日志 mtime。运行中的子智能体持续写 model-io-sess_subagent_agent_<id>.jsonl。
            // 异常中断的 agent：metadata.status 永远停 running，但 rollout 无文件 → 僵尸。
            let rolloutMtime = 0;
            const roPath = rolloutFile(agentId);
            if (fs.existsSync(roPath)) rolloutMtime = fs.statSync(roPath).mtimeMs;

            const dirMtime = fs.statSync(agDir).mtimeMs;
            const lastActive = Math.max(dirMtime, rolloutMtime);
            if (minutes > 0 && (now - lastActive) / 60000 > minutes) continue;

            const alive = rolloutMtime > 0 && (now - rolloutMtime) / 60000 <= aliveWindowMin;
            if (aliveOnly && !alive) continue;

            const ageMin = (now - lastActive) / 60000;
            let activity = '';
            if (alive) activity = 'alive';
            else if (status === 'running') activity = `stale(${Math.round(ageMin)}m)`;
            else activity = status || '';

            let outputSize = 0;
            const outPath = path.join(agDir, 'output.txt');
            if (fs.existsSync(outPath)) outputSize = fs.statSync(outPath).size;

            agents.push({
                agentId,
                status,
                alive: alive ? 'Y' : 'N',
                lastRollout: rolloutMtime ? localTs(new Date(rolloutMtime).toISOString()) : '-',
                description: (meta.description || meta.prompt || '').slice(0, 60) || '(无描述)',
                created: localTs(meta.createdAt),
                cwd: meta.cwd || '',
                outputSize,
                _ageMin: ageMin,
                _activity: activity,
            });
        }
        // 修正：升序 = 最新活跃在前（原来写反，最旧在前）
        agents.sort((a, b) => a._ageMin - b._ageMin);
        return agents.slice(0, limit).map((a) => ({
            agentId: a.agentId,
            status: a.status,
            alive: a.alive,
            lastRollout: a.lastRollout,
            description: a.description,
            created: a.created,
            cwd: a.cwd,
            outputSize: a.outputSize ? `${a.outputSize}B` : '0B',
        }));
    },
});
