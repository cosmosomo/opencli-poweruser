// zcode send — 向 ZCode 当前会话发送消息（React contenteditable + execCommand + Enter）
// 需 ZCode 以 --remote-debugging-port=9240 启动。
// 经验来源：2026-09-17 实测 ZCode 输入框为 React contenteditable，
// document.execCommand('insertText') 模拟原生输入 + dispatch Enter 可成功提交。
import { cli, Strategy } from '@jackwener/opencli/registry';
import { selectorError } from '@jackwener/opencli/errors';

cli({
    site: 'zcode',
    name: 'send',
    access: 'write',
    description: '[write] 向 ZCode 当前会话发送消息（React contenteditable + Enter 提交；发送后建议 read-transcript 验证）',
    example: 'opencli zcode send "继续推进"',
    domain: 'localhost',
    strategy: Strategy.UI,
    browser: true,
    args: [
        { name: 'message', positional: true, required: true, help: '要发送的消息文本' },
    ],
    columns: ['Status', 'Message'],
    func: async (page, kwargs) => {
        const text = kwargs.message;
        // 输入框选择器：优先 contenteditable，回退 textarea（ZCode 桌面版主输入区）
        const injected = await page.evaluate(`
      (function(t) {
        const editables = Array.from(document.querySelectorAll('[contenteditable="true"]'));
        let target = editables[editables.length - 1] || null;
        if (!target) target = document.querySelector('textarea');
        if (!target) return false;
        target.focus();
        document.execCommand('insertText', false, t);
        return true;
      })(${JSON.stringify(text)})
    `);
        if (!injected) throw selectorError('ZCode input element (contenteditable/textarea)');
        await page.wait(0.5);
        await page.pressKey('Enter');
        await page.wait(1);
        return [{ Status: 'Sent', Message: text }];
    },
});
