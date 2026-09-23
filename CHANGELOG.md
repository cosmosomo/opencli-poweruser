# 进化日志

> 本 skill 每次能力变更/经验沉淀的时间线。**只追加，不改写。**
>
> 分工：本文件记 **skill 层面的变更**（新方法论、新 reference、速查表状态位变化）；
> 单个适配器的验证记录与报错细节记在 [references/pitfalls.md](references/pitfalls.md) 的进化日志节。
> 写入规范见 [EVOLUTION.md](EVOLUTION.md) §4。

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

### 2026-09-12 议题词典方法论沉淀（Agent Harness 领域调研驱动）
- ✅ 创建 `references/topic-lexicon.md`：认知闭环模型（脑中词表→探针→捕获陌生词→立体认知→再摸瓜）、**AI 前沿盲区自觉（硬规则：AI 不认识但语料高频=最强前沿信号，开工先声明盲区，每词标 AI先验，强制跑第二轮反查）**、七栏词典骨架、五维评估（热度/新鲜度/前沿度🔮/本质度⚙️/契合度）+ 升降级判据、顺藤摸瓜递归与剪枝规则、🔥search/❄️note 配额分配、词典纵向追踪（议题雷达）与跨议题迁移、反哺舆情/数据质量/ASR/招聘等 SOP
- ✅ 创建 `scripts/lexicon_scan.py`：参数化词典扫描器（tags/freq/tier/inventory 四模式，不含议题专属词），内置 read_json（BOM 三级嗅探）与 flatten（note 摊平结构）两个踩坑工具函数；已用本次 58 篇/51 精读真实数据验证 tags（160 标签）、inventory（58 去重）、tier（分层+AI先验标注）全部通过
- ✅ 明确 content/skill 分层纪律：词典本体（具体词条）属单次任务数据留 research 目录，只有方法论与参数化脚本进 skill
- ✅ 更新 `research-sop.md` §七衔接词典、`research-scripts.md` 第 8 种模式、`EVOLUTION.md` 归档规则与文件职责表
- 来源：Agent Harness 领域调研（DSH/Pi/Hermes/Cordis 路线之争），小红书 11 组关键词→58 篇去重→51 篇精读→130+ 词条词典

### 2026-09-14 豆包副本经验回流（小红书命令坑 + 调研前置验证）
- ✅ SKILL.md 新增"输出处理通用提醒"：PowerShell Out-File 默认 UTF-16 LE BOM→Python 读取必须 utf-8-sig；各命令输出结构不一、用前先验证类型；含 & 的 URL 必须单引号包裹
- ✅ `adapter-xiaohongshu.md` 固化 5 坑：note 输出 field-value 对列表（非 dict）、comments 输出 dict 列表（与 note 结构不同）、search 无 id 字段需从 URL 提取、download 输出目录固定不可指定、note/comments 偶发 0B 静默失败（批量脚本必须检查文件大小+重试，附 safe_note 防护示例）；签名 URL 取用升级为铁律三条
- ✅ `research-sop.md` 新增调研前置环节：第 0 步议题理解验证（复述理解+列"不是什么"+拆核心名词层次+确认通用性）、第 0.5 步平台相关性必须实测（禁止凭印象排除平台）、社媒数字只作关注度参考不纳入技术判断、发现高重合开源项目立即转一手资料做架构拆解
- 来源：豆包副本两轮实战（25+8 篇小红书精读暴露命令坑；一次方向跑偏的调研沉淀出前置验证方法论）

### 2026-09-16/17 求职平台专项建立（Claude Code 环境实测）
- ✅ 盘点 163 个站点适配器，确认求职相关 8 个（51job/nowcoder/linkedin/indeed/1point3acres/upwork/maimai/boss），
  排除 3 个"名字像求职实则无关"（jianyu 招标 / powerchina 采购 / linkedin-learning 课程）
- ✅ 新建 `references/job-platforms.md`：实测状态矩阵 + 字段可信度 + 与既有批量采集系统的边界划分 + 按能力词反查公司工作流
- ✅ **51job 实测完全可用且免登录**：search 21 字段可信（salaryMin/Max 已拆、encCoId 可反查公司全部在招岗位）；
  ⚠️ 实测发现 `detail.title` 与 `company.companyName` **恒为"APP下载"**（选择器污染），`detail` 的 workYear/degree/company 全空、
  location 三值挤一格 → **只信 search，detail 只取 description**
- ✅ **牛客双通道确认**：7 条命令（jobs/companies/trending/hot/topics/recommend/creators）`browser:false`，
  daemon 未运行未登录直接跑通；关键词策略实测：搜公司名出真面经，搜技术概念词全是市场报告 SEO 垃圾
- ✅ linkedin 职位搜索通过；indeed 半残（title 全空 + Cloudflare）；1point3acres 需登 `/bbs/` 非 `/home`
- 🔴 **BOSS 状态从"⚠️ 低频可用"上调为"🔴 本机禁区"**：依据是 2026-08-15 真实投递账号被限 24 小时（项目 README 有记录），
  这是账号问题不是技术问题，速查表原描述会误导
- 📝 pitfalls 新增 §14（login 轮询 `page.goto` 冲掉人工登录，脉脉源码级确证，通用）、
  §15（Git Bash 中 `cmd | python -c` 被 .cmd shim 搅坏 + 中文显示乱码别误判成数据乱码）
- 📝 51job 干净浏览器会撞滑块验证 → **肉眼比对不能用干净浏览器做**，改用 search × detail 交叉核对

### 2026-09-17 脉脉渠道打通（首次自建适配器，走完官方 adapter-author Runbook）
- ✅ **自建两个适配器并通过官方 `verify --strict-memory`**：
  `maimai search-gossip`（职言/实名动态搜索，19 行，返回**帖子全文 + 稳定 gid**）、
  `maimai quota`（搜索配额探针）；fixture + `endpoints.json`(3) + `notes.md` 已回写 `~/.opencli/sites/maimai/`
- 🔍 **根因级发现**：内置 `maimai whoami/login` 探针已失效——它扫的内联 `userObj = JSON.parse(...)`
  在当前站点已不存在，导致**已登录却恒报未登录**；而 `login` 用同一个坏探针轮询 +
  每 2 秒 `page.goto`，会把用户正在输验证码的页面反复导走（"刚登录又退掉"的真凶）→ 已固化为 pitfalls §14
- 🔬 **证伪了"Token 解耦"路线**：浏览器完整 cookie 拿到 Node 侧直连，204 → 补全 XHR 头仍 204 →
  CSRF 握手后 `403 error_code 20001「此设备已被操作下线」` → **脉脉会话与设备绑定，只能走浏览器上下文**。
  据此提炼出通用的[三步证伪测试](references/new-site-exploration.md#8)
- 💡 **新技术沉淀**：DOM 只有截断摘要时，去 **React fiber 的 memoizedProps 里挖完整对象**
  （脉脉靠这个拿到全文 + gid + 真实互动数）；必须写 DOM 降级分支 + `source` 列做改版告警 →
  已写入 [new-site-exploration.md §7](references/new-site-exploration.md#7)
- ⚠️ 诚实标注：`quota` 的计数器在我们的访问方式下**不增长**，不能当节奏依据；
  脉脉搜索**无分页**（`lim`/`o` 页面不认、无加载更多控件），单关键词 19 条封顶
- 📝 新建 [adapter-maimai.md](references/adapter-maimai.md)；速查表 maimai 行从"能力不匹配"改为"已自建职言通道"

### 2026-09-17 skill 架构清晰化 + 渠道探活方法论独立成卡

- 📐 **SKILL.md 从 364 行瘦到 240 行**：进化日志（90 行且持续增长）移出到 `CHANGELOG.md`，
  入口文件不再承载日志；与 `new-site-exploration.md` 重复的「探索新站点 6 步」展开压缩为指针
- 📐 **references/ 18 份分四层导航**（平台层 / 通道层 / 方法层 / 工作流层），
  替换原先分散在 4-5 个小节里的零散引用；新增「三条越级铁律」段（AI 盲区自觉 / 调研留痕 / 探活不用 whoami）
- 🆕 **新建 [channel-probing.md](references/channel-probing.md)**：把"开一个新渠道"固化成流水线——
  渠道研发五步、**探活阶梯 L0-L4**（本地 help → 免登录命令 → 轻量数据命令 → cookie 层 → 页面层）、
  四种失败鉴别（真未登录 / 探针失效 / 站点改版 / 限流）、五档定级（🟢🟡⛔🔴⚠️）
- 🔑 **两条铁律来自本轮实证**：
  ① **能力边界判定必须在鉴权调试之前**（脉脉 `search-talents` 是 B 端搜人，鉴权再完美对求职侧也零价值）
  ② **不要用 `whoami` 探活**——已确认 4 个独立误报案例（linux-do 读 meta 标签 / 小红书走 creator 子域 /
  脉脉扫内联 userObj / 一亩三分地找 `#um`），规律是 whoami 吊死在单点脆弱锚点上，而数据命令走主链路
- 📝 `EVOLUTION.md` 同步：归档规则新增"渠道研发/探活经验"一行、职责表补齐 4 个新文件、
  进化日志写入位置从 SKILL.md 改为 CHANGELOG.md
- 📝 `pitfalls.md` §16：git 网络操作在 Bash 工具里 TLS 握手失败、改用 PowerShell；
  附离线多副本同步法（本地路径当远程 + `merge-base --is-ancestor` 先验快进）

### 2026-09-17 使用侧加固：可达性 / 新鲜度 / 并行写入（agent 自我推演驱动）

> 触发：把"社区盘点"里的渠道技术经验回流进 skill 时，连续暴露出四类**不是知识错、而是知识失效**的问题。
> 本轮不加新知识，只加**让知识活着的机制**。

- 🆕 **[scripts/nav_audit.py](scripts/nav_audit.py)** —— 导航可达性自检（孤儿 / 死链 / 计数 / 内链四项，退出码可做门禁）。
  **为什么要脚本而不是纪律**：本仓回流率曾是 1/3（脉脉回流了，牛客、活动行没有），纪律会忘，脚本不会。
  首跑即抓到 1 个真孤儿（新建的 `adapter-huodongxing.md` 未登记）+ 自身 1 个真 bug
  （references 内部的 `references/x.md` 是仓库根相对、不是文件相对；`adapter-<name>.md` 是占位符非链接）。现已全绿。
- 🆕 **[adapter-huodongxing.md](references/adapter-huodongxing.md)** + 速查表登记。
  **一条 `--help` 就纠了两处**：卡上漏记 `--tag` 参数；`--qs` 被描述成"关键词过滤"，实为**按活动名称匹配**
  （决定了关键词策略——议题词必须以会议起名的方式出现才命中）。另确认 `events` 是唯一命令、
  输出列里**没有**赞助商/嘉宾/议程，必须两段式穿透详情页。
- 🆕 **[channel-probing.md](references/channel-probing.md) §七「复用已有卡之前：30 秒复核」** ——
  前六节只覆盖"开新渠道"，但日常高频的是**用一张已写好的卡**，而卡会过期。
  三条触发线（无版本标注 / 非本 skill 写的 / 超期且升过级）+ 三条零风险复核命令 + 不一致时的处理矩阵。
  **§7.3 立为铁律：版本号 / 登录态 / 路径 / 工具版本四类环境事实以活体命令为准，不以文件为准。**
  实证：LOCAL.md 与某渠道卡都写 v1.8.6，其中一条还专门"校正"成 v1.8.6，而活体是 **v1.8.7**（并行会话升的级）——
  后果是两条以 1.8.7 为前提的结论（活动行 busy 页识别、BOSS 只读恢复）会被按 1.8.6 误读。
- 📝 **[pitfalls.md](references/pitfalls.md) §17**：`--window` / `--site-session` / `--limit` / `-f` 是**子命令级**参数，
  放全局位置必报 `unknown option`。opencli 只有 `--profile` 一个全局参数。
- 📝 **[EVOLUTION.md](EVOLUTION.md) §6 维护原则 +4 条**（7 可达性优先于完整性 / 8 环境事实现查 /
  9 并行写入安全 / 10 半成品必须可发现）。第 9 条是本机新常态：多个 agent 会话同时改同一批文件，
  本轮就遇到并行会话重写 `job-platforms.md §4.2` 与新建 `channel-probing.md §4.5`。
- 🔧 **速查表 nowcoder 行纠偏**：仍挂着已被 §4.2 推翻的"搜技术概念词全是 SEO 垃圾"。
  **速查表是最先被读到的地方，推翻结论不同步到这里等于没推翻。**
- 🔧 **[platforms/claude-code.md](platforms/claude-code.md) 更正**：原文"Claude Code 没有原生 Skill 概念"已过时——
  现有原生 `~/.claude/skills/`，本 skill 当前正是这样加载的。新增"方式 0"并指出
  **frontmatter 的 `description` 是唯一无条件常驻的文本，触发词写得准不准决定这个 skill 会不会被想起来**。
- 🔧 **LOCAL.md 路径遗留修正**：SKILL.md 三处仍写 `local/LOCAL.md（不提交）`，实际文件在仓库根且随仓提交
  （`.gitignore` 注释写明了这是有意的），照旧文会找错地方；顺带统一口径为"随仓提交但不公开分享，
  真凭证一律不落文件"。

### 2026-09-17 一个渠道一张维护卡：4 张新卡 + verified-platforms 降为索引

> 用户定的分工：**渠道的技术维护内容归到该渠道专属的 md**。
> 已有专属去处的不新建（牛客并入 `job-platforms.md §四`）；只散在跨平台总表里的，独立成卡。

- 🆕 **[adapter-reddit.md](references/adapter-reddit.md)** / **[adapter-v2ex.md](references/adapter-v2ex.md)** /
  **[adapter-bilibili.md](references/adapter-bilibili.md)** / **[adapter-github.md](references/adapter-github.md)**
  —— 内容来自 `verified-platforms.md` 对应小节 + 外部渠道记录 + **本轮 L0 `--help` 实录**，三源合并。
- 🔧 **[verified-platforms.md](references/verified-platforms.md) 改为「登录态总表 + 卡索引」**：
  命令明细迁往各卡（迁移前逐个核对过接收方已覆盖，含 BOSS）；
  只保留掘金 / linux.do 明细（暂无卡，已标注）+ 登录态怎么验（别用 whoami）+ 通用调用格式。
- 🔧 SKILL.md：速查表 4 行改指新卡并写明各自的**能力边界**；导航表 `adapter-*.md` 行列全 10 张卡
  并注明"牛客的卡在 job-platforms §四，未单列"；references 计数 19 → 23。

#### L0 复核抓到的 4 处错记（这一轮最值钱的产出）

| 渠道 | 原记载 | L0 实录 | 后果 |
|---|---|---|---|
| **Reddit** | "`comments <URL>` 读评论，评论区是金矿" | **根本没有 `comments` 命令**；读评论是 `read <post-id>`。而 **`comment`（单数）是 [write] 发评论** | 照原文跑会报错；**手滑一个字母就在用户账号上发帖**（触犯安全铁律 #2） |
| **V2EX** | 11 条命令列在"只读"表里 | **`daily` 是 [write] 每日签到**，会改动账号状态 | 被当只读顺手跑 → 未授权的账号动作 |
| **V2EX** | —— | **没有 `search` 命令** | 用法只能是"节点泛读 + 人工筛"，不是关键词检索；不知道会以为搜不出来是词的问题 |
| **B站** | LOCAL.md 记"27 个命令" | 实为 **21 条** | 计数虚高，不影响使用但说明快照没人复核 |

→ Reddit 这条是**把小红书的命令名套到了 Reddit 上**（小红书确实有 `comments`），
属 [channel-probing.md](references/channel-probing.md) §一 的"假设别人有的它也有"。
四条全部由 §七「30 秒复核」的第一步（`--help`）发现，**零网络、零风险、耗时不到一分钟**——
这是该节建立以来的首次实战回报。

#### 顺带

- 每张新卡都按 **[read] / [write] 分表**列命令（安全铁律 #2 要落到卡上才有用，
  混在一张表里就是上面 V2EX `daily` 那种事故的温床）
- 每张卡都带"渠道职能：能回答什么 / 不擅长→换哪个渠道"，与外部议题层记录对齐

### 2026-09-17 能力层 / 内容层归位：skill 只留方法论与能力事实

> 用户指正：**skill 侧要写得更 general——是方法论层面的指导；业务级内容（词汇空间之类）归对面。**
> 本轮把混进 skill 的业务判断全部清出去，并把规则写进模板，防止再犯。

- 🔧 **EVOLUTION §2.3 改写为纯方法论**（原版本把对面的字段名——词汇空间/信号密度/证据质量/
  维护优先级——当成"内容侧长什么样"逐条列了出来，等于在 skill 里固化了某一个内容侧的 schema）。
  新版本只留：
  - **唯一判据**：问这条知识什么情况下会过期（站点/适配器变→skill；议题/目标变→内容层）
  - 操作化版本：**把议题名词换成占位符，这句话还读得通吗**
  - skill 不收的四类（按**种类**，不按具体字段）
  - **skill 不规定对面怎么组织文件**——那是对面的事，只规定自己收到回流后做什么
- 🔑 **新增一条最容易犯的规则**：**adapter 卡不要写"这个渠道能回答什么业务问题"，只写能力边界。**
  配 ✅/❌ 对照表（"返回帖子正文+线程式评论，一次拿全" vs "适合看某领域的讨论"）。
- 🔧 **四张新卡的「渠道职能：能回答什么」全部替换为「能力边界：取得到什么 / 取不到什么」**：
  - reddit：子版是唯一结构化筛选维度；无按时间/分数的服务端过滤 → "先定子版再搜"是**能力决定的**，不是偏好
  - v2ex：**无全文检索**是最硬约束——任何"找关于 X 的帖子"都得先翻译成"去哪个节点翻"
  - bilibili：取文成本三级阶梯 `subtitle`(免费) → `summary`(只有大纲) → ASR(贵)
  - github：**一样内容都拿不到**，替代路径走 `github-trending` / REST API / clone
  - reddit 子版表也改了框架：记"平台有哪些分区、活不活跃"（能力），不记"哪个分区对我有用"（内容）
- 🔧 **adapter-maimai §六** 从「内容价值实测（对光谱/仪器方向）」改为「返回内容的形态实测」：
  实测数据保留（它是能力证据），**"对某方向有没有价值"的框架去掉**
- 📝 **site-memory-guide §4.1 卡模板新增「能力边界」节**，并写死禁令——
  模板不改的话，下一个人照旧模板写卡还会再犯一次
- ✅ 复查：`channel-probing.md` 里的"光谱/仪器/面经"**保留**——那是证据分级方法论的真实案例
  （证明 n=1 不能泛化），是方法论的论据，不是业务内容

**自查教训**：我在同一天先写下"渠道的议题职能判断不进 skill"，然后在四张新卡里各写了一遍议题职能。
规则写进 EVOLUTION 还不够，**必须同时写进产出物的模板**——否则规则和产出是两条不相交的路径。
### 2026-09-22 ZCode 适配器构建 + 桌面应用受控操作 SOP（真实场景避慌协议）
- 🆕 **新建自建适配器 `zcode`**（`~/.opencli/clis/zcode/`，8 命令）：
  - 磁盘直读 4 条（**已实测通过**）：`list`（会话，tasks-index.sqlite tasks 表）/ `tasks`（自动化 automations+automation_runs）/ `subagents`（子智能体 metadata.json，含任务书摘要/状态/活跃度）/ `read-transcript`（rollout model-io-*.jsonl）
  - CDP 交互 4 条（代码就绪，待 ZCode 带 9240 端口窗口实测）：`status` / `send`（contenteditable+Enter）/ `new`（Ctrl+N）/ `open`（task-item 点击）
  - 端口 **9240**（`~/.opencli/apps.yaml` 注册；避开内置 9235 trae-solo）
  - 关键技术：`node:sqlite` readOnly 打开（Windows 无 sqlite3 CLI）；LOCAL strategy（`browser:false`，func 拿 args 不拿 page）
- 🆕 **新建 [references/desktop-app-safety-sop.md](references/desktop-app-safety-sop.md)**：桌面 AI 应用受控操作六步闭环
  （勘察→记录→受控操作→恢复→验证→汇报）、Electron 单实例陷阱（Start-Process 吞参数→必须 ProcessStartInfo）、
  自动化自恢复原则（ZCode 每小时轮询重派中断子智能体，任务书内置「前次静默退出零产物——你是重跑」）。
  **本 SOP 是本轮实战的直接产物**：曾因盲目杀 ZCode 中断用户生产任务（4 个 running 子智能体），被用户严正纠正后沉淀。
- 🎯 **最高理念：断掉之后要续跑**（用户原话：「断掉之后要续跑要作为基本理念哦」）——
  已写入 SOP 第〇节：操作前必须能回答「断了谁来续/续跑证据/怎么证明续上」；
  续跑三机制（自动化自恢复 > 任务书重跑 > 人工手动恢复）；反面教材 = 2026-09-22 盲杀进程中断 4 子智能体。
- 🆕 **新建 [references/adapter-zcode.md](references/adapter-zcode.md)**：ZCode 数据层地图（tasks-index.sqlite 表结构、
  agents/rollout 路径）、已验证做不通清单（CLI headless / app-server stdio / 凭证复用 / 智谱 API 429）、
  与 AntiGravity 适配器异同对照
- ✅ SKILL.md：速查表加 `zcode` 行、文档导航加 adapter-zcode.md + desktop-app-safety-sop.md
- 📌 实战洞察：**ZCode 是自恢复系统**——每小时自动化轮询会自动重派被中断的子智能体，
  操作进程后只需确认 automation active + next_run 正常 + 主会话 rollout 继续写，不必手工恢复

### 2026-09-22（2）ZCode 并发监控口径血泪修正：status 不可信，rollout mtime 才是金标准
- 🔴 **纠正原则性错误**：`subagents --active running` 按 `metadata.status` 过滤统计"并发"完全不可靠——
  实测 `status=running` 的 10 个里 **8 个是僵尸**（异常中断的 agent 状态永远停在 running，updatedAt 停在创建时刻，无 rollout 文件），
  真实并发只有 **2-3 个**（rollout 日志持续写入的）
- ✅ **修正 subagents.js**（`~/.opencli/clis/zcode/subagents.js` + skill 副本 `adapters/zcode/subagents.js`）：
  - 新增 `--alive` / `--alive-minutes`（默认 30）：只返回 rollout 日志 mtime 在窗口内有写入的子智能体 = **真在跑**
  - 输出新增 `alive`（Y/N）+ `lastRollout` 列；rollout 文件名 = `model-io-sess_subagent_` + agentId（注意前缀无重复 `agent_`）
  - 修复排序 bug：原 `b._ageMin - a._ageMin` 最旧在前，改为升序（最新活跃在前）
  - `--minutes` 过滤也从目录 mtime 改为取 rollout/dir 两者较新
- ✅ **5 个并发监控定时任务全部改口径**：`--active running` → `--alive`（9点前 :00/:20/:40 + 9点后奇/偶点）
- ✅ adapter-zcode.md 新增「⚠️⚠️ 子智能体活跃判定」章节 + 命令矩阵/快速上手示例全部换 `--alive`
- 📌 **教训**：监控"在跑"永远不要用 metadata 状态字段，桌面应用要数活跃必须找「运行期持续写入的日志文件」；
  顺带暴露原 subagents 示例本身也是错误示范（`--active running`），已一并改正

### 2026-09-23（3）ZCode 3.14.3 DWF 架构实测修正：rollout 金标准分流 + 9240 修复链路 + 提醒文件闭环
- 🔴 **纠正写死的金标准**（2026-09-22 版假设部分失效）：主会话**不写** `rollout/model-io-sess_<id>.jsonl`——
  轨迹在 `cli\log\zcode-<date>.jsonl`（每日滚动、每行带 sessionId）；3.14.3 多智能体改走 **DWF（workflow_child）**：
  `cli\db\db.sqlite` 的 `dwf_run`/`dwf_actor` 表 + rollout `model-io-sess_dwf-dwfrun-<runId>-actor_<n>_<m>.jsonl`
- ✅ **subagents.js 升级双形态**（skill 副本 + ~/.opencli/clis/zcode 运行本体同步）：旧式 agents 目录 + DWF db 表合并列出，
  rollout 通用规则 `model-io-<childSessionId>.jsonl` 判活跃；新增 `kind` 列（subagent/dwf）；**终态排除**（completed/failed/cancelled
  最近有写入也不算 alive，收尾写入不计并发）；修 dwf 时间戳单位 bug（ms 勿 ×1000）
- ✅ **read-transcript.js 加主会话 log 回退**：rollout 找不到时读今日 `cli/log/zcode-<date>.jsonl` 按 sessionId 过滤尾部
- ✅ **实测**：sess_xxxxxx 列出运行中 DWF run「示例自动化任务」的 4 actors（2 alive）；sess_xxxxxx 旧式子智能体
  「智联城市类目页批五」alive=Y；主会话 read-transcript 走 log 回退正常
- 🔴 **提醒文件闭环验证**：`__ZCode并发提醒.md` 无人消费——automations.prompt 全文 6214 字不含读该文件指令；
  沉淀规则：写给 ZCode 看的文件必须先查任务书，同步走覆盖地图认领行/状态指针
- ✅ **9240 修复链路沉淀**（adapter-zcode.md §三·补 + desktop-app-safety-sop.md 教训表）：假死特征诊断清单
  （LISTENING 但 HTTP 超时 + CPU 秒级 + 截图空白）；根因①3.14.3 待装更新阻塞→清残留+静默装更新+重启；
  根因②DWM 故障（系统级，需系统重启）；触发延迟现实（三相位叠加晚 5-30 分钟）
