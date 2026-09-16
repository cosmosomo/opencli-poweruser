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
