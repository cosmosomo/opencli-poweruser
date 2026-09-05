#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
B站视频 ASR 转写：下载音频 → faster-whisper 转写 → 输出字幕

用法:
  python bili_asr.py <bvid>                  # 下载音频并转写
  python bili_asr.py <local_audio.mp4>       # 转写本地音视频文件
  python bili_asr.py BV1xx --model small --language zh --format srt

依赖: yt-dlp, faster-whisper, imageio-ffmpeg, opencli (用于获取 cookie)
注意: 必须用安装了 faster-whisper 的 Python 解释器运行
环境: 自动设置 HF_ENDPOINT=https://hf-mirror.com, HF_HUB_DISABLE_XET=1
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

# ── 环境配置（中国网络环境：HuggingFace 镜像 + 禁用 xet CDN）──────────────────
os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")
os.environ.setdefault("HF_HUB_DISABLE_XET", "1")

# ── ffmpeg 路径（imageio-ffmpeg 自带，yt-dlp 合并时用）───────────────────────
try:
    import imageio_ffmpeg
    FFMPEG_DIR = str(Path(imageio_ffmpeg.get_ffmpeg_exe()).parent)
except ImportError:
    FFMPEG_DIR = None

# ── opencli 路径（Windows 上是 .cmd）─────────────────────────────────────────
def find_opencli():
    if sys.platform == "win32":
        for name in ["opencli.cmd", "opencli.bat", "opencli.exe", "opencli"]:
            p = shutil.which(name)
            if p:
                return p
    return "opencli"

OPENCLI = find_opencli()


def run_cmd(cmd, **kwargs):
    return subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", **kwargs)


# ── Step 1: 从浏览器获取 B站 cookie（非 HttpOnly）────────────────────────────
def get_cookies_from_browser(profile=None):
    """用 opencli browser eval 从已登录的 Chrome 获取 document.cookie"""
    print("[cookie] 从浏览器获取 B站 cookie...")
    cmd = [OPENCLI, "browser", "eval", "document.cookie"]
    if profile:
        cmd = [OPENCLI, "--profile", profile, "browser", "eval", "document.cookie"]
    result = run_cmd(cmd)
    if result.returncode != 0 or not result.stdout.strip():
        print(f"  ⚠️  获取 cookie 失败: {result.stderr[:200]}")
        return None
    raw = result.stdout.strip().strip('"')
    # 解析 key=value; key=value
    cookies = {}
    for pair in raw.split(";"):
        if "=" in pair:
            k, v = pair.strip().split("=", 1)
            cookies[k.strip()] = v.strip()
    print(f"  获取到 {len(cookies)} 个 cookie")
    return cookies


def write_netscape_cookies(cookies, filepath, domain=".bilibili.com"):
    """写 Netscape 格式 cookie 文件（无 BOM）"""
    lines = ["# Netscape HTTP Cookie File"]
    for k, v in cookies.items():
        # domain  includeSubdomains  path  secure  expires  name  value
        lines.append(f"{domain}\tTRUE\t/\tFALSE\t0\t{k}\t{v}")
    Path(filepath).write_text("\n".join(lines) + "\n", encoding="utf-8")
    return filepath


# ── Step 2: 用 yt-dlp 只下载音频（bestaudio）─────────────────────────────────
def download_audio(bvid, output_dir, cookie_file=None):
    """只下载音频流（m4a），比下载视频快很多"""
    output_dir = Path(output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    url = f"https://www.bilibili.com/video/{bvid}"
    output_template = str(output_dir / f"{bvid}.%(ext)s")

    cmd = [
        sys.executable, "-m", "yt_dlp",
        url,
        "-o", output_template,
        "-f", "bestaudio/best",
        "--no-playlist",
        "--no-part",
    ]
    if cookie_file:
        cmd += ["--cookies", cookie_file]

    print(f"[1/3] 下载音频: yt-dlp {bvid} (bestaudio)")
    result = run_cmd(cmd)

    if result.returncode != 0:
        err = (result.stderr or result.stdout).strip().splitlines()
        print("  下载失败:\n" + "\n".join(err[-5:]), file=sys.stderr)
        sys.exit(1)

    # 找到下载的音频文件
    audio_exts = {".m4a", ".mp3", ".aac", ".ogg", ".opus", ".wav", ".flac"}
    audio_files = sorted(
        [f for f in output_dir.iterdir()
         if f.stem.startswith(bvid) and f.suffix.lower() in audio_exts],
        key=lambda f: f.stat().st_mtime, reverse=True,
    )
    if not audio_files:
        audio_files = sorted(
            [f for f in output_dir.iterdir() if f.suffix.lower() in audio_exts],
            key=lambda f: f.stat().st_mtime, reverse=True,
        )
    if not audio_files:
        print("  错误: 未找到音频文件", file=sys.stderr)
        sys.exit(1)

    audio_path = audio_files[0]
    size_mb = audio_path.stat().st_size / 1024 / 1024
    print(f"  文件: {audio_path.name} ({size_mb:.1f} MB)")
    return audio_path


# ── Step 3: faster-whisper 转写 ─────────────────────────────────────────────
def transcribe(audio_path, model_size, language, device, compute_type):
    print(f"[2/3] ASR 转写: model={model_size}, device={device}, lang={language or 'auto'}")
    from faster_whisper import WhisperModel

    model = WhisperModel(model_size, device=device, compute_type=compute_type)
    segments, info = model.transcribe(
        str(audio_path),
        language=language if language else None,
        beam_size=5,
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=500),
    )
    print(f"  语言: {info.language} (概率 {info.language_probability:.2f})")
    print(f"  时长: {info.duration:.1f}s ({info.duration/60:.1f}min)")
    return list(segments), info


# ── Step 4: 格式化输出 ──────────────────────────────────────────────────────
def fmt_time(seconds):
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def to_srt(segments):
    lines = []
    for i, seg in enumerate(segments, 1):
        lines.append(str(i))
        lines.append(f"{fmt_time(seg.start)} --> {fmt_time(seg.end)}")
        lines.append(seg.text.strip())
        lines.append("")
    return "\n".join(lines)


def to_vtt(segments):
    lines = ["WEBVTT", ""]
    for seg in segments:
        lines.append(f"{fmt_time(seg.start).replace(',', '.')} --> {fmt_time(seg.end).replace(',', '.')}")
        lines.append(seg.text.strip())
        lines.append("")
    return "\n".join(lines)


def to_txt(segments):
    return "\n".join(seg.text.strip() for seg in segments)


def to_json_transcript(segments, info):
    return json.dumps({
        "language": info.language,
        "language_probability": info.language_probability,
        "duration": info.duration,
        "segments": [{"start": s.start, "end": s.end, "text": s.text.strip()} for s in segments],
    }, ensure_ascii=False, indent=2)


# ── main ────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="B站视频 ASR 转写：下载音频 → faster-whisper → 字幕",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python bili_asr.py BV1ZJtu6tEyd                       # 默认 small 模型, 中文, srt
  python bili_asr.py BV1xx --model medium --device cuda  # medium + GPU
  python bili_asr.py audio.m4a --format txt              # 转写本地音频
  python bili_asr.py BV1xx --cookies cookies.txt         # 指定 cookie 文件
        """,
    )
    parser.add_argument("input", help="B站 BV号 或本地音视频文件路径")
    parser.add_argument("--model", default="small",
                        choices=["tiny", "base", "small", "medium", "large-v3", "large-v3-turbo"],
                        help="Whisper 模型 (默认: small, 中文推荐 small 以上)")
    parser.add_argument("--language", default="zh", help="语言代码 (默认: zh, 留空自动检测)")
    parser.add_argument("--format", default="srt", choices=["srt", "vtt", "txt", "json"], help="输出格式 (默认: srt)")
    parser.add_argument("--device", default="cuda", choices=["cuda", "cpu"], help="设备 (默认: cuda, 无GPU自动fallback)")
    parser.add_argument("--output-dir", default="./bili-asr-output", help="输出目录")
    parser.add_argument("--cookies", default=None, help="B站 cookie 文件路径 (Netscape格式), 不指定则从浏览器获取")
    parser.add_argument("--profile", default=None, help="OpenCLI browser profile (用于获取 cookie)")
    parser.add_argument("--keep-audio", action="store_true", help="保留下载的音频文件")
    args = parser.parse_args()

    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    # 判断输入类型
    bvid_pattern = re.compile(r"^BV[0-9A-Za-z]{10}$")
    is_bvid = bool(bvid_pattern.match(args.input))
    is_local_file = Path(args.input).is_file()

    temp_files = []

    if is_bvid:
        # 获取 cookie
        cookie_file = args.cookies
        if not cookie_file:
            cookies = get_cookies_from_browser(args.profile)
            if cookies:
                cookie_file = str(output_dir / "_bili_cookies.txt")
                write_netscape_cookies(cookies, cookie_file)
                temp_files.append(cookie_file)
            else:
                print("  ⚠️  无法获取 cookie, 下载可能失败 (412). 请用 --cookies 指定文件")
        # 下载音频
        audio_path = download_audio(args.input, output_dir, cookie_file)
        base_name = args.input
    elif is_local_file:
        audio_path = Path(args.input).resolve()
        base_name = audio_path.stem
        print(f"[1/3] 使用本地文件: {audio_path.name}")
    else:
        print(f"错误: 输入既不是 BV号也不是存在的文件: {args.input}", file=sys.stderr)
        sys.exit(1)

    # ASR 转写（自动 fallback cuda → cpu）
    compute_type = "float16" if args.device == "cuda" else "int8"
    try:
        segments, info = transcribe(audio_path, args.model, args.language, args.device, compute_type)
    except Exception as e:
        if args.device == "cuda":
            print(f"  CUDA 失败 ({str(e)[:80]}), fallback 到 CPU...")
            segments, info = transcribe(audio_path, args.model, args.language, "cpu", "int8")
        else:
            raise

    # 输出字幕
    print(f"[3/3] 生成字幕: {args.format}")
    formatters = {"srt": to_srt, "vtt": to_vtt, "txt": to_txt, "json": lambda s: to_json_transcript(s, info)}
    content = formatters[args.format](segments)
    ext = {"srt": ".srt", "vtt": ".vtt", "txt": ".txt", "json": ".json"}[args.format]
    output_path = output_dir / f"{base_name}{ext}"
    output_path.write_text(content, encoding="utf-8")

    print(f"  输出: {output_path}")
    print(f"  段落数: {len(segments)}")

    # 清理
    for f in temp_files:
        Path(f).unlink(missing_ok=True)
    if not args.keep_audio and is_bvid and audio_path.exists():
        audio_path.unlink()

    print(f"\n✅ 完成! 字幕: {output_path}")


if __name__ == "__main__":
    main()
