// zcode new — 新会话（Ctrl+N）
import { cli, Strategy } from '@jackwener/opencli/registry';

cli({
    site: 'zcode',
    name: 'new',
    access: 'write',
    description: '[write] 在 ZCode 中新建会话（Ctrl+N）',
    example: 'opencli zcode new',
    domain: 'localhost',
    strategy: Strategy.UI,
    browser: true,
    args: [],
    columns: ['Status'],
    func: async (page) => {
        const isMac = process.platform === 'darwin';
        await page.pressKey(isMac ? 'Meta+N' : 'Control+N');
        await page.wait(1);
        return [{ Status: 'Success' }];
    },
});
