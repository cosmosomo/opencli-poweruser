// zcode subagents — 列某父会话派发的子智能体（旧式 subagent_child + 3.14.3+ DWF workflow_child 双形态）
// 磁盘直读，不碰 ZCode 进程。Strategy.LOCAL。
// 2026-09-22 修正：活跃度以 rollout 日志 mtime 为金标准（metadata.status 僵尸不可信：异常中断的 agent 永远停 running）
// 2026-09-23 修正（3.14.3 DWF 架构 + 实测核证）：
//   - ZCode 3.14.3 起多智能体派发走 DWF（workflow_child）：登记在 ~/.zcode/cli/db/db.sqlite 的 dwf_run/dwf_actor 表，
//     rollout 文件名 = model-io-sess_dwf-dwfrun-<runId>-actor_<n>_<m>.jsonl（实测持续写入）
//   - 旧式 subagent_child：~/.zcode/cli/agents/<父会话>/*/metadata.json，rollout = model-io-sess_subagent_agent_<id>.jsonl（3.14.1 实测）
//   - 通用规则：rollout 文件名 = model-io-<childSessionId>.jsonl，两种形态同规则
//   - 主会话轨迹不在 rollout 目录（在 ~/.zcode/cli/log/zcode-<date>.jsonl），读主会话用 read-transcript（已加 log 回退）
//   - alive 排除终态：completed/failed/cancelled 即使 rollout 最近有写入也不算活跃（收尾写入不计并发）
import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError, CommandExecutionError } from '@jackwener/opencli/errors';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';

const AGENTS_ROOT = path.join(os.homedir(), '.zcode', 'cli', 'agents');
const ROLLOUT_ROOT = path.join(os.homedir(), '.zcode', 'cli', 'rollout');
const DB = path.join(os.homedir(), '.zcode', 'cli', 'db', 'db.sqlite');

function localTs(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function rolloutMtimeOf(sessionId) {
    if (!sessionId) return 0;
    const p = path.join(ROLLOUT_ROOT, `model-io-${sessionId}.jsonl`);
    try {
        if (fs.existsSync(p)) return fs.statSync(p).mtimeMs;
    } catch { /* ignore */ }
    return 0;
}

function isTerminal(status) {
    return ['completed', 'failed', 'cancelled'].includes(String(status || '').trim());
}

// 3.14.3+ DWF：读 db.sqlite 的 dwf_run（parent_session_id=父会话）+ dwf_actor（run 的 actors）
async function dwfActors(session) {
    const out = [];
    if (!fs.existsSync(DB)) return out;
    const { DatabaseSync } = await import('node:sqlite');
    let db;
    try {
        db = new DatabaseSync(DB, { readOnly: true });
    } catch {
        return out; // 库被占用/不可用 → 优雅降级为仅旧式列表
    }
    try {
        const runs = db.prepare(`SELECT id, name, status, cwd, time_created, time_updated FROM dwf_run WHERE parent_session_id = ? ORDER BY time_created DESC`).all(session);
        for (const r of runs) {
            const actors = db.prepare(`SELECT site_id, ordinal, name, session_id, time_created, time_updated FROM dwf_actor WHERE run_id = ? ORDER BY ordinal`).all(r.id);
            for (const a of actors) {
                out.push({
                    kind: 'dwf',
                    agentId: a.session_id || `${r.id}/${a.site_id}`,
                    status: r.status,
                    sessionId: a.session_id || '',
                    name: a.name || a.site_id || '',
                    runName: r.name || r.id,
                    cwd: r.cwd || '',
                    createdMs: a.time_created || 0,   // dwf 表时间戳是毫秒（与 automations last_run_at 同制），勿 ×1000
                    dirMtime: a.time_updated || 0,
                });
            }
        }
    } catch { /* 查询失败 → 仅旧式 */ } finally {
        try { db.close(); } catch { /* ignore */ }
    }
    return out;
}

cli({
    site: 'zcode',
    name: 'subagents',
    access: 'read',
    description: '[read] 列 ZCode 父会话派发的子智能体（旧式 subagent_child + DWF workflow_child；status=running 不可信，活跃看 rollout mtime）',
    example: 'opencli zcode subagents --session sess_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    domain: 'localhost',
    strategy: Strategy.LOCAL,
    browser: false,
    args: [
        { name: 'session', positional: true, required: true, help: '父会话 task_id（sess_...）' },
        { name: 'active', required: false, help: '只看指定状态: running|completed|stopped|failed（留空=全部）' },
        { name: 'limit', type: 'int', required: false, default: 50, help: '返回条数上限（默认按最后活跃时间倒序取最新）' },
        { name: 'minutes', type: 'int', required: false, help: '只看最近 N 分钟内有活动的（按 rollout 日志 mtime，无 rollout 则按目录 mtime）' },
        { name: 'alive', required: false, help: '只看真正在跑的（rollout 日志最近 N 分钟内有写入且非终态；配合 --alive-minutes，默认 30 分钟）' },
        { name: 'alive-minutes', type: 'int', required: false, default: 30, help: 'alive 判定窗口（分钟），默认 30' },
    ],
    columns: ['agentId', 'kind', 'status', 'alive', 'lastRollout', 'description', 'created', 'cwd', 'outputSize'],
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
        // ① 旧式 subagent_child：agents/<父会话>/agent_*/metadata.json
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
            const childSessionId = meta.childSessionId || `sess_subagent_agent_${agentId}`;
            let outputSize = 0;
            const outPath = path.join(agDir, 'output.txt');
            if (fs.existsSync(outPath)) outputSize = fs.statSync(outPath).size;
            agents.push({
                kind: 'subagent',
                agentId,
                status,
                sessionId: childSessionId,
                description: (meta.description || meta.prompt || '').slice(0, 60) || '(无描述)',
                createdMs: Date.parse(meta.createdAt || '') || 0,
                cwd: meta.cwd || '',
                outputSize,
                dirMtime: fs.statSync(agDir).mtimeMs,
            });
        }
        // ② 3.14.3+ DWF workflow_child：db.sqlite dwf_run/dwf_actor（父会话派发的 workflow run）
        try {
            const dwf = await dwfActors(session);
            for (const d of dwf) {
                if (statusFilter && d.status !== statusFilter) continue;
                let outputSize = 0;
                agents.push({
                    kind: 'dwf',
                    agentId: d.agentId,
                    status: d.status,
                    sessionId: d.sessionId,
                    description: `${d.name}｜${d.runName}`.slice(0, 60),
                    createdMs: d.createdMs,
                    cwd: d.cwd,
                    outputSize,
                    dirMtime: d.dirMtime,
                });
            }
        } catch { /* ignore */ }

        const out = [];
        for (const ag of agents) {
            // 金标准：rollout 日志 mtime（通用规则 model-io-<childSessionId>.jsonl，两种形态同规则）
            const rolloutMtime = rolloutMtimeOf(ag.sessionId);
            const lastActive = Math.max(ag.dirMtime, rolloutMtime);
            if (minutes > 0 && (now - lastActive) / 60000 > minutes) continue;

            const alive = rolloutMtime > 0 && (now - rolloutMtime) / 60000 <= aliveWindowMin && !isTerminal(ag.status);
            if (aliveOnly && !alive) continue;

            const ageMin = (now - lastActive) / 60000;
            let activity = '';
            if (alive) activity = 'alive';
            else if (ag.status === 'running') activity = `stale(${Math.round(ageMin)}m)`;
            else activity = ag.status || '';

            out.push({
                agentId: ag.agentId,
                kind: ag.kind,
                status: ag.status,
                alive: alive ? 'Y' : 'N',
                lastRollout: rolloutMtime ? localTs(new Date(rolloutMtime).toISOString()) : '-',
                description: ag.description,
                created: localTs(ag.createdMs ? new Date(ag.createdMs).toISOString() : ''),
                cwd: ag.cwd,
                outputSize: ag.outputSize ? `${ag.outputSize}B` : '0B',
                _ageMin: ageMin,
                _activity: activity,
            });
        }
        // 升序 = 最新活跃在前
        out.sort((a, b) => a._ageMin - b._ageMin);
        return out.slice(0, limit).map(({ _ageMin, _activity, ...row }) => row);
    },
});
