# 小红书适配器经验

> 验证日期：2026-08-19
> 版本：opencli v1.8.6
> 结论：feed/search/whoami/comments 完全可用；note 需完整签名 URL

## 认证方式

COOKIE 策略——通过浏览器扩展在页面内执行 JS 抓取数据。
**必须在 Chrome 中登录小红书账号**，否则部分接口返回空或被限流。

登录验证：`opencli xiaohongshu whoami -f json`，返回 `logged_in: true` 即正常。

## 可用命令

### 只读（安全）

| 命令 | 用途 | 示例 |
|---|---|---|
| `whoami` | 当前登录用户 | `opencli xiaohongshu whoami -f json` |
| `feed [--limit N]` | 首页推荐流 | `opencli xiaohongshu feed --limit 15 -f json` |
| `search <query>` | 搜索笔记 | `opencli xiaohongshu search "上海周末" --limit 10 -f json` |
| `note <url>` | 笔记详情（需完整 URL） | `opencli xiaohongshu note "<full_url>" -f json` |
| `comments <note-id>` | 笔记评论（含楼中楼） | `opencli xiaohongshu comments "<note-id>" -f json` |
| `user <id>` | 用户公开笔记 | `opencli xiaohongshu user "<user-id>" -f json` |
| `liked` | 赞过的笔记 | `opencli xiaohongshu liked -f json` |
| `saved` | 收藏的笔记 | `opencli xiaohongshu saved -f json` |
| `notifications` | 通知 | `opencli xiaohongshu notifications -f json` |
| `creator-profile` | 创作者账号信息 | `opencli xiaohongshu creator-profile -f json` |
| `creator-stats` | 创作者数据总览 | `opencli xiaohongshu creator-stats -f json` |
| `creator-notes` | 创作者笔记列表 | `opencli xiaohongshu creator-notes -f json` |
| `drafts` | 本地草稿箱 | `opencli xiaohongshu drafts -f json` |
| `download <note-id>` | 下载笔记图片/视频 | `opencli xiaohongshu download "<note-id>" -f json` |

### 写操作（需用户明确授权）

`publish`、`ask`、`follow`、`unfollow`、`delete-note`、`draft-clear`、`draft-delete` —— 禁止自动执行。

## 关键注意事项

### note 命令必须传完整签名 URL

**错误用法**：`opencli xiaohongshu note 6a6c95b1000000002402f61c`
**正确用法**：`opencli xiaohongshu note "https://www.xiaohongshu.com/explore/6a6c95b1...?xsec_token=xxx&xsec_source="`

从 search/feed 结果中取 `url` 字段（已包含 xsec_token），而非仅用 `id`。

### search 输出字段

`rank, title, author, author_url, likes, url, published_at`

### feed 输出字段

`id, title, type(normal/video), author, likes, url`

## 已知问题

| 问题 | 原因 | 解决 |
|---|---|---|
| `note now requires a full signed URL` | note 命令不再接受纯 ID | 传完整 URL（含 xsec_token） |
| `AUTH_REQUIRED: 登录已过期` | Chrome 中小红书登录过期 | 在 Chrome 中重新登录 xiaohongshu.com，或运行 `opencli xiaohongshu login` |
| search 返回空 | 关键词过于冷门或被过滤 | 换更通用的关键词，或检查登录状态 |

## 反爬风险评估

- 只读操作（feed/search/comments）：**低风险**，COOKIE 方式模拟正常浏览
- 批量抓取：建议单次 limit ≤ 20，间隔 > 5 秒
- 写操作（publish/follow）：**中风险**，频繁操作可能触发风控

## 实测反爬教训（2026-08-27 新增）

**现象**：连续执行 3 次 `search`（每次 `--limit 20`，中间 sleep 3 秒）即触发风控，
3 次全部返回空数组 `[]`（非报错，无任何提示）。冷却 20 秒后，单测 1 次 `search "大模型 面试" --limit 10` 仍返回空。

**判断**：
- 小红书对连续 search 的容忍度比本文件此前标注的"3 次/分钟、间隔 >5 秒"更严格；
- 空数组 `[]` 是风控信号，不是"关键词太冷门"——冷门词通常也至少返回 1-2 条；
- 触发后需较长冷却时间（≥60 秒）才会恢复，短时间内反复试探只会拉长冷却。

**对策（小红书 search 的保守节奏）**：
1. 每批只跑 **1 个关键词**，跑完等 **30 秒以上**再跑下一个，绝不 3 连发；
2. 单次 `--limit ≤ 10`，避免一次拉太多触发特征；
3. 连续 2 次返回空数组 → **立即停止搜索**，等待 ≥60 秒冷却，期间可用 `feed --limit 5` 探活判断是限流还是关键词问题；
4. 若长时间不恢复，改用 `--window foreground --site-session persistent` 重建一次会话后再回 background；
5. 把搜索总量压到最少：先想清关键词矩阵，宁少而精。

## 命令参数补遗（2026-09-01 滨寿司调研实测）

- `comments` 和 `download` 命令**同样需要完整签名 URL**（含 xsec_token），不能只传 note-id。报错信息为 `now requires a full signed URL`。从 search/feed 结果取 `url` 字段即可。
- 传 URL 时用双引号包裹，避免 `&` 被 shell 解析。

## 图片型笔记处理 SOP（2026-09-01 新增，非常重要）

小红书高赞笔记大量为**图文笔记**：`note` 命令返回的 `content` 字段只有 `#标签`，菜品/价格/评分等核心信息全部写在图片里。遇到 content 只有标签时，**立即转 download 图片**，不要在正文里找信息。

处理流程：
1. `note <full_url>` 检查 content——若只有标签，判定为图片型笔记。
2. `download <full_url>` 下载全部图片到 `xiaohongshu-downloads/<note-id>/`。
3. **download 输出必须过滤**：多图笔记的进度条会刷屏浪费 token，用：
   ```powershell
   opencli xiaohongshu download "<full_url>" -f json 2>&1 | Select-String -Pattern "✓|Download complete|index|status|error"
   ```
4. **并行 Read 图片**：Read 工具支持并行调用，一次读 3~4 张。`thumbnail_size=large` 足够看清菜品文字和价格，不需要 full。
5. **封面图优先**：多图笔记第 1 张通常是汇总页（直接列出全部推荐项+价格+评分），先读封面判断价值，再决定是否读完全部。
6. 图片路径：`E:\program\media\xiaohongshu-downloads\<note-id>\<note-id>_N.jpg`

## 评论区读取策略（2026-09-01 新增）

- 评论区对**图片型笔记**有补充价值：用户常在评论区补充推荐菜品、反馈争议款。
- **只读高赞笔记的评论**（点赞 >5000），低赞笔记评论信息量低。
- `comments <full_url>` 同样需要完整签名 URL。
- 评论区价值场景：发现争议款（如牛肉鹅肝有人说"天作之合"、有人说"柴+腻没咽下去"）、补充推荐（如评论区推荐火炙焦糖鳗鱼、辣辣骨汤乌冬）。

## 调研工作流优化（2026-09-01 滨寿司调研总结）

1. **关键词矩阵**：2~3 个互补关键词即可（如"必点"+"性价比"），近义词重复搜索结果重复率约 40%，浪费反爬配额。
2. **先筛选再精读**：search 返回的标题+点赞数足够判断价值，只精读点赞 >3000 或标题含"红黑榜/从夯到拉/攻略/测评"的笔记。
3. **交叉验证定置信度**：同一菜品在 ≥3 篇独立笔记中被推荐 → 高置信度必吃；只在 1 篇出现 → 标注"个人推荐"。
4. **复用原生分类**：小红书滨寿司等品类已有成熟的"从夯到拉"四档分类（夯夯组/人上人组/NPC组/拉完了），直接复用比自己重新分类效率高且符合用户认知。
5. **daemon 状态**：`opencli daemon status` 可能显示 `not running`，但命令实际可用（通过浏览器扩展直连）。whoami 正常返回即说明通道可用，不必纠结 daemon 状态。

## 本次调研效率数据（2026-09-01 滨寿司）

- 3 组关键词搜索 → 去重后约 15 篇独特笔记
- 精读 7 篇正文 + 2 篇图片红黑榜（共 10 张图）+ 2 篇评论区
- 产出 47 款菜品四档分级 + 2 套验证过的性价比方案 + 8 篇信源链接
- 总耗时：约 15 分钟（含反爬等待约 2 分钟）

## 舆情/风评调研场景经验（2026-09-03 验证）

> 来源：AI 办公三产品（豆包/WorkBuddy/千问）真实风评调研，精读 13 篇小红书笔记 + 2 篇评论区

### 关键词策略（风评专用）

产品/工具类风评调研，关键词分两类：
- **负面触发词**：产品名 + "踩坑/吐槽/避雷/坑/后悔/退款/骗/垃圾/智商税"
- **额度/价格词**：产品名 + "积分/额度/会员/性价比/值不值/耐用/消耗"

实际案例：
- "豆包会员 坑" → 命中 388 赞高赞负面笔记
- "WorkBuddy 积分" → 命中 141 赞严重吐槽 + 52 赞消费欺诈
- "千问 积分" → 命中 61 赞治好积分焦虑 + 69 赞敢放肆跑 Agent

经验：负面词比中性词命中率高 3-5 倍，风评调研优先用负面词搜。

### 高赞负面笔记筛选

- 点赞 > 100 且标题含负面词 → 必精读（高置信度普遍槽点）
- 点赞 20-100 → 选择性精读（可能是个人极端体验，需交叉验证）
- 点赞 < 20 → 跳过（样本量不足，参考价值低）
- 标题含"实测/对比/从入门到放弃/使用一个月后" → 即使点赞不高也值得看（通常有具体数据）

### 评论区挖掘（风评调研的金矿）

小红书评论区对风评调研价值极高，远超普通内容调研：
1. **"我也是"效应**：高赞负面笔记评论区常出现大量"我也遇到了"+具体细节，能验证槽点是否普遍
2. **替代方案**：评论区常有人分享"我后来改用 X 了""接 Y API 省钱"，是正面技巧的重要来源
3. **争议点**：同一笔记评论区可能出现正反两方争论，能看到不同用户群体的体验差异
4. **补充细节**：正文没说的具体消耗数据、退款流程、客服回复，常在评论区

读取策略：只对点赞 > 100 的笔记读评论区，低赞笔记评论区信息量低。

### 反爬节奏验证（2026-09-03）

本次舆情调研严格执行保守节奏，**全程零风控**：
- search：每批 1 个关键词，间隔 ≥ 30 秒，limit=10 → 6 次 search 全部正常返回
- note：连续调用 8 次（不同笔记 URL），间隔 5-10 秒 → 全部正常
- comments：连续调用 2 次，间隔 5 秒 → 全部正常

**关键发现**：note 和 comments 的反爬严格度远低于 search。search 需 30 秒间隔，但 note/comments 可以 5-10 秒连续调用。原因可能是 search 是高频接口（爬虫主要入口），note/comments 是浏览行为（模拟正常用户）。

**优化后的节奏建议**：
1. search 阶段：1 关键词 / 30 秒 / limit≤10（严格保守）
2. 精读阶段：note + comments 可以批量连续调用，5-10 秒间隔即可
3. 先搜完所有关键词（攒够笔记列表），再批量精读 note/comments，效率最高

### 图文笔记在风评调研中的处理

风评调研中图文笔记比例较高（用户常截图消耗记录、退款聊天记录）：
- content 只有标签 → 立即 download 图片
- 图片中常包含：积分消耗截图、客服对话截图、套餐价格对比表
- Read 图片时 thumbnail_size=large 足够看清文字，不需要 full
- 封面图优先：第 1 张通常是总结页（直接列出槽点+证据）

### 与知乎的互补

小红书抓负面情绪和高赞吐槽，知乎补深度分析和省钱技巧。同一槽点在两个平台都出现 → 高置信度普遍问题；只在小红书出现 → 可能是情绪化个体体验，需甄别。

---

*本文件最后更新：2026-09-03*
