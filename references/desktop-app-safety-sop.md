# 桌面 AI 应用受控操作 SOP（真实场景避慌协议）

> 核心：桌面 AI 应用（AntiGravity / ZCode / Codex 等 Electron 应用）**往往正在运行用户的生产工作**——
> 自动化任务、子智能体、长跑会话。直接杀进程重启 = 打断用户工作 = 不可接受。
> 任何需要重启/操作进程的动作，必须走本 SOP：**勘察 → 记录 → 受控操作 → 恢复 → 验证 → 汇报**。
>
> 适用场景：为适配器开启 CDP 调试端口、应用卡死需要重启、切换应用启动参数等一切需要触碰进程的操作。
> 配套文档：[adapter-antigravity.md](adapter-antigravity.md)、[adapter-zcode.md](adapter-zcode.md)

---

## 〇、最高理念：断掉之后要续跑（一切操作的出发点和验收标准）

> **「断掉之后要续跑」是本 SOP 的最高理念，不是可选项。** 用户原话（2026-09-22 实战纠正）：
> 「这种断掉之后要续跑要作为基本理念哦」「你启动之后必须要仔细看它的工作内容，然后把正在进行的工作恢复」。
> 任何对运行中桌面 AI 应用的操作，本质上都是在「打断 → 续跑」之间做切换；**续跑是义务，不是加分项。**

**操作前必须能回答三个问题（答不出就不许动手）：**

1. **断了之后谁来续？**——自动化会不会自动重派？任务书有没有断点重跑机制？还是必须人工恢复？
2. **续跑需要哪些证据？**——子智能体任务书（metadata prompt）、已写入的产物、进度位置。**勘察记录 = 续跑的输入**，不是事后追溯。
3. **怎么证明真的续上了？**——重启后核对：自动化 active + next_run 正常推进？被中断子智能体被重派？主会话 rollout 继续写？产物最终落在用户可见的文件上？

**续跑的三种机制（按优先级）：**

| 机制 | 适用 | 判断标准 | 操作要点 |
|---|---|---|---|
| **自动化自恢复**（首选） | ZCode 每小时轮询 | 自动化 active + next_run 推进 = 中断子智能体会被自动重派 | 重启后只确认自动化活着，不手工逐个子智能体恢复 |
| **任务书重跑机制**（次选） | 子智能体级 | 任务书内置「前次静默退出零产物——你是重跑」= 自带断点续跑 | 勘察时读出任务书全文（metadata prompt），确认含重跑语义 |
| **人工/脚本手动恢复**（兜底） | 无自动化覆盖的任务 | 无自恢复机制时必须人工续 | 用勘察记录的任务书重新派发，或向主会话发送续跑指令 |

**反面教材（必须避免）**：2026-09-22 曾盲目杀 ZCode 进程 → 4 个 running 子智能体被中断
（agent_191937 的 rollout 日志停在杀进程时刻）→ 用户怒斥「我正在工作呢」「至少有两个在跑，然后被你关掉了」。
**教训：没有续跑方案的操作 = 破坏性操作。**

---

## 一、为什么必须这样做（动机与结果）

**动机**：桌面 AI 应用不是普通软件，它承载用户的长跑任务。以 ZCode 为例——每小时自动化巡检会持续派发 4-6 个子智能体并行挖岗位情报；AntiGravity 的会话可能正在跑 2 个深度调研子智能体。**杀掉应用 = 中断这些生产任务**，子智能体日志停在杀进程时刻，任务书里的「重跑」机制要等下一轮自动化才能接管。

**结果**：不按 SOP 操作 = 用户窗口反复闪退 + 生产任务被中断 + 信任崩塌（用户原话：「你一直为什么一直要退出我的 ZCode？我正在工作呢」）。

---

## 二、完整流程（六步闭环）

### Step 1：勘察（只读，绝不先动手）

在触碰任何进程前，先回答三个问题：

**① 有哪些自动化/定时任务在跑？**
- ZCode：读 `%USERPROFILE%\.zcode\v2\tasks-index.sqlite` 的 `automations` 表（enabled/running/next_run_at）与 `automation_runs` 表（最近运行记录）
- 关键字段：`automation_id`、`enabled`、`running`、`run_count`、`last_run_at`、`next_run_at`、`lifecycle_status`、`last_error`

**② 有几个子智能体在跑？各自什么任务？**（2026-09-23 修正：3.14.3 双形态）
- ZCode 旧式：扫描 `%USERPROFILE%\.zcode\cli\agents\<父会话id>\agent_*\metadata.json`
- ZCode 3.14.3+ DWF：`cli\db\db.sqlite` → `dwf_run`（parent_session_id=父会话）+ `dwf_actor`（actor 名/session_id）——**当前活跃多智能体基本全走此形态**
- 每个子智能体的 `prompt` 字段 = 完整任务书（任务目标+名单+方法+写入边界），`status` = 当前状态
- **子智能体活跃度判断**：目录 mtime（metadata.json 最后写入时间）+ 对应 rollout 日志 mtime
  - 旧式：`cli\rollout\model-io-sess_subagent_agent_*.jsonl` mtime 近 30 分钟 = 活跃
  - DWF：`cli\rollout\model-io-sess_dwf-dwfrun-<runId>-actor_<n>_<m>.jsonl` mtime 近 30 分钟 = 活跃
  - mtime 停在杀进程时刻 = 被中断；**完成/失败后 ZCode 会清理 rollout 文件**（文件消失=该 actor 已结束）

**③ 主会话当前在推进什么？**
- 主会话活跃看 `cli\log\zcode-<日期>.jsonl`（**主会话不写 rollout！** 每日滚动日志 mtime 近几分钟 = 主线程活着）
- 自动化下一轮触发时间 = 自恢复窗口（ZCode 每小时自动重派发）

**勘察代码**：参考 `opencli-poweruser` 实战沉淀的勘察脚本模式（只读 sqlite + 扫 agents 目录 + rollout mtime），不要用全盘搜索。

### Step 2：记录（操作前留底）

把勘察结果写成清单，至少包含：
- 自动化：id / 最近一轮结果 / 下一轮时间
- 子智能体：agent_id / 任务名 / 创建时间 / 状态 / 已写入的产物
- 主会话：最后活跃时间 / 当前推进内容

**这份清单 = 恢复的对照基线。**

### Step 3：受控操作（最小侵入）

杀进程不是目的，重启带调试端口才是。两步：

```powershell
# ① 优雅关闭（CloseMainWindow 触发正常退出，保存状态）
$main = Get-CimInstance Win32_Process -Filter "Name='ZCode.exe'" |
  Where-Object { $_.CommandLine -notmatch '--type=' } | Select-Object -First 1
(Get-Process -Id $main.ProcessId).CloseMainWindow()

# ② 等待全部退出（最多 30s），必要时才强制
$deadline = (Get-Date).AddSeconds(30)
while ((Get-Process ZCode -ErrorAction SilentlyContinue) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 500 }
Stop-Process -Name ZCode -Force -ErrorAction SilentlyContinue   # 仅残留时
```

⚠️ **Electron 单实例陷阱**：`Start-Process` 直接传参经常被吞（Electron 单实例锁会把参数交给已存在实例后退出）。可靠方式：
```powershell
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "E:\zcode\ZCode.exe"
$psi.Arguments = "--remote-debugging-port=9240 --remote-allow-origins=*"
$psi.UseShellExecute = $false
[System.Diagnostics.Process]::Start($psi) | Out-Null
```

### Step 4：恢复（重启后立即核对，对照 Step 2 基线）

**恢复 = 验证续跑真的发生**，不是"看着正常"：
1. 自动化是否还 active、`next_run_at` 是否正常推进（读 automations 表）
2. 主会话是否继续写入（`cli\log\zcode-<date>.jsonl` 或 rollout mtime 更新）→ 主线程活着 = 续跑管道通
3. 被中断的子智能体：automation 下一轮是否会重派发（ZCode 任务书内置「前次同任务静默退出零产物——你是重跑」）
4. 不必手工逐个子智能体恢复——**自动化轮询是自恢复机制**，只确认它活着
5. **核对基线清单**：勘察时记录的每个子智能体任务，重启后逐条确认「已重派 / 待下轮 / 需人工续」，不遗漏

### Step 5：验证（用户真正看到的层）

- CDP 端口可连：`Invoke-WebRequest http://127.0.0.1:<port>/json`
- 页面加载完成：等 15s 让应用从 loading splash 过渡到主界面
- 实测一条真实命令（如 `status`），确认能收发

### Step 6：汇报（诚实说明影响面 + 续跑状态）

向用户说明：动了什么进程、中断了什么（如有）、**续跑状态**（哪些已自动恢复、哪些待下轮自动化、哪些需人工）、下一轮自动化何时接管。**不要隐瞒中断**，用户比我们更清楚自己的工作。

---

## 三、关键教训（血泪）

| 教训 | 说明 |
|---|---|
| **断掉之后要续跑（最高理念）** | 一切操作以「断了怎么续」为前提；没有续跑方案 = 破坏性操作，不许动手 |
| **先勘察后动手** | 任何杀进程前，必须读 automations 表 + agents 目录 + rollout/log，否则就是盲杀 |
| **别用 Start-Process 传参** | Electron 单实例锁会吞参数，用 ProcessStartInfo 或先杀干净再启动 |
| **杀进程必留基线** | 子智能体清单、自动化 next_run、主会话活跃度，全部记录后才能重启；**这份记录就是续跑的依据** |
| **自动化是自恢复的** | ZCode 每小时轮询会自动重派发被中断的子智能体（任务书内置重跑机制），确认自动化活着即可 |
| **用户在工作时别碰进程** | 若用户明确在用（"我正在工作呢"），优先写只读命令+文档，CDP 实测等用户方便时受控重启 |
| **磁盘直读永远安全** | list/subagents/tasks/read 这类只读 `.zcode` 数据的命令不碰进程，可随时开发+测试 |
| **端口 LISTENING ≠ CDP 可用** | 9240 监听但 curl /json/version 超时 = 主进程 UI 线程卡死（DevTools 跑在主进程事件循环上），app-server 独立进程正常会误导判断 |
| **卡死先查系统层** | ZCode 假死 + 截图空白 + 弹「DWM 故障」= Windows 桌面会话问题（需系统重启），不是应用问题；先点掉弹窗确认桌面恢复 |
| **更新待装会阻塞启动** | 3.14.3 更新包下载完后，启动停在「确认安装更新」模态 → 自动化引擎/CDP 全不起来；静默装完更新再重启 |
| **版本升级后必须重实测** | 3.14.1→3.14.3 多智能体改 DWF 架构，rollout 文件名/登记位置全变了；写死的路径会静默失效，升级后先 ls 实测再信文档 |

---

## 四、分应用要点

### ZCode（端口 9240）
- 数据根：`%USERPROFILE%\.zcode\`
- 自动化表：`v2\tasks-index.sqlite` → `automations` / `automation_runs`
- 子智能体（旧式）：`cli\agents\<父会话>\agent_*\metadata.json`
- 子智能体（3.14.3+ DWF）：`cli\db\db.sqlite` → `dwf_run` / `dwf_actor`
- 活跃日志：`cli\rollout\model-io-*.jsonl`（子智能体/DWF actor）+ `cli\log\zcode-<date>.jsonl`（主会话）
- 会话索引：`v2\tasks-index.sqlite` → `tasks` 表（workspace/title/status/model）
- 可执行：`E:\zcode\ZCode.exe`；CLI：`E:\zcode\resources\glm\zcode.cjs`

### AntiGravity（端口 9234）
- brain 根：`~\.gemini\antigravity\brain\<会话id>\`
- transcript：`<会话id>\.system_generated\logs\transcript.jsonl`
- 子智能体：`<会话id>\.system_generated\subagents\*.json`

---

*本文件最后更新：2026-09-23（3.14.3 DWF 双形态活跃判定修正 + 9240 假死特征/DWM 故障/更新阻塞教训沉淀）*
