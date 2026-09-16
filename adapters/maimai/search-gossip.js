import { cli, Strategy } from '@jackwener/opencli/registry';
import { AuthRequiredError, EmptyResultError } from '@jackwener/opencli/errors';

/**
 * 脉脉职言/实名动态关键词搜索。
 *
 * Strategy note（adapter-author Runbook Step 6）
 *   Strategy : DOM_STATE（主：React hydration props；备：SSR DOM 文本）
 *   Contract : visible-ui
 *   Evidence :
 *     - observed state : https://maimai.cn/web/search_center?type=gossip&query=<kw>
 *                        服务端直出 ul.list-group > li.list-group-item（约 19 条/页）。
 *                        每个 li 的 React props 挂着完整帖子对象：
 *                        { gid, gossip: { id, egid, text（全文）, summary（截断）,
 *                                         crtime_string, likes, total_cnt, username, author, search_qs } }
 *                        network 抓包确认职言列表**没有**对应 XHR（/sdk/search/web_get 只服务"实名动态"tab）
 *     - auth source    : 浏览器已登录会话（cookie u / session / csrftoken(HttpOnly)）
 *     - replay result  : 页面上下文 200 + 真实数据
 *                        **Node 侧带同样 cookie 直连 = 403 error_code 20001
 *                        "此设备已被操作下线" → 会话与设备绑定，COOKIE_API 路线实测不可行**
 *   为什么不用 PAGE_FETCH / INTERCEPT：职言列表本就是 SSR + hydration props，
 *   DOM 状态已能完整表达目标数据（含全文），没理由承担 internal-unstable 接口 7-8 倍的维护成本。
 *
 * 健壮性设计：
 *   React 内部 key 随版本变化（React 16 = `__reactInternalInstance$`，17+ = `__reactFiber$`），
 *   两种都尝试；props 取不到时**自动降级**为纯 DOM 文本抽取（字段少但不会整体失败）。
 *   输出里的 `source` 列标明每行走的是哪条路径，便于发现站点改版。
 */

const EXTRACT = `(() => {
  const clean = (s) => (s || '').replace(/\\s+/g, ' ').trim();

  const bodyText = document.body ? document.body.innerText || '' : '';
  const loggedIn = bodyText.indexOf('退出') !== -1;

  // 找挂在 li 上的 React fiber/instance，向上回溯找带 gossip prop 的节点
  const reactGossip = (li) => {
    try {
      const key = Object.keys(li).find(
        (k) => k.startsWith('__reactInternalInstance') || k.startsWith('__reactFiber')
      );
      if (!key) return null;
      let node = li[key];
      for (let i = 0; i < 8 && node; i++) {
        const p = node.memoizedProps || node.pendingProps;
        if (p && p.gossip) return p.gossip;
        node = node.return;
      }
    } catch (e) { /* 降级到 DOM */ }
    return null;
  };

  const items = Array.from(document.querySelectorAll('li.list-group-item'));
  const rows = [];

  for (const li of items) {
    const authorEl = li.querySelector('.media-body .text-muted.font-15 span');
    if (!authorEl) continue;

    let raw = clean(authorEl.textContent).replace(/^发布者[:：]\\s*/, '');
    if (!raw) continue;

    // "<职位·年限>.<匿名昵称>" → identity + author
    let identity = '';
    let author = raw;
    const dot = raw.indexOf('.');
    if (dot > 0) { identity = raw.slice(0, dot); author = raw.slice(dot + 1); }

    const wrap = reactGossip(li);
    const g = wrap && wrap.gossip ? wrap.gossip : null;

    if (g) {
      rows.push({
        gid: String(wrap.gid || g.gid || g.id || ''),
        author: author || g.username,
        identity: identity,
        publishedAt: g.crtime_string || g.crtime || '',
        text: (g.text || g.summary || '').trim(),
        likes: Number(g.likes || 0),
        comments: Number(g.total_cnt || 0),
        egid: g.egid || '',
        source: 'props',
      });
      continue;
    }

    // ── 降级：纯 DOM 文本（拿不到全文，只有截断摘要）
    const timeEl = li.querySelector('.media-body .text-muted.small');
    const summaryEl = li.querySelector('.m-b-5 span');
    const countEl = li.querySelector('p.clearfix .pull-right');
    const counts = clean(countEl && countEl.textContent);
    const likes = (counts.match(/(\\d+)\\s*赞/) || [])[1];
    const comments = (counts.match(/(\\d+)\\s*评论/) || [])[1];

    rows.push({
      gid: '',
      author: author,
      identity: identity,
      publishedAt: clean(timeEl && timeEl.textContent),
      text: clean(summaryEl && summaryEl.textContent).replace(/^\\.{3}/, ''),
      likes: likes ? Number(likes) : 0,
      comments: comments ? Number(comments) : 0,
      egid: '',
      source: 'dom',
    });
  }

  return { loggedIn: loggedIn, rows: rows };
})()`;

cli({
  site: 'maimai',
  name: 'search-gossip',
  description: '[read] 脉脉职言/实名动态关键词搜索（需登录；返回帖子全文 + 稳定 gid）',
  access: 'read',
  example: 'opencli maimai search-gossip "光谱" -f json',
  domain: 'maimai.cn',
  strategy: Strategy.COOKIE,
  browser: true,
  siteSession: 'persistent',
  args: [
    { name: 'query', positional: true, required: true, help: '搜索关键词（公司名 / 岗位 / 话题）' },
    { name: 'type', default: 'gossip', help: 'gossip=职言交流（匿名爆料）/ feed=实名动态' },
    { name: 'limit', type: 'int', default: 20, help: '返回条数上限（站点单次最多 19 条，见下方说明）' },
  ],
  columns: ['rank', 'author', 'identity', 'publishedAt', 'text', 'likes', 'comments', 'gid', 'source'],
  func: async (page, kwargs) => {
    const { query, type = 'gossip', limit = 20 } = kwargs;

    // ⚠️ 实测：站内 API 的 lim / o 参数在页面 URL 上**不生效**（传 o=10 返回同样的 gid），
    //    页面也没有任何分页控件 → 单个关键词单次最多 19 条，**没有翻页**。
    //    要更多结果只能换关键词（关键词矩阵策略），不要在这里加假的分页参数。
    const url = 'https://maimai.cn/web/search_center'
      + '?type=' + encodeURIComponent(type)
      + '&query=' + encodeURIComponent(query);

    await page.goto(url);
    await page.wait(3);

    const probe = await page.evaluate(EXTRACT);

    if (!probe || typeof probe !== 'object') {
      throw new EmptyResultError('maimai search-gossip', '页面探针返回异常');
    }

    if (!probe.loggedIn && probe.rows.length === 0) {
      throw new AuthRequiredError(
        'maimai.cn',
        '脉脉未登录或会话已失效。请在 Chrome 中手动登录 maimai.cn 后重试；'
        + '注意不要使用 `opencli maimai login`（其轮询每 2 秒会把登录页导走）',
      );
    }

    if (probe.rows.length === 0) {
      throw new EmptyResultError('maimai search-gossip', '关键词「' + query + '」无结果');
    }

    return probe.rows.slice(0, limit).map((r, i) => ({ rank: i + 1, ...r }));
  },
});
