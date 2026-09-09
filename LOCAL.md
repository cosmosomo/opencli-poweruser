# LOCAL — 本机专属方法论与环境

> ⚠️ **本文件为本机专属，不打包进入 GitHub，不公开分享。**
> 包含本机工具链状态、目录结构、登录状态、专属工作流串联。
> 公开版 skill 不应包含此文件。

---

## 1. 本机环境概览

| 项目 | 版本/状态 | 验证日期 |
|---|---|---|
| 操作系统 | Windows | — |
| Python（sandbox 默认） | 3.14.7 | 2026-09-05 |
| Python（pyenv 3.12.4，有 faster-whisper） | 3.12.4 | 2026-09-05 |
| OpenCLI | 1.8.7 | 2026-09-03 |
| yt-dlp（独立 exe） | 2026.08.19 | 2026-09-05 |
| yt-dlp（pyenv 模块） | 2026.07.4 | 2026-09-05 |
| ffmpeg | ⚠️ imageio-ffmpeg 自带（非系统 PATH） | 2026-09-05 |
| bili2rag | ❌ 未安装 | 2026-08-30 |
| faster-whisper | ✅ 1.2.0（pyenv 3.12.4） | 2026-09-05 |
| torch（CUDA 12.8） | 2.9.0.dev | 2026-09-05 |
| Chrome 扩展（Browser Bridge） | ✅ 已连接，2 个 profile | 2026-08-27 |

### 默认浏览器 Profile
- **默认使用 `v6pz9gjx`**（新浏览器，已登录各网站）
- 另一个 profile：`svxyqy6c`
- daemon 运行端口：19825
- 默认窗口模式：background（`$env:OPENCLI_WINDOW="background"`）

### Python 解释器路径
- **ASR 脚本必须用 pyenv 3.12.4**：`C:\Users\COLORFIRE\.pyenv\pyenv-win\versions\3.12.4\python.exe`
- 默认 `python` 指向 sandbox 的 3.14.7（没有 faster-whisper）

---

## 2. 本机工具链状态

### ✅ 已安装可用

| 工具 | 用途 | 调用方式 |
|---|---|---|
| OpenCLI | 163+ 网站适配器数据采集 | `opencli <adapter> <command>` |
| yt-dlp（独立 exe） | 视频/音频下载 | `yt-dlp.exe`（在 `%APPDATA%\npm\`） |
| yt-dlp（Python 模块） | 脚本内调用 | `python -m yt_dlp`（pyenv 3.12.4） |
| faster-whisper | 本地语音转写 | `python scripts/bili_asr.py`（pyenv 3.12.4） |
| imageio-ffmpeg | ffmpeg 二进制（yt-dlp 合并用） | 脚本自动定位 |
| Python 3.12.4（pyenv） | ASR 脚本运行 | 完整路径调用 |

### ❌ 待安装（安装后可解锁能力）

| 工具 | 解锁能力 | 安装方式 | 优先级 |
|---|---|---|---|
| ffmpeg（系统 PATH） | 音视频转码、帧提取 | `winget install ffmpeg` | 中（imageio-ffmpeg 已够用） |
| bili2rag | B站视频→本地 RAG 语料库端到端管道 | `git clone https://github.com/cosmosomo/bili2rag && pip install -e .` | 中 |

---

## 3. 本机专属工作流串联

### 3.1 有字幕视频：OpenCLI 直接搞定

```
opencli bilibili search "关键词" --limit 20
    → opencli bilibili subtitle <bvid>      # 拿字幕
    → opencli bilibili comments <bvid>      # 拿评论
    → opencli bilibili summary <bvid>       # 拿官方 AI 总结
```
输出 JSON，脚本处理后入库。无需外部工具。

### 3.2 无字幕视频：ASR 一键转写（✅ 已打通）

```
python scripts/bili_asr.py <bvid> --model small --format srt
```

完整流程：
1. 从浏览器获取 B站 cookie（`opencli browser eval "document.cookie"`）
2. yt-dlp 只下载音频（bestaudio/m4a，快 3-5 倍）
3. faster-whisper 转写（自动 CUDA→CPU fallback）
4. 输出字幕（srt/vtt/txt/json）

**关键环境配置**（脚本已内置）：
- `HF_ENDPOINT=https://hf-mirror.com`（HuggingFace 镜像）
- `HF_HUB_DISABLE_XET=1`（禁用 xet CDN，国内无法解析）

**模型选择**：
- CPU：`small`（6 分钟音频约 5-10 分钟）或 `tiny`（快速但质量差）
- GPU：`medium` 或 `large-v3`（质量高，速度快 5-10x）

**测试验证**：BV1FQtt6JEKs（6.9 分钟）→ small 模型 CPU → 236 段字幕 ✅

### 3.3 批量 B站视频→RAG 语料库：用 bili2rag（待安装）

```
# 单视频端到端
bili2rag run --url BVxxx --cookies cookie.txt --prune-output

# 批量抓取整个 UP 主
python -m bilibili_get grab-uploader --seed-bvid BVxxx --new-limit 0 --cookies cookie.txt
```

### 3.4 OpenCLI + bili_asr + bili2rag 串联

```
1. OpenCLI 发现：opencli bilibili search / hot / user-videos → BV 号列表
2. 单视频快速转写：python scripts/bili_asr.py BVxxx → 字幕
3. 批量 RAG 库：bili2rag grab-targets --targets-file bv_list.txt
4. 文本入库：纳入知识空间
```

---

## 4. 本机目录结构

### 知识空间（独立于 skill 的内容资产）
```
E:\program\media\knowledge-space\
├── chatgpt/           # ChatGPT 导出对话（57篇，9议题分类）
└── xiaohongshu/       # 小红书调研项目
    └── sdd-research/  # SDD 主题调研（189文件，5流程阶段）
```

### Skill 维护工作区
```
E:\program\media\opencli-skill-dev\
└── discussions/       # 讨论记录（提案、工作流、经验总结）
```

### Skill 本体（加载目录）
```
C:\Users\COLORFIRE\AppData\Local\Doubao\User Data\Default\.doubao\agent_mode\workspace\.user_skills\opencli-poweruser\
├── SKILL.md
├── SETUP.md
├── EVOLUTION.md
├── LOCAL.md           ← 本文件（本机专属）
├── .gitignore
├── scripts/
│   └── bili_asr.py    # B站 ASR 一键转写脚本
└── references/
    ├── verified-platforms.md
    ├── pitfalls.md
    ├── adapter-boss.md
    ├── adapter-xiaohongshu.md
    ├── adapter-zhihu.md
    ├── adapter-public-api.md
    ├── research-sop.md
    ├── research-scripts.md
    ├── anti-bot-notes.md
    ├── new-site-exploration.md
    ├── data-quality-checklist.md
    ├── site-memory-guide.md
    └── bilibili-asr-workflow.md
```

### 其他相关项目
```
E:\program\GIT\rag2026\sdd-projects\xhs_search\   # 小红书 SDD 调研原项目
E:\program\media\bilibili_cookies.txt               # B站 cookie（key=value）
E:\program\media\bilibili_cookies_netscape.txt      # B站 cookie（Netscape，无 BOM）
E:\program\media\bili-asr-test\                     # ASR 测试目录
```

---

## 5. 本机平台登录状态摘要

| 平台 | 适配器 | 登录状态 | 备注 |
|---|---|---|---|
| 小红书 | xiaohongshu | ✅ 已登录 | note/comments/download 需完整签名 URL |
| 知乎 | zhihu | ✅ 已登录 | 深度长文质量高 |
| GitHub | github | ✅ 已登录 | 适配器只有 whoami；发现项目用 github-trending |
| Reddit | reddit | ✅ 已登录 | AI 编程/找工质量极高 |
| V2EX | v2ex | ✅ 已登录 | 国内程序员真实讨论 |
| linux.do | linux-do | ✅ 已登录 | whoami 误报 bug，feed 正常 |
| 掘金 | juejin | ✅ 可用（无需登录） | 只有 hot/recommend |
| B站 | bilibili | ✅ 已登录（智慧与文明，Lv2） | 27 个命令；download 需 yt-dlp.exe |
| BOSS 直聘 | boss | ⏸️ 搁置 | 反爬严格，纯自动化不可行 |

---

## 6. 本机认证 / Cookie 状态

| 平台 | Cookie 状态 | 敏感凭证 | 导出文件 |
|---|---|---|---|
| B站 | ✅ 已导出（23个非 HttpOnly cookie） | ❌ SESSDATA（HttpOnly） | `E:\program\media\bilibili_cookies*.txt` |
| 小红书 | ✅ 浏览器登录态 | 不导出 | — |
| 知乎 | ✅ 浏览器登录态 | 不导出 | — |
| Reddit | ✅ 浏览器登录态 | 不导出 | — |

> B站 cookie 已足够绕过 412（不需要 SESSDATA）。bili2rag 的搜索/上传者发现可能需要 SESSDATA。

---

## 7. 本机专属方法论

### 7.1 OpenCLI 的能力边界（本机已验证）

**OpenCLI 能做的**：调用网站已有功能和数据（搜索、元数据、字幕、评论、AI总结、下载、动态、历史、写操作）。

**OpenCLI 不能做的**：
- ❌ 本地 ASR 语音转写（但可通过 scripts/bili_asr.py 弥补）
- ❌ 本地媒体处理（转码、帧提取）
- ❌ 批量并行引擎（需外部脚本循环）
- ❌ 读取 HttpOnly cookie（如 B站 SESSDATA）

**弥补方式**：OpenCLI 负责发现和查询，外部工具（bili_asr / bili2rag / yt-dlp）负责端到端处理。

### 7.2 无字幕视频内容获取决策树

```
视频有字幕？
├─ 有 → opencli bilibili subtitle <bvid> → 直接拿文本
└─ 无 → 视频有官方 AI 总结？
    ├─ 有 → opencli bilibili summary <bvid> → 拿分段大纲（但不是全文）
    └─ 无 → 需要 ASR？
        ├─ ✅ 用 scripts/bili_asr.py <bvid> → 一键转写（已打通）
        └─ 批量 → bili2rag（待安装）
```

### 7.3 Windows 环境特殊注意事项

1. **opencli download 的 ENOENT**：Node.js spawn 找不到 pyenv shim 的 yt-dlp。解决：下载独立 yt-dlp.exe 放到 `%APPDATA%\npm\`。
2. **Python 解释器**：默认 `python` 是 sandbox 3.14.7，ASR 必须用 pyenv 3.12.4 完整路径。
3. **HuggingFace 下载**：必须设 `HF_ENDPOINT=https://hf-mirror.com` + `HF_HUB_DISABLE_XET=1`（xethub CDN 国内无法解析）。
4. **cookie 文件 BOM**：PowerShell `Out-File` 会加 BOM，yt-dlp 无法识别。用 Python 写文件或去 BOM。
5. **yt-dlp 只下音频**：用 `-f bestaudio` 不加 `-x`，避免需要 ffprobe。B站音频本身是 m4a，不需要转换。

---

## 8. 待办（本机环境优化）

- [ ] 安装 bili2rag（`git clone` + `pip install -e .`），解锁 B站批量 RAG 管道
- [ ] 用浏览器扩展导出 B站完整 cookie（含 SESSDATA），用于 bili2rag
- [ ] 测试 GPU 加速 ASR（`--device cuda`，当前 CUDA fallback 到 CPU，需排查）
- [ ] 安装系统 ffmpeg 到 PATH（可选，imageio-ffmpeg 已够用）
- [x] 升级 OpenCLI 至 1.8.7（2026-09-03）
- [x] 安装 faster-whisper 1.2.0（pyenv 3.12.4）
- [x] 下载独立 yt-dlp.exe 到 npm 全局目录（解决 opencli ENOENT）
- [x] 打通 B站 ASR 工作流（scripts/bili_asr.py，2026-09-05）

---

*本文件最后更新：2026-09-05*
