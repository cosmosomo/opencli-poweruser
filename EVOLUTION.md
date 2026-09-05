# Skill 自迭代方法论

> 本文档指导智能体（Agent）和用户如何将每次任务中产生的经验、踩坑、方法论持续沉淀进 skill，使 skill 随使用不断进化。
>
> 核心原则：**每次任务结束后，问自己——这次遇到的问题/学到的方法，以后还会遇到吗？如果会，就记录下来。**

---

## 1. 什么该记录

### 1.1 必须记录（高价值）

| 类型 | 判断标准 | 示例 |
|---|---|---|
| **踩坑/错误** | 第一次遇到、花了时间排查、以后可能再遇到 | `stale page identity` 的解决方法、`note` 需完整签名 URL、PowerShell 中 curl 是别名 |
| **平台适配经验** | 某个平台的特殊参数、反爬策略、登录要求、输出格式异常 | BOSS 直聘需 `--site-session persistent`、linux.do whoami 误报、coingecko 输出非标准 JSON |
| **工作流/方法论** | 多步骤任务的标准流程、关键词策略、分类方法、质量过滤标准 | 8 步调研 SOP、关键词矩阵 4 类拆分、点赞数阈值过滤 |
| **工具链经验** | 外部工具的串联方式、参数技巧、版本兼容性、依赖关系 | OpenCLI + bili2rag 串联、yt-dlp 需 ffmpeg、faster-whisper GPU 参数 |
| **能力边界** | OpenCLI 能做什么/不能做什么，需要什么外部工具补充 | 无本地 ASR、无批量引擎、无法读 HttpOnly cookie |

### 1.2 选择性记录（中价值）

| 类型 | 判断标准 |
|---|---|
| 单次任务的具体数据 | 只在该任务有用，不记录；但提炼出的方法论要记录 |
| 某个平台的临时故障 | 记录到 pitfalls.md，标注日期，后续验证是否已修复 |
| 用户的个性化偏好 | 记录到 LOCAL.md（本机专属，不公开） |

### 1.3 不记录

- 敏感信息：cookie 值、token、密码、个人隐私、security_id 真实值
- 推测性内容：未验证的假设、"应该可以"的猜测（先验证再记录）
- 过时内容：已被新版本修复的问题（标注已废弃或删除）
- 与 skill 无关的内容：纯业务逻辑、特定项目的代码细节

---

## 2. 记录到哪里

### 2.1 分类归档规则

| 经验类型 | 目标文件 | 说明 |
|---|---|---|
| 新适配器验证经验 | `references/adapter-<name>.md` | 新建文件，记录必加参数、反爬策略、可用命令、踩坑点 |
| 通用踩坑/已知故障 | `references/pitfalls.md` | 追加到对应章节，进化日志记录日期 |
| 平台登录状态变化 | `references/verified-platforms.md` | 更新表格状态和备注 |
| 调研工作流/方法论 | `references/research-sop.md` | 追加新策略或更新现有 SOP |
| 脚本/工具链模式 | `references/research-scripts.md` | 追加可复用模式或参数化设计 |
| 反爬/反调试 | `references/anti-bot-notes.md` | 追加站点反爬特征和应对策略 |
| 新站点探索经验 | `references/new-site-exploration.md` | 追加 Pattern/Strategy 判断、analyze 输出解读、探索流程优化 |
| 数据质量问题 | `references/data-quality-checklist.md` | 追加新的静默失败模式、验证方法、平台特殊检查点 |
| 站点记忆规范 | `references/site-memory-guide.md` | 更新记录模板、维护规则、记忆结构 |
| 音视频处理/ASR | `references/bilibili-asr-workflow.md` | 追加新平台 ASR 经验、模型对比、踩坑 |
| 安装配置问题 | `SETUP.md` | 追加常见问题或更新安装步骤 |
| 本机专属（profile、目录、cookie 状态、工具链版本） | `LOCAL.md` | **不公开**，仅本机维护 |
| 全新的方法论类别 | `references/<topic>.md` | 新建文件，在 SKILL.md 注册引用 |

### 2.2 文件不存在时怎么办

- 目标 reference 文件不存在 → 新建，参考已有文件的结构
- 经验类型无法归类 → 新建 `references/<topic>.md`，并在 SKILL.md 的对应章节添加引用
- 拿不准放哪里 → 先放 `references/pitfalls.md`，后续整理时再迁移

---

## 3. 怎么记录

### 3.1 格式规范

**事实优先**：只记录已验证的，不记录推测。每条经验包含：

```markdown
### <问题/经验标题>

**现象**：<具体报错或异常表现，可贴命令和输出>
**原因**：<根因分析>
**解决**：<具体步骤或命令>
**验证日期**：YYYY-MM-DD
**适用版本**：opencli vX.Y.Z（如相关）
```

**命令示例**用代码块，参数说明用表格，不写大段散文。

**不记录敏感信息**：cookie 值、token、密码、真实 security_id、个人账号信息（账号名可记录作为登录状态标识，但不记录凭证）。

### 3.2 记录的时机

- **任务进行中**：遇到新踩坑时，先解决问题，解决后立即记录（不要等任务结束，容易忘）
- **任务结束后**：回顾整个任务，提炼可复用的方法论，补充到对应 reference
- **定期回顾**：每隔一段时间（如每月），清理过时内容、合并重复经验、验证仍有效的方法

### 3.3 记录的粒度

- **踩坑**：一条问题一个小节，标题用问题现象或错误信息
- **方法论**：一个策略一个小节，包含原理、步骤、示例
- **平台经验**：按命令分类，每个命令记录用途、参数、输出字段、注意事项
- **不要**把多个不相关的经验塞在一个小节里

---

## 4. 何时更新 SKILL.md

SKILL.md 是 skill 的入口和速查表，不是所有细节都往里写。更新规则：

| 事件 | SKILL.md 操作 |
|---|---|
| 新适配器验证成功 | 速查表新增一行 + 进化日志追加记录 |
| 新方法论沉淀（新建 reference） | "可复用调研工作流"章节追加引用 + 进化日志 |
| 重要通用踩坑（影响所有适配器） | "遇到问题"章节追加 + pitfalls.md 详细记录 |
| 安装配置流程变化 | "前置检查"或"安装与初始配置"章节更新 + SETUP.md 同步 |
| 本机环境变化（profile、工具版本） | **只更新 LOCAL.md**，不更新 SKILL.md |
| reference 文件内容更新（非新增） | SKILL.md 无需改动，进化日志可选记录 |

**进化日志格式**（追加在 SKILL.md 末尾）：

```markdown
### YYYY-MM-DD <事件简述>
- ✅/⚠️/❌ <具体做了什么>
- 📝 创建/更新 reference 文件：<文件名>
```

---

## 5. 自迭代检查清单

每次任务结束后，按此清单检查是否有经验需要沉淀：

- [ ] 这次遇到了新的报错或异常吗？→ 记录到 pitfalls.md 或对应 adapter 文件
- [ ] 发现了某个平台的特殊参数或限制吗？→ 记录到 adapter-<name>.md
- [ ] 摸索出了一套可复用的工作流或方法论吗？→ 记录到 research-sop.md 或新建 reference
- [ ] 用到了外部工具和 OpenCLI 串联吗？→ 记录到 research-scripts.md 或 LOCAL.md
- [ ] 验证了新的适配器或平台吗？→ 更新 verified-platforms.md + SKILL.md 速查表
- [ ] 发现了 OpenCLI 的能力边界或缺陷吗？→ 记录到对应 reference，说明弥补方案
- [ ] 有过时的内容需要清理吗？→ 标注已废弃或删除
- [ ] 有敏感信息不小心写进了公开文件吗？→ 立即移除，移到 LOCAL.md 或删除

---

## 6. 维护原则

1. **增量更新**：每次只改需要改的，不做大规模重构（除非明确需要）
2. **保留历史**：进化日志不删除，过时的经验标注"已废弃（YYYY-MM-DD）"而非直接删除
3. **公开/私有分离**：本机专属信息（profile ID、目录路径、cookie 状态、工具版本）只进 LOCAL.md，不进公开文件
4. **事实可追溯**：每条经验标注验证日期和适用版本，方便后续验证是否仍有效
5. **不重复**：同一经验只在一个文件记录，其他地方引用而非复制
6. **简洁**：用表格和代码块，不写大段散文；每条经验只写必要信息

---

## 7. 参考：已有 reference 文件的职责

| 文件 | 职责 | 何时更新 |
|---|---|---|
| `SETUP.md` | 安装配置指南 | 安装步骤变化、新常见问题 |
| `references/verified-platforms.md` | 平台登录状态与可用命令 | 新平台验证、登录状态变化 |
| `references/pitfalls.md` | 通用踩坑与进化日志 | 新通用问题、适配器特定问题 |
| `references/adapter-*.md` | 单适配器详细经验 | 该适配器新发现的参数/限制/踩坑 |
| `references/research-sop.md` | 调研工作流与方法论 | 新策略、SOP 优化 |
| `references/research-scripts.md` | 脚本/工具链可复用模式 | 新模式、参数化设计更新 |
| `references/anti-bot-notes.md` | 反爬/反调试识别与应对 | 新站点反爬特征、新应对策略 |
| `references/new-site-exploration.md` | 新站点探索指南（analyze/Pattern/Strategy/6步流程） | 新站点探索经验、Pattern/Strategy 判断优化 |
| `references/data-quality-checklist.md` | 数据质量检查清单（11种静默失败） | 新的数据质量问题、验证方法 |
| `references/site-memory-guide.md` | 站点记忆指南（记录规范/模板/维护） | 记忆结构调整、记录规范更新 |
| `references/bilibili-asr-workflow.md` | B站 ASR 转写工作流（yt-dlp + faster-whisper） | 新平台 ASR、模型对比、踩坑 |
| `scripts/bili_asr.py` | B站 ASR 一键转写脚本 | 功能扩展、bug 修复 |
| `LOCAL.md` | 本机专属（不公开） | 本机环境变化、工具安装/升级、cookie 状态 |

---

*本文档是 skill 自迭代的元指导，最后更新：2026-09-03*
