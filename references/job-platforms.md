# 求职平台专项（OpenCLI 使用者视角）

> 首次实测：2026-09-16（opencli v1.8.6）· 补测与修正：2026-09-17（**已升级 v1.8.7**）· profile v6pz9gjx
> 用途：求职/招聘情报采集时，先查本文件确定「用哪个平台、哪条命令、哪些字段能信」，不要凭印象试。
> 配套：[adapter-boss.md](adapter-boss.md)（BOSS 专项）、[anti-bot-notes.md](anti-bot-notes.md)、[data-quality-checklist.md](data-quality-checklist.md)
>
> ⚠️ **本文件的结论按证据等级标注**（🔍 单点观察 / 📊 倾向 / ✅ 规则），门槛见
> [channel-probing.md](channel-probing.md) §4.5。**没标等级的默认按 🔍 单点观察对待**——
> 内容类判断（哪种关键词好用、某平台"适不适合"）尤其容易从一两次调用过度泛化，
> 用之前先看 n 是多少。

---

## 一、定位：OpenCLI 在求职链路里干什么、不干什么

求职情报往往有两条链路：一条是**重资产批量采集**（自建/开源采集器 + 官方 ATS 抓取 + 统一数据库，
append-only 存历史），另一条才是 OpenCLI。**如果你已经有前者，OpenCLI 不是用来和它抢活的。**

两者边界：

| 维度 | 批量采集系统 | OpenCLI（本 skill） |
|---|---|---|
| 目标 | 批量 JD 入库、历史追踪 | 轻量探针、即时查询、社区情报 |
| 频率 | 定时/批量 | 一次几条，随用随查 |
| 平台 | BOSS/猎聘/智联/官方 ATS/小红书 | **51job、牛客、LinkedIn、Indeed、一亩三分地**（前者不覆盖的） |
| 风险 | 与真实投递账号绑定 | 优先走免登录/匿名通道 |

**铁律**：如果批量采集系统已经在用真实投递账号跑 BOSS，**不要再用 OpenCLI 对 BOSS 做任何自动化**——
两者共用同一套浏览器指纹与登录态，风险叠加。见第六节。

---

## 二、平台实测矩阵（2026-09-16）

| 适配器 | 平台 | 实测状态 | 登录 | 浏览器 | 一句话 |
|---|---|---|---|---|---|
| `51job` | 前程无忧 | ✅ **完全可用** | ❌ 不需要 | 需要 | 国内主力通道，21 字段、薪资已拆 min/max |
| `nowcoder` | 牛客 | ✅ **全部可用**（已登录） | 部分命令需要 | **7 条不需要** | 唯一有「零浏览器零登录」通道的求职平台 |
| `linkedin` | 领英 | ⛔ AUTH_REQUIRED | ✅ 必须 | 需要 | 职位搜索筛选维度最全 |
| `indeed` | Indeed | 🟡 **半残** | ❌ | 需要 | search 的 title 全空；detail 撞 Cloudflare |
| `1point3acres` | 一亩三分地 | ⛔ 403 / AUTH | ✅ 必须 | 部分 | 匿名连版块列表都 403 |
| `boss` | BOSS 直聘 | 🔴 **禁区** | — | — | 见第六节，是账号问题不是技术问题 |
| `maimai` | 脉脉 | ⚠️ 能力不匹配 | ✅ | 需要 | 只有 `search-talents`（招聘方搜候选人），**读不到职言爆料** |
| `upwork` | Upwork | 未测 | ✅ | 需要 | 外包接单，非求职主线 |

**名字像求职、实际无关**（别浪费时间去试）：`jianyu`（剑鱼标讯/招标）、`powerchina`（电建采购公告）、`linkedin-learning`（课程）。

---

## 三、51job（国内主力通道）

### 3.1 三条命令的分工与可信度

**核心结论：元数据只信 `search`，`detail` 只取 JD 正文。**

| 命令 | 用途 | 可信度 |
|---|---|---|
| `search <keyword>` | 关键词搜岗位 | ✅ **21 字段全部可信**，主数据源 |
| `company <encCoId>` | 该公司全部在招岗位 + 公司简介 | ✅ 可用，但 `companyName` 字段污染 |
| `detail <jobId>` | 岗位详情 | 🟡 **只有 `description` 和 `category` 可用** |
| `hot` | 按城市/行业浏览推荐岗位 | 未实测 |

### 3.2 search（可信，主数据源）

```bash
opencli --profile v6pz9gjx 51job search "光谱算法" --limit 10 --window background -f json
```

筛选参数：`--area`（城市名或 6 位城市码）、`--salary`（"20-30k" / "1-1.5万"）、`--experience`（"应届" / "3-5年"）、
`--degree`、`--companyType`（外资/国企/民营）、`--companySize`（"50-150"）、`--sort`（综合/最新/薪资/距离）、`--page`、`--limit`（1-50）。

输出 21 列：`rank, jobId, title, salary, salaryMin, salaryMax, city, district, workYear, degree, tags,
company, companyFull, companyType, companySize, industry, hr, issueDate, url, companyUrl, encCoId`

关键字段：

- `salaryMin` / `salaryMax`：**已解析成「元/月」整数**（"2-4万·14薪" → 20000 / 40000）
- ⚠️ **`salaryMin/Max` 不含薪资月数**。"·14薪" 只存在于 `salary` 原始字符串里。
  **算年包必须自己从 `salary` 解析「·N薪」**，否则 13 薪和 16 薪的岗位会被当成完全一样。
- `issueDate`：完整时间戳（`2026-09-16 16:02:20`），可直接做新鲜度过滤
- `hr`：招聘负责人姓名+职位（如"江文仙·经理"）
- `encCoId`：加密公司 ID，**传给 `company` 命令即可反查该公司全部在招岗位**——死角公司发掘的关键钩子
- `tags`：经验/学历/技能/福利混在一个逗号串里，用前需自己切分
- `url`：带签名参数（`?s=sou_sou_soulb&t=0_0&req=...`），**含 `&`，PowerShell 里必须单引号包裹**

### 3.3 company（字段污染，需绕过）

```bash
opencli --profile v6pz9gjx 51job company "BWBTMVIzDzJWMABjVjM" --limit 20 --window background -f json
```

- ❌ **`companyName` 字段恒为 `"APP下载"`**（选择器抓到了页面上的 App 下载按钮，8 条结果全部相同）。
  **正确取公司名**：从 `search` 结果的 `companyFull` 取，或从本命令 `companyIntro` 开头解析。
- ❌ `funcType` 是**未解码的职能代号**（`0603` / `A0JT` / `A0MR`…），无对照表，**不要拿它做分类**。
- ✅ `companyIntro` 可用，是公司简介全文。
- **真正用途**：判断一家公司是不是真的在这个方向招人。若 8 个在招岗位里 7 个是销售/人事/CNC、只有 1 个光学测试，
  那它不是这个方向的雇主，只是偶然发了一个岗。

### 3.4 detail（大面积损坏，只取正文）· 🔍 单点观察（1 条岗位 jobId=163598924）

```bash
opencli --profile v6pz9gjx 51job detail 163598924 --window background -f json
```

| 字段 | 状态 |
|---|---|
| `description` | ✅ **完整 JD 正文**（岗位职责+任职要求），detail 唯一的增量价值 |
| `category` | ✅ 可用（如"激光/光电子技术"），search 里没有这个字段 |
| `salary` / `companyType` / `companySize` / `companyIndustry` | ✅ 与 search 交叉核对一致 |
| `title` | ❌ **恒为 `"APP下载"`**（与 company 同一个污染 bug） |
| `location` | ❌ **三值挤在一个字段**：`"东莞-沙田镇\n4年及以上\n硕士"` |
| `workYear` / `degree` / `address` / `welfare` / `company` / `companyUrl` | ❌ **全部空字符串** |

→ **标准用法**：`search` 拿全部元数据 → 需要读 JD 时才调 `detail`，且只读 `description`。

### 3.5 反爬与验证

- 走**已登录/有浏览历史的 Chrome profile（v6pz9gjx）**时，`--window background` 直接可用，
  不需要 `--site-session persistent`，实测连续多次调用未触发风控。
- ⚠️ **干净浏览器会撞滑块验证**：用内置浏览器/无痕窗口打开 `jobs.51job.com` 会跳「滑动验证页面」。
  **所以 51job 的「肉眼比对」不能用干净浏览器做**——改用 `search` × `detail` 交叉核对（两条不同取数路径），
  或在已登录的 Chrome 里人工看。

---

## 四、牛客（唯一有零风险通道的平台）

### 4.1 双通道结构（最重要的认知）

牛客的 18 条命令分成**两个完全不同的风险等级**：

| 通道 | 命令 | 浏览器 | 登录 | 风险 |
|---|---|---|---|---|
| 🟢 **公共 API** | `jobs` `companies` `trending` `hot` `topics` `recommend` `creators` | **不需要** | **不需要** | 零（Node 直连 `gw-c.nowcoder.com`） |
| 🟡 社区内容 | `experience`(面经) `salary`(薪资) `referral`(内推) `search` `detail` `papers` `practice` `notifications` | 需要 | **必须** | 与账号绑定 |

🟢 通道实测（2026-09-16，**daemon 未运行、未登录、直接跑通**）：

```bash
opencli nowcoder jobs -f json        # 13 个一级职业 + ID
opencli nowcoder trending --limit 5  # 实时热帖（标题 + heat + id）
opencli nowcoder companies -f json   # 面试热门公司 + companyId
```

🟡 通道未登录时的报错样子：`whoami` → `AUTH_REQUIRED: Nowcoder t cookie missing`；
`experience` → `Error: need login`（底层 `home/tab/content` 接口直接返回 need login）。

### 4.2 关键词表现：决策链流水（⚠️ 证据等级 📊 倾向，**不是规则**）

> 记法与证据门槛见 [channel-probing.md](channel-probing.md) §4.5。
> **这一节曾被写成一条规则并被推翻，过程原样保留——它本身就是教训，不要删。**

#### 观察流水（事实层，不随解释变化）

| 轮次 | 关键词 | 词性 | 返回 n | 有效命中 | 内容特征 | 当时推断 |
|---|---|---|---|---|---|---|
| R1 09-16 | `光谱` | 窄技术概念词 | 5 | 1/5 | 4 条是"路亿市场策略"类市场研究报告标题党 | 概念词可能被站内 SEO 页盖过 |
| R2 09-16 | `仪器` | **宽行业词** | 5 | 5/5 | 某仪器公司 C++ 一面（带具体考题）、某外企 FAE 实习体验连帖 | ⚠️ **与 R1 冲突，当时未解释**——我把它错归进"公司名/岗位名"栏，硬凑 R1 的结论 |
| R3 09-17 | `大模型 算法 面经` | 概念+场景 | 35+ | 高 | GRPO vs DPO、OPD 自蒸馏、RAG 边界、bge-m3、DeepSeek 架构、多模态幻觉治理 | 加场景词后命中高 |
| R3 09-17 | `笔试 难度 算法` | 概念+场景 | — | 高 | 2026 届笔试新形态：算法手撕 + 八股选择 + AI Coding（Prompt 代码生成） | 同上 |
| R3 09-17 | `秋招 时间线` / `提前批 时间线` | 场景词 | — | 高 | 各厂投递→笔试→一面→二面→HR 面→意向书的真实日历 | 同上 |

#### ❗ 已被推翻的结论（保留，不静默改写）

> **09-16 曾写下**：「在牛客搜公司名和岗位名，**不要搜技术概念词**。」
>
> **推翻证据**：
> ① **同一轮就有反例**——R2 的 `仪器` 本身就是裸概念词（宽行业词），5/5 全是真面经，当时被我归错类；
> ② R3 的概念+场景词批量高命中。
>
> **教训**：`n=1` 关键词不足以给一整类词定性。当时该写的是"R1 观察到一次 SEO 污染"，
> 而不是"这类词没用"。

#### 当前认知（📊 倾向）

在已测的 5 个词里，命中率与"是不是概念词"**没有稳定对应关系**。更可能相关的变量有三个，
**样本不足以区分**：

| 候选解释 | 支持 | 缺口 |
|---|---|---|
| ① 该词是否为市场研究报告的热门标的（商业价值高 → 站内 SEO 页多） | `光谱` 行业报告极多；`仪器` 相对少 | 未系统验证 |
| ② 词的宽窄（窄技术词 vs 宽行业词） | `光谱`(窄)差 / `仪器`(宽)好 | 样本仅 2 |
| ③ 是否带场景词 | R3 全部带场景词且高命中 | **未测"窄技术词 + 场景词"**——正是最能区分的那一格 |

**区分实验（待做，成本很低）**：取 3 个窄技术词 + 3 个宽行业词，各裸搜一次、各加场景词搜一次，
比较命中率。共 12 次调用，牛客登录通道反爬压力小，一轮可跑完。

#### 操作建议（够用即可，别当规律用）

- **首轮多词展开**：公司名 / 岗位名 / 宽行业词 / 窄技术词 / 概念+场景，各取 1-2 个，每词 `--limit 10`
- **逐词记命中率**（有效条数/返回条数）。某个词命中率低 → 记下来，**不要立刻推广成"这类词都不行"**
- 场景词（`面经` / `难度` / `时间线` / `offer选择` / `投票`）是牛客社区帖的自称词，SEO 页一般不用，
  **加上通常不亏**——这是目前最稳的一条，但同样只到 📊 倾向级

### 4.3 各命令的实测特征

- `experience`（面经）：默认 feed 是**时间序**不是热度序，赞/评常年为 0，对硬件/仪器方向命中率低。
  真正有用的是配合 §4.2 用 `search` 定向搜公司名。
- `salary`（薪资爆料）：标题多为公司对比（"网易互娱 vs 百度 vs 蚂蚁"），**具体薪资数字在正文里**，
  需要再调 `detail <id>` 才能看到。偶有标题为"无"的条目。
- `referral`（内推）：华为/米哈游/卓驭等，**存在重复条目**（同一帖子在 limit 4 里出现 2 次），去重按 `id`。
- ⚠️ **`rank` 字段不连续**（如 limit=4 返回 rank 2/4/5/8）——适配器过滤了广告等条目但保留原始序号。
  **不要用 rank 做计数或分页依据**，用返回数组长度。

### 4.4 两套 ID 空间（容易搞混）

- **一级职业 ID**（`jobs` 命令返回，共 13 个，用于 `practice --job`）：
  `11226`=软件开发 `11227`=通信/硬件 `11228`=机械/制造 `11229`=产品/项目/运营 `11230`=金融 `143882`=生物医疗 …
- **二级岗位 ID**（用于 `companies --job` / `papers --job`）：
  `11002`=Java `11003`=C++ `11200`=后端 `11201`=前端 `11203`=测试
- ⚠️ 两套 ID **不通用**。二级 ID 的完整列表官方接口未暴露
  （`careerJobLevel2List` 返回的是 `{id:300, name:"求职职位"}` 占位数据），只能用帮助文本里这 5 个。

### 4.5 适用性提醒

牛客是**互联网校招**导向。对光谱/仪器/半导体硬件方向，`papers`（题库）和 `practice` 价值有限；
有价值的是按公司名 `search` 面经（看面试流程和真实岗位要求）、`salary`、`referral`。

### 4.6 登录通道实测补充（2026-09-17）

🟡 登录通道（`search` / `detail` / `experience`）跑通记录，补 §4.1 只验了 🟢 通道的缺口：

```bash
opencli --profile v6pz9gjx nowcoder whoami -f json
# → {"logged_in": true, "site": "nowcoder", "user_id": "...", "nickname": "..."}

opencli --profile v6pz9gjx nowcoder search "<词>" --window background --limit 10 -f json
# 输出列: rank, id, title, author, school, content

opencli --profile v6pz9gjx nowcoder detail <id> --window background -f json
# 输出列: title, author, school, content, likes, comments, views, time, location
```

| 现象 | 根因 | 应对 |
|---|---|---|
| `Error: Post not found: <id>` | 列表里混着**专栏文章 / 跨系统路径**的 id，`detail` 只路由通用帖子路径 | 优先用 `search` 命中的标准 UUID；遇 not found **直接采信 `search` 自带的 `content` 摘要**，不死磕（成本优先，SKILL 铁律 7.6） |
| 节奏 | `search`/`detail` 均 1~3s 返回 | 3~5s/次连打无阻断、无验证码，是**反爬最宽松的登录态平台之一** |

> `search` 的 `content` 字段是**完整摘要而非截断**，这是 `detail` 失败可以兜底的前提；
> 别的适配器（如脉脉 `/web/search_center`）DOM 摘要是服务端截断的，不能这么兜。

---

## 五、LinkedIn / Indeed / 一亩三分地

### 5.1 LinkedIn（待登录后验证）

`search` 是**职位搜索**（不是人脉搜索），筛选维度最全：

`--location` `--company` `--experience-level`（internship/entry/associate/mid-senior/director/executive）
`--job-type`（full-time/part-time/contract/…）`--date-posted`（any/month/week/24h）`--remote`（on-site/hybrid/remote）
`--limit`（最大 100）`--details`（连正文和投递链接一起拉，慢）

⚠️ **`people-search` 会消耗 LinkedIn 每月商业使用额度（Commercial Use Limit）**，适配器帮助文本明确要求限流。
职位 `search` 不受该限制，但也不要滥用。

### 5.2 Indeed（半残，慎用）

实测 `search "spectroscopy algorithm" --limit 3`（🔍 **单点观察：仅 1 个关键词 1 次调用**，未换词复验）：
能返回，但 **`title` / `salary` / `tags` 三个字段全空**，
只有 `company` / `location` / `url` / `id` 有值 → 典型选择器漂移（见 data-quality-checklist §2.11）。
`job <id>` 直接报 **`Indeed served a Cloudflare challenge page`**。

→ 目前只能拿到「哪些公司在招」这一层，拿不到岗位标题和正文。
需要时：人工在浏览器过一次 Cloudflare 盾再重试；或直接用 LinkedIn 替代。

### 5.3 一亩三分地（适配器已被站点迁移打废，走浏览器通道）

**根因（两环境独立实测一致）**：站点已从 Discuz BBS 迁移到新版 `/home` 前端，
旧 `/bbs/` URL 重定向到 `/home`，适配器依赖的旧标记
（`#um` / `#g_upmine` / `a[title="访问我的空间"]` / `.vwmy a` / `a.username`）在新版页面**全部不存在**。
上游 #2145 的修复被这次站点迁移超越。

| 命令 | browser | 实测 |
|---|---|---|
| `digest` `forum` `forums` `hot` `latest` `thread` `user` | ❌ Node 直连 | **匿名/登录均 403**（旧 `/bbs/forum-*.html` 端点已废） |
| `search` `whoami` `notifications` `login` | ✅ | `whoami` 报 `bbs rendered but no #um identity`；`search` 复用同一失效检测 → AUTH_REQUIRED |

**注意**：Node 直连类命令**不接受 `--window` 参数**，传了报 `unknown option '--window'`。
**用户只登录新版 `/home` 不够**——适配器查的是 `/bbs/` 侧身份。

**可用替代（浏览器通道，已验证）**：
```bash
opencli browser <sess> open "https://www.1point3acres.com/home/forum/<fid>"
# 再 eval 抽取帖子（标题 + /home/thread/<id> 链接）
```
新版登录态锚点：`img[src*="avatar.1p3a.com"]`（仅登录态渲染）。
搜索页 `/home/search?q=<kw>` 能加载，但结果需搜索框交互后异步渲染。

---

## 六、BOSS 直聘：禁区（账号问题，不是技术问题）

> ⚠️ 与 skill 其他地方「低频只读可用」的描述不同，**本机 BOSS 是禁区**。

**事实依据（真实事故）**：曾因短时间内多次启动采集任务，**真实求职账号被限制访问约 24 小时**。
该账号用于实际投递——被限影响的是找工作本身，不是数据。

**本机规则**：

- BOSS 数据改走**人工单次通道**（每天最多手动触发一次、失败不重试、单关键词 + 30s 等待）
- **不要用 OpenCLI `boss` 适配器做任何自动化**——与批量采集端共用同一套浏览器指纹与登录态
- 定下的原则：**渠道收益低于账号风险时，优先放弃自动化，数据从其他渠道补**
- 替代：同一岗位在 51job / LinkedIn 上基本都能找到平替信息

技术层面的反爬机制（CDP 特征探测 → 页面刷新 → 强制登出）见 [adapter-boss.md](adapter-boss.md)。

---

## 七、按能力词反查公司（E6-2 工作流）

**目的**：不按公司找岗位，而是按能力关键词搜岗位、反查出「不知道自己不知道」的公司。

```
1. 用市场语言（不是学术自称）搜 51job
   opencli --profile v6pz9gjx 51job search "<能力词>" --limit 20 --window background -f json
2. 从结果取 companyFull + encCoId + industry + city + salaryMin/Max
3. 对候选公司调 company <encCoId>，看在招岗位的整体构成
   → 判断是「真方向雇主」还是「偶然发了一个岗」
4. 岗位线索 ≠ 真源。公司官网 ATS 仍需按项目六步流程单独确认后才登记链接表
5. 想看这家公司的面试真实情况 → 拿公司名去 nowcoder search（公司名有效，技术词无效）
```

⚠️ **硬教训（项目 E6-2）**：「化学计量学」在 2963 个真实 JD 里命中 **0 次**。
用学术术语搜必然空手而归，然后错误地得出「这个方向没岗位」的结论。

**已验证有效的市场语言词**：光谱算法、光谱分析、近红外、物质表征、量测、可解释、多维评估、研究员、博士专项。

---

## 八、待办

- [ ] 登录后验证：linkedin（search）、1point3acres（search/forums）
- [ ] Indeed：人工过 Cloudflare 后复验 `job <id>`；`title` 全空是适配器缺陷，考虑上报或自修
- [ ] 51job `hot` 命令未实测；`--area` 传中文城市名 vs 6 位城市码的差异未验证
- [ ] 牛客 `salary` 正文需 `detail` 二次读取，未验证 detail 对 salary 帖的字段完整性

---

*本文件最后更新：2026-09-16（首次建立：51job 三命令 + 牛客双通道已实测）*
