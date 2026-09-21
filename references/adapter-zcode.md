# ZCode 适配器经验（桌面应用 CDP 桥接 + 磁盘直读）

> 验证日期：2026-09-22 · opencli v1.8.7 · zcode CLI v0.16.9 · 桌面版 3.14.1
> 结论：**ZCode 是 Electron 桌面应用，控制路径与 AntiGravity 完全同构：CDP 调试端口 + 本地磁盘数据直读。**
> 已沉淀为 opencli 自建适配器 `zcode`（8 命令），注册端口 **9240**。
> 配套文档：[desktop-app-safety-sop.md](desktop-app-safety-sop.md)（**操作前必读**：受控重启协议）
> 踩坑记录：[pitfalls.md](pitfalls.md) 2026-09-22 条目

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
| `subagents` | 列父会话子智能体 | `~/.zcode/cli/agents/<父会话>/*/metadata.json` | `opencli zcode subagents <sess> --active running` |
| `read-transcript` | 读会话 rollout 最近内容 | `~/.zcode/cli/rollout/model-io-<sess>.jsonl` | `opencli zcode read-transcript <sess> --last 5` |

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
| 子智能体 | `%USERPROFILE%\.zcode\cli\agents\<父会话>\agent_*\metadata.json` | 任务书(prompt)/状态/创建时间/parent |
| 模型日志 | `%USERPROFILE%\.zcode\cli\rollout\model-io-*.jsonl` | 活跃度判断（mtime）/ 请求明细 |
| 凭证 | `~/.zcode/v2/credentials.json`（enc:v1 加密态） | **外部不可复用**（已验证 401） |

**sqlite 读取**：适配器用 `node:sqlite` 的 `DatabaseSync(DB, { readOnly: true })`（Windows 无 /usr/bin/sqlite3）。

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

**2026-09-22 实战记录**（每小时巡检自动化 + 4 子智能体场景）：
1. **勘察**：automations 表（active、next_run 03:16）+ agents 目录（4 个 running：高才面外交叉/协会L1升档/CIOE余量/博后工作站名录）+ rollout mtime（主会话 8 秒前活跃 → **用户正在用，不可碰**）
2. **记录**：子智能体 id + 任务名 + 创建时间（**= 续跑输入**，重启后逐条核对）
3. **受控操作**：优雅关闭 → ProcessStartInfo 带 9240 → 轮询 CDP
4. **恢复核对**（验证续跑）：自动化 active？next_run 正常？主会话 rollout 继续写？被中断子智能体重派？（任务书内置「前次静默退出零产物——你是重跑」）
5. **汇报**：诚实说明中断了什么、哪些已自恢复、哪些待下轮、哪些需人工续

**核心洞察**：ZCode 自动化是**自恢复系统**——每小时轮询会重派被中断的子智能体（查重三步跳过已完成）。所以操作后只需确认自动化活着，不必手工恢复子智能体。

---

## 六、新使用者快速上手

```powershell
# 1. 列会话（磁盘直读，无需端口）
opencli zcode list -f json

# 2. 看自动化在跑什么
opencli zcode tasks -f json

# 3. 看某会话派了哪些子智能体、是否在跑
opencli zcode subagents sess_92f8c7e2-d860-4409-b6d2-a4df71cdddee --active running -f json

# 4. 读会话最近进展（含子智能体日志）
opencli zcode read-transcript sess_92f8c7e2-d860-4409-b6d2-a4df71cdddee --last 5

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

*本文件最后更新：2026-09-22（zcode 适配器首版沉淀）*
