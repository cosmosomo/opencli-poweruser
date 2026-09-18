# B站适配器经验

> 登录态验证：2026-08-27 · 命令清单 L0 复核：2026-09-17（opencli v1.8.7）· 两版并集合并：2026-09-18
> 渠道职能：**视频形式的方法论**——教程、经验分享、直播切片。信息密度低于图文，
> 但叙事完整，适合"某个 UP 主的系统性方法论"单点深挖，不适合批量扫描。
> 配套：[bilibili-asr-workflow.md](bilibili-asr-workflow.md)（无字幕视频 → ASR 转写，第四层工作流）

## 认证方式

✅ 已登录（profile `v6pz9gjx`），COOKIE 策略——通过浏览器扩展在页面内执行 JS 抓数据。
`search` / `hot` / `video` / `summary` 等公开内容免登录可读；
`me` / `history` / `favorite` / `dynamic` 需登录。实践上建议保持 Chrome 登录态。

登录验证：`opencli bilibili whoami -f json`

## 可用命令（L0 实录，21 条 —— 不是 21 条以外的数字）

> ⚠️ **纠正**：`LOCAL.md` 曾记"27 个命令"，L0 实录为 **21 条**。以 `--help` 为准。

### [read] 只读（安全）

| 命令 | 用途 |
|---|---|
| `whoami` / `me` | 当前登录账号 / 个人资料 |
| `search <query>` | 搜索视频或用户 |
| `hot` | 热门视频 |
| `ranking` | 排行榜 |
| `video <bvid>` | 视频元数据（标题、作者、时长、统计） |
| **`subtitle <bvid>`** | **拿字幕——有字幕时的首选，零成本拿全文** |
| **`summary <bvid>`** | **官方 AI 总结**（视频页「AI总结」同款，含分段大纲与时间戳） |
| `comments <bvid>` | 视频评论（官方 API；`--parent <rpid>` 读楼中楼） |
| `download <bvid>` | 下载视频（需 yt-dlp，⚠️ 见下） |
| `user-videos <uid>` | 指定用户投稿 |
| `following [uid]` | 关注列表 |
| `feed [uid]` / `feed-detail <id>` | 动态时间线 / 动态详情 |
| `dynamic` | 用户动态流 |
| `history` | 我的观看历史 |

### [write] 写操作（⚠️ 需用户明确授权）

`comment <bvid> <message>`（发评论）、`favorite`（收藏）、`follow` / `unfollow`（关注/取关）、`login`

> ⚠️ 与 Reddit 同型陷阱：**`comments`（复数）是读，`comment`（单数）是写**。手滑一个字母就发出去了。

## 内容获取决策树（先便宜后贵）

```
需要视频内容？
├─ 有字幕？ → subtitle <bvid>            ← 零成本拿全文，首选
├─ 无字幕/字幕差？ → summary <bvid>       ← 零成本拿分段大纲（不是全文）
└─ 都不够 → ASR 转写                      ← 最贵，见 bilibili-asr-workflow.md
              python scripts/bili_asr.py <bvid>
```

**先判断价值再转写**：看 `video` 的统计 + `comments` 高赞 → 再决定要不要付 ASR 的成本。

> **两个口径的取舍说明**：09-17 探针批次主张「`search` → `summary` → 有价值才 ASR」，称 `summary`
> 是零成本精读入口、能覆盖大部分干货；但该批次把 `subtitle` 标为"待实测"。
> 本卡仍把 `subtitle` 排在前面——**它给全文，`summary` 只给大纲**，有字幕时全文严格优于大纲。
> `summary` 的价值在**无字幕时替代 ASR**，这一点两版一致。

`summary` 的粒度实测：对一条"校招大模型算法简历修改"视频（22750 分）跑 `summary`，
拿到了逐行修改建议，**全程零下载零转写**——说明它不止是标题级摘要。

## ⚠️ download 在 Windows 上不可靠，音频请直接用 yt-dlp

| 问题 | 说明 |
|---|---|
| `opencli download` 报 ENOENT | Node spawn 找不到 pyenv shim 的 yt-dlp → 装独立 `yt-dlp.exe` 到 `%APPDATA%\npm\` |
| `download` 只下视频流无音频 | 做 ASR 时白下 → 直接 `yt-dlp -f bestaudio`（m4a），**快 3-5 倍** |
| B站 412 | 下载需 cookie → 从浏览器取；`bili_asr.py` 已自动处理，或 `--cookies` 指定 |

## 搜索行为

搜索结果按相关度排序，高播放量视频通常排在前列——**可以直接取前几条做初筛**，
不必翻页找"最热"。

## 反爬与节奏

公开 API 型，**风险低**：搜索与 `summary` 限流宽松，未遇严重风控，无特殊参数。
批量下载视频需注意频率。

## 能力边界：取得到什么 / 取不到什么

| ✅ 取得到 | 成本 |
|---|---|
| 视频元数据（标题/作者/时长/统计） | 一次调用 |
| **字幕全文**（若该视频有字幕） | 一次调用，**最便宜的取文方式** |
| **官方 AI 总结**（分段大纲 + 时间戳） | 一次调用，是大纲不是全文 |
| 评论（含楼中楼 `--parent`） | 一次调用 |
| 用户投稿 / 关注 / 动态 / 观看历史 | 一次调用 |

| ❌ 取不到 | 影响 |
|---|---|
| **无字幕视频的正文** | 适配器内没有 ASR → 必须外部转写（`scripts/bili_asr.py`），这是**唯一的高成本路径** |
| 可靠的音频下载 | `download` 在 Windows 报 ENOENT 且只下视频流 → 走独立 yt-dlp |

→ 取文成本是三级阶梯：`subtitle`（免费全文）→ `summary`（免费大纲）→ ASR（贵）。
**先判断值不值得，再决定要不要付第三级的成本。**

## 待完善

- [ ] `search` / `summary` / `subtitle` 的输出字段结构
- [ ] 批量采集的限流实测下限

## 变更记录

| 日期 | 变更 |
|---|---|
| 2026-08-27 | 登录态首验（原一行记于 adapter-public-api.md） |
| 2026-09-05 | ASR 工作流打通（`scripts/bili_asr.py`，另见 bilibili-asr-workflow.md） |
| 2026-09-17 | 独立成卡；L0 复核命令清单（**纠正"27 条"为 21 条**）；标出 `comment`/`comments` 读写陷阱 |
| 2026-09-17 | AntiGravity 委托探针批次：`summary` 零成本精读实测、搜索排序行为、限流评估 |
| 2026-09-18 | 两个智能体各写一版，按语义并集合并；取文优先级冲突按证据强弱裁定（`subtitle` 给全文 > `summary` 给大纲，且探针批次未实测 `subtitle`），并在卡内写明取舍理由 |

---

*本文件最后更新：2026-09-18*
