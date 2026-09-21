// zcode list — 列 ZCode 会话（tasks-index.sqlite 的 tasks 表）
// 磁盘直读，不碰 ZCode 进程。Strategy.LOCAL。
import { cli, Strategy } from '@jackwener/opencli/registry';
import { CommandExecutionError } from '@jackwener/opencli/errors';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';

const DB = path.join(os.homedir(), '.zcode', 'v2', 'tasks-index.sqlite');

function localTs(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

cli({
    site: 'zcode',
    name: 'list',
    access: 'read',
    description: '[read] 列 ZCode 会话（读 tasks-index.sqlite；含 workspace/标题/状态/模型/时间）',
    example: 'opencli zcode list',
    domain: 'localhost',
    strategy: Strategy.LOCAL,
    browser: false,
    args: [
        { name: 'status', required: false, help: '按状态过滤: active|completed|running|failed（留空=全部）' },
        { name: 'limit', type: 'int', required: false, default: 50, help: '返回条数上限' },
        { name: 'workspace', required: false, help: '按 workspace 路径子串过滤' },
    ],
    columns: ['taskId', 'title', 'status', 'workspace', 'model', 'updated'],
    func: async (args) => {
        if (!fs.existsSync(DB)) {
            throw new CommandExecutionError(`tasks-index.sqlite not found: ${DB}`, 'Has ZCode been run at least once?');
        }
        const { DatabaseSync } = await import('node:sqlite');
        let db;
        try {
            db = new DatabaseSync(DB, { readOnly: true });
        } catch (e) {
            throw new CommandExecutionError(`Cannot open tasks-index.sqlite: ${e.message}`, 'The DB may be locked by a running ZCode instance. Read-only open failed; retry in a few seconds.');
        }
        const limit = Math.min(Math.max(Number(args?.limit ?? 50), 1), 200);
        const clauses = [];
        const params = {};
        if (args?.status) {
            clauses.push('task_status = $status');
            params.$status = String(args.status).trim();
        }
        if (args?.workspace) {
            clauses.push('workspace_path LIKE $ws');
            params.$ws = `%${String(args.workspace).trim()}%`;
        }
        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const sql = `SELECT task_id, title, task_status, workspace_path, model, updated_at, created_at
                     FROM tasks ${where} ORDER BY updated_at DESC LIMIT ${limit}`;
        let rows;
        try {
            rows = db.prepare(sql).all(params);
        } catch (e) {
            throw new CommandExecutionError(`tasks query failed: ${e.message}`);
        } finally {
            db.close();
        }
        if (!rows.length) return [{ taskId: '-', title: '(无会话)', status: '-', workspace: '-', model: '-', updated: '-' }];
        return rows.map((r) => ({
            taskId: r.task_id,
            title: r.title || '(无标题)',
            status: r.task_status,
            workspace: r.workspace_path || '',
            model: (r.model || '').replace('account:bigmodel-individual-coding-plan/', ''),
            updated: localTs(r.updated_at),
        }));
    },
});
