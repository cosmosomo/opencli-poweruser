import { cli, Strategy } from '@jackwener/opencli/registry';
import { AuthRequiredError, CommandExecutionError } from '@jackwener/opencli/errors';

/**
 * 脉脉搜索配额探针。
 *
 * Strategy note（adapter-author Runbook Step 6）
 *   Strategy : PAGE_FETCH
 *   Contract : internal-unstable
 *   Evidence :
 *     - observed request : GET https://maimai.cn/search/check_access_limit?uid=<u>&word=<kw>&type=<t>
 *                          （在 /web/search_center 搜索时由页面自身发出，network 抓包所得）
 *                          响应 shape: {result, is_limited, search_count_1h, search_count_24h}
 *     - auth source      : 浏览器已登录会话 cookie（uid 取自 cookie `u`）
 *     - replay result    : 页面上下文 200 + JSON
 *   为什么不是 COOKIE_API：实测 Node 侧带同样 cookie 直连返回 403 error_code 20001
 *                          （"此设备已被操作下线"）——脉脉会话与设备绑定，脱离浏览器不可用。
 *   为什么不是 DOM_STATE / UI_SELECTOR：**配额数字在页面上完全不渲染**，DOM 无法表达该数据，
 *                          这是承担 internal-unstable 成本的正当理由。
 *   维护成本可接受：单端点、响应仅 4 个标量字段、失败即报错不静默。
 *
 * 用途：脉脉对搜索有显式风控配额。**每次批量搜索前后各跑一次**，
 *       用 search_count_1h / search_count_24h 的真实增量来定节奏，不要靠猜。
 */

const PROBE = `(async () => {
  try {
    const m = document.cookie.match(/(?:^|; )u=([^;]+)/);
    if (!m) return { kind: 'auth', detail: '脉脉 cookie u 缺失（未登录）' };
    const uid = m[1];
    const url = 'https://maimai.cn/search/check_access_limit'
      + '?uid=' + encodeURIComponent(uid)
      + '&word=' + encodeURIComponent(WORD_PLACEHOLDER)
      + '&type=' + encodeURIComponent(TYPE_PLACEHOLDER);
    const r = await fetch(url, { credentials: 'include' });
    if (r.status === 401 || r.status === 403) {
      return { kind: 'auth', detail: '脉脉会话失效 HTTP ' + r.status };
    }
    const ct = r.headers.get('content-type') || '';
    if (ct.indexOf('json') === -1) {
      return { kind: 'exception', detail: '非 JSON 响应（HTTP ' + r.status + '），端点可能已变更' };
    }
    const j = await r.json();
    if (j && j.error_code) {
      return { kind: 'auth', detail: 'error_code ' + j.error_code + ': ' + (j.error_msg || '') };
    }
    return { ok: true, uid: String(uid), data: j };
  } catch (e) {
    return { kind: 'exception', detail: String((e && e.message) || e) };
  }
})()`;

cli({
  site: 'maimai',
  name: 'quota',
  description: '[read] 脉脉搜索配额探针（1 小时 / 24 小时已用次数 + 是否已被限流）',
  access: 'read',
  example: 'opencli maimai quota -f json',
  domain: 'maimai.cn',
  strategy: Strategy.COOKIE,
  browser: true,
  siteSession: 'persistent',
  args: [
    { name: 'word', default: '测试', help: '探测用关键词（不会真的执行搜索，仅用于配额查询）' },
    { name: 'type', default: 'gossip', help: 'gossip / feed' },
  ],
  columns: ['is_limited', 'search_count_1h', 'search_count_24h', 'result'],
  func: async (page, kwargs) => {
    const { word = '测试', type = 'gossip' } = kwargs;

    // 确保处在 maimai.cn 同源上下文（否则 fetch 会跨域 + 无 cookie）
    const state = await page.evaluate('location.hostname');
    if (!String(state || '').includes('maimai.cn')) {
      await page.goto('https://maimai.cn/web/search_center?type=gossip&query=%E6%B5%8B%E8%AF%95');
      await page.wait(2);
    }

    const script = PROBE
      .replace('WORD_PLACEHOLDER', JSON.stringify(word))
      .replace('TYPE_PLACEHOLDER', JSON.stringify(type));

    const probe = await page.evaluate(script);

    if (probe && probe.kind === 'auth') {
      throw new AuthRequiredError('maimai.cn', probe.detail);
    }
    if (!probe || !probe.ok) {
      throw new CommandExecutionError(
        '脉脉配额探测失败: ' + ((probe && probe.detail) || JSON.stringify(probe)),
      );
    }

    const d = probe.data || {};
    return [{
      is_limited: d.is_limited,
      search_count_1h: d.search_count_1h,
      search_count_24h: d.search_count_24h,
      result: d.result,
    }];
  },
});
