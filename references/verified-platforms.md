# 已验证平台清单

> 验证日期：2026-08-27
> 浏览器 profile：v6pz9gjx
> 窗口模式：默认 background（OPENCLI_WINDOW=background）

## 平台总览

| # | 平台 | 适配器 | 登录状态 | 优先级 | 备注 |
|---|---|---|---|---|---|
| 1 | 小红书 | `xiaohongshu` | ✅ 已登录 | 🥇 高 | COSMOS，17 粉 |
| 2 | BOSS 直聘 | `boss` | ⏸️ 暂时搁置 | — | stale page identity + detached，后续排查 |
| 3 | 知乎 | `zhihu` | ✅ 已登录 | 🥈 中 | wjsnbb |
| 4 | 掘金 | `juejin` | ✅ 可用（无需登录） | 🥉 低 | hot/recommend 公开内容 |
| 5 | GitHub | `github` | ✅ 已登录 | 🥇 高 | cosmosomom |
| 6 | Reddit | `reddit` | ✅ 已登录 | 🥇 高 | Intrepid_Ad3831（2021 年注册） |
| 7 | V2EX | `v2ex` | ✅ 已登录 | 🥈 中 | cosmostxy |
| 8 | linux.do | `linux-do` | ✅ 已登录 | 🥈 中 | whoami 误报，feed 正常 |

---

## 各平台详细命令

### 1. 小红书（xiaohongshu）

**登录**：✅ 已登录（COSMOS，17 粉）

**只读命令**：
| 命令 | 用途 |
|---|---|
| `whoami` | 当前登录用户 |
| `feed [--limit N]` | 首页推荐流 |
| `search <query> [--limit N]` | 搜索笔记 |
| `note <full-url>` | 笔记详情（需完整签名 URL，含 xsec_token） |
| `comments <note-id>` | 笔记评论（含楼中楼） |
| `user <id>` | 用户公开笔记 |
| `liked` / `saved` | 赞过/收藏的笔记 |
| `creator-stats` | 创作者数据总览 |

**注意事项**：
- `note` 必须传完整签名 URL，不能只用 note ID
- 默认模式即可正常工作，不需要 foreground

---

### 2. BOSS 直聘（boss）

**登录**：⏸️ 暂时搁置

**问题**：
- `stale page identity`：页面句柄过期
- `Detached while handling command`：daemon 连接断开

**已知可用命令**（之前在 svxyqy6c profile 验证过）：
| 命令 | 用途 |
|---|---|
| `search [query] --city <城市> --limit N` | 搜索职位 |
| `detail <security-id>` | 职位详情 |
| `chatlist` | 聊天列表 |
| `whoami` | 登录状态（易报 stale） |

**关键参数**（之前验证有效）：
```bash
--window foreground --site-session persistent
```

**待办**：在 v6pz9gjx profile 中重新排查，可能需要先打开 zhipin.com 页面建立会话。

---

### 3. 知乎（zhihu）

**登录**：✅ 已登录（wjsnbb，uid: 991295536128827392）

**只读命令**：
| 命令 | 用途 |
|---|---|
| `whoami` | 当前登录用户 |
| `hot` | 知乎热榜 |
| `search <query>` | 搜索 |
| `question <id>` | 问题详情 |
| `answer <id>` | 回答 |
| `answer-detail <id>` | 单个回答完整内容 |
| `answer-comments <id>` | 回答评论列表 |
| `user <id>` | 用户信息 |
| `user-answers <user>` | 用户回答列表 |
| `user-articles <user>` | 用户文章列表 |
| `collection <id>` | 收藏夹内容（需登录） |
| `collections` | 收藏夹列表（需登录） |
| `recommend` | 推荐 |
| `pins` | 想法 |
| `download` | 导出文章为 Markdown |

**注意事项**：
- 深度长文分析质量高，适合"如何评价XX""XX原理"类内容
- `answer-detail` 可获取完整回答正文

---

### 4. 掘金（juejin）

**登录**：✅ 可用（无需登录，hot/recommend 公开）

**只读命令**：
| 命令 | 用途 |
|---|---|
| `hot [--category <分类>]` | 热门文章排行榜，可按分类筛选 |
| `recommend` | 首页推荐文章流 |

**注意事项**：
- 命令较少，只有 hot 和 recommend
- 适合获取中文技术实战教程
- AI 编程/多智能体垂直领域声量不如 V2EX/Reddit

---

### 5. GitHub（github）

**登录**：✅ 已登录（cosmosomom，id: 224133797）

**只读命令**：
| 命令 | 用途 |
|---|---|
| `whoami` | 当前登录账号 |

**注意事项**：
- 适配器命令较少（只有 login 和 whoami）
- 发现项目用 `github-trending` 适配器（见 adapter-public-api.md）
- `github-trending` 支持每日/每周/每月热门，可按语言筛选

---

### 6. Reddit（reddit）

**登录**：✅ 已登录（Intrepid_Ad3831，2021-08-26 注册，Total Karma: 1）

**只读命令**：
| 命令 | 用途 |
|---|---|
| `whoami` | 当前登录用户（含 Karma、注册时间等） |
| `hot` | 热门帖子 |
| `frontpage` | 首页 / r/all |
| `popular` | /r/popular |
| `home` | 个性化首页（Best，需登录） |
| `search <query>` | 搜索帖子 |
| `subreddit <name>` | 指定子版帖子 |
| `subreddit-info <name>` | 子版元数据（订阅数、描述、创建日期） |
| `read <post-id>` | 读取帖子和评论 |
| `user <username>` | 用户信息 |
| `user-posts <username>` | 用户发帖 |
| `user-comments <username>` | 用户评论 |
| `saved` | 已保存的帖子（需登录） |
| `subscribed` | 已订阅的子版（需登录） |
| `upvoted` | 已赞的帖子（需登录） |

**高价值子版推荐**：
- `r/LocalLLaMA` - 本地大模型、AI 编程工具
- `r/MachineLearning` - 机器学习学术讨论
- `r/programming` - 编程综合
- `r/cscareerquestions` - 程序员找工/职业
- `r/artificial` - AI 综合
- `r/SelfHosted` - 自托管工具

**注意事项**：
- AI 编程实战经验和海外找工信息质量极高
- 1050 赞的"Reddit 大神 Tech 找工完全指南"在小红书传播，说明认可度高

---

### 7. V2EX（v2ex）

**登录**：✅ 已登录（cosmostxy）

**只读命令**：
| 命令 | 用途 |
|---|---|
| `whoami` | 当前登录账号 |
| `me` | 个人资料（余额/未读提醒） |
| `hot` | 热门话题 |
| `latest` | 最新话题 |
| `topic <id>` | 主题详情和回复 |
| `replies <id>` | 主题回复列表 |
| `node <name>` | 节点话题列表 |
| `nodes` | 所有节点列表 |
| `member <username>` | 用户资料 |
| `user <username>` | 用户发帖列表 |
| `notifications` | 提醒（回复/@） |

**高价值节点推荐**：
- `programmer` - 程序员综合
- `share` - 分享创造
- `work` - 工作
- `devops` - DevOps
- `python` / `nodejs` / `golang` - 各语言
- `ai` - AI 相关
- `career` - 职业发展

**注意事项**：
- 国内程序员一手实践讨论最真实的地方，无种草感
- Vibe Coding、AI 编程等话题经常从 V2EX 发酵到小红书
- 浏览体验被吐槽（321 赞的"大家是怎么忍受 V2EX 的浏览体验的"）

---

### 8. linux.do（linux-do）

**登录**：✅ 已登录（页面显示"我的帖子""我的消息"，feed 正常返回数据）

**已知 bug**：`whoami` 命令误报 `AUTH_REQUIRED`，因为它读的是页面 meta 标签 `current-user-username`，但 linux.do 当前页面没有这个标签。**不影响核心功能使用**。

**只读命令**：
| 命令 | 用途 |
|---|---|
| `feed [--category <分类>] [--tag <标签>]` | 话题列表（需登录；支持全站、标签、分类） |
| `search <query>` | 搜索 |
| `topic <id>` | 帖子首页摘要和回复（首屏） |
| `topic-content <id>` | 获取帖子正文为 Markdown |
| `categories` | 分类列表 |
| `tags` | 标签列表 |
| `user-posts <username>` | 用户的帖子 |
| `user-topics <username>` | 用户创建的话题 |

**高价值分类/标签**：
- `开发调优` - 开发技术
- `前沿快讯` - 科技新闻
- `人工智能` - AI 相关
- `资源荟萃` - 资源分享
- `原创` - 原创内容
- `精华神帖` - 高质量帖子

**注意事项**：
- 高端开发者社区，AI 工具讨论质量高
- 有抽奖、积分等社区机制
- whoami 误报 bug，用 feed/search/topic 命令验证登录状态即可

---

## 通用调用格式

所有命令统一格式：
```bash
opencli --profile v6pz9gjx <adapter> <command> [args] [options] -f json
```

若已设置环境变量：
```powershell
$env:OPENCLI_PROFILE="v6pz9gjx"
$env:OPENCLI_WINDOW="background"
```
则可省略 `--profile` 和 `--window`：
```bash
opencli <adapter> <command> [args] -f json
```

## 验证记录

- 2026-08-27：在 v6pz9gjx profile 中验证 8 个平台登录状态
- 7/8 可用（BOSS 直聘暂时搁置）
- linux.do whoami 误报 bug 已确认，不影响核心功能
