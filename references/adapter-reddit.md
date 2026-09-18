# Reddit 适配器经验

> 验证日期：2026-09-17（探针批次）
> 版本：opencli v1.8.7
> 状态：**精简版，待完善**。仅记录 09-17 AntiGravity 委托探针批次的实测发现。

## 认证方式

COOKIE 策略——通过浏览器扩展在页面内执行 JS 抓取数据。
**必须在 Chrome 中登录 Reddit 账号**，否则部分子版内容受限。

登录验证：`opencli reddit whoami -f json`

## 已验证可用命令

| 命令 | 用途 | 示例 | 状态 |
|---|---|---|---|
| `read <post_id>` | **精读帖子+评论** | `opencli reddit read abc123 --limit 5 -f json` | ✅ 可同时拿帖+评论 |
| `search <query>` | 搜索帖子 | `opencli reddit search "resume review" -f json` | 待实测 |
| `subreddit <name>` | 读取子版帖子列表 | `opencli reddit subreddit resumes -f json` | 待实测 |

**⚠️ 无 comments 命令**：Reddit 适配器没有独立的 comments 命令，评论通过 `read --limit N` 获取。

## 关键发现（2026-09-17）

### read 可同时拿帖+评论（P2）

`opencli reddit read <post_id> --limit 5` 可同时获取帖子正文和评论，`--limit` 参数控制评论条数。

09-17 实测：用 read 精读 r/resumes 的博士简历求评帖，**评论区专家反馈质量极高**（具体到 bullet point 的改写建议）。

### 子版定位（求职相关）

| 子版 | 内容 | 求职相关度 |
|---|---|---|
| `r/resumes` | 简历求评/模板/改写建议 | 高（专家反馈质量高） |
| `r/PhD` | 博士生活/就业/转行 | 高（就业焦虑帖 2216 score） |
| `r/cscareerquestions` | CS 职业发展/面试/薪资 | 高 |
| `r/LocalLLaMA` | 大模型技术讨论 | 中（AI 岗位技术前沿） |

### 核心信号（09-17 探针）

- 学术转产业简历需从 "WHAT"（做了什么）转向 "Accomplished"（达成了什么）
- r/PhD 就业焦虑帖热度极高（2216 score），是博士就业情绪的优质信源
- 英文语料理解成本：英文词用英文搜，结论需中文转述时保留原文链接

## 反爬风险评估

**中**——Reddit 对连续读取有限流，建议间隔 5-10 秒。搜索 API 限制更严。

## 待完善

- [ ] 完整命令清单（`opencli reddit --help`）
- [ ] read 输出字段结构（帖子+评论的精确字段）
- [ ] search 命令可用性和输出格式
- [ ] subreddit 命令可用性和输出格式
- [ ] 批量采集限流节奏
- [ ] 登录态对内容可见性的影响
