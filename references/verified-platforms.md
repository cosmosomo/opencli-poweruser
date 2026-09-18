# 已验证平台清单（登录态总表 + 卡索引）

> 首次验证：2026-08-27（profile `v6pz9gjx`，窗口模式默认 background）
> 结构调整：2026-09-17 —— **命令清单已迁往各渠道自己的 `adapter-*.md`**，本文件只保留
> ①登录态与账号总表 ②去哪张卡查 ③尚无独立卡的渠道明细。
>
> 为什么拆：一个渠道的技术维护信息（命令 / 输出结构 / 踩坑 / 节奏 / 渠道职能）应当**只有一个家**，
> 否则改一处、漏一处，读者还不知道该信哪份（[EVOLUTION.md](../EVOLUTION.md) §6.5 不重复）。

---

## 一、登录态与卡索引

| 平台 | 适配器 | 登录状态 | 优先级 | 维护卡（权威） |
|---|---|---|---|---|
| 小红书 | `xiaohongshu` | ✅ 已登录 | 🥇 高 | [adapter-xiaohongshu.md](adapter-xiaohongshu.md) |
| 知乎 | `zhihu` | ✅ 已登录 | 🥈 中 | [adapter-zhihu.md](adapter-zhihu.md) |
| Reddit | `reddit` | ✅ 已登录 | 🥇 高 | [adapter-reddit.md](adapter-reddit.md) |
| V2EX | `v2ex` | ✅ 已登录 | 🥈 中 | [adapter-v2ex.md](adapter-v2ex.md) |
| B站 | `bilibili` | ✅ 已登录 | 🥈 中 | [adapter-bilibili.md](adapter-bilibili.md) |
| GitHub | `github` | ✅ 已登录 | 🥇 高 | [adapter-github.md](adapter-github.md) |
| 脉脉 | `maimai` | ✅ 已登录（自建通道） | 🥈 中 | [adapter-maimai.md](adapter-maimai.md) |
| 活动行 | `huodongxing` | ✅ 免登录 | 🥈 中 | [adapter-huodongxing.md](adapter-huodongxing.md) |
| BOSS 直聘 | `boss` | 🔴 本机禁区 | — | [adapter-boss.md](adapter-boss.md) + [job-platforms.md](job-platforms.md) §六 |
| 牛客 | `nowcoder` | ✅ 已登录 | 🥇 高 | [job-platforms.md](job-platforms.md) §四（**未单列卡**） |
| 51job / LinkedIn / Indeed / 一亩三分地 | 各自 | 见卡 | — | [job-platforms.md](job-platforms.md) §三 §五 |
| HackerNews / arXiv / wttr / github-trending | 各自 | ✅ 免登录 | — | [adapter-public-api.md](adapter-public-api.md) |
| 掘金 | `juejin` | ✅ 免登录 | 🥉 低 | ⚠️ 无卡，明细见本文 §三 |
| linux.do | `linux-do` | ✅ 已登录 | 🥈 中 | ⚠️ 无卡，明细见本文 §三 |

> **状态位的权威在 [SKILL.md](../SKILL.md) 速查表**（🟢🟡⛔🔴⚠️⚪ 六档定级见
> [channel-probing.md](channel-probing.md) §五）。本表只管"登录了没"和"去哪查"。

---

## 二、登录态本身怎么验（别用 whoami）

已确认 **4 个平台的 `whoami` 会在实际已登录时误报** `AUTH_REQUIRED`
（linux.do / 小红书 / 脉脉 / 一亩三分地），根因是它们各自吊死在一个脆弱的单点锚点上。

→ **用最轻的数据命令探活**，判据与阶梯见 [channel-probing.md](channel-probing.md) §二 §三。

---

## 三、尚无独立卡的渠道（明细暂留此处）

> 这两个渠道命令面窄、使用频率低，暂未单列卡。
> 若后续开始常规使用，按"一个渠道一张卡"的规则迁出去。

### 掘金（juejin）

**登录**：✅ 可用（无需登录，hot/recommend 为公开内容）

| 命令 | 类型 | 用途 |
|---|---|---|
| `hot [--category <分类>]` | [read] | 热门文章排行榜，可按分类筛选 |
| `recommend` | [read] | 首页推荐文章流 |

**渠道职能**：中文技术实战教程。
**边界**：只有 hot / recommend，**无搜索**；AI 编程/多智能体垂直领域声量不如 V2EX / Reddit。

---

### linux.do（linux-do）

**登录**：✅ 已登录（页面显示"我的帖子""我的消息"，`feed` 正常返回数据）

⚠️ **已知 bug**：`whoami` 误报 `AUTH_REQUIRED`——它读页面 meta 标签 `current-user-username`，
而 linux.do 当前页面没有该标签。**不影响核心功能**，用 `feed`/`search`/`topic` 验登录态即可。
（这是 §二 那四个误报案例之一）

| 命令 | 类型 | 用途 |
|---|---|---|
| `feed [--category <分类>] [--tag <标签>]` | [read] | 话题列表（需登录；支持全站/标签/分类） |
| `search <query>` | [read] | 搜索 |
| `topic <id>` | [read] | 帖子首屏摘要和回复 |
| `topic-content <id>` | [read] | 帖子正文转 Markdown |
| `categories` / `tags` | [read] | 分类 / 标签列表 |
| `user-posts <username>` / `user-topics <username>` | [read] | 用户的帖子 / 创建的话题 |

**高价值分类/标签**：`开发调优`、`前沿快讯`、`人工智能`、`资源荟萃`、`原创`、`精华神帖`

**渠道职能**：高端开发者社区，AI 工具讨论质量高。有抽奖/积分等社区机制（噪声来源）。

---

## 四、通用调用格式

```bash
opencli --profile v6pz9gjx <adapter> <command> [args] [options] -f json
```

已设环境变量时可省略 `--profile` / `--window`：

```powershell
$env:OPENCLI_PROFILE="v6pz9gjx"
$env:OPENCLI_WINDOW="background"
```

⚠️ `--window` / `--site-session` / `-f` 都是**子命令级**参数，必须跟在命令后面
（放全局位置报 `unknown option`，见 [pitfalls.md](pitfalls.md) §17）。

---

## 五、验证记录

| 日期 | 记录 |
|---|---|
| 2026-08-27 | 在 v6pz9gjx profile 中验证 8 个平台登录状态，7/8 可用（BOSS 搁置）；linux.do whoami 误报 bug 确认 |
| 2026-09-17 | L0 复核 reddit / v2ex / bilibili / github / nowcoder 命令清单；本文件改为登录态总表 + 卡索引，命令明细迁往各卡 |

---

*本文件最后更新：2026-09-17*
