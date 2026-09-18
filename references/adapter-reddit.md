# Reddit 适配器经验

> 登录态验证：2026-08-27 · 命令清单 L0 复核：2026-09-17（opencli v1.8.7）· 两版并集合并：2026-09-18
> 数据形态：**英文语料**，帖子 + 线程式评论；**子版（subreddit）是平台自带的主题分区**，
> 也是本适配器唯一的结构化筛选维度。

## 认证方式

✅ 已登录（profile `v6pz9gjx`）。`Browser: yes`，COOKIE 策略——通过浏览器扩展在页面内执行 JS 抓数据。
免登录也能跑 `hot` / `frontpage` / `popular` / `search` / `subreddit`；
`home` / `saved` / `subscribed` / `upvoted` 必须登录；**部分子版内容未登录时受限**，
所以实践上建议保持 Chrome 里登录状态。

登录验证：`opencli reddit whoami -f json`

## 可用命令（L0 实录，21 条）

### [read] 只读（安全）

| 命令 | 用途 |
|---|---|
| `whoami` | 当前登录用户（含 Karma、注册时间） |
| `hot` | 热门帖子 |
| `frontpage` | 首页 / r/all |
| `popular` | /r/popular |
| `home` | 个性化首页（Best，**需登录**） |
| `search <query>` | 搜索帖子 |
| `subreddit <name>` | 指定子版帖子 |
| `subreddit-info <name>` | 子版元数据（订阅数、描述、创建日期、NSFW） |
| **`read <post-id>`** | **读取帖子正文 + 评论**，`--limit N` 控制评论条数 |
| `user <username>` | 用户资料 |
| `user-posts <username>` | 用户发帖 |
| `user-comments <username>` | 用户评论历史 |
| `saved` / `subscribed` / `upvoted` | 我保存的/订阅的/赞过的（需登录） |

### [write] 写操作（⚠️ 必须先获得用户明确授权）

`comment <post-id> <text>`（发评论）、`reply <comment-id> <text>`（回复）、
`save`（收藏）、`subscribe`（订阅）、`upvote`（顶/踩）、`login`

## ⚠️ 没有 `comments` 命令——读评论用 `read`

**这是本适配器最危险的一条。**

```bash
# ❌ 不存在，会报错
opencli reddit comments '<url>' -f json
# ✅ 正确：read 一次性给正文 + 评论，--limit 控制评论条数
opencli reddit read <post-id> --limit 5 -f json
```

`comment`（单数）**是 [write] 发评论**，和 `comments`（想象中的读命令）只差一个字母。
按安全铁律 #2，写操作必须先告知用户并获授权——**别在这条上手滑**。

> 溯源：外部渠道记录里曾写着"`comments <URL>` 7s/篇，评论区是金矿"——
> 那是把小红书的命令名套到了 Reddit 上（小红书确实有 `comments`）。
> 典型的"假设别人有的它也有"（[channel-probing.md](channel-probing.md) §一）。

## 检索策略

1. **先定子版再搜词**：全局 `search` 噪声大，`subreddit <name>` 内查精准得多。
2. **英文词用英文搜**：中文关键词在 Reddit 无效。结论需要中文转述时保留原文链接。
3. **`read` 拿评论**：高赞评论承载真实反馈（与小红书评论区策略同源）。
4. **`subreddit-info` 先探子版**：订阅数/活跃度决定值不值得投入。

### 已探过的子版（平台自带分区，按活跃度记，不按用途记）

| 子版 | 该子版自身的主题 | 状态 |
|---|---|---|
| `r/LocalLLaMA` / `r/MachineLearning` / `r/artificial` | 本地大模型 / 机器学习 / AI 综合 | ✅ 2026-08-27 实测活跃 |
| `r/programming` / `r/SelfHosted` | 编程综合 / 自托管 | ✅ 同上 |
| `r/cscareerquestions` | 技术岗职业话题 | ✅ 同上 |
| `r/resumes` | 简历求评 / 模板 / 改写建议 | ✅ 2026-09-17 实测，评论区反馈细到 bullet point 级 |
| `r/PhD` | 博士生活 / 就业 / 转行 | ✅ 2026-09-17 实测活跃（单帖 2216 score） |
| `r/Physics` | 物理 | 🔶 **未实测**，用前先 `subreddit-info` 探一次 |

> 这张表记的是**平台上有哪些分区、活不活跃**（能力层）。
> **"哪个分区对我当前的议题有用"属内容层，不写在这张卡里**（见 EVOLUTION §2.3）。

<details>
<summary>内容层实例（2026-09-17 探针顺带产出，仅作渠道价值佐证，勿当结论引用）</summary>

- 学术转产业简历的常见建议：从 "WHAT"（做了什么）转向 "Accomplished"（达成了什么）
- r/PhD 的就业焦虑帖热度极高，是该群体就业情绪的优质信源

> 这两条是**内容层**结论，n 很小且未交叉验证。留在这里只为说明"这几个子版确实出得了东西"，
> 真要用必须回原帖复核。议题级结论应沉淀到 [job-platforms.md](job-platforms.md) 或调研产出，不是本卡。

</details>

## 反爬与节奏

| 来源 | 建议节奏 |
|---|---|
| 跨平台保守同口径 | 30s/词（**非实测下限**，是统一保守值） |
| 2026-09-17 探针实测建议 | 连续读取间隔 5-10s；搜索接口限制更严 |

`read` 属浏览行为，节奏可比 `search` 宽松。风险评级：**中**。

## 能力边界：取得到什么 / 取不到什么

| ✅ 取得到 | 说明 |
|---|---|
| 帖子正文 + **线程式评论** | `read <post-id> --limit N` 一次拿全，不用二段式 |
| **子版作为天然主题分区** | `subreddit <name>` 在分区内取；`subreddit-info` 可先探订阅数与活跃度再决定投入 |
| 用户维度 | `user` / `user-posts` / `user-comments`，可追一个发帖人的历史 |
| 本账号维度 | `saved` / `subscribed` / `upvoted`（需登录） |

| ❌ 取不到 | 影响 |
|---|---|
| 跨子版的结构化筛选 | 只有关键词 `search`，没有按时间/分数的服务端过滤 → 先定子版再搜，是**由能力决定的**，不是偏好 |
| 中文语料 | 英文社区，中文词检索无效 |

## 待完善

- [ ] `read` 输出字段结构（帖子 + 评论的精确字段）
- [ ] `search` / `subreddit` 的输出格式实测
- [ ] 批量采集的限流实测下限（现有 30s 与 5-10s 两个口径都未压测）

## 变更记录

| 日期 | 变更 |
|---|---|
| 2026-08-27 | 登录态与命令清单首验（原记于 verified-platforms.md） |
| 2026-09-17 | 独立成卡；L0 复核命令清单；**纠正"有 comments 命令"的错误记载**并标注写操作风险 |
| 2026-09-17 | AntiGravity 委托探针批次：`read --limit` 控制评论条数、r/resumes 与 r/PhD 实测、限流建议 |
| 2026-09-18 | 两个智能体各写一版，按语义并集合并；远端版写进卡里的内容层结论按 EVOLUTION §2.3 降级为折叠的佐证块；两个节奏口径并列保留并标注来源 |

---

*本文件最后更新：2026-09-18*
