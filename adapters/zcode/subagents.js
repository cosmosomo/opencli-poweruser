// zcode subagents — 列某父会话派发的子智能体（cli/agents/<父会话>/*/metadata.json）
// 磁盘直读，不碰 ZCode 进程。Strategy.LOCAL。
import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError, CommandExecutionError } from '@jackwener/opencli/errors';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';

const AGENTS_ROOT = path.join(os.homedir(), '.zcode', 'cli', 'agents');

function localTs(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

cli({
    site: 'zcode',
    name: 'subagents',
    access: 'read',
    description: '[read] 列 ZCode 父会话派发的子智能体（读 metadata.json；含任务名/状态/创建时间/活跃度）',
    example: 'opencli zcode subagents --session sess_92f8c7e2-d860-4409-b6d2-a4df71cdddee',
    domain: 'localhost',
    strategy: Strategy.LOCAL,
    browser: false,
    args: [
        { name: 'session', positional: true, required: true, help: '父会话 task_id（sess_...）' },
        { name: 'active', required: false, help: '只看指定状态: running|completed|stopped|failed（留空=全部）' },
        { name: 'limit', type: 'int', required: false, default: 50, help: '返回条数上限（默认按目录修改时间倒序取最新）' },
        { name: 'minutes', type: 'int', required: false, help: '只看最近 N 分钟内有活动的（按目录 mtime）' },
    ],
    columns: ['agentId', 'status', 'description', 'created', 'lastActive', 'cwd', 'outputSize'],
    func: async (args) => {
        const session = String(args?.session || '').trim();
        if (!session) throw new ArgumentError('session', 'is required (父会话 task_id, 如 sess_...)');
        const sessDir = path.join(AGENTS_ROOT, session);
        if (!fs.existsSync(sessDir)) {
            throw new CommandExecutionError(`No agents dir for session ${session}: ${sessDir}`, 'List sessions with `opencli zcode list` first.');
        }
        const statusFilter = args?.active ? String(args.active).trim() : '';
        const minutes = args?.minutes ? Number(args.minutes) : 0;
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
            const lastActive = fs.statSync(agDir).mtimeMs;
            if (minutes > 0 && (now - lastActive) / 60000 > minutes) continue;

            // 活跃度判断：metadata mtime vs rollout 日志
            const ageMin = (now - lastActive) / 60000;
            let activity = '';
            if (status === 'running') {
                activity = ageMin < 30 ? `active(${Math.round(ageMin)}m)` : `stale(${Math.round(ageMin)}m)`;
            }

            let outputSize = 0;
            const outPath = path.join(agDir, 'output.txt');
            if (fs.existsSync(outPath)) outputSize = fs.statSync(outPath).size;

            agents.push({
                agentId: meta.agentId || dir,
                status,
                description: (meta.description || meta.prompt || '').slice(0, 60) || '(无描述)',
                created: localTs(meta.createdAt),
                lastActive: localTs(new Date(lastActive).toISOString()),
                cwd: meta.cwd || '',
                outputSize,
                _ageMin: ageMin,
                _activity: activity,
            });
        }
        agents.sort((a, b) => b._ageMin - a._ageMin);
        return agents.slice(0, limit).map((a) => ({
            agentId: a.agentId,
            status: a.status,
            description: a.description,
            created: a.created,
            lastActive: a.lastActive,
            cwd: a.cwd,
            outputSize: a.outputSize ? `${a.outputSize}B` : '0B',
        }));
    },
});
