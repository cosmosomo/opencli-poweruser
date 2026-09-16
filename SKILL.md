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
> **本文件中的 `v6pz9gjx` 是本机 Browser Bridge profile ID（私有仓库包含本机配置，clone 后立即可用）。** 本机详细配置见 [LOCAL.md](LOCAL.md)。

## 前置检查（每次任务第一步）

运行 `opencli daemon status`，确认：
- `Daemon: running`（默认端口 19825）
- `Extension: connected`（浏览器扩展已连接）
- 记下你的 profile ID（如 `v6pz9gjx`），后续命令需要用到

若 daemon 未运行，运行 `opencli daemon start`。
若扩展未连接，在 Chrome 中确认扩展已启用并打开目标网站。

## 环境配置

### 浏览器 Profile

运行 `opencli daemon status` 查看已连接的 Browser Bridge profile。如果有多个 profile 连接，必须指定使用哪一个。

所有命令加全局 `--profile` 参数（放在 `opencli` 后、适配器前）：
```bash
opencli --profile v6pz9gjx <adapter> <command> -f json
```

或设置环境变量（当前终端会话有效）：
```powershell
$env:OPENCLI_PROFILE="v6pz9gjx"
```

若报 `Multiple Browser Bridge profiles are connected`，说明未指定 profile，按上述方式指定即可。

> **你的 profile ID 和本机配置记录在 `local/LOCAL.md` 中（不提交到 Git）。**

### 默认后台窗口模式

**推荐使用后台模式**，避免浏览器窗口反复弹到前台抢焦点：
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

### ⚠️ 输出处理通用提醒（所有适配器适用）

**PowerShell 编码**：`Out-File` 默认输出 UTF-16 LE BOM，Python 读取必须用 `encoding='utf-8-sig'`，否则 json.load 会报错或乱码。

```powershell
# 保存结果
opencli <adapter> <command> -f json 2>$null | Out-File -FilePath "result.json" -Encoding utf8
```
```python
# 读取结果（必须 utf-8-sig）
with open('result.json', 'r', encoding='utf-8-sig') as f:
    data = json.load(f)
```

**输出格式因适配器而异**：search 通常返回 dict 列表，note 可能返回 field-value 对列表（如小红书）。使用前先 `print(type(data))` 和 `print(data[0].keys() if isinstance(data, list) else data.keys())` 确认结构，不要假设所有命令输出格式一致。

**URL 中的 & 符号**：PowerShell 中 `&` 是调用运算符，包含 `&` 的 URL 必须用单引号包裹：`opencli xiaohongshu note '<url_with_&>' -f json`

## 已验证适配器速查

> 完整的 8 平台登录状态、可用命令清单、高价值子版/节点/分类见 [references/verified-platforms.md](references/verified-platforms.md)

| 适配器 | 平台 | 登录状态 | 关键参数/注意事项 | 经验文件 |
|---|---|---|---|---|
| `xiaohongshu` | 小红书 | ✅ 已登录 | note/comments/download均需完整签名URL（从search结果url字段取，单引号包裹）；note输出field-value列表非dict；comments输出dict列表（与note不同！）；search无id字段需从URL提取；note/comments偶发静默失败(0B空文件)必须检查+重试；图文笔记需download图片后Read | [adapter-xiaohongshu.md](references/adapter-xiaohongshu.md) |
| `zhihu` | 知乎 | ✅ 已登录 | 深度长文质量高，answer-detail 可获全文；反爬比小红书宽松 | [adapter-zhihu.md](references/adapter-zhihu.md) |
| `juejin` | 掘金 | ✅ 可用（无需登录） | 只有 hot/recommend，中文技术教程 | [verified-platforms.md](references/verified-platforms.md) |
| `github` | GitHub | ✅ 已登录 | 适配器只有 whoami；发现项目用 `github-trending` | [verified-platforms.md](references/verified-platforms.md) |
| `reddit` | Reddit | ✅ 已登录 | AI 编程/找工质量极高，推荐 r/LocalLLaMA 等子版 | [verified-platforms.md](references/verified-platforms.md) |
| `v2ex` | V2EX | ✅ 已登录 | 国内程序员真实讨论，推荐 programmer/share 节点 | [verified-platforms.md](references/verified-platforms.md) |
| `linux-do` | linux.do | ✅ 已登录 | whoami 误报 bug，feed/search/topic 正常 | [verified-platforms.md](references/verified-platforms.md) |
| `boss` | BOSS 直聘 | 🔴 **账号级禁区** | 曾因短时多次触发采集导致**真实投递账号被限约 24 小时**；BOSS 改走人工单次通道，**OpenCLI 侧不做任何自动化** | [job-platforms.md](references/job-platforms.md) §六 |
| `51job` | 前程无忧 | ✅ 完全可用（免登录） | 求职主力通道；`search` 21 字段可信、薪资已拆 min/max、`encCoId` 可反查公司；⚠️ `detail.title` 与 `company.companyName` 恒为"APP下载"（字段污染），detail 只取 `description` | [job-platforms.md](references/job-platforms.md) §三 |
| `nowcoder` | 牛客 | ✅ 已登录 | **双通道**：7 条命令零浏览器零登录（jobs/companies/trending/hot/topics/recommend/creators）；面经/薪资/内推需登录。搜公司名有效、搜技术概念词全是 SEO 垃圾 | [job-platforms.md](references/job-platforms.md) §四 |
| `linkedin` | 领英 | ✅ 已登录 | `search` 是职位搜索，筛选最全（remote/date-posted/经验级别）；⚠️ `people-search` 消耗每月商业使用额度 | [job-platforms.md](references/job-platforms.md) §五 |
| `indeed` | Indeed | 🟡 半残 | `search` 的 title/salary/tags 全空（选择器漂移）；`job` 撞 Cloudflare | [job-platforms.md](references/job-platforms.md) §五 |
| `1point3acres` | 一亩三分地 | ⛔ 需登录 bbs | 只有 `search` 走浏览器，`forums/hot/latest/thread` 是 Node 直连**必 403**；登录要登 `/bbs/` 不是 `/home` | [job-platforms.md](references/job-platforms.md) §五 |
| `maimai` | 脉脉 | ✅ **已自建职言通道** | 内置 3 条命令全废（whoami 恒误报、login 会破坏人工登录、search-talents 是 B 端搜人）；**自建 `search-gossip`（职言全文+gid）和 `quota`（配额探针）已通过官方 verify**。薪资包体情报价值高 | [adapter-maimai.md](references/adapter-maimai.md) |
| `bilibili` | B站 | ✅ 可用 | 无特殊参数 | [adapter-public-api.md](references/adapter-public-api.md) |
| `hackernews` / `arxiv` / `wttr` 等 | 公开 API | ✅ 可用 | 无需浏览器 | [adapter-public-api.md](references/adapter-public-api.md) |
| `doubao` / `chatgpt` / `claude` | AI 工具 | ⚠️ 部分可用 | ChatGPT 因 UI 改版选择器失效 | 见 pitfalls.md |

## 本机专属环境（local/LOCAL.md，不提交）

> 本机专属的工具链状态、目录结构、登录状态、专属工作流串联，记录在 `local/LOCAL.md` 中。
>
> **此文件不提交到 Git，不公开分享。** 包含：本机已安装/待安装工具（OpenCLI / yt-dlp / ffmpeg / bili2rag / faster-whisper）、知识空间目录结构、平台登录状态、cookie 状态、无字幕视频 ASR 决策树、OpenCLI 能力边界与弥补方式。
>
> 首次使用时从 `local/LOCAL.md.example` 复制一份，填入你自己的配置。已通过 `.gitignore` 排除 `local/` 目录。

## 文档导航（按任务找文件）

> references/ 共 18 份，**分四层**。不确定读哪个时从这张表进，不要凭文件名猜。

### 第一层 · 平台层「这个站点能给我什么」

| 文件 | 何时读 |
|---|---|
| [verified-platforms.md](references/verified-platforms.md) | 查某平台的登录态、命令清单、高价值子版/节点 |
| [job-platforms.md](references/job-platforms.md) | **求职/招聘采集前必读**：8 个求职适配器状态矩阵、字段可信度、BOSS 禁区、按能力词反查公司 |
| `adapter-*.md`（[xiaohongshu](references/adapter-xiaohongshu.md) / [zhihu](references/adapter-zhihu.md) / [boss](references/adapter-boss.md) / [maimai](references/adapter-maimai.md) / [public-api](references/adapter-public-api.md)） | 动手用某个具体适配器之前，先读它的卡 |

### 第二层 · 通道层「怎么把一个渠道跑通」

| 文件 | 何时读 |
|---|---|
| [channel-probing.md](references/channel-probing.md) | **开新渠道第一站**：研发五步、探活阶梯 L0-L4、四种失败鉴别、定级落卡 |
| [new-site-exploration.md](references/new-site-exploration.md) | 速查表里没有这个站点；评估要不要自建适配器；React props 挖数据法 |
| [data-quality-checklist.md](references/data-quality-checklist.md) | 命令跑通了，验数据对不对（11 种静默失败） |
| [anti-bot-notes.md](references/anti-bot-notes.md) | 页面闪烁 / 强制登出 / 连续返回空 |
| [pitfalls.md](references/pitfalls.md) | **遇到报错先搜这里**（15 条通用坑 + 适配器特定问题） |
| [site-memory-guide.md](references/site-memory-guide.md) | 任务结束，经验该记到哪个文件 |

### 第三层 · 方法层「怎么做一场调研」

| 文件 | 何时读 |
|---|---|
| [research-sop.md](references/research-sop.md) | 跨平台议题调研的标准流程（含第 0 步议题理解验证、舆情专项、推理决策树） |
| [topic-lexicon.md](references/topic-lexicon.md) | 把关键词沉淀成可复用词典资产（七栏骨架 / 五维评估 / AI 盲区自觉） |
| [research-scripts.md](references/research-scripts.md) | 写采集脚本前：8 种可复用模式 + 参数化规范 |
| [research-logging.md](references/research-logging.md) | 调研过程怎么存（先存后整理） |

### 第四层 · 工作流层「特定产出」

| 文件 | 何时读 |
|---|---|
| [bilibili-asr-workflow.md](references/bilibili-asr-workflow.md) | B站视频 → 字幕（yt-dlp + faster-whisper） |
| [adapters/README.md](adapters/README.md) | 本 skill 自建的适配器源码与安装方法（换机器时复制启用） |

**脚本**：[init_research.py](scripts/init_research.py)（建调研目录）、[lexicon_scan.py](scripts/lexicon_scan.py)（词典扫描 tags/freq/tier/inventory）、[bili_asr.py](scripts/bili_asr.py)（B站转写）

---

## 三条越级铁律（不看文档也必须遵守）

1. **⚠️ 前沿议题：AI 必须清楚自己不知道真正的前沿词汇。** 词汇知识截止于训练数据，
   "AI 不认识但语料高频"是最强前沿信号。开工先声明盲区，只做一轮搜索 = 只拿到 AI 已知的世界。详见 [topic-lexicon.md](references/topic-lexicon.md) §一
2. **调研必须留痕**：开始时 `python scripts/init_research.py "议题名"`，搜索结果直接存 `raw/`，
   结束花 1 分钟填 `README.md`。**结果只存在于对话里 = 没做过。** 详见 [research-logging.md](references/research-logging.md)
3. **探活不要用 `whoami`**：已有 4 个平台确认误报（linux-do / 小红书 / 脉脉 / 一亩三分地）。
   用最轻的数据命令探活。详见 [channel-probing.md](references/channel-probing.md) §二

---

## 探索新站点与新适配器

> 完整流程见 [channel-probing.md](references/channel-probing.md)（渠道研发五步 + 探活）
> 与 [new-site-exploration.md](references/new-site-exploration.md)（Pattern/Strategy 判断 + 要不要自建）。
>
> 一句话版本：`opencli browser <sess> analyze <url>` 一步诊断 → 按 `recommended_next_step` 走 →
> 能力边界判定 → 探活阶梯 → 数据质量 5 步 → 定级落卡。
> 真要写适配器时参考官方 `opencli-adapter-author` skill（npm 包内 `skills/opencli-adapter-author/`），
> 本 skill 已按其 Runbook 自建过适配器，样例见 [adapters/](adapters/README.md)。

## 遇到问题

1. `stale page identity` → 用 `--window foreground --site-session persistent` 重建一次持久会话，后续切 `--window background`（详见 pitfalls.md 和 adapter-boss.md）
2. `AUTH_REQUIRED` → 在 Chrome（你配置的 profile）中登录对应网站
3. `Multiple Browser Bridge profiles are connected` → 未指定 profile，加 `--profile v6pz9gjx`（全局参数，放在 opencli 后适配器前）或设 `$env:OPENCLI_PROFILE="v6pz9gjx"`
4. 命令无响应/卡住 → 检查 daemon 状态，必要时重启
5. 输出格式异常 → 确认加了 `-f json`，部分适配器默认输出非标准格式
6. **手动登录时页面被反复导走 / "刚登录又自动退掉"** → 不是站点风控，是 `<site> login` 的轮询每 2 秒 `page.goto`。
   该站点人工登录期间**禁止执行它的任何 opencli 命令**（whoami 也不行），登完再单独验证。判断方法见 pitfalls.md §14
7. `命令 | python -c "..."` 报 `IndentationError` 且错误内容是 `|| goto :error` → Windows .cmd shim 坑，
   改成先落盘再解析或用 `node -e`；Git Bash 里 python 打印中文加 `PYTHONIOENCODING=utf-8`，见 pitfalls.md §15

## 自迭代与经验沉淀

> skill 的价值在于经验持续沉淀。每次任务中遇到的踩坑、平台适配经验、工作流方法论、工具链技巧，都应按分类归档到 references/ 中。
>
> 完整的自迭代方法论见 [EVOLUTION.md](EVOLUTION.md)：什么该记录、记录到哪里、怎么记录、何时更新 SKILL.md、自迭代检查清单、维护原则。
>
> 快速规则：新适配器 → `adapter-<name>.md`；通用踩坑 → `pitfalls.md`；调研方法论 → `research-sop.md`；脚本/工具链模式 → `research-scripts.md`；反爬 → `anti-bot-notes.md`；新站点探索 → `new-site-exploration.md`；数据质量 → `data-quality-checklist.md`；站点记忆规范 → `site-memory-guide.md`；本机专属 → `LOCAL.md`（不公开）。

## 进化日志

> 已移出本文件，见 [CHANGELOG.md](CHANGELOG.md)（skill 层面变更）
> 与 [references/pitfalls.md](references/pitfalls.md) 的进化日志节（单适配器验证记录）。
