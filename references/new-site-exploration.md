# 新站点/新适配器探索指南

> 使用者视角：当用户需求涉及一个不在速查表中的网站时，如何系统化地探索、验证、记录。
>
> 核心工具：`opencli browser analyze <url>` —— 一步拿到站点分类、反爬检测、最近适配器、下一步建议。

---

## 1. 一步诊断：`opencli browser analyze`

**这是探索新站点的第一命令，不要跳过。**

```bash
opencli browser <session> analyze <url>
```

返回 JSON，包含 5 个关键字段：

| 字段 | 含义 | 对使用者的意义 |
|---|---|---|
| `pattern` | 站点类型（A/B/C/D/E）+ 原因 + JSON 响应数 | 判断数据好不好拿 |
| `anti_bot` | 反爬厂商检测 + 证据 + 影响 | 判断会不会被封、需不需要特殊参数 |
| `initial_state` | `__INITIAL_STATE__` / `__NEXT_DATA__` 等 hydration state | 首屏数据是否在 HTML 里（无需等 JS） |
| `nearest_adapter` | 最像的已有适配器 + 示例命令 | 有没有现成的可以直接用 |
| `recommended_next_step` | 官方建议的下一步 | 直接按建议走，不用自己猜 |

**输出示例：**
```json
{
  "pattern": { "pattern": "A", "reason": "3 JSON XHR responses observed", "json_responses": 3 },
  "anti_bot": { "detected": false, "implication": "Node-side fetch may work; try COOKIE first" },
  "nearest_adapter": { "site": "xueqiu", "example_commands": ["xueqiu search", "xueqiu hot"] },
  "recommended_next_step": "Pick the most specific JSON endpoint and try a bare Node fetch with cookies"
}
```

---

## 2. 5 种 Pattern 对使用者的意义

| Pattern | 站点类型 | 代表站点 | 数据获取难度 | 登录要求 | 稳定性 |
|---|---|---|---|---|---|
| **A. SPA / JSON XHR** | React/Vue 单页应用，数据走 fetch | 小红书、Reddit、大多数现代 SaaS | 中（需等 JS 加载） | 视站点而定 | 中（接口可能变） |
| **B. SSR / inline data** | 首屏数据在 HTML 里，深层再走 API | B站个人主页、微博、部分 Next.js 页 | 低（首屏直接拿） | 视站点而定 | 高（HTML 结构相对稳定） |
| **C. JSONP / script src** | 老一代金融站，数据通过 `<script src>` 加载 | 东方财富、同花顺 | 中（需找 baseURL） | 通常无需登录 | 中（老站变化慢但结构怪） |
| **D. Token / CSRF 鉴权** | 在 A 基础上加鉴权，请求需 token/CSRF | Twitter/X、企业 SaaS | 高（需处理鉴权） | 必须登录 | 低（token 经常变） |
| **E. 流式** | WebSocket / SSE 实时推送 | 行情 tick、LLM chat | 高（需拦截或找轮询接口） | 视站点而定 | 低（流式接口不稳定） |

**Pattern A 注意陷阱**：看到 JSON XHR 不等于数据好拿。`analyze` 输出的 `api_candidates[]` 里，`verdict=likely_data` 的才是真业务数据；`verdict=noise`（analytics/beacon/personalization）不能算。
- 反例：booking.com 有 17 个 JSON XHR，但全是 analytics side-channel，实际数据在 SSR HTML 里。

---

## 3. 6 种 Strategy 对使用者的意义（稳定性判断）

当你使用一个适配器时，它的底层 Strategy 决定了它**有多稳、多久会坏一次**。

| Strategy | 契约级别 | 实测 fix 频率 | 含义 | 代表 |
|---|---|---|---|---|
| `PUBLIC_API` | stable | **1.18 次/年** | 官方文档化 API，最稳 | HackerNews、arXiv、wttr |
| `COOKIE_API` | stable | 2.01 次/年 | 官方 web 接口 + 用户 cookie | 知乎、Reddit（部分） |
| `UI_SELECTOR` | visible-ui | 1.92 次/年 | DOM 语义选择器，跟 COOKIE_API 同档 | 写操作（publish/click） |
| `DOM_STATE` | visible-ui | 0.91 次/年（小样本） | hydration JSON / SSR HTML | B站个人主页、微博 |
| `PAGE_FETCH` | **internal-unstable** | **8.41 次/年** | 站内未文档化 endpoint，最易漂 | Twitter GraphQL（部分） |
| `INTERCEPT` | **internal-unstable** | **8.69 次/年** | 拦截内部 XHR，签名/字段静默漂移 | 小红书 signed URL |

**对使用者的实际意义：**
- 用 `PUBLIC_API` / `COOKIE_API` / `DOM_STATE` 的适配器 → 基本不用管，坏了再修
- 用 `UI_SELECTOR` 的适配器 → 网站 UI 改版时可能坏，注意观察
- 用 `PAGE_FETCH` / `INTERCEPT` 的适配器 → **维护成本是其他的 7-8 倍**，可能每隔 1-2 月就坏一次，需要定期重新验证

**怎么看一个适配器用的什么 Strategy**：
1. 看 `opencli <adapter> --help` 的描述
2. 看 `references/adapter-<name>.md` 里的记录
3. 用 `opencli browser analyze <url>` 看 `recommended_next_step`
4. 直接看适配器源码（`~/.opencli/clis/<site>/<name>.js` 或 npm 包内）

---

## 4. 新站点探索流程（使用者视角）

```
Step 1: 查找已有适配器
  ├─ opencli --help | findstr <site-keyword>
  ├─ 查 SKILL.md 速查表
  └─ 查 references/verified-platforms.md
      ├─ 有 → 跳到 Step 4（探活验证）
      └─ 没有 → 继续

Step 2: 一步诊断
  ├─ opencli browser <session> analyze <url>
  ├─ 看 nearest_adapter：有没有最像的适配器可以参考
  ├─ 看 pattern：判断数据获取难度
  ├─ 看 anti_bot：判断会不会被封
  └─ 看 recommended_next_step：直接按建议走

Step 3: 判断是否需要写新适配器
  ├─ 有类似适配器 → 复制修改（参考官方 opencli-adapter-author skill）
  ├─ 只有公开 API → 可能不需要适配器，直接用 fetch/curl
  └─ 必须写新适配器 → 参考官方 opencli-adapter-author skill 的 12 步 Runbook
      （官方 skill 路径：npm 包内 skills/opencli-adapter-author/）

Step 4: 探活验证
  ├─ 最轻量命令：opencli <adapter> whoami 或 search --limit 1
  ├─ 检查输出：非空、字段合理、无报错
  ├─ 检查登录态：需要登录的网站确认已在 Chrome 中登录
  └─ 检查反爬：频繁调用是否触发限流/验证码

Step 5: 数据质量检查
  ├─ 肉眼比对：拿一条结果和网页上的实际值对比
  ├─ 单位检查：数值量级对不对（"万" vs "元"、百分比 0.025 vs 2.5%）
  ├─ 字段语义：两个相似字段选的对不对（发布日 vs 更新日）
  ├─ 空值检查：核心字段有没有静默变成 0 或空字符串
  └─ 详见 references/data-quality-checklist.md

Step 6: 记录经验
  ├─ 更新 references/verified-platforms.md：登录状态、可用命令
  ├─ 新建/更新 references/adapter-<name>.md：必加参数、反爬策略、踩坑点
  ├─ 更新 SKILL.md 速查表（新适配器验证成功后）
  ├─ 记录到 LOCAL.md（本机专属信息：profile、目录、工具版本）
  └─ 详见 references/site-memory-guide.md
```

---

## 5. 没有现成适配器时怎么办

当 `opencli --help` 里找不到目标站点的适配器时：

### 5.1 先判断是否真的需要适配器

| 情况 | 解决方案 |
|---|---|
| 站点有公开 API（无需登录） | 直接用 `curl` / `Invoke-WebRequest` / Python `requests` 调用，不需要适配器 |
| 站点有官方 SDK / CLI | 用官方工具，OpenCLI 可能有 external CLI 封装（`opencli --help` 查 External CLI 部分） |
| 只需要一次性数据 | 用 `opencli browser` 手动操作（open/eval/extract），不需要写适配器 |
| 需要长期、反复采集 | 值得写适配器，参考官方 opencli-adapter-author skill |

### 5.2 写适配器时参考官方 skill

官方 `opencli-adapter-author` skill 提供了完整的 12 步 Runbook：
- 站点侦察（`opencli browser analyze`）
- API 发现（network/state/bundle/token/intercept 五步法）
- Strategy 选择（6 种契约模型）
- 字段解码（已知代号查表 / 未知代号解码 playbook）
- 输出设计（columns 命名/类型/顺序规范）
- 适配器编写（`opencli browser init` 生成骨架）
- 验证（`opencli browser verify` + fixture）
- 站点记忆回写（endpoints.json / field-map.json / notes.md）

**官方 skill 位置**：npm 全局安装目录下 `node_modules/@jackwener/opencli/skills/opencli-adapter-author/`

---

## 6. 常用诊断命令速查

| 目的 | 命令 |
|---|---|
| 一步诊断站点 | `opencli browser <session> analyze <url>` |
| 打开页面 | `opencli browser <session> open <url>` |
| 等 XHR 到场（比盲等 time 更稳） | `opencli browser <session> wait xhr '/api/path-fragment'` |
| 看网络请求 | `opencli browser <session> network` |
| 页面状态（URL/title/交互元素） | `opencli browser <session> state` |
| 执行 JS | `opencli browser <session> eval "document.title"` |
| 提取页面内容为 Markdown | `opencli browser <session> extract` |
| 截图 | `opencli browser <session> screenshot` |
| 查看所有适配器 | `opencli --help` |
| 查看某适配器命令 | `opencli <adapter> --help` |
| daemon 状态 | `opencli daemon status` |

---

*本文件基于官方 opencli-adapter-author skill 的方法论，适配使用者视角。最后更新：2026-09-03*
