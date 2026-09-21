// zcode tasks — 列 ZCode 自动化任务与最近运行（automations / automation_runs）
// 磁盘直读，不碰 ZCode 进程。Strategy.LOCAL。
import { cli, Strategy } from '@jackwener/opencli/registry';
import { CommandExecutionError } from '@jackwener/opencli/errors';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';

const DB = path.join(os.homedir(), '.zcode', 'v2', 'tasks-index.sqlite');

function ts(ms) {
    if (!ms) return '';
    const d = new Date(ms);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

cli({
    site: 'zcode',
    name: 'tasks',
    access: 'read',
    description: '[read] 列 ZCode 自动化任务与最近运行（automations/automation_runs 表）',
    example: 'opencli zcode tasks',
    domain: 'localhost',
    strategy: Strategy.LOCAL,
    browser: false,
    args: [
        { name: 'runs', type: 'int', required: false, default: 5, help: '每个自动化显示最近 N 次运行' },
        { name: 'limit', type: 'int', required: false, default: 20, help: '返回自动化条数上限' },
    ],
    columns: ['automationId', 'title', 'enabled', 'running', 'runCount', 'lastRun', 'nextRun', 'lastError', 'recentRuns'],
    func: async (args) => {
        if (!fs.existsSync(DB)) {
            throw new CommandExecutionError(`tasks-index.sqlite not found: ${DB}`, 'Has ZCode been run at least once?');
        }
        const { DatabaseSync } = await import('node:sqlite');
        let db;
        try {
            db = new DatabaseSync(DB, { readOnly: true });
        } catch (e) {
            throw new CommandExecutionError(`Cannot open tasks-index.sqlite: ${e.message}`, 'DB locked by running ZCode instance; retry shortly.');
        }
        const limit = Math.min(Math.max(Number(args?.limit ?? 20), 1), 100);
        const runsN = Math.min(Math.max(Number(args?.runs ?? 5), 1), 20);
        let automations;
        try {
            automations = db.prepare(`SELECT automation_id, title, enabled, running, run_count, last_run_at, next_run_at, lifecycle_status, last_error
                                      FROM automations ORDER BY updated_at DESC LIMIT ${limit}`).all();
        } catch (e) {
            db.close();
            throw new CommandExecutionError(`automations query failed: ${e.message}`);
        }
        if (!automations.length) {
            db.close();
            return [{ automationId: '-', title: '(无自动化任务)', enabled: '-', running: '-', runCount: 0, lastRun: '-', nextRun: '-', lastError: '-', recentRuns: '-' }];
        }
        const out = [];
        for (const a of automations) {
            let recent = '';
            try {
                const runs = db.prepare(`SELECT scheduled_at, dispatch_status, outcome FROM automation_runs
                                         WHERE automation_id = ? ORDER BY created_at DESC LIMIT ${runsN}`).all(a.automation_id);
                recent = runs.map((r) => `${ts(r.scheduled_at)}:${r.outcome || r.dispatch_status || '?'}`).join(' | ');
            } catch { /* ignore */ }
            out.push({
                automationId: a.automation_id || '',
                title: a.title || '(无标题)',
                enabled: a.enabled ? 'Y' : 'N',
                running: a.running ? 'Y' : 'N',
                runCount: a.run_count ?? 0,
                lastRun: ts(a.last_run_at),
                nextRun: ts(a.next_run_at),
                lastError: a.last_error ? String(a.last_error).slice(0, 120) : '-',
                recentRuns: recent || '-',
            });
        }
        db.close();
        return out;
    },
});
