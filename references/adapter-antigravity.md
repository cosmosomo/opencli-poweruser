# AntiGravity 适配器经验（桌面应用 CDP 桥接）

> 验证日期：2026-09-17 · opencli v1.8.7 · profile v6pz9gjx
> 结论：**31 条命令实测：12 条完全可用（39%）、6 条部分/有条件可用（19%）、13 条失效（42%），平均评分 2.8/5。核心对话三件套（status/send/copy-message）可用但 send 有假成功 bug；会话管理（history/new/read）因 DOM 选择器过期失效但真实 testid 仍在；5 条命令因 Windows 路径 bug 失效。最大发现：AntiGravity 有完整的子智能体架构（独立 conversationId + 文件消息总线），适配器完全未暴露。**
> 深度测试报告：本地知识库 `opencli/antigravity-usability-test/`（含基础测试 + 深度交互测试 + 存储取证；报告本体不公开）
> 配套脚本：`scripts/ag_goto.ps1`（跳转会话）、`scripts/ag_list.ps1`（列会话）、`scripts/ag_read_transcript.ps1`（读对话）、`scripts/ag_list_subagents.ps1`（列子智能体）、`scripts/ag_send_to_subagent.ps1`（向子智能体投递消息）
> 踩坑记录：[pitfalls.md](pitfalls.md) 2026-09-17 条目

---

## 一、连接前置条件（最关键）

AntiGravity 适配器通过 **CDP（Chrome DevTools Protocol）端口 9234** 与应用通信，**不是**通过浏览器扩展桥接。

**必须以调试参数启动 AntiGravity**：
```powershell
Start-Process "$env:LOCALAPPDATA\Programs\antigravity\Antigravity.exe" `
  -ArgumentList '--remote-debugging-port=9234','--remote-allow-origins=*'
```

**未带参数启动时的报错**：
```
Antigravity is not reachable on CDP port 9234.
Auto-launch is not yet supported on win32.
```

### 1.1 连接流程（从运行中实例到 CDP 可用）

如果 AntiGravity 已经在运行但没开调试端口（常见于自动更新后以 `--updated` 重启）：

```powershell
# 1. 优雅关闭（CloseMainWindow 触发正常退出，保存状态）
$main = Get-CimInstance Win32_Process -Filter "Name='Antigravity.exe'" |
  Where-Object { $_.CommandLine -notmatch '--type=' } | Select-Object -First 1
(Get-Process -Id $main.ProcessId).CloseMainWindow()

# 2. 等待全部进程退出（最多 25s），必要时强制结束
while (Get-Process Antigravity -ErrorAction SilentlyContinue) { Start-Sleep 1 }

# 3. 带调试参数重启
Start-Process "Antigravity.exe" -ArgumentList '--remote-debugging-port=9234','--remote-allow-origins=*'

# 4. 轮询等待端口开放（通常 10-30s）
while (-not (Test-NetConnection 127.0.0.1 -Port 9234 -WarningAction SilentlyContinue).TcpTestSucceeded) { Start-Sleep 2 }

# 5. 再等 15s 让应用从 loading splash 过渡到主界面
Start-Sleep -Seconds 15
```

### 1.2 验证连接

```powershell
opencli --profile v6pz9gjx antigravity status -f json
# 期望: status=Connected, url=https://127.0.0.1:<app_port>/, title=Antigravity
```

> `app_port`（如 53973、57865）是 AntiGravity 内部 HTTP 服务端口，**每次启动变化**。CDP 端口 9234 恒定。

---

## 二、可用命令矩阵（2026-09-17 全量实测 31 条）

> 评分：5=一次就通且输出清晰；3=可用但有条件/局限；1=完全不可用

### ✅ 完全可用（12 条）

| 命令 | 类型 | 用途 | 示例 | 评分 |
|---|---|---|---|---|
| `status` | read | CDP 连接状态 + 当前页面 URL/标题 | `opencli antigravity status -f json` | 5 |
| `send <msg>` | write | 向当前会话发送消息；**在首页发送则自动新建会话** | `opencli antigravity send "分析这份简历" -f json` | 3⚠️见下 |
| `copy-message` | write* | 抓取最后一条助手消息全文 | `opencli antigravity copy-message -f json` | 3⚠️见下 |
| `copy-code` | write* | 提取最后一条消息中的代码块，支持 `--index N` | `opencli antigravity copy-code --index 0 -f json` | 4 |
| `nav back` | write | 应用内后退（回首页） | `opencli antigravity nav back -f json` | 5 |
| `nav forward` | write | 应用内前进（回会话） | `opencli antigravity nav forward -f json` | 5 |
| `sidebar-toggle` | write | 展开/收起侧边栏 | `opencli antigravity sidebar-toggle -f json` | 4 |
| `model`（无参数） | read | 读取当前模型 | `opencli antigravity model -f json` → `Gemini 3.8 Flash High` | 5 |
| `model <name>` | write | 切换模型，按子串模糊匹配 | `opencli antigravity model "Flash" -f json` | 4 |
| `settings` | write | 点击设置按钮（打开设置面板） | `opencli antigravity settings -f json` | 4 |
| `display-options` | write | 打开 Display Options 菜单（列出 11 个选项） | `opencli antigravity display-options -f json` | 4 |
| `toggle-aux` | write | 切换 Auxiliary Pane（辅助面板） | `opencli antigravity toggle-aux -f json` | 4 |
| `react good`/`react bad` | write | 对最后一条助手消息点 Good/Bad | `opencli antigravity react good -f json` | 4 |
| `watch` | read | 实时流式捕获新消息（长连接） | `opencli antigravity watch`（需 Ctrl+C 或超时退出） | 4 |
| `dump` | read | 导出当前页面 DOM + snapshot | `opencli antigravity dump -f json` | 4 |

> `send` 和 `copy-message` 标记为 ✅ 但有已知问题，见第六节。`dump` 在 Windows 上文件落在**当前工作盘根目录的 `\tmp\` 下**（如 `E:\tmp\antigravity-dom.html`），不是 `%TEMP%`。

### ⚠️ 部分/有条件可用（6 条）

| 命令 | 状态 | 说明 |
|---|---|---|
| `add-context` | 可用 | 点击 Add context 按钮（打开文件/URL 选择器），后续需 GUI 操作 |
| `storage-get <key>` | 可用 | CDP 命令不受路径 bug 影响；localStorage 为空所以 key 不存在 |
| `delete <id>` | 有条件 | 不带 `--yes` 时 dry-run 正常；**实际删除需 `convo-pill-<id>` 在侧边栏可见**，否则报 `Conversation pill not found` |
| `revert` | 有条件 | 不带 `--yes` 时 dry-run 正常；未实际执行（保护工作区） |
| `watch` | 可用但有坑 | 流式监听正常；**重定向到文件时只捕获 banner，正文流式未落到 stdout**（TTY/缓冲问题），需 `cmd /c opencli.cmd antigravity watch` 包装 |
| `model --list=true` | 意外功能 | 裸 `--list` 报 unknown option，但 `--list=true` 实际转储整个侧边栏无障碍树（含子智能体状态！），不是纯模型列表 |

### ❌ 已确认失效（14 条，含替代方案）

| 命令 | 错误 | 根因 | 替代方案 |
|---|---|---|---|
| `new` | `Could not find New Conversation button` | DOM 选择器与当前 UI 不匹配；**但 `data-testid="new-conversation-button"` 真实存在**，改选择器即可修复 | **首页 `send` 自动新建会话**（见第四节） |
| `read` | `Could not find conversation container` | DOM 选择器过期；真实容器是 `[data-testid="conversation-view"]` + `data-cascade-id` | **`copy-message`** 或 **`ag_read_transcript.ps1`** |
| `history` | `No conversations visible in sidebar` | **即使侧边栏可见也失败**；真实选择器是 `[data-testid="conversation-list-sidebar"] [data-testid^="convo-pill-"]` | **直读 `app_storage.json`** + `ag_list.ps1` |
| `extract-code` | 有代码块仍返回 `[]` | 代码块选择器与当前 UI 不匹配（`copy-code` 的选择器是好的，两者未对齐） | **`copy-code --index N`** |
| `mark-read <id>` | `Conversation pill not found` | 依赖侧边栏 `convo-pill-<id>` DOM，选择器过期 | 暂无（功能不重要） |
| `state-keys` | file not found | **Windows 路径 bug**：硬编码 `~/Library/Application Support/` | 直读 `state.vscdb`（SQLite） |
| `state-get <key>` | file not found | 同上 Windows 路径 bug | 同上 |
| `settings-read` | file not found | 同上 Windows 路径 bug | 直读 `%APPDATA%\Antigravity\User\settings.json` |
| `recent-paths` | file not found | 同上 Windows 路径 bug | 直读 `state.vscdb` 中 `history.recentlyOpenedPathsList`（14 条） |
| `workspaces-list` | file not found | 同上 Windows 路径 bug | 直读 `%APPDATA%\Antigravity\User\workspaceStorage\`（17 个工作区） |
| `idb-list` | `No IndexedDB databases` | **IndexedDB 磁盘目录本身就是 0 字节完全空**，不只是 CDP 上下文问题 | N/A（无数据） |
| `storage-keys` | `localStorage is empty` | CDP 页面上下文不对；真实 Local Storage 在磁盘 leveldb（实验开关） | 直读 `%APPDATA%\Antigravity\Local Storage\` |
| `cookies` | `document.cookie is empty` | 本地桌面应用无 cookie 概念（预期失败） | N/A |
| `rename <id> <title>` | `NOT YET IMPLEMENTED` | 源码标记未实现，错误信息诚实记录了"第一次尝试导致会话从侧边栏消失"的历史事故 | — |

> **`model <name>` 危险 bug**：子串匹配范围未限定在模型下拉项，`model "Pro"` 会误中侧边栏菜单项 "Projects" 并导航过去。切换模型时用完整名称如 `"Gemini 3.8 Flash High"`，切换后用 `model`（无参数）读回校验。

---

## 三、子智能体架构（最大发现，适配器完全未暴露）

AntiGravity 不只是单轮 chat，而是一个**带文件级消息总线的多智能体系统**。父会话可以派生子智能体并行执行任务，子智能体是完全独立的对话。

### 3.1 派发工具

父会话的 `transcript.jsonl` 中，子智能体通过以下工具调用派发和管理：

| 工具 | 作用 |
|---|---|
| `invoke_subagent` | 派发一个子智能体（指定 role） |
| `manage_subagents` | 查询/管理子智能体状态 |

派发后父会话会**主动等待**子智能体完成，例如："I am waiting for the second subagent to finish collecting technical docs..."

### 3.2 子智能体元数据

```
路径: brain/<父会话id>/.system_generated/subagents/<子会话id>.json
```

格式：
```json
{
  "conversationId": "5a2742b5-b2a2-482e-8213-e5aef8dfa83b",
  "subagentDescriptor": {
    "typeName": "self",
    "role": "Xiaohongshu Collector"
  },
  "state": "SUBAGENT_STATE_ALIVE",
  "spawnStepIndex": 50
}
```

字段含义：
- `conversationId`：子智能体是**完全独立的对话 UUID**（不是父会话的子目录）
- `subagentDescriptor.role`：人类可读角色名
- `state`：`SUBAGENT_STATE_ALIVE`（推断还有 DONE / BLOCKED 等）
- `spawnStepIndex`：父 transcript 中派发它的 step

### 3.3 子智能体的独立脑目录

子智能体**不是父会话的子目录，而是 brain 根下的独立会话目录**：

```
brain/<子会话id>/.system_generated/
  ├─ logs/transcript.jsonl      ← 自己的完整对话
  ├─ logs/transcript_full.jsonl ← 完整未截断记录
  ├─ steps/<n>/output.txt        ← 每步工具输出
  ├─ tasks/task-*.log            ← 异步任务日志
  └─ messages/                   ← ★跨会话消息总线★
```

子智能体自己会调用工具（含 `opencli`），有完整的 steps/tasks/transcript。实测一个 "Xiaohongshu Collector" 子智能体有 179 行 transcript、61 个步骤，正在调用 `opencli xiaohongshu note` 采集数据。

### 3.4 跨会话消息总线（messages/）

每个子智能体目录下有文件级消息队列：

```
messages/
  ├─ read.json           ← 已读消息 id 集合 {msgId:true,...}
  ├─ <msgId>.json        ← 一条消息
  └─ undelivered         ← 投递锁文件（占用中）
```

消息格式：
```json
{
  "id": "07c7cdc3-...",
  "recipient": "5a2742b5-...(子会话)",
  "sender": "5a2742b5-.../task-48",
  "priority": "MESSAGE_PRIORITY_HIGH",
  "timestamp": "2026-09-17T05:59:16Z",
  "renderDetails": {"messageTitle": "Fetch note finished"},
  "content": "Task id ... finished with result:\n...",
  "sourceMetadata": {"tool": {"conversationId": "...", "stepIndex": 48,
    "toolCall": {"name": "run_command", "argumentsJson": "{...}"}}}
}
```

- `sender` 形如 `<会话id>/<task-N>`，表示某任务发回的结果通知
- 子智能体完成后，结果通过 messages/ 回投，父会话的 `manage_subagents` 拾取，再由父模型汇总

### 3.5 UI 层证据

辅助面板中可直接看到子智能体状态：
- `[data-testid="running-items-panel"]` → "1 subagent running, 1 blocked"
- 列出每个子智能体的 role 名和状态（running / blocked / Needs Attention）
- `model --list=true` 的无障碍树转储中也能看到子智能体信息

### 3.6 辅助脚本

```powershell
# 列出某父会话的所有子智能体
& scripts/ag_list_subagents.ps1 -ConversationId "<父会话UUID>"

# 读取子智能体的完整对话（子智能体有独立 conversationId）
& scripts/ag_read_transcript.ps1 -ConversationId "<子会话UUID>"

# 跳转到子智能体会话（在 UI 中查看）
& scripts/ag_goto.ps1 -ConversationId "<子会话UUID>"

# 向子智能体投递消息（谨慎，需 -DryRun 先预览）
& scripts/ag_send_to_subagent.ps1 -SubAgentId "<子会话UUID>" -Message "..." -DryRun
```

> **注意**：`ag_send_to_subagent.ps1` 直接写文件到 messages/ 目录，可能干扰正在运行的子智能体。使用前务必先 `-DryRun` 预览，且不要向运行中的真实子智能体投递。

---

## 四、会话发现（绕过失效的 history 命令）

AntiGravity 的会话不依赖 DOM 读取，而是直接存在磁盘上。会话索引散落在 **3 个地方**（protobuf 索引最全），会话正文只在 brain/。

### 4.1 活跃会话索引：`app_storage.json`

```
路径: %APPDATA%\Antigravity\app_storage.json
```

键名格式：`antigravity-multi-conversation-layout-v3-<conversation_id>`
- 实测 **25 个活跃会话布局标记**（2026-09-17）
- 值为 JSON：`{rootNode: {type:"pane", id:"pane-1", cascadeId:"<id>"}, focusedPaneId:"pane-1"}`
- 另有 `antigravity-multi-conversation-layout-v3-index`（实测为空数组 `[]`）
- `comments.artifacts`（25KB）：会话工件摘要索引，含标题和 summary
- `aux-pane-session`：辅助窗格状态（**含明文命令历史，可能有 API key，注意脱敏**）

**提取活跃会话 ID**（PowerShell）：
```powershell
$data = Get-Content "$env:APPDATA\Antigravity\app_storage.json" -Raw -Encoding utf8 | ConvertFrom-Json
$data.PSObject.Properties.Name |
  Where-Object { $_ -match '^antigravity-multi-conversation-layout-v3-[0-9a-f-]{36}$' } |
  ForEach-Object { $_ -replace '^antigravity-multi-conversation-layout-v3-', '' }
```

### 4.2 最全会话索引：state.vscdb 中的 protobuf 字段（新发现）

会话标题和摘要的**最佳来源**不是 app_storage.json，而是 state.vscdb 中两个 **base64 编码的 protobuf** 字段：

| 字段 | 覆盖会话数 | 含标题 | 含摘要 | 格式 |
|---|---:|---|---|---|
| `jetskiStateSync.agentManagerInitState` | **48** | ✅ TaskName | ✅ TaskSummary/Message | base64-protobuf |
| `antigravityUnifiedStateSync.trajectorySummaries` | 18 | ✅ | ✅ | base64-protobuf |
| `app_storage` `-v3-<uuid>` 键 | 25 | ❌ | ❌（仅布局标记） | JSON |
| `chat.ChatSessionStore.index` | **0（空）** | — | — | JSON |

> VS Code 原生的 `chat.ChatSessionStore.index` 是空的 `{entries:{}}`——AntiGravity 不用它。要恢复"UUID → 标题"映射，最优源是 `jetskiStateSync.agentManagerInitState`。当前 `ag_list.ps1` 用 brain 目录 + transcript 推断标题作为替代。

### 4.3 全部会话脑目录：`~/.gemini/antigravity/brain/`

```
路径: %USERPROFILE%\.gemini\antigravity\brain\<conversation_id>\
```

**2026-09-17 实测结构（46 个会话目录）**：
- 仅 **10/46** 有 `task.md`（老会话为主，首行通常是会话标题）
- **32/46** 有 `.system_generated/logs/transcript.jsonl`（精简版对话转写）
- 有 `.system_generated/logs/transcript_full.jsonl`（完整未截断记录）+ `chunks/`（大字段分片）
- **0/46** 有 `artifacts/` 目录
- 部分目录有 `.system_generated/steps/`（逐步输出）、`.system_generated/tasks/`（异步任务日志）、`.system_generated/messages/`（消息总线，子智能体特有）、`.system_generated/subagents/`（子智能体元数据）
- 顶层有交付物 `*.md` + `*.md.metadata.json`
- 老会话（2025-11~2026-01）的 transcript 已被清空

> **重要修正**：旧版文档说"每个目录包含 task.md + artifacts/"，实际并非如此。大多数会话的标题和内容需要从 transcript.jsonl 或 protobuf 索引提取。

### 4.4 全局状态库：`state.vscdb`

```
路径: %APPDATA%\Antigravity\User\globalStorage\state.vscdb
类型: SQLite（表 ItemTable，列 key/value）
键数: 721
```

关键键分类：
- `antigravity.notification.<uuid>-<seq>` × **590 个**：通知已读标记（全为 `true`）
- `jetskiStateSync.agentManagerInitState`：**最全的会话索引**（48 会话，base64-protobuf，含 TaskName/TaskSummary）
- `antigravityUnifiedStateSync.*` × 11：统一状态同步（trajectorySummaries 等，base64-protobuf；多数偏好 key 为空字节——真偏好云端同步）
- `history.recentlyOpenedPathsList`：最近打开路径（14 条）
- `chat.ChatSessionStore.index`：**空对象**（AntiGravity 不用 VS Code 原生聊天存储）
- `chat.participantNameRegistry`：参与者别名表（不含会话标题）
- `workbench.*` / `windowState.*`：工作台 UI 布局
- `google.antigravity`：扩展状态（含 codeium.installationId）

**查询示例**（Python）：
```python
import sqlite3, json
conn = sqlite3.connect(os.path.expandvars(r'%APPDATA%\Antigravity\User\globalStorage\state.vscdb'))
cur = conn.cursor()
cur.execute("SELECT key, value FROM ItemTable WHERE key LIKE 'chat.%'")
for key, val in cur.fetchall():
    print(f'{key}: {val[:200]}')
conn.close()
```

### 4.5 完整对话转写：`transcript.jsonl`（read 命令的最佳替代）

```
路径: %USERPROFILE%\.gemini\antigravity\brain\<conversation_id>\.system_generated\logs\transcript.jsonl
```

**格式**：JSONL，每行一个 JSON 对象。字段：
- `step_index`：步骤序号（从 0 开始）
- `source`：`USER_EXPLICIT` / `MODEL` / `SYSTEM`
- `type`：`USER_INPUT` / `PLANNER_RESPONSE` / `GENERIC` / `SYSTEM_MESSAGE` / `ERROR_MESSAGE` / `CHECKPOINT`
- `status`：`DONE` 等
- `created_at`：ISO 8601 时间戳
- `content`：消息内容
- `tool_calls`：模型调用的工具列表（`[{name, args}]`），工具结果在下一个 `GENERIC` 的 content 中
- `thinking`：**思考链**（PLANNER_RESPONSE 中）
- `truncated_fields`：被截断的大字段，完整版在 `chunks/` 目录

**关键类型说明**：
- `CHECKPOINT`：上下文压缩恢复点。长会话遇到 CHECKPOINT 后，前面的细节只剩用户请求清单
- `GENERIC`：通常是工具执行结果
- `PLANNER_RESPONSE`：模型的规划/回复，含 `thinking` 思考链和 `tool_calls`

**优势**：不受 DOM 选择器影响、包含完整对话历史、含思考链和工具调用记录、磁盘直读无需 CDP。

**使用脚本**：`scripts/ag_read_transcript.ps1 -ConversationId <uuid> [-LastN N] [-IncludeTools]`

### 4.6 辅助脚本：`ag_list.ps1`

一键列出所有会话（含标题、最后修改时间），标题优先从 `task.md` 提取，无 task.md 时从 `transcript.jsonl` 首条用户消息推断。见 `scripts/ag_list.ps1`。

---

## 五、DOM 选择器修复线索（dump 分析的重大发现）

`read` / `history` / `new` 失效**不是因为应用没这些功能，而是适配器的 DOM 选择器写法过期**。通过 `dump` 命令导出的 `dom.html` 分析，当前 UI 的真实 testid 全部存在：

| 失效命令 | 适配器找的 | 真实存在的选择器 |
|---|---|---|
| `new` | "New Conversation button"（文本匹配） | `[data-testid="new-conversation-button"]` |
| `history` | 侧边栏会话条目（旧选择器） | `[data-testid="conversation-list-sidebar"] [data-testid^="convo-pill-"]` |
| `read` | "conversation container"（旧选择器） | `[data-testid="conversation-view"]`（带 `data-cascade-id` 属性） |
| `mark-read` | `convo-pill-<id>`（部分匹配） | `[data-testid="convo-pill-<uuid>"]`（完整 UUID） |
| `extract-code` | 旧代码块选择器 | 与 `copy-code` 共用选择器即可（copy-code 是好的） |

其他有用的 testid：
- `[data-testid="running-items-panel"]` — 子智能体运行状态面板
- `[data-testid="settings-button"]` — 设置按钮
- `[data-testid="autoscroll-viewport"]` — 消息列表滚动容器（在 conversation-view 内部）

**修复方法**：更新适配器源码中对应的 querySelector，从旧的 class/text 匹配改为 `[data-testid="..."]` 属性匹配。这些 testid 是 React 组件的稳定标识，比 class 名可靠得多。

**调试技巧**：运行 `opencli antigravity dump`，然后在 `E:\tmp\antigravity-dom.html` 中搜索目标元素的文本，找到其 `data-testid` 属性。

---

## 六、新建会话（new 命令失效后的标准方案）

`opencli antigravity new` 报 `Could not find New Conversation button`，但**从首页发送消息会自动创建新会话**：

```powershell
# 1. 回首页
opencli --profile v6pz9gjx antigravity nav back -f json

# 2. 从首页 send → 自动新建会话并跳转
opencli --profile v6pz9gjx antigravity send "新会话的第一条消息" -f json
# → Status: Sent successfully

# 3. 提取新会话 ID
opencli --profile v6pz9gjx antigravity status -f json
# → url: https://127.0.0.1:<port>/c/<新会话ID>?section=f2e7e3a6-...
```

**实测行为**：
- 新会话 ID 为 UUID v4
- AntiGravity 会根据消息内容**自动命名会话**
- 会话 URL 中的 `section` 参数恒定为 `f2e7e3a6-0af3-4ee1-a2b6-01068ac9f4ac`
- 智能体开始处理后显示 "Thought for Xs"

> **注意**：如果当前已在某个会话中，`send` 只是追加消息到当前会话，**不会**新建会话。必须先 `nav back` 回首页。

---

## 七、跳转指定会话（CDP Page.navigate）

适配器没有 goto 命令，但可通过 CDP 直接导航。已封装为 `scripts/ag_goto.ps1`。

### 5.1 URL 模式

```
https://127.0.0.1:<app_port>/c/<conversation_id>?section=f2e7e3a6-0af3-4ee1-a2b6-01068ac9f4ac
```

- `app_port`：每次启动变化（如 53973），脚本自动从当前页面提取
- `conversation_id`：目标会话 UUID
- `section`：恒定值 `f2e7e3a6-0af3-4ee1-a2b6-01068ac9f4ac`（聊天区段 ID）

### 5.2 使用脚本

```powershell
& "scripts/ag_goto.ps1" -ConversationId "8a2a9f46-c8cc-4c5b-91d9-503f0ecb6023"
```

输出：
```
Current : https://127.0.0.1:53973/c/当前会话...
Target  : https://127.0.0.1:53973/c/8a2a9f46-...
OK frameId=B9D48EA8009C5511977812541AB1FFDA
VERIFIED: now on conversation 8a2a9f46-...
```

### 5.3 原理（Node 原生 WebSocket + CDP）

```javascript
// 1. GET http://127.0.0.1:9234/json 获取目标列表，取 type=page 的 webSocketDebuggerUrl
// 2. 连接 WebSocket，发送 Page.navigate
const ws = new WebSocket(page.webSocketDebuggerUrl);
ws.onopen = () => ws.send(JSON.stringify({
  id: 1, method: 'Page.navigate',
  params: { url: targetUrl }
}));
```

---

## 八、读取回复（read 命令失效后的方案）

`opencli antigravity read` 报 `Could not find conversation container`。有两种替代方案。

### ⚠️ P0：send 假成功（必须知道）

**2026-09-17 深度测试发现**：`send` 命令在以下情况会报 `Sent successfully` 但消息**实际未提交**：
1. **整页 CDP 刷新后**：编辑器未完全水合，send 静默空转（前 1-2 次 send 都不落盘）
2. **agent 忙碌时**：当前会话有运行中的子智能体时，输入被静默丢弃
3. **多条消息快速连续发送**：可能被 Lexical 编辑器缓冲，合并成一条提交

**验证方法（必须做）**：send 后立即检查 transcript.jsonl 是否出现新的 USER_INPUT 行：
```powershell
# send 后验证
opencli antigravity send "测试消息" -f json
Start-Sleep -Seconds 3
# 检查 transcript 最后一行是否是刚发的消息
& scripts/ag_read_transcript.ps1 -ConversationId "<id>" -LastN 2
```
如果 transcript 中没有新消息，说明 send 假成功，需要等待 10-15 秒后重试。

### 8.1 方案 A：`copy-message`（快速但有局限）

```powershell
opencli --profile v6pz9gjx antigravity copy-message -f json
```

输出结构：
```json
[
  {"Field": "Length", "Value": "95 chars"},
  {"Field": "ClipboardClicked", "Value": "no"},
  {"Field": "Text", "Value": "用户消息...\n3:02\nThought for 24s\n\n助手回复内容...\n\n3:02"}
]
```

- `Text` 字段包含：用户消息原文 + 时间戳 + 思考时长 + 助手回复 + 时间戳
- `ClipboardClicked: no` 表示未实际点击复制按钮，通过 DOM 文本提取

**已知问题：send 后 copy-message 可能读到旧内容**

`send` 报告成功后，等待 10-60s 后 `copy-message` 可能始终返回发送前的最后一条消息。DOM 中 Copy 按钮的选择器命中了旧消息。

**绕行**：
1. 发送后 `nav back` → `nav forward` 刷新 DOM，再调用 copy-message
2. 或直接使用方案 B（transcript.jsonl 直读），更可靠

### 8.2 方案 B：`ag_read_transcript.ps1`（可靠，推荐）

```powershell
& "scripts/ag_read_transcript.ps1" -ConversationId "<会话ID>"
```

- 从磁盘直读 `transcript.jsonl`，不受 DOM 选择器影响
- 输出完整对话历史（用户消息 + 助手回复 + 工具调用 + 思考链）
- 无需等待 DOM 渲染，发送后立即可读（文件实时写入）
- 支持 `-LastN N` 只看最后 N 条，`-IncludeTools` 显示工具调用详情

获取当前会话 ID：`opencli antigravity status -f json`，URL 中 `/c/<UUID>` 即为会话 ID。

### 8.3 代码提取：`copy-code`（不是 extract-code）

```powershell
# 提取最后一条消息中的代码块
opencli antigravity copy-code -f json
# 指定第 N 个代码块（从 0 开始）
opencli antigravity copy-code --index 0 -f json
```

- `copy-code` 正常工作，返回 `TotalCodeBlocks` / `PickedIndex` / `Code`
- **`extract-code` 已失效**（有代码块也返回 `[]`），不要用

---

## 九、Windows 路径 bug（系统性，影响 5 条命令）

### 现象

`state-keys` / `state-get` / `settings-read` / `recent-paths` / `workspaces-list` 全部报 file not found，路径为：
```
C:\Users\<user>\Library\Application Support\Antigravity\...
```

错误信息还会误导性地提示 "Has Antigravity been run at least once?"，让新使用者以为应用没装。

### 根因

适配器源码硬编码了 **macOS 路径** `~/Library/Application Support/`，未做 Windows 平台判断。

### 真实 Windows 路径

| 用途 | 真实路径 |
|---|---|
| 用户数据根目录 | `%APPDATA%\Antigravity\` |
| settings.json | `%APPDATA%\Antigravity\User\settings.json` |
| state.vscdb | `%APPDATA%\Antigravity\User\globalStorage\state.vscdb` |
| workspaceStorage | `%APPDATA%\Antigravity\User\workspaceStorage\` |
| app_storage.json | `%APPDATA%\Antigravity\app_storage.json` |
| 会话脑目录 | `%USERPROFILE%\.gemini\antigravity\brain\` |
| IndexedDB | `%APPDATA%\Antigravity\IndexedDB\` |
| Local Storage | `%APPDATA%\Antigravity\Local Storage\` |

> 修复方向：在适配器源码中用 `process.platform === 'win32'` 判断，Windows 下用 `process.env.APPDATA` 替代 `~/Library/Application Support/`。

---

## 十、dump 命令在 Windows 上的行为（修正）

旧版文档说 `dump` "返回 /tmp/... 路径但文件未落盘"，**这是错误的**。

2026-09-17 实测：`dump` 命令正常工作，文件确实落盘，但位置不是 `%TEMP%`，而是**当前工作盘根目录的 `\tmp\` 下**：

```
# 如果当前工作目录在 E: 盘
E:\tmp\antigravity-dom.html      (177KB)
E:\tmp\antigravity-snapshot.json (33KB)
```

原因：Node.js 在 Windows 上将 `/tmp/` 解析为当前工作盘根目录下的 `tmp\`（如 `E:\tmp\`），而非系统临时目录。

**使用注意**：
- 执行 `dump` 前确认当前工作盘，文件会落在该盘的 `\tmp\` 下
- `dom.html` 可用于分析当前 UI 的 DOM 结构（调试选择器问题时很有用）
- `snapshot.json` 包含可访问性树快照

---

## 十一、自动更新导致调试端口丢失（常见陷阱）

AntiGravity 自动更新后会以 `--updated` 参数重启，**不带 `--remote-debugging-port`**，导致 CDP 连接中断。

**检测方法**：
```powershell
# 查看主进程启动参数
Get-CimInstance Win32_Process -Filter "Name='Antigravity.exe'" |
  Where-Object { $_.CommandLine -notmatch '--type=' } |
  Select-Object CommandLine
# 如果不含 --remote-debugging-port=9234，需要重启
```

**处理**：按第 1.1 节的连接流程优雅关闭并带参数重启。会话数据持久化在磁盘，重启后自动恢复。

---

## 十二、完整工作流示例：外部智能体调用 AntiGravity 做分析

```powershell
$env:OPENCLI_PROFILE = "v6pz9gjx"
$env:OPENCLI_WINDOW = "background"

# 1. 确保连接（如果端口丢失则重启）
opencli antigravity status -f json

# 2. 回首页 + 发送任务（自动新建会话）
opencli antigravity nav back -f json
Start-Sleep -Seconds 2  # 等待首页加载完成
opencli antigravity send "请分析以下 50 条招聘数据，按匹配度排序并给出理由：<数据>" -f json

# 3. ⚠️ 验证 send 真的成功了（P0：send 可能假成功）
Start-Sleep -Seconds 3
$status = opencli antigravity status -f json | ConvertFrom-Json
$conversationId = ($status.url -split '/c/')[1] -split '\?')[0]
$lastLines = & scripts/ag_read_transcript.ps1 -ConversationId $conversationId -LastN 2
# 如果 lastLines 中没有刚发的消息，等待 10 秒后重发

# 4. 等待智能体处理（复杂任务 30-60s）
Start-Sleep -Seconds 40

# 5. 读取回复（推荐用 transcript 直读，不受 DOM 缓存影响）
& scripts/ag_read_transcript.ps1 -ConversationId $conversationId

# 6. （可选）查看是否有子智能体在运行
& scripts/ag_list_subagents.ps1 -ConversationId $conversationId

# 7. （可选）跳转到其他历史会话
& scripts/ag_goto.ps1 -ConversationId "8a2a9f46-c8cc-4c5b-91d9-503f0ecb6023"
```

---

## 十三、反爬风险评估

**N/A** — 本地桌面应用 CDP 通信，非网站抓取，无反爬机制。唯一限制是 AntiGravity 自身的 API 调用频率（模型速率限制），与适配器无关。

---

## 十四、会员额度查询（5小时 + 周配额）

> 2026-09-17 新增。opencli antigravity 的 31 条命令中**无额度查询命令**，但可通过 CDP 导航到 Settings > Models & Usage 页面，dump DOM 后解析额度圆环数据。已封装为 `scripts/ag_quota.ps1`。

### 14.1 一键查询（推荐）

```powershell
& scripts/ag_quota.ps1
```

输出示例：
```
=== AntiGravity Membership Quota ===
Plan: Google AI Pro

--- Gemini Models ---
  5-Hour Limit:  78% remaining (refreshes in 1 hour)
  Weekly Limit:  85% remaining (refreshes in 6 days, 3 hours)

--- Claude & GPT Models ---
  5-Hour Limit:  100% remaining (refreshes in )
  Weekly Limit:  100% remaining (refreshes in )

--- Token Usage (Customizations) ---
  Rules:  1,153 tokens (5.765%)
  Skills: 9,566 tokens (47.83%)
  Budget: 46.4% available

Upgrade to Ultra: https://antigravity.google/g1-upgrade?...
```

JSON 输出（用于脚本集成）：
```powershell
& scripts/ag_quota.ps1 -Raw
```

### 14.2 手动查询步骤（理解原理）

1. **导航到 Models & Usage 设置页**：将当前 URL 的 `settingsScreen=General` 改为 `settingsScreen=Models`
2. **等待 4 秒**让额度数据从云端加载
3. **dump DOM**：`opencli antigravity dump -f json`
4. **解析额度圆环**：DOM 中每个额度项包含：
   - 标题：`Five Hour Limit Remaining` / `Weekly Limit Remaining`
   - 百分比：`<span class="text-sm font-semibold">78%</span>`
   - 刷新时间：`You have used some of your 5-hour limit, it will fully refresh in 1 hour, 14 minutes.`
   - 进度圆环：`<circle data-testid="quota-progress-circle" stroke-dasharray="..." stroke-dashoffset="...">`

### 14.3 关键发现

| 项目 | 说明 |
|---|---|
| **额度不存储在本地** | `state.vscdb` 中 `antigravityUnifiedStateSync.modelCredits` / `userStatus` / `oauthToken` 均为 0 字节（空），额度数据从云端 API 实时获取 |
| **两套独立额度** | Gemini Models 和 Claude/GPT models 各有独立的 5小时 + 周配额 |
| **当前计划** | `Your Plan: Google AI Pro`，可升级到 Ultra 获得更高速率限制 |
| **AI Credit Overages** | 可启用开关：额度用完后自动用 AI credits 继续（`Enable AI Credit Overages`） |
| **刷新按钮** | `aria-label="Refresh quota and credits data"`，可手动刷新额度数据 |
| **Token Usage** | Rules/Skills/MCP 等自定义内容的 token 占用，有独立预算（当前 46.4% available） |
| **设置页面导航** | URL 参数 `settingsScreen=Models` / `Account` / `General` / `Appearance` 等，共 14 个设置页 |

### 14.4 设置页面完整列表

通过 `data-testid="settings-nav-item-<名称>"` 可识别所有设置页：
`Account`, `App`, `Appearance`, `Browser`, `Conversations`, `Customizations`, `General`, `Jobs`, `L1_manuscript`, `Models`, `Provide Feedback`, `Shortcuts`, `media`

---

## 十五、新使用者快速上手（核心三件套）

如果你是第一次使用 antigravity 适配器，只需要记住这三条命令：

```powershell
# 1. 确认连接 + 获取当前会话 ID
opencli antigravity status -f json

# 2. 发送消息（在首页发会自动新建会话）
#    ⚠️ send 可能假成功，发完后用步骤3验证
opencli antigravity send "你的问题" -f json

# 3. 读取回复（从磁盘直读，最可靠，同时验证 send 是否真成功）
& scripts/ag_read_transcript.ps1 -ConversationId "<从status的URL中提取的UUID>" -LastN 5
```

**进阶能力**：
```powershell
# 列出所有会话
& scripts/ag_list.ps1

# 跳转到指定会话
& scripts/ag_goto.ps1 -ConversationId "<uuid>"

# 查看某会话的子智能体
& scripts/ag_list_subagents.ps1 -ConversationId "<uuid>"

# 提取代码块（用 copy-code，不要用 extract-code）
opencli antigravity copy-code --index 0 -f json
```

**不要浪费时间在这些命令上**（已知失效）：`read`、`history`、`new`、`extract-code`、`state-keys`、`state-get`、`settings-read`、`recent-paths`、`workspaces-list`。

**模型切换注意**：用完整模型名（如 `"Gemini 3.8 Flash High"`），不要用短名（`"Pro"` 会误中 "Projects" 菜单）。

---

## 十六、待优化 / 待修复清单

| 优先级 | 项目 | 说明 |
|---|---|---|
| P0 | 修复 `send` 假成功 | 整页刷新后/agent 忙碌时 send 报成功但不落盘，应读回 transcript 验证后再返回 |
| P0 | 修复 `read` / `history` / `new` DOM 选择器 | 真实 testid 已确认：`conversation-view` / `conversation-list-sidebar` / `new-conversation-button`，改选择器即可复活 |
| P0 | 修复 Windows 路径 bug | 5 条命令受影响，源码硬编码 macOS 路径 |
| P0 | 修复 `model <name>` 匹配范围 | 子串匹配误中侧边栏 "Projects" 菜单，应限定在模型下拉项 |
| P1 | 修复 `extract-code` | 有代码块仍返回 `[]`，与 copy-code 对齐选择器即可 |
| P1 | 修复 `copy-message` 缓存 | send 后 copy-message 读到旧内容 |
| P1 | 新增 `goto <id>` 命令 | 内置 ag_goto.ps1 的 CDP Page.navigate |
| P1 | 新增 `list-conversations` 命令 | 内置直读 app_storage.json + protobuf 索引 |
| P1 | 新增 `read-transcript <id>` 命令 | 内置 ag_read_transcript.ps1 逻辑 |
| P1 | 新增子智能体命令组 | `list-subagents` / `read-subagent-transcript`（适配器最大能力空白） |
| P2 | `dump` Windows 路径修复 | `/tmp/` 应映射到 `%TEMP%` |
| P2 | `delete` 不依赖侧边栏 DOM | 当前实际删除需 convo-pill 可见，应改为直读+API |
| P2 | `watch` 输出缓冲修复 | 重定向到文件时只捕获 banner |
| P3 | `watch` 超时控制 | 长连接需优雅退出 |
| P3 | `rename` 命令实现 | 源码标记 NOT YET IMPLEMENTED |
| P3 | `mark-read` 命令修复 | 依赖侧边栏 DOM |
| P3 | `idb-list` / `storage-keys` | IndexedDB 本身为空（0 字节），可能无需修复 |
