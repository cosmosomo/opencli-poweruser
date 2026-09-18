# Workbody 平台安装指南

## 平台特点

- Workbody 是通用 AI Agent 平台，支持自定义 Skill 和工具
- 支持 MCP (Model Context Protocol) 工具集成
- 支持本地文件读写和命令执行
- 跨平台支持（Windows / macOS / Linux）

## 安装步骤

### 1. 找到 Skill 目录

Workbody 的 Skill 目录位置取决于安装方式：

**Windows 默认路径：**
```powershell
cd "$env:USERPROFILE\AppData\Local\DoubaoWork\User Data\Default\.doubaowork\agent_mode\workspace\.user_skills"
```

**如果使用自定义工作区：**
在 Workbody 设置中查看"工作区路径"，Skill 通常放在工作区下的 `.user_skills/` 或 `skills/` 目录。

### 2. Clone 仓库

```powershell
cd <your-workbody-skill-directory>
git clone git@github.com:<your-username>/opencli-poweruser.git
```

### 3. 配置本机环境

```powershell
cd opencli-poweruser
Copy-Item local\LOCAL.md.example local\LOCAL.md
# 编辑 local\LOCAL.md，填入你的配置
```

### 4. 安装 OpenCLI

```powershell
npm install -g @jackwener/opencli
opencli daemon restart   # 没有 daemon start 子命令
opencli daemon status  # 验证
```

### 5. 安装浏览器扩展

在 Chrome 中安装 OpenCLI Browser Bridge 扩展（参考 OpenCLI 官方文档）。

### 6. 验证

在 Workbody 对话中输入：
```
读取 opencli-poweruser 的 SKILL.md，然后帮我搜索 B站热门视频
```

## Workbody 平台特有优势

1. **MCP 集成**：可以通过 MCP 协议集成额外工具，扩展 OpenCLI 能力
2. **跨平台**：同一套 Skill 可以在 Windows / macOS / Linux 上使用
3. **灵活的工作区**：可以自定义工作区路径，方便管理多个项目
4. **通用 Agent 架构**：不绑定特定生态，易于迁移

## Workbody 平台注意事项

1. **Skill 发现机制**：Workbody 可能需要手动指定 Skill 目录，或在对话中明确引用 Skill 路径
2. **浏览器控制**：Workbody 可能没有内置浏览器控制工具，需要依赖 OpenCLI 自身的 browser 工具
3. **命令执行权限**：确认 Workbody Agent 有权限执行本地命令（opencli、python、git 等）
4. **路径差异**：Workbody 的工作区路径可能与豆包不同，注意调整脚本中的路径

## 与豆包平台的差异

| 维度 | 豆包 | Workbody |
|---|---|---|
| Skill 自动加载 | ✅ 自动识别 `.user_skills/` | ⚠️ 可能需要手动指定 |
| 浏览器控制 | ✅ 内置 browser_use | ⚠️ 依赖 OpenCLI browser |
| 桌面控制 | ✅ 内置 computer_use | ❌ 可能没有 |
| 飞书集成 | ✅ 原生支持 | ❌ 需额外配置 |
| 跨平台 | ⚠️ 主要 Windows | ✅ Windows/macOS/Linux |
| MCP 支持 | ⚠️ 有限 | ✅ 完整支持 |

## 更新 Skill

```powershell
cd <your-workbody-skill-directory>/opencli-poweruser
git pull
```

## 常见问题

### Q: Workbody 找不到 opencli 命令？

A: 确认 npm 全局目录在系统 PATH 中。可以在 Workbody 的环境变量设置中添加 npm 全局路径。

### Q: Skill 没有被加载？

A: 在 Workbody 设置中确认 Skill 目录路径。可以尝试在对话中明确说"读取 [SKILL.md 完整路径]"来手动加载。

### Q: 浏览器扩展连接失败？

A: 确认 Chrome 正在运行，且 OpenCLI 扩展已启用。运行 `opencli daemon status` 查看详细状态。

---

*最后更新：2026-09-09*
