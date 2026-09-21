// zcode status — CDP 连接状态（需 ZCode 以 --remote-debugging-port=9240 启动）
import { cli, Strategy } from '@jackwener/opencli/registry';

cli({
    site: 'zcode',
    name: 'status',
    access: 'read',
    description: '[read] 检查 ZCode CDP 连接状态与当前页面',
    example: 'opencli zcode status',
    domain: 'localhost',
    strategy: Strategy.UI,
    browser: true,
    args: [],
    columns: ['Status', 'Url', 'Title'],
    func: async (page) => {
        const url = await page.evaluate('window.location.href');
        const title = await page.evaluate('document.title');
        return [{ Status: 'Connected', Url: url, Title: title }];
    },
});
