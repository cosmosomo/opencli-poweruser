# B站视频 ASR 转写工作流

> 用 OpenCLI + yt-dlp + faster-whisper 实现 B站视频 → 字幕的一键转写。
> 脚本：`scripts/bili_asr.py`

---

## 1. 工作流概述

```
B站 BV号 → yt-dlp 下载音频(bestaudio/m4a) → faster-whisper ASR → 字幕(srt/vtt/txt/json)
```

**为什么不用 opencli bilibili download？**
- opencli download 内部 spawn yt-dlp 在 Windows 上常报 `ENOENT`（已通过安装独立 yt-dlp.exe 部分解决）
- opencli download 只下载视频流（无音频），需要额外合并
- 直接用 yt-dlp 只下载音频（bestaudio），速度快 3-5 倍，且不需要 ffmpeg 合并

**为什么不用 opencli bilibili subtitle？**
- `subtitle` 只能获取有官方字幕的视频
- 大量 B站视频没有字幕，需要 ASR 转写
- `summary`（官方 AI 总结）只给大纲，不给逐字稿

---

## 2. 环境要求

| 依赖 | 版本 | 安装方式 | 备注 |
|---|---|---|---|
| Python | 3.10+（推荐 3.12） | pyenv / 官网 | 必须用安装了 faster-whisper 的解释器 |
| faster-whisper | 1.0+ | `pip install faster-whisper` | CTranslate2 加速，比 openai-whisper 快 4x |
| yt-dlp | 2024+ | `pip install yt-dlp` 或独立 .exe | 独立 .exe 放 PATH 可解决 opencli ENOENT |
| imageio-ffmpeg | 任意 | `pip install imageio-ffmpeg` | 提供 ffmpeg 二进制（仅视频合并时需要） |
| opencli | 1.8.6+ | npm 全局安装 | 用于从浏览器获取 cookie |
| CUDA（可选） | 11.8+ | GPU 驱动 | 转写速度提升 5-10x |

### 中国网络环境配置

脚本自动设置以下环境变量（在脚本开头）：

```python
os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")
os.environ.setdefault("HF_HUB_DISABLE_XET", "1")
```

- `HF_ENDPOINT`：HuggingFace 镜像，解决模型下载超时
- `HF_HUB_DISABLE_XET`：禁用 xet 下载协议（xet CDN 域名 `cas-bridge.xethub.hf.co` 在国内无法解析）

---

## 3. 使用方法

### 3.1 基本用法

```bash
# 用安装了 faster-whisper 的 Python 解释器
C:\Users\<user>\.pyenv\pyenv-win\versions\3.12.4\python.exe \
  scripts/bili_asr.py BV1ZJtu6tEyd
```

默认参数：`--model small --language zh --format srt --device cuda`

### 3.2 常用参数

| 参数 | 默认值 | 说明 |
|---|---|---|
| `input` | 必填 | BV号（如 `BV1xx`）或本地音视频文件路径 |
| `--model` | `small` | tiny/base/small/medium/large-v3/large-v3-turbo |
| `--language` | `zh` | 语言代码，留空自动检测 |
| `--format` | `srt` | srt/vtt/txt/json |
| `--device` | `cuda` | cuda/cpu，CUDA 失败自动 fallback 到 CPU |
| `--output-dir` | `./bili-asr-output` | 输出目录 |
| `--cookies` | 自动获取 | B站 cookie 文件（Netscape 格式），不指定则从浏览器获取 |
| `--profile` | 无 | OpenCLI browser profile（用于获取 cookie） |
| `--keep-audio` | false | 保留下载的音频文件 |

### 3.3 示例

```bash
# 高质量转写（medium 模型 + GPU）
python bili_asr.py BV1xx --model medium --device cuda

# 转写本地音频文件
python bili_asr.py recording.m4a --format txt

# 指定 cookie 文件（浏览器未登录时）
python bili_asr.py BV1xx --cookies bilibili_cookies.txt

# 纯文本输出（方便后续分析）
python bili_asr.py BV1xx --format txt
```

---

## 4. Cookie 处理

### 4.1 为什么需要 cookie

B站对未登录请求返回 `HTTP 412 Precondition Failed`。需要有效的 cookie（至少包含 `buvid3`、`bili_jct`、`DedeUserID` 等）。

### 4.2 自动获取（推荐）

脚本默认用 `opencli browser eval "document.cookie"` 从已登录的 Chrome 获取 cookie。

前提：
- OpenCLI daemon 运行中
- Chrome 已登录 B站
- 浏览器扩展已连接

注意：`document.cookie` 无法获取 HttpOnly cookie（如 `SESSDATA`），但 23 个非 HttpOnly cookie 已足够绕过 412。

### 4.3 手动指定

如果自动获取失败，可手动导出 cookie 并用 `--cookies` 指定：

```bash
# 用 opencli 导出 cookie
opencli browser <session> eval "document.cookie" > cookies_raw.txt

# 转换为 Netscape 格式（脚本内已自动处理）
```

Netscape 格式要求：
- 无 BOM（UTF-8 无 BOM）
- 每行：`domain\tTRUE\t/\tFALSE\t0\tname\tvalue`
- 第一行：`# Netscape HTTP Cookie File`

---

## 5. 模型选择建议

| 模型 | 大小 | CPU 速度* | GPU 速度* | 中文质量 | 适用场景 |
|---|---|---|---|---|---|
| tiny | 75MB | ~0.3x | ~0.1x | 差，错字多 | 快速预览、语音检测 |
| base | 142MB | ~0.5x | ~0.2x | 一般 | 短音频快速转写 |
| small | 466MB | ~1x | ~0.3x | 良好 | **日常使用推荐** |
| medium | 1.5GB | ~2x | ~0.8x | 优秀 | 高质量转写 |
| large-v3 | 3GB | ~4x | ~1.5x | 最佳 | 专业级、口音/术语 |
| large-v3-turbo | 1.5GB | ~1.5x | ~0.5x | 接近 large | 速度质量均衡 |

\* 相对速度：转写 1 小时音频所需时间（如 1x = 1 小时转写 1 小时音频）

**推荐**：
- 有 GPU：`small` 或 `medium`
- 无 GPU：`tiny` 或 `base`（small 在 CPU 上 6 分钟音频约需 5-10 分钟）
- 专业内容/口音重：`large-v3`

---

## 6. 常见问题

### 6.1 `HTTP Error 412: Precondition Failed`

**原因**：B站反爬，缺少有效 cookie。
**解决**：
1. 确认 Chrome 已登录 B站
2. 用 `--cookies` 指定 cookie 文件
3. 检查 cookie 文件无 BOM（`Get-Content` 可能添加 BOM，用 Python 写文件）

### 6.2 `spawn yt-dlp ENOENT`（opencli download）

**原因**：opencli（Node.js）在 Windows 上 spawn yt-dlp 时找不到可执行文件（pyenv shim 的 .bat 不被识别）。
**解决**：下载独立 yt-dlp.exe 放到 npm 全局目录：
```powershell
Invoke-WebRequest -Uri "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" `
  -OutFile "$env:APPDATA\npm\yt-dlp.exe"
```
本脚本不使用 opencli download，直接调 yt-dlp，无此问题。

### 6.3 `Connection to huggingface.co timed out`

**原因**：HuggingFace 在国内被墙。
**解决**：脚本已自动设置 `HF_ENDPOINT=https://hf-mirror.com`。如果仍失败，检查镜像是否可用。

### 6.4 `cas-bridge.xethub.hf.co` 解析失败

**原因**：HuggingFace xet 下载协议的 CDN 域名在国内无法解析。
**解决**：脚本已自动设置 `HF_HUB_DISABLE_XET=1`，禁用 xet 走普通 HTTPS。

### 6.5 CUDA 失败 fallback 到 CPU

**原因**：GPU 不支持 float16、CUDA 版本不匹配、或模型未缓存。
**解决**：脚本自动 fallback。如想强制 CPU：`--device cpu`。如想修复 CUDA：检查 `nvidia-smi`、PyTorch CUDA 版本、ctranslate2 CUDA 版本。

### 6.6 字幕质量差

**原因**：模型太小（tiny/base）、音频质量差、口音/术语。
**解决**：
- 换更大的模型（`--model medium` 或 `large-v3`）
- 检查音频是否清晰（背景音乐大、多人说话会降低质量）
- 专业术语可考虑后处理校正

### 6.7 `ffprobe and ffmpeg not found`

**原因**：yt-dlp 的 `-x`（提取音频）需要 ffmpeg/ffprobe。
**解决**：本脚本已去掉 `-x`，直接下载 bestaudio（B站音频本身是 m4a，不需要转换）。如果需要其他格式，安装 ffmpeg 或用 imageio-ffmpeg。

---

## 7. 与 bili2rag 的对比

| 维度 | 本脚本 (bili_asr.py) | bili2rag |
|---|---|---|
| 定位 | 单视频 ASR 转写工具 | 端到端 B站视频 → RAG 语料库 |
| 输入 | 单个 BV号 | 批量视频/UP主/搜索结果 |
| 下载 | yt-dlp 直接下载音频 | yt-dlp + cookie（含 SESSDATA） |
| ASR | faster-whisper | faster-whisper |
| 输出 | srt/vtt/txt/json | 结构化 RAG 语料（分块/索引） |
| 批量处理 | 需外部循环 | 内置批量 + 去重 + 库管理 |
| 搜索/发现 | 无（需配合 opencli bilibili search） | 内置搜索/UP主发现 |
| 依赖 | yt-dlp + faster-whisper | yt-dlp + faster-whisper + RAG 框架 |
| 适用 | 单视频快速转写 | 大规模知识库构建 |

**互补关系**：用 opencli bilibili search 发现视频 → bili_asr.py 转写单视频 → 结果存入知识空间。大规模批量处理用 bili2rag。

---

## 8. 输出格式说明

### SRT（默认）
标准字幕格式，可直接导入视频播放器/剪辑软件。

### VTT
WebVTT 格式，适合网页播放器。

### TXT
纯文本，每行一段，适合后续文本分析（关键词提取、摘要、RAG 分块）。

### JSON
结构化数据，包含语言、时长、每段的起止时间和文本，适合程序化处理。

---

## 9. 与 OpenCLI 其他命令的串联

```bash
# 1. 搜索视频
opencli bilibili search "AI 编程" --limit 10 -f json

# 2. 对搜索结果中的每个视频转写
python scripts/bili_asr.py BV1xx --format txt

# 3. 获取视频元数据和 AI 总结
opencli bilibili video BV1xx -f json
opencli bilibili summary BV1xx

# 4. 获取评论（补充观点）
opencli bilibili comments BV1xx -f json
```

典型调研流程：search → 筛选 → ASR 转写 → summary → comments → 整合分析。

---

*最后更新：2026-09-05*
