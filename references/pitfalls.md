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

**2026-09-10 补充（长会话累积限流）**：同一 session 内当天已做约 50+ 次 search/note/comments 混合调用后，即使间隔已有数分钟，用高频词（"秋招"，此前几十次调用都能命中大量结果）探活仍返回 `[]`——说明限流不是纯粹按"上一次调用后经过多久"计算，可能有当天累积调用量或调用总频次的阈值。**遇到长时间连续密集调研（几十次以上调用）后突然全线返回空，不要只等 60 秒重试，先确认是否是累积量触发，必要时切换到其他平台（知乎/Reddit）等到明显更长时间（数十分钟级）或换 session 再回来。**
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

### 8. v1.8.6 没有 `opencli daemon start`（2026-09-12 实测）

**现象**：`opencli daemon start` 报 `error: unknown command 'start'`。

**原因**：daemon 子命令只有 `restart / status / stop`，没有 start（daemon 由 restart 或首次浏览器命令自动拉起）。

**解决**：用 `opencli daemon restart`，随后 `opencli daemon status` 确认 `running on port 19825`。

### 9. 适配器命令没有 `--timeout` 参数（2026-09-12 实测）

**现象**：`opencli xiaohongshu whoami --timeout 90` 报 `error: unknown option '--timeout'`（帮助文本里提到的 `--timeout <seconds>` 在部分命令上不生效）。

**解决**：用环境变量调全局超时：`$env:OPENCLI_BROWSER_COMMAND_TIMEOUT="120"`（单位秒），在同一 PowerShell 会话内对后续所有命令生效。

### 10. whoami 走 creator 站点，探活应该用 feed（2026-09-12 实测，重要）

**现象**：`xiaohongshu whoami` 第一次 60s TIMEOUT、第二次报 `AUTH_REQUIRED: Xiaohongshu creator profile requires login: 登录已过期`（指向 creator.xiaohongshu.com）；但同 profile 的 `feed`/`search` 完全正常。

**原因**：whoami/creator-* 系列命令依赖**创作服务平台**登录态，与 www 浏览登录态是分开的两套 cookie；创作平台掉登录不影响采集。

**解决**：通道探活一律用 `opencli --profile <id> xiaohongshu feed --limit 3 -f json`，**不要用 whoami**；只有需要创作者数据时才修 creator 登录。

### 11. Python subprocess 调 opencli.cmd 会把签名 URL 在 `&` 处截断（2026-09-12 实测，Windows 关键坑）

**现象**：脚本里 `subprocess.run(["opencli.cmd", ..., "note", "https://...?xsec_token=xx&xsec_source="])` 后，opencli 只收到 `&` 前的半截 URL，报 `'xsec_source' is not recognized as an internal or external command`，且 `-f json` 参数丢失、输出退化成 YAML field 列表。

**原因**：`opencli.cmd` 是 cmd.exe 批处理 shim，cmd 把 `&` 当命令分隔符，Python 的 list-argv 会被拼进 cmd 命令行后重新解析。直接 `subprocess.run(["opencli", ...])` 还会因 WinError 2（找不到裸 exe）失败。

**解决**：**绕开 .cmd shim，用 node 直调真实入口**：
```python
MAIN_JS = Path(r"C:\Users\<user>\AppData\Roaming\npm\node_modules\@jackwener\opencli\dist\src\main.js")
cmd = ["node", str(MAIN_JS), "--profile", PROFILE, "xiaohongshu", "note", url, "-f", "json"]
subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
```
入口路径从 `opencli.cmd` 内容最后一行可读出。PowerShell 里直接调用（单引号包 URL 或双引号+`%` 转义）不受此影响。

### 12. PowerShell 5.1 `Tee-Object` 落盘是 UTF-16 LE，Python json 直接读会炸（2026-09-12 实测）

**现象**：`opencli ... -f json | Tee-Object file.json` 后，Python `json.loads(open(f, encoding='utf-8-sig').read())` 报 `0xff invalid start byte`。

**原因**：PS 5.1 的 Tee-Object/Set-Content 默认 UTF-16 LE + BOM（`FF FE` 开头），不是 UTF-8。

**解决**：读取端做 BOM 嗅探（`utf-16` / `utf-8-sig` / `utf-8` 三级 fallback）；或写入端显式转码：`$out | Out-File $f -Encoding utf8`。调研脚本里封装一个 `read_json()` 工具函数一劳永逸。

### 13. opencli note 输出是 `[{field, value}]` 摊平结构（2026-09-12 实测）

**现象**：`xiaohongshu note <url> -f json` 返回的不是嵌套对象，而是 `[{"field":"title","value":...}, {"field":"content","value":...}, ...]`（含 title/author/content/likes/collects/comments/tags）。

**解决**：解析时先摊平 `{i["field"]: i["value"]}` 再取字段；不要按 dict 或嵌套结构假设。

### 14. `<site> login` 的轮询会把你正在输入的登录页导走（2026-09-17 源码级确证，通用）

**现象**：用户在浏览器里手动登录某站点，输到一半页面被刷回首页；或 `opencli <site> login` 跑着跑着，
用户"刚登录又自动退掉"。容易被误判为站点风控熔断。

**根因**：`clis/_shared/site-auth.js` 的 login 循环每 2 秒调一次该站点注册的 `poll` 函数：
```js
await page.goto(config.loginUrl);
while (Date.now() < deadline) {
  await page.wait(2);
  const identity = await tryProbe(config, page, 'poll');   // ← 每 2 秒
}
```
**如果这个站点的 poll 函数第一行是 `page.goto(...)`，就会每 2 秒把当前页面导航一次**，
直接打断人工登录流程。脉脉是已确认的案例（`clis/maimai/auth.js:29-31`），
因为它的登录信号是服务端内联渲染的 `userObj = JSON.parse('{...}')`，不重新加载页面就读不到。

**判断方法**：读 `clis/<site>/auth.js`，看注册给 `poll:` 的函数第一行是不是 `page.goto`。

**解决**：
1. 这类站点**不要用 `opencli <site> login`**；
2. 人工在 Chrome 里登录，**期间不执行该站点的任何 opencli 命令**（whoami 也不行，它同样会 goto）；
3. 登录完成后再单独跑一次 `whoami` 验证。

**教训**：把"登录态掉线"归因给站点风控之前，先读适配器源码看是不是自己把页面冲掉了。
源码里能读到的确定解释，优先于反爬推测。

### 15. Git Bash 里 `命令 | python -c "..."` 会被 .cmd shim 搅坏（2026-09-16 实测，Windows）

**现象**：`opencli ... -f json | python -c "import json,sys; ..."` 报
`IndentationError: unexpected indent`，错误行内容却是 `|| goto :error`——明显是批处理文件的内容被喂给了 python。

**原因**：Windows 上 `opencli` / 部分 `python` 是 `.cmd` 批处理 shim，管道 + `-c` 多行脚本组合时参数被 cmd 重新解析。

**解决**（任选）：
- **先落盘再解析**：`opencli ... -f json > out.json` 然后 `python - out.json <<'EOF' ... EOF`（heredoc 传脚本、文件传数据）
- **改用 `node -e`**：实测不受影响
- 另外，Git Bash 里 python 打印中文会乱码（stdout 编码），验数据时加 `PYTHONIOENCODING=utf-8 PYTHONUTF8=1`，
  否则会把**显示层乱码误判成数据层乱码**（已踩过：51job JD 正文实际是完好 UTF-8）

### 16. git / curl 网络操作在 Bash 工具里 TLS 握手失败，改用 PowerShell（2026-09-17 实测）

**现象**：同一台机器、同一时刻——
- Bash 工具里：`git push` 报 `TLS connect error: error:0A000126:SSL routines::unexpected eof while reading`；
  `curl https://github.com/` 报 `schannel: failed to receive handshake`。加不加代理、开不开沙箱都一样
- PowerShell 工具里：设 `$env:HTTP_PROXY/$env:HTTPS_PROXY="http://127.0.0.1:7897"` 后 `git push` **一次成功**

**注意**：Bash 侧 `HTTPS_PROXY` 环境变量**本来就是设好的**，所以差异不只是代理变量，
而是两个工具走的 TLS 栈不同（Bash 侧 curl 报的是 schannel，Windows 原生 TLS）。根因未深究。

**解决**：**凡是 git 的网络操作（push / pull / clone / fetch origin）一律用 PowerShell 工具执行**，
命令前显式带上代理变量。Bash 只用于本地 git 操作（status/diff/commit/本地路径 fetch）。

**连带经验**：本地路径可以当远程用——`git -C <copy> pull --ff-only <canonical-path> HEAD`
可以在完全离线的情况下同步多个副本，不必等 origin 可达。
先用 `git merge-base --is-ancestor A B` 确认是纯快进再做。

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

### 一亩三分地 1point3acres（站点迁移新版前端，2026-09-16 实测）

**状态**：适配器失效，上游未跟进（#2145 修复被站点迁移超越）；浏览器通道可用

**现象**：
- `whoami`：已登录（`_auth` cookie 存在，HttpOnly）仍报 `AUTH_REQUIRED: bbs rendered but no logged-in identity`
- `forum`（公开策略）：打旧端点 `/bbs/forum-*.html` 返回 403
- `search`：登录闸门复用同一失效检测 → AUTH_REQUIRED

**原因**：站点从 Discuz BBS 迁移到新版 `/home` 前端，旧 `/bbs/` URL 重定向到 `/home`；v1.8.7 依赖的旧标记 `#um` / `#g_upmine` / `a[title="访问我的空间"]` / `.vwmy a` / `a.username` 在新版页面全部不存在。

**新版登录态锚点（实测）**：`img[src*="avatar.1p3a.com"]`（仅登录态渲染，路径含 Discuz 目录散列可反推 uid）。

**浏览器通道（已验证可用）**：`opencli browser <session> open "https://www.1point3acres.com/home/forum/<fid>"` + eval 抽取帖子（标题 + `/home/thread/<id>` 链接）；搜索页 `/home/search?q=<kw>` 加载正常但结果需搜索框交互后异步渲染。

> **2026-09-17 独立复现**：另一环境同日实测完全一致——`forums`（Node 直连）匿名/登录均 403，`whoami` 报
> `bbs rendered but no #um identity — anonymous or shape drifted`，`search` 报 AUTH_REQUIRED。
> **补充定位**：`digest/forum/forums/hot/latest/thread/user` 全是 `browser:false`（Node 直连，必 403），
> **唯一走浏览器的只读命令是 `search`**。用户若只登录新版 `/home` 仍不够，适配器查的是 `/bbs/` 侧身份。

### 脉脉 maimai（三处故障，2026-09-16 实测）

> ⚠️ **本节结论已被 2026-09-17 的实测部分推翻，见文末「结论更新」。技术细节仍有效，保留。**

**状态（2026-09-16 判定）**：不可用；判定不值得投入（求职侧）

**现象**：
1. `whoami`：已登录（cookie `u`/`u.sig`/`session` 存在）仍报 `AUTH_REQUIRED: Maimai userObj missing from page`——旧版页面内联 `userObj = JSON.parse(...)` 脚本已不再注入（上游 #1876 中作者自认该方案为待确认 best-effort）
2. `search-talents`：报 `UNKNOWN: page.waitForTimeout is not a function`——`clis/maimai/search-talents.js:55` 用了桥接 page 对象不存在的方法；其余适配器统一用 `page.wait(秒)`。**修复建议：改 `await page.wait(5);`**
3. `search-talents` 目标页 `maimai.cn/ent/talents/discover/search_v2` 无招聘端权限时重定向 `/platform/login`；且适配器读取的 `csrftoken` cookie 现为 `n_csrf_token`（名称漂移）

**额外风险**：自动探测招聘端专属页疑似触发华为云 WAF 风控，登录会话被踢（`u` cookie 消失、页面回退"登录/注册"）。

**2026-09-16 修复实测（本地 v1.8.7）**：
- 登录态实测确认：v6pz9gjx 浏览器内已登录；`whoami` 报 `AUTH_REQUIRED (anonymous)` 为适配器误报（userObj 检测过时）
- 本地修复两处后重测：`page.waitForTimeout(5000)`→`page.wait(5)` 生效；`csrftoken`→`n_csrf_token` 生效（fetch 可发出）。升级后若被覆盖需重打
- 但 fetch 返回 401/403 → **个人账号无脉脉企业招聘端权限**，search_v2 页面被重定向、API 拒绝。这是账号权限边界，非代码 bug

#### 🔄 结论更新（2026-09-17，另一环境实测）

上面"maimai 对求职侧确认不可用"的定论**只对官方内置的三条命令成立**，对站点本身不成立：

- **职言（C 端内容）通道已打通**：`https://maimai.cn/web/search_center?type=gossip&query=<kw>` 是登录态下可直读的
  老版 SSR 页，已据此自建 `maimai search-gossip`（返回帖子**全文** + 稳定 `gid`）并通过官方
  `verify --strict-memory`。详见 [adapter-maimai.md](adapter-maimai.md)
- **掉线真凶另有其人**：不是 WAF，而是 `_shared/site-auth.js` 的 login 轮询每 2 秒调 poll，
  而脉脉的 poll 第一行就是 `page.goto('https://maimai.cn/')`——把人工登录页反复导走。见本文件 §14
- **Token 解耦路线已证伪**：浏览器 cookie 拿到 Node 侧直连 → 204 →补全 XHR 头仍 204 →
  CSRF 握手后 `403 error_code 20001「此设备已被操作下线」`＝会话与设备绑定
- ⚠️ **待核对分歧**：上文称 cookie 名漂移为 `n_csrf_token`；2026-09-17 实测服务器响应头会主动
  `set-cookie: csrftoken=...; httponly` 并回 `x-csrf-token`。两者可能同时存在（`document.cookie` 看不到 HttpOnly 的那个，
  但适配器走 CDP `page.getCookies()` 能看到）。**谁对未最终确认**，改适配器前先实测一次 `page.getCookies()`

### 活动行 huodongxing（限流 busy 页，2026-09-16 实测）

**状态**：v1.8.7 已修复识别（上游 #2103），限流触发后需长冷却

**现象**：`events` 命中 busy 页（页面文案「当前访问人数过多，请休息片刻重试 / ERROR CODE: ...」）
- v1.8.6：误报 `EMPTY_RESULT`（适配器不识别该文案）
- v1.8.7：正确报 `COMMAND_EXEC: temporary busy/access page`，并自动从同一会话重试一次

**经验**：多次连续探测会累积触发 IP 限流（本机 4 次探测后持续限流）；触发后冷却以小时计；保持低频使用。

### BOSS直聘（v1.8.7 恢复技术可用，但本机仍为账号级禁区）

**技术层面（2026-09-16 实测）**：v1.8.7 含 fix #2291（restore read-only job search/detail）+ #2198
（probe current geek jobs route）后，`search` 恢复正常，实测"光谱"返回完整字段。

**⚠️ 但本机策略层面（2026-09-17）：仍是禁区，且优先级高于"技术可用"这一事实。**
2026-08-15 因短时多次触发采集任务，**真实求职账号被限制访问 24 小时**。
BOSS 数据改走**人工单次通道**，**OpenCLI 侧不做任何自动化**——
两者共用同一套浏览器指纹与登录态。详见 [job-platforms.md](job-platforms.md) §六。

> 合并说明：这两条不矛盾——"适配器能跑"与"该不该用它跑"是两个问题。账号风险优先。

> **版本提示（2026-09-17 收尾更新）**：本机已从 1.8.6 升级到 **v1.8.7**，上述标注 v1.8.7 的修复结论现已成立。
> 但 §8（`daemon start` 不存在）等标注 v1.8.6 的条目属历史记录，保留以便回溯。
> **升级后必做**：自建适配器在 `~/.opencli/clis/` 不受升级影响，但**对官方适配器的本地修改会被覆盖**（如脉脉 `page.wait` / `n_csrf_token` 两处补丁），需重打。

## 进化日志

### 2026-08-19 初始验证

- ✅ 验证 BOSS 直聘适配器：search/detail 可用，需 foreground+persistent 参数
- ✅ 验证小红书适配器：feed/search/whoami 可用，note 需完整 URL
- ✅ 验证公开 API 适配器：hackernews/wttr/arxiv/npm/bilibili 正常
- ⚠️ 发现 ChatGPT 适配器因 UI 改版部分失效
- 📝 创建 adapter-boss.md、adapter-xiaohongshu.md、adapter-public-api.md

### 2026-08-20 系统全局安装

- ✅ OpenCLI 全局安装到 npm 全局目录（Windows 为 `%APPDATA%\npm`），任意终端可调用
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

### 2026-09-10 v2ex 适配器命令清单核对

- ⚠️ SKILL.md/verified-platforms.md 未明确列出 v2ex **没有 `search` 命令**；直接尝试 `opencli v2ex search ... ` 报 `error: unknown command 'search'`
- ✅ 实际命令清单（`opencli v2ex --help`）：`daily, hot, latest, login, me, member, node, nodes, notifications, replies, topic, user, whoami`；全文检索类需求只能靠 `node <name>` 拉指定节点列表 + 人工筛选，或用 `hot`/`latest` 泛读，**没有关键词搜索能力**
- 📌 通用教训：适配器命令集不能假设"其他平台常见命令它也有"（如 search/comments），调用前先跑一次 `opencli <adapter> --help` 确认真实命令清单，尤其是速查表里没写全命令的平台
- 📝 待补：`adapter-v2ex.md`（目前只在 verified-platforms.md 里有一行，未单独立卡）——下次深入用 v2ex 时应创建独立文件并写清"无 search，靠 node/hot/latest"这条限制

---

### 2026-09-12 Agent Harness 领域调研（千问工作助理环境首战）

- ✅ 新环境部署：千问工作助理（Windows）SkillImport 安装本 skill 成功；opencli v1.8.6 全局可用，daemon restart 拉起，profile v6pz9gjx 桥接正常
- ✅ 单平台批量采集实测：11 组关键词（6 组命中）→ 58 篇去重 → **51 篇 note 全文精读零风控**（7s 间隔）——再次验证 note 通道远比 search 宽松，"先攒 search 列表、后批量精读"策略成立
- ✅ 调研成果：Agent Harness 领域（DSH/Pi/Hermes/Cordis 路线之争）关键词图谱+路线分析报告，存 `E:\program\GIT\media\research\2026-09-12-agent-harness\`
- ⚠️ 本次踩坑 6 条已固化为本文件通用问题 §8-§13：daemon 无 start / 无 --timeout / whoami 走 creator 站点（探活用 feed）/ Python 调 .cmd shim 截断签名 URL（node 直调 main.js）/ Tee-Object UTF-16 编码坑 / note 输出 field-value 摊平结构
- ⚠️ search 累积限流复现：第 6 词后 OpenClaw/harness论文/harness对比/上下文工程 四连空数组（feed 探活正常），与 §6 长会话累积限流模式一致；本次靠"转 note 精读"完成调研，未硬等冷却
- 📝 待办：`OpenClaw`、`上下文工程` 两个关键词在冷却充分后补跑

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
