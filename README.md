# OpenCLI Power User

> A cross-platform knowledge layer for OpenCLI (@jackwener/opencli) — accumulated experience, reusable workflows, and battle-tested scripts for data collection from 160+ websites.
>
> 跨平台 OpenCLI 知识层——积累的经验、可复用工作流、经过实战验证的脚本，用于从 160+ 网站采集数据。

---

## What is this?

**This is NOT a thin wrapper around OpenCLI. This is the experience layer that sits on top of OpenCLI. 这不是 OpenCLI 的简单封装。这是构建在 OpenCLI 之上的经验层。**

When you use OpenCLI directly, you have to figure out:
- Which adapters are available and what do they do?
- What are the anti-bot strategies for each site?
- What parameters are required for stable collection?
- How to design keyword matrices for research?
- How to handle cookies, sessions, and rate limits?

This skill answers all those questions with **accumulated, battle-tested experience** from hundreds of collection runs.

---

## Quick Start

### 1. Install OpenCLI

```bash
npm install -g @jackwener/opencli
```

### 2. Install Browser Extension

Follow the official guide to install the OpenCLI Browser Bridge extension in Chrome.

### 3. Start Daemon

```bash
opencli daemon start
opencli daemon status  # verify: Daemon running + Extension connected
```

### 4. Clone this skill (Private Repo)

> **This is a private repository containing machine-specific config. Clone into your AI platform's skill directory with the name `opencli-poweruser`.**

```bash
# 豆包平台 (Doubao)
cd "$env:USERPROFILE\AppData\Local\Doubao\User Data\Default\.doubao\agent_mode\workspace\.user_skills"
git clone https://github.com/cosmosomo/opencli-poweruser-private.git opencli-poweruser

# Workbody 平台
cd /path/to/workbody/skills/
git clone https://github.com/cosmosomo/opencli-poweruser-private.git opencli-poweruser

# Claude Code (任意位置)
mkdir -p ~/skills && cd ~/skills
git clone https://github.com/cosmosomo/opencli-poweruser-private.git opencli-poweruser
```

### 5. Ready to use (No extra config needed)

**This private repo already contains `LOCAL.md` with machine-specific config (profile ID, paths, tool status). Clone后立即可用，无需额外配置。**

Agent 读取 `SKILL.md` 即可开始工作。本机详细配置见 `LOCAL.md`。

See [SETUP.md](SETUP.md) for detailed installation and configuration.
See [platforms/](platforms/) for platform-specific installation guides.

---

## Directory Structure

```
opencli-poweruser/
├── README.md              # This file — project entry
├── SKILL.md               # Main skill file — agent reads this first
├── SETUP.md               # Installation and configuration guide
├── EVOLUTION.md           # Self-iteration methodology
├── .gitignore             # Excludes local/ and sensitive files
├── scripts/               # Reusable scripts
│   ├── bili_asr.py        # Bilibili video → subtitle (yt-dlp + faster-whisper)
│   └── init_research.py   # One-click research directory initialization
├── references/            # Accumulated experience and methodology
│   ├── research-sop.md           # 8-step cross-platform research SOP
│   ├── research-logging.md       # Research recording specification
│   ├── research-scripts.md       # Script design patterns
│   ├── anti-bot-notes.md         # Anti-bot/anti-debug identification
│   ├── new-site-exploration.md   # New site exploration methodology
│   ├── data-quality-checklist.md # Data quality verification
│   ├── site-memory-guide.md       # Site memory recording规范
│   ├── bilibili-asr-workflow.md  # Bilibili ASR transcription workflow
│   ├── verified-platforms.md      # Verified platforms and login status
│   ├── pitfalls.md                # Common pitfalls and solutions
│   ├── adapter-boss.md            # BOSS Zhipin adapter experience
│   ├── adapter-xiaohongshu.md     # Xiaohongshu adapter experience
│   ├── adapter-zhihu.md           # Zhihu adapter experience
│   └── adapter-public-api.md      # Public API adapters (HN/arxiv/wttr/etc)
├── platforms/             # Platform-specific installation guides
│   ├── doubao.md          # Doubao (豆包) platform
│   ├── workbody.md        # Workbody platform
│   └── claude-code.md     # Claude Code platform
└── local/                 # Machine-specific (gitignored, NOT committed)
    └── LOCAL.md           # Your profile IDs, paths, login status
```

---

## Key Features

### 📚 Research Methodology
- 8-step cross-platform research SOP
- Keyword matrix design (4 categories, 5-10 variants each)
- Multi-platform cross-validation strategy
- Platform-specific keyword adaptation
- Quality filtering (likes, time decay, duplicates)

### 🛡️ Anti-Bot Experience
- CDP feature detection identification
- 8 types of DevTools detectors
- Rate limiting strategies
- Session management (foreground/background/persistent)
- Verified anti-bot status for each platform

### 🔧 Reusable Scripts
- `bili_asr.py`: Bilibili video → subtitle (yt-dlp + faster-whisper, one-click)
- `init_research.py`: One-click research directory creation with templates

### 🌐 New Site Exploration
- `opencli browser analyze` one-step diagnosis
- 5 site patterns (A/B/C/D/E)
- 6 strategy classes with stability rankings
- 12-step adapter-author Runbook integration

### ✅ Data Quality
- 11 types of silent failure identification
- 5-step verification method
- Fixture-based regression testing
- Field decoding playbook

---

## Platform Support

This skill is designed to work across multiple AI agent platforms. See [platforms/](platforms/) for platform-specific installation guides:

| Platform | Status | Guide |
|---|---|---|
| Doubao (豆包) | ✅ Primary | [platforms/doubao.md](platforms/doubao.md) |
| Workbody | ✅ Supported | [platforms/workbody.md](platforms/workbody.md) |
| Claude Code | ✅ Supported | [platforms/claude-code.md](platforms/claude-code.md) |

---

## Self-Iteration

This skill is designed to grow with use. Every research run, every new adapter, every pitfall encountered should be recorded.

See [EVOLUTION.md](EVOLUTION.md) for the self-iteration methodology:
- What to record
- Where to record it
- When to update SKILL.md
- Maintenance principles

**Quick rule: New adapter → `adapter-<name>.md`; Common pitfalls → `pitfalls.md`; Research methodology → `research-sop.md`; Script patterns → `research-scripts.md`; Anti-bot → `anti-bot-notes.md`; Machine-specific → `local/LOCAL.md` (not committed).**

---

## Related Projects

- [OpenCLI](https://github.com/jackwener/opencli) — The underlying CLI tool this skill wraps
- [opencli-adapter-author](https://github.com/jackwener/opencli) — Official skill for writing new adapters (bundled with OpenCLI)
- [bili2rag](https://github.com/cosmosomo/bili2rag) — Bilibili video → RAG corpus pipeline (complementary to this skill)

---

## License

Private repository — for personal use across AI agent platforms.

---

*Last updated: 2026-09-09*
