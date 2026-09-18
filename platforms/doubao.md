# 豆包 (Doubao) 平台安装指南

## 平台特点

- 豆包 Agent 模式支持自定义 Skill（`.user_skills/` 目录）
- 内置浏览器控制工具（browser_use）和桌面控制工具（computer_use）
- 支持飞书文档/表格/幻灯片等办公工具
- Windows 桌面端路径：`%USERPROFILE%\AppData\Local\Doubao\User Data\Default\.doubao\agent_mode\workspace\`

## 安装步骤

### 1. 找到 Skill 目录

```powershell
# 豆包用户 Skill 目录
cd "$env:USERPROFILE\AppData\Local\Doubao\User Data\Default\.doubao\agent_mode\workspace\.user_skills"
```

如果目录不存在，先创建：
```powershell
New-Item -ItemType Directory -Path "$env:USERPROFILE\AppData\Local\Doubao\User Data\Default\.doubao\agent_mode\workspace\.user_skills" -Force
```

### 2. Clone 仓库

```powershell
cd "$env:USERPROFILE\AppData\Local\Doubao\User Data\Default\.doubao\agent_mode\workspace\.user_skills"
git clone git@github.com:<your-username>/opencli-poweruser.git
```

### 3. 配置本机环境

```powershell
cd opencli-poweruser
Copy-Item local\LOCAL.md.example local\LOCAL.md
# 编辑 local\LOCAL.md，填入你的 profile ID、路径等
notepad local\LOCAL.md
```

### 4. 安装 OpenCLI

```powershell
npm install -g @jackwener/opencli
opencli daemon restart   # 没有 daemon start 子命令
```

### 5. 验证

在豆包 Agent 对话中输入：
```
用 opencli-poweruser skill 帮我搜索小红书上的 AI 编程内容
```

Agent 应该能自动加载 SKILL.md 并按指导执行。

## 豆包平台特有优势

1. **Skill 自动加载**：放在 `.user_skills/` 目录下的 Skill 会被 Agent 自动识别和加载
2. **浏览器控制**：豆包内置 `browser_use` 工具，可以直接控制 Chrome
3. **桌面控制**：内置 `computer_use` 工具，可以操作桌面应用
4. **飞书集成**：可以直接创建飞书文档/表格/幻灯片作为调研产出
5. **文件读写**：可以直接读写本地文件，方便存储调研结果

## 豆包平台注意事项

1. **Skill 路径**：豆包有 `.skills/`（系统 Skill）和 `.user_skills/`（用户 Skill）两个目录，自定义 Skill 放在 `.user_skills/`
2. **Profile 管理**：豆包的 Browser Bridge profile 在 `opencli daemon status` 中查看，通常有多个
3. **沙箱模式**：豆包 Agent 默认在沙箱中运行，需要用户授权才能访问本地文件和执行命令
4. **完全访问模式**：用户可以选择"完全访问"模式，此时 Agent 可以直接执行命令，无需每次确认

## 更新 Skill

```powershell
cd "$env:USERPROFILE\AppData\Local\Doubao\User Data\Default\.doubao\agent_mode\workspace\.user_skills\opencli-poweruser"
git pull
```

## 常见问题

### Q: Agent 没有自动加载 Skill？

A: 确认 Skill 目录路径正确，且 SKILL.md 文件存在。重启豆包 Agent 会话。

### Q: opencli 命令找不到？

A: 确认 npm 全局目录在 PATH 中。运行 `npm config get prefix` 查看全局目录，然后加到系统 PATH。

### Q: 浏览器扩展未连接？

A: 在 Chrome 中确认 OpenCLI Browser Bridge 扩展已启用。运行 `opencli daemon status` 查看连接状态。

---

*最后更新：2026-09-09*
