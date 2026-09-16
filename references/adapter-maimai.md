# 脉脉适配器经验（含自建 search-gossip / quota）

> 验证日期：2026-09-17 · opencli v1.8.6 · profile v6pz9gjx
> 结论：**官方内置的 3 条命令基本不可用；职言通道靠自建适配器打通，已通过官方 verify + 站点记忆。**
> 配套：`~/.opencli/sites/maimai/notes.md`（站点记忆）、[job-platforms.md](job-platforms.md)、[pitfalls.md](pitfalls.md) §14

---

## 一、官方内置命令的真实状态

| 命令 | 状态 | 说明 |
|---|---|---|
| `whoami` | ❌ **恒误报未登录** | 探针失效，见下方第二节 |
| `login` | ❌ **永远不会成功，且会破坏人工登录** | 同一个坏探针 + 每 2 秒 `page.goto`，见 pitfalls §14 |
| `search-talents` | ⚠️ **能力不匹配求职者** | 走 `/ent/talents/discover/search_v2`（B 端招聘企业版人才库），是招聘方搜候选人；输出列为 `name/job_title/company/historical_companies/school/degree/age/mutual_friends`。个人号是否有 `/ent/` 权限未验证 |

---

## 二、whoami 探针已失效（最容易浪费时间的坑）

`clis/maimai/auth.js` 靠正则扫内联脚本里的 `userObj = JSON.parse('{...}')` 判断登录态
（官方注释说明：脉脉用 `let` 声明所以不挂 window，`userCardStr` 被污染成 `[object Object]`，只能扫 script 标签）。

**实测：该内联脚本在当前 maimai.cn 首页已不存在。**
→ `whoami` 恒报 `AUTH_REQUIRED: Maimai userObj missing from page (anonymous)`，**即使浏览器实际已登录**。

**可靠的替代判断**（任选）：
```bash
# 看 cookie：含 u / u.sig / session / n_csrf_token 即为已登录
opencli --profile v6pz9gjx browser <sess> eval 'document.cookie'
# 或看页面是否出现"退出"链接
```

> 通用教训：**`whoami` 报未登录时，先用真实数据命令或 cookie 独立验证一次再下结论。**
> 这是继 linux-do 之后第二个已确认的 whoami 误报案例。

---

## 三、会话与设备绑定：Token 解耦路线已实测证伪

网上流传的脉脉自动化方案（导出 `u` + `access_token` 后用纯 HTTP 客户端直连）**在当前脉脉不成立**。

实测三步（全部用浏览器里同一份完整 cookie）：

| 尝试 | 结果 |
|---|---|
| Node 侧 fetch + cookie + UA | `204` 空响应 |
| 补齐 Origin / X-Requested-With / sec-fetch-* / Referer | 仍 `204` |
| 按服务器下发的 `x-csrf-token` 做 CSRF 握手后重试 | `403` `{"error_code":20001,"error_msg":"你的账号登录已过期或此设备已被操作下线，请重新登录"}` |

→ **`error_code 20001` = 设备绑定校验失败。** 同一份凭证换个客户端就被判成另一台设备。

**结论：脉脉数据只能在浏览器上下文里取。** 不要再投入"脱离浏览器直连"的架构设计。
（顺带：常被引用的 `lsongdev/maimai-js` 是 3 stars / 2021 年 / v0.0.3，`maimai-mcp` 与 `maimai-cookies-tool` 各 1 star，都不是成熟方案。）

---

## 四、自建适配器：`maimai search-gossip`（职言搜索，已打通）

```bash
opencli --profile v6pz9gjx maimai search-gossip "光谱" --limit 10 --window background -f json
opencli --profile v6pz9gjx maimai search-gossip "<目标公司名>" --type gossip -f json   # 按公司搜
opencli --profile v6pz9gjx maimai search-gossip "裁员" --type feed -f json         # 实名动态
```

- 文件：`~/.opencli/clis/maimai/search-gossip.js`
- Strategy：`DOM_STATE` / contract `visible-ui`（读 `/web/search_center` 老版 SSR 页）
- 输出列：`rank, author, identity, publishedAt, text, likes, comments, gid, source`
- `--type`：`gossip`=匿名职言 / `feed`=实名动态

### 4.1 关键技术：数据在 React props 里，不在 DOM 文本里

老版 `/web/search_center` 是 React 16 页面。DOM 文本里只有**服务端截断的摘要**（`...` 开头），
但列表项的 React props 上挂着**完整帖子对象**：

```js
props.gossip = {
  gid, gossip: { id, egid, encode_id, text /* 全文 */, summary /* 截断 */,
                 crtime_string, likes, total_cnt, unlikes, username, author,
                 avatar, profession, search_qs, status, is_freeze }
}
```

抓取方式（适配器已实现，含 React 16/17+ 两种 key 兼容 + DOM 兜底）：

```js
const key = Object.keys(li).find(k =>
  k.startsWith('__reactInternalInstance') || k.startsWith('__reactFiber'));
let node = li[key];
for (let i = 0; i < 8 && node; i++) {
  const p = node.memoizedProps || node.pendingProps;
  if (p && p.gossip) return p.gossip;
  node = node.return;            // 向上回溯 fiber
}
```

输出的 `source` 列标明每行走的是 `props` 还是降级的 `dom`——**全变成 `dom` 就说明站点改版了**。

### 4.2 已知限制（不要浪费时间去试）

| 限制 | 实测 |
|---|---|
| **无分页** | `lim` / `o` 是内部 API 参数，页面 URL **不认**（传 `o=10` 返回同样 gid）；页面无任何"加载更多/下一页"控件 → **单关键词单次 19 条封顶**，扩量只能靠关键词矩阵 |
| 无单帖链接 | 列表 `li` 无 anchor、无 data 属性；但 props 里的 `gid` / `egid` 是稳定 ID |
| 排序不可控 | 页面上的"综合/时间/热门"是 JS 切换，未找到 URL 参数 |

---

## 五、自建适配器：`maimai quota`（搜索配额探针）

```bash
opencli --profile v6pz9gjx maimai quota --window background -f json
# → [{ "is_limited": false, "search_count_1h": 0, "search_count_24h": 0, "result": "ok" }]
```

- 文件：`~/.opencli/clis/maimai/quota.js`
- Strategy：`PAGE_FETCH` / contract `internal-unstable`
  （理由充分：**配额数字在页面上完全不渲染**，DOM 无法表达，这是承担 internal-unstable 成本的正当理由）
- 端点：`/search/check_access_limit?uid=<u>&word=<kw>&type=<t>`

⚠️ **诚实标注**：实测在 `search-gossip` 调用前后，`search_count_1h` / `search_count_24h` **均为 0 且不变**。
说明该计数器**不统计"直接 navigate 到结果 URL"这种访问方式**，是否统计站内搜索框操作未验证。
→ **它不能作为节奏控制的唯一依据**，只能作为"是否已被显式限流（`is_limited`）"的旁证。

---

## 六、内容价值实测（对光谱/仪器方向）

脉脉对这个方向**有真实价值**，主要是**薪资结构与包体**，这是小红书/牛客/51job 都给不了的：

```
搜某细分技术词 → 命中同行多家公司的薪资结构横向对比（形如「A 公司：月薪×月数 / 作息 / 业务线；
                B 公司：月薪×月数 / 作息 / 业务线」），这类帖在招聘平台和内容社区都看不到
搜某行业词   → 该行业上市公司特定产品线的岗位对比
```

身份标签（`identity` 列，如 `化工工程师·1年`、`算法工程师·10年+`、`运营·3年`）能直接判断发帖人可信度。

噪声：概念词会混进比喻用法（"职业是连续的光谱"）和个人求职简历帖，需要按 `identity` + `likes` 过滤。

---

## 七、操作纪律

1. **人工登录期间绝对不要跑任何 maimai 命令**（见 pitfalls §14）
2. 不用 `whoami` 探活，用 `search-gossip` 直接打或看 cookie
3. 频率保守：本次实测约 15 次浏览器调用无异常，但脉脉是实名社交平台，账号价值高于数据，
   **出现任何异常（跳登录页/空结果连续 2 次）立即停手**
4. 采到的职言涉及具体公司与个人，**只作为交叉验证的一路信源，不扩散、不直接引用到对外材料**

---

*本文件最后更新：2026-09-17（首次建立，两个自建适配器均通过官方 verify + strict-memory）*
