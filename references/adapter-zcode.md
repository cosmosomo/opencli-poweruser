# ZCode 适配器经验（桌面应用 CDP 桥接 + 磁盘直读）

> 验证日期：2026-09-23（3.14.3 DWF 架构实测修正） · opencli v1.8.7 · 桌面版 **3.14.3**（此前文档基线 3.14.1）
> 结论：**ZCode 是 Electron 桌面应用，控制路径与 AntiGravity 完全同构：CDP 调试端口 + 本地磁盘数据直读。**
> 已沉淀为 opencli 自建适配器 `zcode`（8 命令），注册端口 **9240**。
> 配套文档：[desktop-app-safety-sop.md](desktop-app-safety-sop.md)（**操作前必读**：受控重启协议）
> 踩坑记录：[pitfalls.md](pitfalls.md) 2026-09-22/2026-09-23 条目
> ⚠️ **3.14.3 关键变更**：多智能体派发走 DWF（workflow_child）新架构，活跃判定数据源已变（见 §三 ⚠️ 章节）

---

## 一、连接前置条件（最关键）

ZCode 适配器通过 **CDP（Chrome DevTools Protocol）端口 9240** 与应用通信。

**必须以调试参数启动 ZCode**（注意：**不是 9235**——9235 在 opencli 内置注册表里属于 trae-solo；zcode 独立注册 9240）：
```powershell
# ~/.opencli/apps.yaml 已注册：
# apps:
#   zcode:
#     port: 9240
#     processName: ZCode
#     executableNames: ['ZCode']
#     displayName: ZCode
```

**手动重启命令**（遵循 desktop-app-safety-sop.md 的受控流程！）：
```powershell
# 优雅关闭 → 等退出 → ProcessStartInfo 带参启动（Start-Process 会被 Electron 单实例锁吞参数）
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "E:\zcode\ZCode.exe"
$psi.Arguments = "--remote-debugging-port=9240 --remote-allow-origins=*"
$psi.UseShellExecute = $false
[System.Diagnostics.Process]::Start($psi) | Out-Null
```

**验证连接**：
```powershell
opencli zcode status -f json
# 期望: Status=Connected, Url=..., Title=ZCode
```

> 端口分配（opencli builtin + 自建）：9225 doubao-app / 9226 cursor / 9228 chatwise / 9232 discord / 9234 antigravity / 9235 trae-solo / 9236 chatgpt-app / 9237 qoder / 9238 codex / **9240 zcode（自建）**

---

## 二、命令矩阵（8 条，磁盘直读 4 条已实测 / CDP 交互 4 条待窗口实测）

### ✅ 磁盘直读类（不碰进程，随时可用）

| 命令 | 用途 | 数据源 | 示例 |
|---|---|---|---|
| `list` | 列 ZCode 会话 | `~/.zcode/v2/tasks-index.sqlite` → `tasks` 表 | `opencli zcode list --status running` |
| `tasks` | 列自动化任务+最近运行 | `automations` + `automation_runs` 表 | `opencli zcode tasks` |
| `subagents` | 列父会话子智能体（**旧式 subagent_child + DWF workflow_child 双形态，含真实活跃判定**） | `~/.zcode/cli/agents/<父会话>/*/metadata.json` + `cli/rollout/` + `cli/db/db.sqlite`（dwf_run/dwf_actor） | `opencli zcode subagents <sess> --alive` |
| `read-transcript` | 读会话最近内容（**主会话回退 log**） | `~/.zcode/cli/rollout/model-io-<sess>.jsonl` → 回退 `~/.zcode/cli/log/zcode-<date>.jsonl` | `opencli zcode read-transcript <sess> --last 5` |

### ⏳ CDP 交互类（需 9240 端口，代码已就绪待实测）

| 命令 | 用途 | 机制 |
|---|---|---|
| `status` | CDP 连接状态 | 复用 makeStatusCommand 模式 |
| `send` | 发消息到当前会话 | contenteditable + `document.execCommand('insertText')` + Enter（与 codex/antigravity 同构） |
| `new` | 新会话 | Ctrl+N |
| `open` | 打开指定会话 | 点击侧边栏 task-item-<id> |

---

## 三、关键数据层地图（磁盘直读的宝藏）

| 数据 | 路径 | 用途 |
|---|---|---|
| 会话索引 | `%USERPROFILE%\.zcode\v2\tasks-index.sqlite` → `tasks` | task_id/标题/状态/模型/workspace |
| 自动化 | 同库 → `automations` | enabled/running/run_count/next_run_at/last_error |
| 运行历史 | 同库 → `automation_runs`（409 行） | 每次触发的结果/outcome |
| 子智能体 | `%USERPROFILE%\.zcode\cli\agents\<父会话>\agent_*\metadata.json` | 旧式 subagent_child：任务书(prompt)/状态/创建时间/parent |
| DWF 运行 | `%USERPROFILE%\.zcode\cli\db\db.sqlite` → `dwf_run`（parent_session_id）+ `dwf_actor`（run 的 actors） | **3.14.3+ 新式多智能体**：run 状态/actor 名/actor 的 session_id |
| 模型日志 | `%USERPROFILE%\.zcode\cli\rollout\model-io-*.jsonl` + `cli\log\zcode-<date>.jsonl` | **真实活跃度金标准**（按会话类型分流，见下方 ⚠️） |
| 凭证 | `~/.zcode/v2/credentials.json`（enc:v1 加密态） | **外部不可复用**（已验证 401） |

**⚠️⚠️ 活跃判定（2026-09-22 血泪修正 + 2026-09-23 3.14.3 实测修正，务必遵守）**：

`metadata.json` / `automations.running` 的 **`status` 字段不可信**——异常中断的 agent 会**永远停在 `running`**（实测 8 个僵尸：updatedAt 停在创建时刻、无 rollout 文件）。正常完成才会更新为 `completed`/`failed`。

**唯一可信的活跃判定 = 日志文件 mtime，但数据源按会话类型分流（2026-09-23 实测核证）：**

| 会话类型 | 活跃判定文件 | 说明 |
|---|---|---|
| **主会话**（interactive，如「每小时巡检+推进」） | `cli\log\zcode-<date>.jsonl`（**不写 rollout！**） | 每日滚动日志，每行 JSON 带 `sessionId`，覆盖主会话/旧式子智能体/DWF actor 全部类型；mtime 近几分钟 = 有活动 |
| **旧式子智能体**（subagent_child） | `cli\rollout\model-io-sess_subagent_agent_<id>.jsonl` | 3.14.1 实测"几秒一写"；**完成后 ZCode 会清理该文件** → 文件消失本身也是完成信号 |
| **DWF actor**（workflow_child，3.14.3+） | `cli\rollout\model-io-sess_dwf-dwfrun-<runId>-actor_<n>_<m>.jsonl` | 登记在 db.sqlite `dwf_actor`（session_id 列），run 状态在 `dwf_run`；当前活跃多智能体基本全走此格式 |

通用规则：**rollout 文件名 = `model-io-<childSessionId>.jsonl`**（两种形态同规则）。
命令：`opencli zcode subagents <sess> --alive`（默认 30 分钟窗口）→ 已升级为双形态 + **终态排除**（completed/failed/cancelled 即使最近有写入也不计并发——收尾写入不算数）。

**教训**：监控并发/活跃度时**永远不要用 `--active running`**（status 过滤）——它会数出 10 个"running"但真实并发只有 2-3 个。必须用 `--alive`。**版本升级后必须重新实测文件格式**——3.14.1→3.14.3 的 rollout 格式/位置就变了，写死的路径会静默失效（本次教训）。

**sqlite 读取**：适配器用 `node:sqlite` 的 `DatabaseSync(DB, { readOnly: true })`（Windows 无 /usr/bin/sqlite3）。

---

## 三·补、9240 修复链路（2026-09-23 实战沉淀，升级/卡死必读）

**假死特征（与"正常未开端口"区分）**：`netstat` 显示 9240 **LISTENING**，但 `curl http://127.0.0.1:9240/json/version` 全部超时零字节；主进程 `Responding=False`、CPU 仅秒级（事件循环被阻塞）；截图看不到窗口但 `GetWindowRect` 矩形正常。**根因**：DevTools HTTP server 跑在主进程事件循环上，UI 线程卡死则 CDP 一起卡；app-server 是独立子进程所以后端可能正常（会误导人以为应用活着）。

**已确证的两个卡死根因与修复**：

1. **3.14.3 待装更新阻塞**：更新包下载完成后（~178MB），启动停在「等待确认安装更新」的模态流程 → host/app-server 未启动 → 自动化引擎没起来 → CDP 无响应。
   修复：安全窗口复核（无子智能体/自动化空闲）→ 结束卡死实例 → 清理残留（上次强制结束后实测 13 个残留进程）→ **静默安装更新**（安装器执行完）→ 带参重启。

2. **Windows DWM 故障（系统级，非 ZCode 问题）**：系统弹窗「你的会话已注销——会话已被关闭，因为 DWM 出现故障」→ 所有 GUI 渲染中断，ZCode 表现为窗口假死/截图空白。
   修复：先点掉弹窗确认桌面恢复；若反复出现 = DWM 残留，**需系统重启**（桌面会话重建），应用内折腾无效。与当日早些时候的卡死同源时要意识到这是系统问题不是应用问题。

**诊断清单**（按序）：`Get-Process ZCode` 看 Responding/CPU → `netstat -ano | Select-String 9240` 看 LISTENING → `curl /json/version` 是否超时 → 截图 vs `GetWindowRect` 对比 → `Get-CimInstance Win32_Process` 查 app-server 是否存活。

---

## 三·补、提醒文件消费闭环（2026-09-23 验证，勿再写单向文件）

**事实**：`%USERPROFILE%\notes\__ZCode并发提醒.md` 一直在被写入，但每小时自动化**并没有读取它**——automations 表里该任务的 `prompt`（任务书）全文 6214 字**不含**任何"读提醒文件"指令。**通道单向无效，写了也白写。**

**规则（沉淀）**：
1. 任何"写给 ZCode 看"的外部文件（提醒/指令/兜底），**必须先查 `automations.prompt` 是否含读取指令**；不含 = 默认无效，别当它有效。
2. 与 ZCode 侧同步请走任务书内置通道：**覆盖地图认领行 / 状态指针**（任务书明确要求读这两个）。
3. 某平台侧的 5 个并发监控定时任务（探测 9240 + 写提醒文件）已于 2026-09-23 停用（`enable=false`，可恢复）。
4. **触发延迟现实**：自动化三相位叠加，实际触发常晚 5-30 分钟（07:00 相位 07:34 才跑）——监控窗口别卡死整点，也别把"到点没跑"当异常。

---

## 四、已验证做不通的路（勿重复投入）

| 尝试 | 结果 |
|---|---|
| ZCode CLI headless（`zcode --prompt`） | Model creation failed |
| `app-server --stdio` 私有 NDJSON | v0.16.5 与 v0.16.9 均 session/create 后不响应 prompt（外部调用需桌面握手），桌面版自身在用此协议 |
| 复制 v2 凭证到 cli/ | 无效 |
| 智谱公开 API | 429 error 1113 余额不足 |
| Coding Plan key 复用 | 401（enc:v1 加密态） |
| `opencli zcode` 用 9235 端口 | 冲突：9235 属 trae-solo，改用 9240 |

---

## 五、真实场景操作要点（最重要）

> ZCode 常驻运行用户的**生产自动化**（每小时多智能体巡检）——操作进程前**必须**读 [desktop-app-safety-sop.md](desktop-app-safety-sop.md)。
> **最高理念：断掉之后要续跑**——操作前想好续跑路径，操作后验证续跑真的发生。

**2026-09-22/23 实战记录**（每小时巡检自动化 + 多子智能体场景）：
1. **勘察**：automations 表（active、next_run）+ agents 目录（旧式子智能体）+ **db.sqlite dwf_run/dwf_actor（3.14.3 DWF 子智能体）** + 日志 mtime（主会话用 `cli\log\zcode-<date>.jsonl` 判活跃 → **用户正在用，不可碰**）
2. **记录**：子智能体 id + 任务名 + 创建时间（**= 续跑输入**，重启后逐条核对）
3. **受控操作**：优雅关闭 → ProcessStartInfo 带 9240 → 轮询 CDP（卡死先看 §三·补 9240 修复链路）
4. **恢复核对**（验证续跑）：自动化 active？next_run 正常？主会话 log/rollout 继续写？被中断子智能体重派？（任务书内置「前次静默退出零产物——你是重跑」）
5. **汇报**：诚实说明中断了什么、哪些已自恢复、哪些待下轮、哪些需人工续

**核心洞察**：ZCode 自动化是**自恢复系统**——每小时轮询会重派被中断的子智能体（查重三步跳过已完成）。所以操作后只需确认自动化活着，不必手工恢复子智能体。

---

## 六、新使用者快速上手

```powershell
# 1. 列会话（磁盘直读，无需端口）
opencli zcode list -f json

# 2. 看自动化在跑什么
opencli zcode tasks -f json

# 3. 看某会话派了哪些子智能体、是否真的在跑（**用 --alive，勿用 --active running**）
opencli zcode subagents sess_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx --alive -f json
# 或看全量（含僵尸标记 alive=N）
opencli zcode subagents sess_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx -f json

# 4. 读会话最近进展（含子智能体日志）
opencli zcode read-transcript sess_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx --last 5

# 5. CDP 交互（需 9240 端口）：status / send / new / open
opencli zcode status -f json
```

---

## 七、与 AntiGravity 适配器的异同

| 维度 | AntiGravity (9234) | ZCode (9240) |
|---|---|---|
| 控制协议 | CDP（opencli 官方内置适配器） | CDP（自建适配器） |
| 读回复 | transcript.jsonl | rollout model-io-*.jsonl |
| 子智能体 | brain/<父>/.system_generated/subagents/*.json | cli/agents/<父会话>/*/metadata.json |
| 自动化 | 无（会话制） | **有自动化引擎**（tasks-index.sqlite，每小时轮询） |
| 会话管理 | ag_goto.ps1 / ag_list.ps1 | opencli zcode list / open |
| 发送 | Lexical 编辑器（send 假成功 bug） | contenteditable（待实测确认） |
| 额度查询 | ag_quota.ps1（5小时+周配额） | ZCode 为 Coding Plan 账号（额度走智谱侧） |

---

*本文件最后更新：2026-09-23（3.14.3 DWF 架构实测：活跃判定数据源分流修正 + 9240 修复链路沉淀 + 提醒文件消费闭环验证）*
