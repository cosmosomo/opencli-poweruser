# OpenCLI 安装与初始配置指南

> 本文档指导智能体（Agent）如何帮助用户在一台新机器上完成 OpenCLI 的安装、浏览器扩展配置、网站登录和初始环境设置。
>
> SKILL.md 中的 `v6pz9gjx` 等 profile ID、端口号、目录路径均为**原作者本机示例**，新用户必须按本文档在自己的机器上重新配置。

---

## 1. 前置要求

| 依赖 | 最低版本 | 检查命令 |
|---|---|---|
| Node.js | >= 20.18.1（推荐 21+） | `node --version` |
| npm | 随 Node.js 安装 | `npm --version` |
| Chrome / Edge（Chromium 内核） | 最新稳定版 | 已安装即可 |

> ⚠️ Node.js 版本低于 20.18.1 时 npm 安装会失败。需先升级 Node.js（推荐用 nvm 或官网下载）。

---

## 2. 安装 OpenCLI

### 方式 A：桌面应用（推荐，普通用户）

1. 从 [GitHub Releases](https://github.com/jackwener/opencli/releases) 下载最新桌面安装包
2. 安装后打开应用一次，在 System 页面点击 install / repair 安装 `opencli` 命令
3. 桌面应用会自动管理浏览器扩展和 daemon

### 方式 B：npm 全局安装（CLI-only / CI / 开发者）

```bash
# 验证 Node.js 版本
node --version   # 必须 >= 20.18.1

# 全局安装
npm install -g @jackwener/opencli

# 验证安装
opencli --version
```

> Windows 用户如果 npm 全局安装后 `opencli` 命令不可用，检查 npm 全局 bin 目录是否在 PATH 中：`npm config get prefix`。

---

## 3. 安装浏览器扩展（Browser Bridge）

OpenCLI 通过 Chrome 扩展 + 本地 daemon 连接浏览器操作网页。**必须安装扩展才能使用需要浏览器的适配器**（小红书、B站、知乎、Reddit 等）。

### 方式 A：Chrome 应用商店（推荐）

1. 打开 [Chrome Web Store - OpenCLI](https://chromewebstore.google.com/detail/opencli/ildkmabpimmkaediidaifkhjpohdnifk)
2. 点击"添加至 Chrome"
3. 安装后扩展会自动连接本地 daemon

### 方式 B：手动加载（无法访问商店时）

1. 打开 [GitHub Releases](https://github.com/jackwener/opencli/releases)，下载最新的 `opencli-extension.zip`
2. 解压到本地目录
3. Chrome 地址栏输入 `chrome://extensions`
4. 右上角开启"开发者模式"
5. 点击"加载已解压的扩展程序"，选择解压后的文件夹
6. 扩展出现在列表中即安装成功

---

## 4. 验证安装

```bash
# 检查 daemon 状态（应显示 running + connected）
opencli daemon status

# 完整健康检查（扩展连接、daemon、适配器）
opencli doctor
```

**预期输出：**
- `Daemon: running`（daemon 已启动，端口通常为 19825）
- `Extension: connected`（浏览器扩展已连接）

> daemon 会在需要时自动启动，无需手动运行。如果 `daemon status` 显示 not running，运行 `opencli daemon start` 或执行任意需要浏览器的命令触发自动启动。

---

## 5. 初始配置

### 5.1 登录目标网站

OpenCLI 复用浏览器中的登录态。**在 Chrome 中手动登录你需要使用的网站**：

| 网站 | 登录地址 | 备注 |
|---|---|---|
| 小红书 | https://www.xiaohongshu.com | 登录后 note/search 可用 |
| B站 | https://www.bilibili.com | 公开内容无需登录；搜索/上传者发现需登录 |
| 知乎 | https://www.zhihu.com | 登录后可访问收藏夹等 |
| GitHub | https://github.com | 登录后 whoami 可用 |
| Reddit | https://www.reddit.com | 登录后可访问已保存/已订阅 |
| V2EX | https://www.v2ex.com | 登录后可访问通知 |
| linux.do | https://linux.do | 登录后 feed 可用 |
| BOSS 直聘 | https://www.zhipin.com | ⚠️ 反爬严格，见 adapter-boss.md |

登录后验证：
```bash
opencli <adapter> whoami    # 例如 opencli xiaohongshu whoami
```

### 5.2 多浏览器 Profile 管理（可选）

如果 Chrome 中有多个 profile（如工作 profile + 个人 profile），OpenCLI 会检测到多个 Browser Bridge 连接，需要指定使用哪个：

```bash
# 查看已连接的 profile
opencli profile list

# 设置默认 profile
opencli profile use <profile-name>

# 单次命令指定 profile（全局参数，放在 opencli 后、适配器前）
opencli --profile <profile-name> <adapter> <command>
```

> 如果只有一个 Chrome profile，无需配置，OpenCLI 自动使用。
> 如果报 `Multiple Browser Bridge profiles are connected`，说明有多个 profile 连接，按上述方式指定。

### 5.3 环境变量（可选，减少重复输入）

```powershell
# PowerShell（当前会话有效）
$env:OPENCLI_PROFILE="<your-profile>"     # 默认浏览器 profile
$env:OPENCLI_WINDOW="background"           # 默认后台窗口模式（不抢焦点）
```

```bash
# bash/zsh
export OPENCLI_PROFILE="<your-profile>"
export OPENCLI_WINDOW="background"
```

设置后命令可简化为：
```bash
opencli <adapter> <command> -f json
```

---

## 6. 智能体操作指南

当智能体（Agent）在新用户机器上首次使用本 skill 时，按以下流程操作：

### 步骤 1：检查环境

```bash
node --version          # 检查 Node.js >= 20.18.1
opencli --version       # 检查 OpenCLI 是否已安装
opencli daemon status   # 检查 daemon 和扩展连接
```

### 步骤 2：如未安装，指导用户安装

- Node.js 未安装或版本过低 → 指导用户从 https://nodejs.org 下载安装
- OpenCLI 未安装 → 执行 `npm install -g @jackwener/opencli`
- 浏览器扩展未安装 → 指导用户从 Chrome 商店安装或手动加载

### 步骤 3：验证连接

```bash
opencli daemon status
```

确认 `Daemon: running` 和 `Extension: connected`。

### 步骤 4：检查目标网站登录态

根据用户需求，检查对应网站是否已登录：
```bash
opencli <adapter> whoami
```

如未登录，指导用户在 Chrome 中手动登录该网站。

### 步骤 5：配置 profile（如需要）

如报 `Multiple Browser Bridge profiles are connected`，指导用户选择 profile：
```bash
opencli profile list
opencli profile use <profile-name>
```

### 步骤 6：记录本机配置

安装配置完成后，将本机的 profile 名称、已登录平台、目录路径等记录到用户本机的 `LOCAL.md`（如用户创建了该文件）。**不要将本机配置写入公开的 SKILL.md 或 references/**。

---

## 7. 常见问题

| 问题 | 原因 | 解决 |
|---|---|---|
| `opencli: command not found` | npm 全局 bin 不在 PATH | `npm config get prefix` 查看路径，加入系统 PATH |
| `Daemon: not running` | daemon 未启动 | `opencli daemon start` 或执行任意浏览器命令触发自动启动 |
| `Extension: disconnected` | 扩展未安装或未启用 | 按第 3 节安装扩展，确认 Chrome 中扩展已启用 |
| `Multiple Browser Bridge profiles are connected` | 多个 Chrome profile 连接 | 用 `--profile <name>` 指定或 `opencli profile use` 设默认 |
| `AUTH_REQUIRED` | 网站未登录 | 在 Chrome 中手动登录对应网站 |
| `stale page identity` | 浏览器标签页会话过期 | 用 `--window foreground --site-session persistent` 重建一次会话，后续切 background |
| `opencli doctor` 卡住 | 等待扩展连接，扩展未加载时阻塞 | 先确认扩展已安装并启用，再运行 doctor |

---

## 8. 参考链接

- OpenCLI GitHub：https://github.com/jackwener/opencli
- npm 包：https://www.npmjs.com/package/@jackwener/opencli
- Chrome 扩展：https://chromewebstore.google.com/detail/opencli/ildkmabpimmkaediidaifkhjpohdnifk
- Releases（含扩展 zip）：https://github.com/jackwener/opencli/releases
- 插件中心（适配器列表）：https://github.com/jackwener/OpenCLI-Hub

---

*本文档基于 OpenCLI 官方 README 和多平台安装实践整理，最后更新：2026-09-03*
