---
name: opencli-poweruser
description: >-
  通过本机已部署的 OpenCLI（@jackwener/opencli，全局安装 v1.8.6+）调用 160+ 网站/桌面应用
  适配器进行数据采集与操作。覆盖 BOSS直聘职位搜索、小红书内容抓取、B站热门、HackerNews、
  arXiv、天气、加密货币等。当用户需要搜索职位、抓取社交媒体内容、查询公开数据、操作已登录
  的网站账号时使用本 skill。触发词：opencli、boss直聘、小红书抓取、职位搜索、B站热门、
  网站数据采集、CLI 调用网站。
---

# OpenCLI Power User

通过本机全局安装的 OpenCLI 调用各类网站/桌面应用适配器。核心价值：**已验证的反爬策略、
必加参数、踩坑经验都沉淀在 references/ 中，调用前查阅对应文件即可避免重复踩坑。**

## 本 skill 的定位与独特价值

> **使用者视角，不是作者视角。** 官方 `opencli-adapter-author` skill 教你怎么为新站点写适配器（12 步 Runbook + 6 种 Strategy 契约模型）；本 skill 教你怎么用已有适配器做**跨平台调研、数据采集、工作流编排**。
>
> 我们的独特优势：
> - **跨平台调研方法论**：8 步 SOP、关键词矩阵、平台适配策略（官方没有）
> - **8 平台已验证经验**：登录态、命令清单、高价值子版/节点、踩坑点（官方假设你已熟悉）
> - **环境问题实战**：stale page identity、daemon 管理、多 profile、cookie 导出（官方只教写适配器）
> - **反爬深度研究**：BOSS 直聘反爬根因、CDP 特征、8 种 DevTools 探测器（官方没有）
> - **跨工具串联**：OpenCLI + bili2rag + yt-dlp + faster-whisper ASR 工作流（官方只教 OpenCLI 内部）
> - **数据质量验证**：11 种静默失败识别、肉眼比对、单位/量级检查（官方只教写适配器时的 verify）
>
> 当需要为全新站点写适配器时，参考官方 `opencli-adapter-author` skill（npm 包内 `skills/opencli-adapter-author/`）。

## 安装与初始配置

> 新用户首次使用本 skill 前，必须先完成 OpenCLI 安装、浏览器扩展配置和网站登录。
> 完整步骤见 [SETUP.md](SETUP.md)：Node.js 前置要求、npm / 桌面应用两种安装方式、Chrome 扩展安装、daemon 验证、多 profile 管理、环境变量配置、智能体操作指南。
>
> **本文件中的 `v6pz9gjx` 等 profile ID、端口号、目录路径均为原作者本机示例，新用户必须按 SETUP.md 在自己机器上重新配置。**

## 前置检查（每次任务第一步）

运行 `opencli daemon status`，确认：
- `Daemon: running`（端口 19825）
- `Extension: connected`（浏览器扩展已连接）

若 daemon 未运行，运行 `opencli daemon start` 或执行 `start-opencli-daemon.bat`。
若扩展未连接，在 Chrome 中确认扩展已启用并打开目标网站。

## 本机环境配置

### 默认浏览器 Profile

本机有两个 Browser Bridge profile 连接，**默认使用 `v6pz9gjx`**（新浏览器，已登录各网站）。

所有命令必须加全局 `--profile` 参数（放在 `opencli` 后、适配器前）：
```bash
opencli --profile v6pz9gjx <adapter> <command> -f json
```

或设置环境变量（当前终端会话有效）：
```powershell
$env:OPENCLI_PROFILE="v6pz9gjx"
```

若报 `Multiple Browser Bridge profiles are connected`，说明未指定 profile，按上述方式指定即可。

### 默认后台窗口模式

**默认使用后台模式**，避免浏览器窗口反复弹到前台抢焦点：
```powershell
$env:OPENCLI_WINDOW="background"
```

设置后所有命令默认后台运行。仅在遇到 `stale page identity` 需要重建持久会话时，临时切一次 `foreground`：
```bash
opencli --profile v6pz9gjx boss search --limit 1 --window foreground --site-session persistent -f json
```

重建成功后切回 background 即可。

## 安全铁律

1. **默认只读模式**：优先使用 `[read]` 类命令（search、detail、feed、whoami、comments、note 等）。
2. **写操作需用户明确授权**：`[write]` 类命令（greet、send、invite、publish、follow、delete 等）
   必须在执行前告知用户具体操作内容并获得确认，禁止自动执行。
3. **保守频率**：同一适配器连续调用不超过 3 次/分钟，避免触发风控。
4. **结果用 `-f json`**：所有数据采集命令加 `-f json` 输出，便于结构化解析。

## 通用调用模板

```bash
opencli --profile v6pz9gjx <adapter> <command> [args] [options] -f json
```

若已设置 `$env:OPENCLI_PROFILE="v6pz9gjx"` 和 `$env:OPENCLI_WINDOW="background"`，可省略：
```bash
opencli <adapter> <command> [args] [options] -f json
```

查询某适配器支持的命令：`opencli <adapter> --help`
列出所有可用适配器：`opencli --help`（输出中包含全部 adapter 名称）

## 已验证适配器速查

> 完整的 8 平台登录状态、可用命令清单、高价值子版/节点/分类见 [references/verified-platforms.md](references/verified-platforms.md)

| 适配器 | 平台 | 登录状态 | 关键参数/注意事项 | 经验文件 |
|---|---|---|---|---|
| `xiaohongshu` | 小红书 | ✅ 已登录 | note/comments/download 均需完整签名 URL；图文笔记正文只有标签，需 download 图片后 Read | [adapter-xiaohongshu.md](references/adapter-xiaohongshu.md) |
| `zhihu` | 知乎 | ✅ 已登录 | 深度长文质量高，answer-detail 可获全文；反爬比小红书宽松 | [adapter-zhihu.md](references/adapter-zhihu.md) |
| `juejin` | 掘金 | ✅ 可用（无需登录） | 只有 hot/recommend，中文技术教程 | [verified-platforms.md](references/verified-platforms.md) |
| `github` | GitHub | ✅ 已登录 | 适配器只有 whoami；发现项目用 `github-trending` | [verified-platforms.md](references/verified-platforms.md) |
| `reddit` | Reddit | ✅ 已登录 | AI 编程/找工质量极高，推荐 r/LocalLLaMA 等子版 | [verified-platforms.md](references/verified-platforms.md) |
| `v2ex` | V2EX | ✅ 已登录 | 国内程序员真实讨论，推荐 programmer/share 节点 | [verified-platforms.md](references/verified-platforms.md) |
| `linux-do` | linux.do | ✅ 已登录 | whoami 误报 bug，feed/search/topic 正常 | [verified-platforms.md](references/verified-platforms.md) |
| `boss` | BOSS 直聘 | ⚠️ 只读低频可用 | **反爬根因已查明**：反调试探测 CDP 特征 → 刷新/强制登出；纯自动化长期不可行，详见 [adapter-boss.md](references/adapter-boss.md) | [adapter-boss.md](references/adapter-boss.md) |
| `bilibili` | B站 | ✅ 可用 | 无特殊参数 | [adapter-public-api.md](references/adapter-public-api.md) |
| `hackernews` / `arxiv` / `wttr` 等 | 公开 API | ✅ 可用 | 无需浏览器 | [adapter-public-api.md](references/adapter-public-api.md) |
| `doubao` / `chatgpt` / `claude` | AI 工具 | ⚠️ 部分可用 | ChatGPT 因 UI 改版选择器失效 | 见 pitfalls.md |

## 本机专属环境（LOCAL.md，不公开）

> 本机专属的工具链状态、目录结构、登录状态、专属工作流串联，记录在 [LOCAL.md](LOCAL.md) 中。
>
> **此文件不打包进入 GitHub，不公开分享。** 包含：本机已安装/待安装工具（OpenCLI / yt-dlp / ffmpeg / bili2rag / faster-whisper）、知识空间目录结构、平台登录状态、cookie 状态、无字幕视频 ASR 决策树、OpenCLI 能力边界与弥补方式。
>
> 公开版 skill 不应包含此文件；已通过 `.gitignore` 排除。

## 可复用调研工作流

> 跨平台议题调研的标准流程、关键词策略、平台策略、数据处理流程、工具链经验，见 [references/research-sop.md](references/research-sop.md)
>
> 调研脚本的可复用模式（7种）、硬编码问题清单、参数化脚本设计规范，见 [references/research-scripts.md](references/research-scripts.md)
>
> 涵盖：关键词矩阵搜索、递归新词捕获、多平台交叉验证、平台适配关键词、批量采集→去重→结构化→分类→总结、点赞/时间质量过滤、OpenCLI 标准采集流程、8 步标准调研 SOP、脚本分层模型、参数化核心脚本设计。
> 来源：小红书 SDD 253 条笔记、6 大技术渠道核验、Scopus 自动化方案、8 平台登录验证、xhs_search 脚本体系分析等多轮实践总结。
>
> 站点反爬/反调试识别与应对（CDP 特征暴露点、8 种 DevTools 探测器、降频策略、技术路线评估、已确认站点反爬状态），见 [references/anti-bot-notes.md](references/anti-bot-notes.md)
>
> 来源：BOSS 直聘反爬 4 轮调研（CSDN/腾讯云/掘金/知乎/V2EX/影刀/GitHub/抖音）+ 小红书限流实测（2026-08-28）。

## 音视频处理工作流

> B站视频下载 + ASR 转写的一键封装，见 [references/bilibili-asr-workflow.md](references/bilibili-asr-workflow.md)
>
> 脚本：[scripts/bili_asr.py](scripts/bili_asr.py)
>
> 流程：BV号 → yt-dlp 下载音频(bestaudio/m4a) → faster-whisper ASR → 字幕(srt/vtt/txt/json)
>
> 关键经验：opencli download 在 Windows 上常报 ENOENT（已通过独立 yt-dlp.exe 解决）且只下视频流无音频；直接用 yt-dlp 只下音频快 3-5 倍；中国网络环境需设 `HF_ENDPOINT=https://hf-mirror.com` + `HF_HUB_DISABLE_XET=1`（脚本已内置）；B站 412 需 cookie（脚本自动从浏览器获取，或用 `--cookies` 指定）。
>
> 与 bili2rag 互补：本脚本做单视频快速转写，bili2rag 做批量 RAG 语料库构建。

## 探索新站点与新适配器（可进化机制）

> 完整的新站点探索流程见 [references/new-site-exploration.md](references/new-site-exploration.md)：`opencli browser analyze` 一步诊断、5 种 Pattern 分类、6 种 Strategy 稳定性判断、6 步探索流程。
>
> 数据质量验证见 [references/data-quality-checklist.md](references/data-quality-checklist.md)：11 种静默失败识别、5 步验证法、不同平台特殊检查点。
>
> 经验记录规范见 [references/site-memory-guide.md](references/site-memory-guide.md)：记录什么、记录到哪里、站点记忆模板、记忆维护。

当用户需求涉及未在速查表中的网站时，按以下流程：

### Step 1: 一步诊断（不要跳过）

```bash
opencli browser <session> analyze <url>
```

`analyze` 一步返回：站点 Pattern（A/B/C/D/E）、反爬厂商检测、最近适配器匹配、`api_candidates`（含 `verdict=likely_data/noise/blocked`）、官方建议的下一步。直接按 `recommended_next_step` 走。

### Step 2: 查找已有适配器

1. 运行 `opencli --help` 查找适配器名称（支持模糊匹配）
2. 看 `analyze` 输出的 `nearest_adapter`：有没有最像的可以直接用或参考
3. 运行 `opencli <adapter> --help` 查看支持的命令和参数

### Step 3: 探活验证

1. 先用最轻量的只读命令探活（如 `whoami` 或 `search --limit 1`）
2. 检查登录态：需要登录的平台确认 `whoami` 返回 `logged_in: true`
3. 检查反爬：频繁调用是否触发限流/验证码
4. 若遇到错误，查阅 [references/pitfalls.md](references/pitfalls.md) 看是否有已知解决方案

### Step 4: 数据质量验证（关键）

命令能跑通 ≠ 数据正确。按 [references/data-quality-checklist.md](references/data-quality-checklist.md) 验证：
- 非空检查 → 肉眼比对（抽 1-3 条和网页实际值对比）→ 单位/量级检查 → 字段语义检查 → 编码/URL 检查
- 11 种静默失败：字段污染、语义分歧、单位混淆、等不够就抓、`|| 0` 兜底、登录态漂移、反爬限流、HTML 实体、URL 不完整、分页不生效、字段缺失

### Step 5: 判断是否需要写新适配器

| 情况 | 解决方案 |
|---|---|
| 有现成适配器 | 直接用，记录经验 |
| 站点有公开 API（无需登录） | 直接用 `curl`/Python `requests`，不需要适配器 |
| 只需要一次性数据 | 用 `opencli browser` 手动操作（open/eval/extract） |
| 需要长期反复采集 | 参考官方 `opencli-adapter-author` skill 写适配器 |

### Step 6: 记录经验（skill 进化）

验证成功后，按 [references/site-memory-guide.md](references/site-memory-guide.md) 记录：
- 新建 `references/adapter-<name>.md`：必加参数、反爬策略、可用命令清单、踩坑点、输出字段
- 更新 `references/verified-platforms.md`：登录状态、可用命令
- 更新本文件速查表：新增一行
- 通用踩坑追加到 `references/pitfalls.md`
- 反爬特征追加到 `references/anti-bot-notes.md`
- 本机专属信息（profile、目录、工具版本）更新 `LOCAL.md`（不公开）

**这就是 skill 的进化方式**——每个新站点的探索经验都被结构化沉淀，下次使用时从 30 分钟变成 5 分钟。

## 遇到问题

1. `stale page identity` → 用 `--window foreground --site-session persistent` 重建一次持久会话，后续切 `--window background`（详见 pitfalls.md 和 adapter-boss.md）
2. `AUTH_REQUIRED` → 在 Chrome（v6pz9gjx profile）中登录对应网站
3. `Multiple Browser Bridge profiles are connected` → 未指定 profile，加 `--profile v6pz9gjx`（全局参数，放在 opencli 后适配器前）或设 `$env:OPENCLI_PROFILE="v6pz9gjx"`
4. 命令无响应/卡住 → 检查 daemon 状态，必要时重启
5. 输出格式异常 → 确认加了 `-f json`，部分适配器默认输出非标准格式

## 自迭代与经验沉淀

> skill 的价值在于经验持续沉淀。每次任务中遇到的踩坑、平台适配经验、工作流方法论、工具链技巧，都应按分类归档到 references/ 中。
>
> 完整的自迭代方法论见 [EVOLUTION.md](EVOLUTION.md)：什么该记录、记录到哪里、怎么记录、何时更新 SKILL.md、自迭代检查清单、维护原则。
>
> 快速规则：新适配器 → `adapter-<name>.md`；通用踩坑 → `pitfalls.md`；调研方法论 → `research-sop.md`；脚本/工具链模式 → `research-scripts.md`；反爬 → `anti-bot-notes.md`；新站点探索 → `new-site-exploration.md`；数据质量 → `data-quality-checklist.md`；站点记忆规范 → `site-memory-guide.md`；本机专属 → `LOCAL.md`（不公开）。

## 进化日志

新适配器的验证记录追加在 [references/pitfalls.md](references/pitfalls.md) 末尾。
每次成功验证新适配器后，更新本文件的"已验证适配器速查"表并创建对应 reference 文件。

### 2026-08-27 跨平台调研 SOP 整合
- ✅ 整合多轮调研实践经验（小红书 SDD 253 条笔记、6 大技术渠道核验、Scopus 自动化方案、8 平台登录验证）
- ✅ 创建 `references/research-sop.md`：关键词策略（4条）、平台策略（2条）、数据处理流程（2条）、工具链经验（2条）、8步标准调研SOP
- ✅ SKILL.md 新增"可复用调研工作流"章节，注册 research-sop.md

### 2026-08-27 调研脚本体系分析与参数化设计规范
- ✅ 分析 xhs_search 项目 ~15 个 PS1 脚本体系（搜索层/读取层/处理层三层模型）
- ✅ 提炼 7 种可复用代码模式（关键词矩阵批量搜索、JSON清洗、多批去重合并、新内容识别、关键词规则自动分类、详情批量读取、Markdown报告生成）
- ✅ 梳理 9 类硬编码问题清单（路径/关键词/分类规则/目标列表/单平台绑定/无参数化/无错误处理/无进度追踪/无配置文件）
- ✅ 制定参数化脚本设计规范（2个核心脚本、7条设计原则、平台字段映射）
- ✅ 创建 `references/research-scripts.md`，核心判断：方法论价值高，代码复用价值低；不建议原封不动塞硬编码脚本
- ✅ SKILL.md "可复用调研工作流"章节追加 research-scripts.md 引用

### 2026-09-03 舆情/风评调研专项经验沉淀
- ✅ AI 办公三产品（豆包/WorkBuddy/千问）真实风评调研实战：小红书 13 篇 + 知乎 2 篇 + 通用搜索 8 篇
- ✅ 新建 `references/adapter-zhihu.md`：zhihu 适配器首次实战经验（search/answer-detail 字段、answer ID 提取、反爬评估、与小红书互补关系）
- ✅ 更新 `references/adapter-xiaohongshu.md`：新增"舆情/风评调研场景经验"章节（负面词关键词策略、高赞筛选、评论区挖掘、反爬节奏验证：note/comments 远低于 search）
- ✅ 更新 `references/research-sop.md`：新增"六、舆情/风评调研专项 SOP"（与普通调研的 7 维区别、8 步标准流程、平台分工与反爬节奏、信源 5 级分级、正负向归类方法、完整实战案例）
- ✅ SKILL.md 速查表：zhihu 适配器经验文件从 verified-platforms.md 改为 adapter-zhihu.md
- 关键发现：负面词命中率比中性词高 3-5 倍；小红书 note/comments 可 5-10 秒连续调用（search 需 30 秒）；知乎 answer-detail 一次拿完整 Markdown 正文效率最高；评论区"我也是"+替代方案是风评调研金矿

### 2026-09-01 小红书图文笔记处理 SOP 与调研效率优化
- ✅ 滨寿司调研实战：3 组关键词 → 精读 7 篇正文 + 2 篇图片红黑榜（10 张图）+ 2 篇评论区 → 产出 47 款菜品四档分级
- ✅ 确认 `comments` 和 `download` 命令同样需要完整签名 URL（此前只记录了 note）
- ✅ 沉淀图片型笔记处理 SOP：content 只有标签 → 立即 download → 并行 Read（thumbnail_size=large）→ 封面图优先
- ✅ 沉淀 download 输出过滤技巧（Select-String 过滤进度条，避免 token 浪费）
- ✅ 沉淀评论区读取策略（只读 >5000 赞高赞笔记，用于发现争议款和补充推荐）
- ✅ 沉淀调研工作流优化（关键词矩阵、先筛选再精读、交叉验证定置信度、复用原生四档分类）
- ✅ 更新 `references/adapter-xiaohongshu.md`：新增"命令参数补遗""图片型笔记处理 SOP""评论区读取策略""调研工作流优化""本次调研效率数据"5 个章节
- ✅ 更新 SKILL.md 速查表：小红书关键参数从"`note` 需完整签名 URL"更新为"note/comments/download 均需完整签名 URL；图文笔记需 download 图片后 Read"

### 2026-09-03 官方 adapter-author 方法论整合 + 新站点探索体系
- ✅ 深度调研官方 `opencli-adapter-author` skill（12 步 Runbook + 6 种 Strategy 契约模型 + 14 个 references + 站点记忆机制）
- ✅ 明确本 skill 定位：使用者视角（跨平台调研/数据采集/工作流编排），与官方作者视角互补
- ✅ 创建 `references/new-site-exploration.md`：`opencli browser analyze` 一步诊断、5 种 Pattern 分类、6 种 Strategy 稳定性判断（fix 频率 1.18 vs 8.41/year）、6 步探索流程、写适配器时参考官方 skill
- ✅ 创建 `references/data-quality-checklist.md`：11 种静默失败识别（使用者视角）、5 步验证法、不同平台特殊检查点、数据质量速查表
- ✅ 创建 `references/site-memory-guide.md`：记录什么/记录到哪里、站点记忆模板（adapter/平台/进化日志）、OpenCLI 本地记忆与 skill 记忆的分工、记忆维护
- ✅ SKILL.md 新增"本 skill 的定位与独特价值"章节，明确 8 大优势
- ✅ SKILL.md "探索新适配器"章节扩展为 6 步流程，引用 3 个新 reference
