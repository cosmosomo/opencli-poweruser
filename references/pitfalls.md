# 通用踩坑记录与进化日志

> 本文件记录所有适配器的通用问题、已知故障、以及新适配器的验证日志。
> 每次遇到新问题或验证新适配器后，追加到对应章节。

## 通用问题

### 1. stale page identity（最常见）

**现象**：
```
Page not found: <hash> — stale page identity
```

**原因**：浏览器扩展持有的目标网站页面句柄过期（页面被关闭/刷新/标签页被清理/daemon 重启）。
默认 `ephemeral` 模式下命令结束后标签页租约被释放，下次调用无会话可复用。

**解决——分阶段策略（一次前台，永久后台）**：

1. **重建会话**（遇到 stale 时跑一次）：
```bash
opencli <adapter> search --limit 1 --window foreground --site-session persistent -f json
```
2. **后续后台运行**（不抢焦点）：
```bash
opencli <adapter> <command> --window background --site-session persistent -f json
```

`--site-session persistent` 是核心——保持标签页租约不被回收，是后台运行的基础。
只要 Chrome 不关闭、daemon 不重启，持久会话一直有效。

**更省事**：设置环境变量 `$env:OPENCLI_WINDOW="background"`，所有命令默认后台，
仅在遇到 stale 时手动跑一次 foreground 重建会话。

**不能完全 headless**：OpenCLI 依赖 Chrome 扩展（MV3 debugger 权限），必须运行在有界面的 Chrome 中。
但可将 Chrome 最小化，效果等同于无干扰后台。

**影响范围**：BOSS 直聘（必现，需 persistent）、其他浏览器桥接适配器（偶现，默认模式通常可用）。

### 2. AUTH_REQUIRED

**现象**：
```
AUTH_REQUIRED: <cookie/token> missing / 登录已过期
```

**原因**：Chrome 中未登录对应网站，或登录态过期。

**解决**：
- 在 Chrome 中手动登录目标网站
- 或运行 `opencli <adapter> login`（会自动打开登录页等待认证）

### 3. doctor 命令卡住

**现象**：`opencli doctor` 无输出，进程不退出。

**原因**：doctor 等待浏览器扩展连接，扩展未加载或 daemon 未运行时阻塞。

**解决**：先确保 daemon 运行 + 扩展加载，再运行 doctor；或直接用 `opencli daemon status` 替代。

### 4. Daemon 无法自动启动

**现象**：需要浏览器的命令时 daemon 没有自动 spawn，`opencli daemon status` 显示 not running。

**原因**：OpenCLI 的 spawnDaemonProcess 在某些环境中被进程树清理。

**解决**：手动启动完全独立的进程：
```bat
cmd /c start "OpenCLI Daemon" /B "node.exe" "daemon.js"
```
或使用 `start-opencli-daemon.bat`。

### 5. note/detail 命令需要完整签名 URL

**现象**：`opencli xiaohongshu note <id>` 报错 `requires a full signed URL`。

**原因**：部分适配器的详情命令不再接受纯 ID，必须带 `xsec_token` 的完整 URL。

**解决**：从 search/feed 结果中取完整 `url` 字段传入。

### 6. 小红书 search 请求频繁 → 返回空数组（2026-08-27 实测）

**现象**：连续 3 次 `xiaohongshu search`（limit 20，间隔 3s）后全部返回 `[]`，
冷却 20s 后单测仍 `[]`。无报错信息，容易误判为"关键词没结果"。

**原因**：小红书对连续 search 的风控比文档标注更严格（约为"1 次/30s"量级），
触发后需较长冷却才能恢复。

**解决**：
- 单次 `--limit ≤ 10`，每批 1 个关键词，间隔 ≥30 秒；
- 连续 2 次空数组立即停手，冷却 ≥60 秒，用 `feed --limit 5` 探活区分限流/关键词；
- 长期不恢复 → `--window foreground --site-session persistent` 重建会话。
- 详细对策见 `adapter-xiaohongshu.md` 的"实测反爬教训"章节。

### 7. CDP 自动化特征被站点反爬探测 → 刷新/登出/stale（2026-08-28 调研结论）

**现象**：浏览器桥接适配器（如 boss）出现**页面一直闪 / 自动刷新 / 强制登出 / stale page identity**，
且正常浏览器中页面稳定。

**原因**：站点内置反调试体系（如 disable-devtool 类库），识别到自动化特征后主动反制。
三类核心特征：`navigator.webdriver=true`、本地调试端口（`127.0.0.1:9222` 等）、`chrome.runtime` 扩展痕迹。
链路：CDP 特征暴露 → risk-detection.js + 埋点 → 前端探测器命中 → `location.reload()`（一直闪）→ 反复触发 → 后端清 cookie 强制登出。

**判断**：不是工具 bug，是站点反爬。正常浏览器操作稳定、自动化一连接就异常 = 被反爬。

**解决**：
- 只做低频单次只读操作（间隔 12-25s 随机延迟，limit ≤ 10，页数 ≤ 3）；
- 连续 2 次闪烁/登出即停手，冷却 ≥ 60s；
- 长期需求走人机协作（浏览器插件只读 DOM / 截图+AI），不要依赖 CDP 纯自动化；
- 识别方法与应对策略详见 `anti-bot-notes.md`。

## 适配器特定问题

### ChatGPT 适配器（UI 改版导致选择器失效）

**状态**：未修复

**现象**：
- `ask`: `Failed to send message to ChatGPT`（输入框选择器失效）
- `read`: `No visible ChatGPT messages were found`（消息选择器失效）
- `history`: `No ChatGPT conversation links were visible in the sidebar`（侧边栏选择器失效）

**正常命令**：`status`、`whoami`、`new`

**原因**：ChatGPT 网站 UI 改版，适配器中的 DOM 选择器对不上。

**待办**：需用 `opencli-adapter-autofix` skill 重新探测页面结构，或手动更新适配器选择器。

### 豆包网页版

**状态**：需登录后验证

**现象**：`doubao whoami` 返回 `AUTH_REQUIRED: passport_csrf_token cookie missing`。

**解决**：在 Chrome 中登录 doubao.com。

## 进化日志

### 2026-08-19 初始验证

- ✅ 验证 BOSS 直聘适配器：search/detail 可用，需 foreground+persistent 参数
- ✅ 验证小红书适配器：feed/search/whoami 可用，note 需完整 URL
- ✅ 验证公开 API 适配器：hackernews/wttr/arxiv/npm/bilibili 正常
- ⚠️ 发现 ChatGPT 适配器因 UI 改版部分失效
- 📝 创建 adapter-boss.md、adapter-xiaohongshu.md、adapter-public-api.md

### 2026-08-20 系统全局安装

- ✅ OpenCLI 全局安装到 `C:\Users\COLORFIRE\AppData\Roaming\npm`，任意终端可调用
- ✅ 验证系统全局 opencli 可连接已有 daemon（端口 19825）

### 2026-08-21 浏览器后台运行方案调研

- ✅ 源码分析：stale page identity 根因是 ephemeral 模式下标签页租约被回收，goto() 有重试但无 session lease 可复用
- ✅ 实验验证：先前台建立 persistent 会话后，后续 `--window background --site-session persistent` 完全正常（BOSS 直聘 search 成功）
- ✅ 确认无法 headless：依赖 Chrome 扩展 MV3 debugger 权限，必须有界面 Chrome；但可最小化窗口实现无干扰后台
- 📝 更新 adapter-boss.md：改为"一次前台，永久后台"分阶段策略
- 📝 更新 SKILL.md 速查表和遇到问题章节
- 📝 更新 pitfalls.md stale page identity 解决方法

### 2026-08-27 新浏览器 Profile 配置 + 多平台核验

- ✅ 切换默认浏览器 profile 为 `v6pz9gjx`（新浏览器）
- ⚠️ 发现 `opencli profile use` 设默认后仍报多 profile 冲突，必须用全局 `--profile` 参数（放在 opencli 后适配器前）或环境变量 `OPENCLI_PROFILE`
- ✅ 验证 `--profile v6pz9gjx` 全局参数有效，不再报冲突
- ✅ 验证 `OPENCLI_WINDOW=background` 环境变量可设置默认后台窗口模式
- ✅ 小红书核验 6 大技术渠道现状：GitHub Trending（最活跃，日报级）、Reddit（高价值，AI编程+找工）、V2EX（讨论源头）、Hacker News（信源推荐）、知乎（自身AI化成话题）、掘金（入门学习资源）
- ✅ 在 v6pz9gjx 浏览器中打开 6 个待登录网站：小红书、BOSS直聘、知乎、掘金、GitHub、Reddit
- 📝 更新 SKILL.md：新增"本机环境配置"章节（默认 profile + 默认后台模式），更新通用调用模板和遇到问题章节

### 2026-08-27 8 平台登录验证 + verified-platforms.md

- ✅ 验证 8 个平台登录状态（v6pz9gjx profile）：
  - 小红书 ✅（COSMOS，17粉）
  - 知乎 ✅（wjsnbb）
  - 掘金 ✅（无需登录，hot/recommend 公开）
  - GitHub ✅（cosmosomom）
  - Reddit ✅（Intrepid_Ad3831，2021年注册）
  - V2EX ✅（cosmostxy）
  - linux.do ✅（已登录，feed 正常）
  - BOSS直聘 ⏸️（暂时搁置，stale page identity + detached）
- ⚠️ 发现 linux.do whoami 误报 bug：读 meta 标签 current-user-username 不存在，但实际已登录，feed/search/topic 正常
- 📝 创建 references/verified-platforms.md：8 平台完整登录状态、可用命令清单、高价值子版/节点/分类推荐
- 📝 更新 SKILL.md 速查表：新增 7 个已验证平台，BOSS直聘标记为暂时搁置

### 2026-08-27 小红书 search 请求频繁反馈

- ⚠️ 实测：连续 3 次 `xiaohongshu search --limit 20`（间隔 3s）触发风控，全部返回 `[]`；冷却 20s 后单测 `search "大模型 面试" --limit 10` 仍返回 `[]`
- 📌 判断：`[]` 是限流信号而非冷门关键词；小红书对连续 search 容忍度约"1 次/30s"量级
- 📝 更新 `adapter-xiaohongshu.md`：新增"实测反爬教训"章节（保守节奏：每批 1 词、limit≤10、间隔≥30s、连续空则冷却≥60s、feed 探活）
- 📝 更新 `pitfalls.md`：新增通用问题第 6 条"小红书 search 请求频繁"

### 2026-08-28 BOSS 直聘反爬调研 + 反爬知识沉淀

- ✅ 4 轮调研查明 BOSS 直聘反爬体系（9 层防御矩阵）与反调试机制（8 种 DevTools 探测器 → reload 刷新惩罚 → 后端 token 熔断强制登出）
- ✅ 查明 boss 适配器搁置根因：不是 stale page identity 工具 bug，而是站点识别 CDP 自动化特征后的主动反制
- ✅ 更新 `adapter-boss.md`：新增"反爬根因与边界"章节（检测链、可用边界、降频信号）；反爬风险从"低"上调为"中/高"
- ✅ 新建 `references/anti-bot-notes.md`：站点反爬识别与应对速查（CDP 特征暴露点、反爬手段清单、降频策略、技术路线评估、已确认站点状态表）
- ✅ 更新 `SKILL.md`：boss 速查表状态改为"⚠️ 只读低频可用"，注册 anti-bot-notes.md
- ✅ 更新 `pitfalls.md`：新增通用问题第 7 条"CDP 自动化特征被站点反爬探测"

---

## 新适配器验证模板

验证新适配器后，按以下格式追加到进化日志：

```
### YYYY-MM-DD <适配器名>验证

- ✅/⚠️/❌ <命令名>：<结果说明>
- 关键参数：<必加参数>
- 反爬风险：<低/中/高>
- 📝 创建/更新 reference 文件：<文件名>
```

验证完成后：
1. 在 SKILL.md 的"已验证适配器速查"表中添加一行
2. 创建 `references/adapter-<name>.md` 记录详细经验
3. 在本文件进化日志中追加记录
