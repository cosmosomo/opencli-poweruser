# BOSS 直聘适配器经验

> 验证日期：2026-08-19（首次）/ 2026-08-28（反爬根因更新）
> 版本：opencli v1.8.6
> 结论（2026-08-28 更新）：只读操作（search/detail）**低频单次**可用；但站点有**工业级反爬/反调试体系**，纯自动化长期运行会触发强制登出。详见下方「反爬根因与边界」。

## 反爬根因与边界（2026-08-28 调研结论）

**搁置根因已查明**：BOSS 直聘内置 disable-devtool 类反调试体系，`stale page identity`/`Detached`/页面闪烁不是工具 bug，而是站点识别到自动化特征后的主动反制。

**检测链**：
```
CDP 特征暴露（navigator.webdriver=true / 127.0.0.1:9222 调试端口 / chrome.runtime）
  → risk-detection.js + 数星埋点（行为指纹）
  → 前端反调试探测器命中 → location.reload()（页面一直闪）
  → 反复触发 → set/zpToken 清空 cookie → 强制登出
```

**核心识别特征**（BOSS 会主动探测）：
- 本地调试端口 `127.0.0.1:9222`、`127.0.0.1:18789`
- `chrome-extension://` 扩展痕迹
- DevTools 8 种探测器（无限 debugger / console 序列化 / 窗口尺寸差 / Performance 计时）

**可用边界**：
- 只读命令 `search`/`detail` 低频单次可跑通（社区多项目验证）
- 必须保持 `--site-session persistent` 持久会话
- 翻页/搜索间隔 ≥ 12-25s 随机延迟，模拟真人节奏
- 单次 limit 建议 ≤ 10，页数 ≤ 3，避免连环请求
- **纯自动化（CDP）长期运行不可行**，GitHub 实测会强制登出
- 人机协作（浏览器插件只读 DOM / 截图+AI）是唯一长期稳定路径

## 窗口模式策略：一次前台，永久后台

BOSS 直聘页面结构复杂，默认 `ephemeral` 模式下标签页易被回收导致 `stale page identity`。
采用**分阶段策略**，无需每次都抢焦点：

### 阶段 1：建立持久会话（每天第一次）

```bash
opencli boss search "算法" --city 上海 --limit 1 \
  --window foreground --site-session persistent -f json
```

用 `foreground` 激活 Chrome 窗口建立持久标签页租约，1-2 秒即可。
只要 Chrome 不关闭、daemon 不重启，会话一直有效。

### 阶段 2：后续全部后台运行

```bash
opencli boss search "机器学习" --city 上海 --limit 5 \
  --window background --site-session persistent -f json
```

`background` 模式完全不抢焦点，可在用户做其他事情时静默执行。

### 更省事：环境变量默认后台

```powershell
$env:OPENCLI_WINDOW="background"
```

设置后所有命令默认后台，仅在遇到 `stale page identity` 时手动跑一次 `foreground` 重建会话。

### 核心参数

| 参数 | 必须？ | 说明 |
|---|---|---|
| `--site-session persistent` | ✅ 始终必须 | 保持标签页租约不被回收，是后台运行的基础 |
| `--window foreground` | ⚠️ 仅第一次 | 建立会话时用，激活窗口 |
| `--window background` | 推荐（后续） | 不抢焦点，静默执行 |

**不能完全 headless**：OpenCLI 依赖 Chrome 扩展（MV3 debugger 权限），扩展必须运行在有界面的 Chrome 中。但可将 Chrome 最小化，效果等同于无干扰后台。

## 可用命令

### 只读（安全）

| 命令 | 用途 | 示例 |
|---|---|---|
| `search [query]` | 搜索职位 | `opencli boss search "算法工程师" --city 上海 --limit 5 -f json` |
| `detail <security-id>` | 职位详情 | `opencli boss detail "<security_id>" -f json` |
| `whoami` | 当前登录状态 | `opencli boss whoami -f json` |
| `chatlist` | 聊天列表 | `opencli boss chatlist -f json` |
| `chatmsg <uid>` | 聊天历史 | `opencli boss chatmsg <uid> -f json` |
| `joblist` | 我发布的职位（招聘端） | `opencli boss joblist -f json` |
| `recommend` | 推荐候选人（招聘端） | `opencli boss recommend -f json` |
| `resume <uid>` | 候选人简历（招聘端） | `opencli boss resume <uid> -f json` |
| `stats` | 职位数据统计 | `opencli boss stats -f json` |

### 写操作（需用户明确授权）

`greet`、`batchgreet`、`send`、`invite`、`exchange`、`mark`、`login` —— 禁止自动执行。

## search 命令参数

| 参数 | 说明 | 示例值 |
|---|---|---|
| `query` | 搜索关键词（空=推荐职位） | `"算法工程师"` |
| `--city` | 城市名或代码 | `上海`, `101010100` |
| `--experience` | 经验要求 | `应届生`, `1-3年`, `经验不限` |
| `--degree` | 学历 | `本科`, `硕士`, `博士` |
| `--salary` | 薪资范围 | `20-30K`, `50K以上` |
| `--industry` | 行业 | `互联网`, `100020` |
| `--jobType` | 工作类型 | `全职`, `兼职`, `实习` |
| `--page` | 页码 | 默认 1 |
| `--limit` | 结果数 | 默认 15 |

## 输出字段（search）

`name, salary, company, area, experience, degree, skills, boss, bossOnline, security_id, url`

- `security_id`：调用 `detail` 时传入此值
- `bossOnline`：Y/N，表示 HR 是否在线
- `url`：职位详情页链接

## detail 命令

传入 search 返回的 `security_id`（完整字符串，含特殊字符如 `~` `-` `_`），
返回完整 JD（岗位职责、任职要求、福利、公司信息、地址、发布者信息）。

注意：security_id 很长且含特殊字符，用双引号包裹。

## 已知问题

| 问题 | 原因 | 解决 |
|---|---|---|
| `stale page identity` | 持久会话丢失（Chrome 关闭/daemon 重启/标签页被回收）**或站点反爬刷新页面** | 用 `--window foreground --site-session persistent` 重建一次会话，之后切 `background` |
| 页面一直闪/自动刷新 | **反调试探测器命中**（DevTools/CDP 特征被识别） | 属站点正常反制；降低频率、避免连环请求；重建会话后低频单次操作 |
| `whoami` 报 stale page identity | 同上 | whoami 不影响核心功能，用 search 重建会话即可 |
| `Detached while handling command` | daemon 重启或 Chrome 崩溃导致连接断开 | 检查 `opencli daemon status`，确认扩展连接后重试 |
| 搜索结果为空 | 筛选条件过严 | 放宽 degree/experience 或换关键词 |

## 反爬风险评估

- 只读操作（search/detail）低频单次：**中风险**（2026-08 后结论上调：站点有工业级反调试，频繁自动化会被识别并强制登出）
- 写操作（greet/send）：**高风险**，频繁发送必然触发风控，需用户授权且控制频率
- 建议：同一关键词搜索间隔 > 12-25 秒随机延迟，单批 limit ≤ 10，单次任务 ≤ 3 页
- **信号**：连续 2 次页面闪烁/强制登出即停手，冷却 ≥ 60 秒，必要时重建会话
- **长期方案**：不要依赖 CDP 纯自动化；用浏览器插件只读 DOM / 截图+AI 人机协作路线
