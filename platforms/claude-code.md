# Claude Code 平台安装指南

## 平台特点

- Claude Code 是 Anthropic 的 CLI 编程助手
- 支持项目级 `CLAUDE.md` 指令文件
- 支持 `.claude/agents/` 自定义 Agent
- 支持 MCP (Model Context Protocol) 服务器
- 跨平台支持（macOS / Linux / Windows）

## 安装步骤

### 1. 选择集成方式

Claude Code 没有原生的"Skill"概念，但有三种等效方式集成 opencli-poweruser：

| 方式 | 适用场景 | 复杂度 |
|---|---|---|
| **A. CLAUDE.md** | 项目级使用，所有对话自动加载 | ⭐ 低 |
| **B. .claude/agents/** | 可召唤的专用 Agent | ⭐⭐ 中 |
| **C. MCP Server** | 工具级集成，可被其他 Agent 调用 | ⭐⭐⭐ 高 |

### 2. Clone 仓库

```bash
# 克隆到任意位置（建议放在 ~/skills/ 或项目目录下）
mkdir -p ~/skills
cd ~/skills
git clone git@github.com:<your-username>/opencli-poweruser.git
```

### 3. 方式 A：项目级 CLAUDE.md（推荐）

在你的项目根目录创建或编辑 `CLAUDE.md`：

```markdown
# OpenCLI Power User Integration

This project uses the opencli-poweruser skill for web data collection.

## Skill Location
`~/skills/opencli-poweruser/`

## Usage Rules
1. When the user asks for research, data collection, or web scraping, first read `~/skills/opencli-poweruser/SKILL.md`
2. Follow the 8-step research SOP in `references/research-sop.md`
3. Use `opencli` CLI commands for data collection (requires OpenCLI installed)
4. Save research results using `scripts/init_research.py` to create structured directories
5. Record new experiences in the appropriate reference file

## Prerequisites
- OpenCLI installed: `npm install -g @jackwener/opencli`
- Chrome with OpenCLI Browser Bridge extension
- Daemon running: `opencli daemon start`

## Machine-specific config
Read `~/skills/opencli-poweruser/local/LOCAL.md` for your profile ID and paths.
```

### 4. 方式 B：自定义 Agent

创建 `.claude/agents/researcher.md`：

```markdown
---
name: researcher
description: Cross-platform research expert using OpenCLI. Trigger when user asks for research, data collection, competitive analysis, or literature review.
---

You are a research expert. Follow this workflow:

1. Read the skill: `cat ~/skills/opencli-poweruser/SKILL.md`
2. Read the research SOP: `cat ~/skills/opencli-poweruser/references/research-sop.md`
3. Initialize research directory: `python ~/skills/opencli-poweruser/scripts/init_research.py "<topic>"`
4. Execute research following the 8-step SOP
5. Save all raw data to the research directory's `raw/` folder
6. Summarize findings in the research directory's `README.md`

Key tools:
- `opencli <adapter> <command> -f json` for data collection
- `opencli browser <session> eval "fetch(...)"` for in-page data fetching
- `python ~/skills/opencli-poweruser/scripts/bili_asr.py <bvid>` for video transcription
```

使用时在 Claude Code 中输入 `@researcher` 召唤。

### 5. 方式 C：MCP Server（高级）

将 OpenCLI 封装为 MCP Server，供 Claude Code 和其他 Agent 调用。

参考 OpenCLI 官方文档或社区 MCP 封装项目。

### 6. 配置本机环境

```bash
cd ~/skills/opencli-poweruser
cp local/LOCAL.md.example local/LOCAL.md
# 编辑 local/LOCAL.md
```

### 7. 安装 OpenCLI

```bash
npm install -g @jackwener/opencli
opencli daemon start
opencli daemon status
```

## Claude Code 平台特有优势

1. **CLAUDE.md 自动加载**：项目级指令自动注入所有对话
2. **自定义 Agent**：可以创建可召唤的专用 Agent（`@agent-name`）
3. **MCP 生态**：丰富的 MCP 服务器生态，可以扩展 OpenCLI 能力
4. **代码编辑能力**：Claude Code 擅长代码编辑，可以直接修改和扩展 OpenCLI 适配器
5. **Shell 集成**：原生支持 shell 命令执行，方便调用 opencli CLI

## Claude Code 平台注意事项

1. **没有原生 Skill 系统**：需要用 CLAUDE.md 或自定义 Agent 模拟
2. **路径配置**：Claude Code 的工作目录是当前项目，注意使用绝对路径引用 Skill 文件
3. **工具差异**：Claude Code 没有豆包的 browser_use/computer_use 工具，完全依赖 OpenCLI 自身的 browser 工具
4. **权限管理**：确认 Claude Code 有权限执行 opencli、python 等命令（可能需要 `--dangerously-skip-permissions` 或配置允许列表）

## 与豆包平台的差异

| 维度 | 豆包 | Claude Code |
|---|---|---|
| Skill 系统 | ✅ 原生 `.user_skills/` | ❌ 用 CLAUDE.md / Agent 模拟 |
| 浏览器控制 | ✅ 内置 browser_use | ❌ 依赖 OpenCLI browser |
| 桌面控制 | ✅ 内置 computer_use | ❌ 无 |
| 代码编辑 | ⚠️ 一般 | ✅ 强 |
| MCP 支持 | ⚠️ 有限 | ✅ 完整支持 |
| 跨平台 | ⚠️ 主要 Windows | ✅ macOS/Linux/Windows |
| 召唤方式 | 自动加载 | `@agent-name` 或 CLAUDE.md |

## 更新 Skill

```bash
cd ~/skills/opencli-poweruser
git pull
```

## 常见问题

### Q: Claude Code 找不到 opencli 命令？

A: 确认 npm 全局目录在 PATH 中。macOS/Linux 运行 `echo $PATH` 查看。可以在 `~/.zshrc` 或 `~/.bashrc` 中添加：
```bash
export PATH="$HOME/.npm-global/bin:$PATH"
```

### Q: 浏览器扩展未连接？

A: 确认 Chrome 正在运行，OpenCLI 扩展已启用。运行 `opencli daemon status` 查看状态。

### Q: CLAUDE.md 太长影响性能？

A: 可以只在 CLAUDE.md 中放简要指引，详细内容让 Agent 按需读取 Skill 文件。

---

*最后更新：2026-09-09*
