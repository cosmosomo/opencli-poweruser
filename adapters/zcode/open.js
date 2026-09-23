// zcode open — 打开指定会话（侧边栏 task-item-<id> 点击）
// 需 ZCode 以 --remote-debugging-port=9240 启动。
// 经验来源：2026-09-17 实测 ZCode 侧边栏会话条目 DOM 前缀 task-item-sess_<id>。
import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError, selectorError } from '@jackwener/opencli/errors';

cli({
    site: 'zcode',
    name: 'open',
    access: 'write',
    description: '[write] 打开 ZCode 指定会话（点击侧边栏 task-item-<id>）',
    example: 'opencli zcode open sess_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    domain: 'localhost',
    strategy: Strategy.UI,
    browser: true,
    args: [
        { name: 'session', positional: true, required: true, help: '会话 task_id（sess_...）' },
    ],
    columns: ['Status', 'Session'],
    func: async (page, kwargs) => {
        const session = String(kwargs.session || '').trim();
        if (!session) throw new ArgumentError('session', 'is required');
        const clicked = await page.evaluate(`
      (function(id) {
        const el = document.querySelector('[data-task-item="' + id + '"], #task-item-' + id + ', [data-task-item-id="' + id + '"]');
        if (el) { el.click(); return 'selector'; }
        // 回退：按文本包含查找
        const all = Array.from(document.querySelectorAll('[class*="task-item"], [class*="taskItem"], [data-task*="item"]'));
        for (const n of all) {
          if ((n.textContent || '').includes(id)) { n.click(); return 'text'; }
        }
        return null;
      })(${JSON.stringify(session)})
    `);
        if (!clicked) throw selectorError(`ZCode sidebar task item for ${session}`);
        await page.wait(1.5);
        return [{ Status: `Opened (${clicked})`, Session: session }];
    },
});
