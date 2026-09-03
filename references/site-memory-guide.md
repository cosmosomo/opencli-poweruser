# 站点记忆指南

> 使用者视角：每次使用新站点或新适配器后，应该记录什么、记录到哪里、怎么组织，让下次使用时加速。
>
> 核心原则：**没记忆 → 用 skill → 产生记忆 → 下次变 5 分钟。** 每次任务结束后花 2 分钟记录，下次省 30 分钟。

---

## 1. 站点记忆的价值

| 没有记忆 | 有记忆 |
|---|---|
| 每次都要查 `opencli --help` 找适配器 | 速查表直接看 |
| 每次都要试哪个参数是必须的 | adapter-<name>.md 里写好了 |
| 每次都要踩同样的坑（note 需完整 URL、boss 需 persistent） | pitfalls.md 里记录了 |
| 每次都要验证登录态 | verified-platforms.md 里记录了 |
| 每次都要重新判断数据质量 | data-quality-checklist.md 里有检查清单 |
| 不知道这个适配器稳不稳 | new-site-exploration.md 里有 Strategy 稳定性判断 |

---

## 2. 我们的 skill 的记忆结构

```
opencli-poweruser/
├── SKILL.md                          # 入口：速查表 + 流程指引
├── SETUP.md                          # 安装配置指南
├── EVOLUTION.md                      # 自迭代方法论
├── LOCAL.md                          # 本机专属（不公开）
├── .gitignore
└── references/
    ├── verified-platforms.md         # 平台登录状态 + 可用命令清单（8 平台）
    ├── pitfalls.md                   # 通用踩坑 + 进化日志
    ├── anti-bot-notes.md             # 反爬/反调试识别与应对
    ├── adapter-boss.md               # 单适配器详细经验（BOSS 直聘）
    ├── adapter-xiaohongshu.md        # 单适配器详细经验（小红书）
    ├── adapter-zhihu.md              # 单适配器详细经验（知乎）
    ├── adapter-public-api.md         # 公开 API 适配器经验（HackerNews/arXiv/wttr/B站）
    ├── research-sop.md               # 调研工作流 SOP（关键词策略/平台策略/数据处理）
    ├── research-scripts.md           # 调研脚本可复用模式 + 参数化设计规范
    ├── new-site-exploration.md       # 新站点探索指南（analyze/Pattern/Strategy）
    ├── data-quality-checklist.md     # 数据质量检查清单（11 种静默失败）
    └── site-memory-guide.md          # 本文件：站点记忆指南
```

### 各文件职责

| 文件 | 记录什么 | 什么时候更新 |
|---|---|---|
| `verified-platforms.md` | 平台登录状态、可用命令清单、高价值子版/节点 | 新平台验证成功 / 登录状态变化 |
| `pitfalls.md` | 通用踩坑（所有适配器共用的问题）、进化日志 | 遇到新的通用问题 |
| `anti-bot-notes.md` | 站点反爬/反调试特征、应对策略 | 发现新的反爬机制 |
| `adapter-<name>.md` | 单适配器详细经验：必加参数、反爬策略、可用命令、踩坑点、输出字段 | 新适配器验证成功 / 发现新坑 |
| `research-sop.md` | 跨平台调研方法论：关键词策略、平台策略、数据处理流程 | 摸索出新的调研方法 |
| `research-scripts.md` | 脚本可复用模式、参数化设计规范 | 写出可复用的脚本模式 |
| `new-site-exploration.md` | 新站点探索流程、Pattern/Strategy 判断 | 探索新站点后补充经验 |
| `data-quality-checklist.md` | 数据质量检查方法、静默失败识别 | 发现新的数据质量问题 |
| `LOCAL.md` | 本机专属：工具版本、目录结构、登录状态、cookie 状态 | 本机环境变化 |

---

## 3. 每次使用新站点后应该记录什么

### 3.1 必须记录（高价值）

| 信息 | 记录到哪里 | 示例 |
|---|---|---|
| 平台登录状态 | `verified-platforms.md` | ✅ 已登录（wjsnbb）/ ⏸️ 搁置（stale page identity） |
| 可用命令清单 | `verified-platforms.md` 或 `adapter-<name>.md` | whoami/search/note/comments/feed |
| 必加参数 | `adapter-<name>.md` | `--site-session persistent`、`note` 需完整签名 URL |
| 反爬策略 | `adapter-<name>.md` 或 `anti-bot-notes.md` | 同一适配器 ≤ 3 次/分钟、foreground 重建会话 |
| 踩坑点 | `adapter-<name>.md` 或 `pitfalls.md` | `note now requires a full signed URL` |
| 输出字段 | `adapter-<name>.md` | rank/title/author/likes/url/published_at |
| 数据质量问题 | `data-quality-checklist.md` 或 `adapter-<name>.md` | 点赞数是 `"1.2万"` 格式需转换 |

### 3.2 选择性记录（中价值）

| 信息 | 记录到哪里 | 示例 |
|---|---|---|
| 高价值子版/节点/分类 | `verified-platforms.md` | r/LocalLLaMA、programmer 节点、开发调优分类 |
| 平台适配的关键词风格 | `research-sop.md` | 小红书用口语化词、V2EX 用技术术语、Reddit 用英文+子版限定 |
| 批量采集经验 | `research-scripts.md` | 关键词矩阵批量搜索、间隔限流、JSON 存储 |
| Strategy 稳定性判断 | `new-site-exploration.md` | 该适配器用 INTERCEPT，维护成本高，需定期重新验证 |

### 3.3 不记录

- 敏感信息：cookie 值、token、密码、个人隐私
- 一次性试错：只在特定任务中遇到的局部怪癖
- 推测性内容：未验证的假设、"应该可以"的猜测
- 与 skill 无关的内容：纯业务逻辑、特定项目的代码细节

---

## 4. 站点记忆模板

### 4.1 新适配器验证模板（`references/adapter-<name>.md`）

```markdown
# <平台名> 适配器经验

> 验证日期：YYYY-MM-DD
> 版本：opencli vX.Y.Z
> 结论：<一句话总结，如"只读操作完全可用，note 需完整签名 URL">

## 认证方式

<COOKIE 策略 / 公开 API / 无需登录>
<登录验证命令：opencli <adapter> whoami>

## 可用命令

### 只读（安全）

| 命令 | 用途 | 示例 |
|---|---|---|
| `whoami` | 当前登录用户 | `opencli <adapter> whoami -f json` |
| `search <query>` | 搜索 | `opencli <adapter> search "关键词" --limit 10 -f json` |
| ... | ... | ... |

### 写操作（需用户明确授权）

`<command1>`、`<command2>` —— 禁止自动执行。

## 关键注意事项

### <踩坑点 1>

**现象**：<具体报错或异常>
**原因**：<根因>
**解决**：<具体步骤或命令>

### <必加参数>

`<参数>`：<为什么必须加，不加会怎样>

## 输出字段（search）

`field1, field2, field3, ...`

- `field1`：<含义>
- `field2`：<含义，注意单位/格式>

## 已知问题

| 问题 | 原因 | 解决 |
|---|---|---|
| <问题> | <原因> | <解决> |

## 反爬风险评估

- 只读操作：<低/中/高>风险
- 批量抓取：<建议，如单次 limit ≤ 20，间隔 > 5 秒>
- 写操作：<低/中/高>风险
```

### 4.2 平台登录状态更新模板（`references/verified-platforms.md`）

在表格中新增一行：
```markdown
| <#> | <平台名> | `<adapter>` | ✅/⏸️/❌ <状态> | 🥇/🥈/🥉 优先级 | <备注> |
```

然后在详细命令部分新增一节（参考已有格式）。

### 4.3 进化日志模板（`references/pitfalls.md` 末尾或 `SKILL.md` 进化日志）

```markdown
### YYYY-MM-DD <事件简述>

- ✅/⚠️/❌ <具体做了什么>
- 关键参数：<必加参数>
- 反爬风险：<低/中/高>
- 📝 创建/更新 reference 文件：<文件名>
```

---

## 5. 利用 OpenCLI 本地站点记忆

OpenCLI 官方有一套本地站点记忆机制，位于 `~/.opencli/sites/<site>/`，可以和我们的 skill 记忆互补：

```
~/.opencli/sites/<site>/
├── notes.md               # 累积笔记（时间戳 + 发现）
├── endpoints.json         # 已验证的 endpoint 目录
├── field-map.json         # 字段代号 → 含义
├── verify/                # verify 期望值
│   └── <cmd>.json
├── fixtures/              # 完整响应样本（脱敏后）
│   └── <cmd>-<ts>.json
└── last-probe.log         # 最近一次侦察输出
```

### 5.1 什么时候用本地记忆

- 写自定义适配器时（官方 adapter-author skill 会自动读写）
- 需要保存完整 API 响应样本时（fixtures/）
- 需要记录字段代号映射时（field-map.json）

### 5.2 什么时候用我们的 skill 记忆

- 使用者视角的经验（必加参数、踩坑点、反爬策略）
- 平台登录状态和可用命令清单
- 跨平台调研方法论和工作流
- 数据质量检查经验

### 5.3 两者的关系

| 维度 | OpenCLI 本地记忆（~/.opencli/sites/） | 我们的 skill 记忆（references/） |
|---|---|---|
| 视角 | 适配器作者 | 使用者 |
| 内容 | endpoint、字段映射、fixture | 必加参数、踩坑、反爬、登录状态 |
| 共享 | 本机 only | 可公开（GitHub） |
| 自动写入 | 官方 skill 自动读写 | 手动记录（EVOLUTION.md 指导） |
| 结构化 | JSON schema 锁死 | Markdown 自由格式 |

---

## 6. 记忆的更新和维护

### 6.1 过期检查

- 平台登录状态：每次使用前验证，过期就更新
- 适配器经验：OpenCLI 大版本升级后重新验证
- 反爬策略：站点改版后重新评估
- 标记 `verified_at: YYYY-MM-DD`，超过 30 天当作过期重验

### 6.2 清理过时内容

- 已被新版本修复的问题：标注"已废弃（YYYY-MM-DD，vX.Y.Z 修复）"或删除
- 重复的经验：合并到一个文件，其他地方引用
- 错误的经验：修正或删除，不要留着误导

### 6.3 定期回顾

- 每月一次：清理过时内容、合并重复经验、验证仍有效的方法
- OpenCLI 大版本升级后：全面重新验证所有适配器
- 新平台大量使用后：整理经验，从临时记录升级为正式 reference

---

## 7. 快速检查清单（任务结束后 2 分钟）

每次用 OpenCLI 完成任务后，按此清单过一遍：

- [ ] 这次用了新平台/新适配器吗？→ 更新 verified-platforms.md + 新建 adapter-<name>.md
- [ ] 遇到了新的踩坑吗？→ 记录到 adapter-<name>.md 或 pitfalls.md
- [ ] 发现了必加参数吗？→ 记录到 adapter-<name>.md
- [ ] 遇到了反爬/限流吗？→ 记录到 anti-bot-notes.md
- [ ] 发现了数据质量问题吗？→ 记录到 data-quality-checklist.md 或 adapter-<name>.md
- [ ] 摸索出了新的调研方法吗？→ 记录到 research-sop.md
- [ ] 写出了可复用的脚本模式吗？→ 记录到 research-scripts.md
- [ ] 本机环境有变化吗？→ 更新 LOCAL.md（不公开）
- [ ] SKILL.md 速查表需要更新吗？→ 新适配器验证成功后更新

---

*本文件基于官方 opencli-adapter-author skill 的 site-memory.md（两层站点记忆结构），适配使用者视角。最后更新：2026-09-03*
