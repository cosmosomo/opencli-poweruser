# 知乎适配器经验

> 验证日期：2026-09-03
> 版本：opencli v1.8.6
> 结论：search / answer-detail / answer-comments 完全可用；反爬比小红书宽松得多，可连续调用

## 认证方式

COOKIE 策略——通过浏览器扩展在页面内执行 JS 抓取数据。
**必须在 Chrome 中登录知乎账号**，否则部分接口返回空或被限流。

登录验证：`opencli zhihu whoami -f json`，返回正常用户信息即登录有效。

## 可用命令

### 只读（安全）

| 命令 | 用途 | 示例 |
|---|---|---|
| `whoami` | 当前登录用户 | `opencli zhihu whoami -f json` |
| `hot` | 知乎热榜 | `opencli zhihu hot -f json` |
| `search <query>` | 搜索（回答/文章/问题混合） | `opencli zhihu search "WorkBuddy 积分" -f json` |
| `question <id>` | 问题详情 | `opencli zhihu question <question-id> -f json` |
| `answer <id>` | 回答摘要 | `opencli zhihu answer <answer-id> -f json` |
| `answer-detail <id>` | **单个回答完整正文**（含 Markdown） | `opencli zhihu answer-detail <answer-id> -f json` |
| `answer-comments <id>` | 回答评论列表 | `opencli zhihu answer-comments <answer-id> -f json` |
| `user <id>` | 用户信息 | `opencli zhihu user <user-id> -f json` |
| `user-answers <user>` | 用户回答列表 | `opencli zhihu user-answers <user> -f json` |
| `user-articles <user>` | 用户文章列表 | `opencli zhihu user-articles <user> -f json` |
| `collection <id>` | 收藏夹内容（需登录） | `opencli zhihu collection <id> -f json` |
| `collections` | 收藏夹列表（需登录） | `opencli zhihu collections -f json` |
| `recommend` | 推荐流 | `opencli zhihu recommend -f json` |
| `pins` | 想法 | `opencli zhihu pins -f json` |
| `download` | 导出文章为 Markdown | `opencli zhihu download <url> -f json` |

## 关键注意事项

### answer-detail 必须传 answer ID，不能传 URL

**错误用法**：`opencli zhihu answer-detail "https://www.zhihu.com/question/123/answer/456"`
**正确用法**：`opencli zhihu answer-detail 456`

从 search 结果的 `url` 字段提取末尾数字：
- URL 格式：`https://www.zhihu.com/question/<question-id>/answer/<answer-id>`
- answer-id 就是最后一段数字
- 用 PowerShell 提取：`($url -split '/')[-1]`

### search 返回字段

`rank, title, type(answer/article/question), author, author_url, votes(赞同数), url, excerpt(摘要), published_at`

**type 字段很重要**：answer 类型才能用 answer-detail 拿全文；article 类型用 download 导出；question 类型用 question 拿问题页。

### 高赞筛选

- search 结果按 votes 排序，votes > 5 即有参考价值
- votes > 50 通常是高质量回答，优先精读
- 同一问题下多个回答，优先选 votes 最高的 1-2 个精读，不必全读

## 反爬风险评估

- 只读操作（search / answer-detail / answer-comments）：**极低风险**
- 本次实战（2026-09-03）：连续 search 3 次 + answer-detail 2 次 + answer-comments 1 次，无任何限流或空返回
- 与小红书对比：知乎对连续 search 的容忍度远高于小红书（小红书 3 连发即风控，知乎 6 连发无异常）
- 建议节奏：同一适配器 ≤ 5 次/分钟，比小红书宽松但仍需保守

## 高价值场景

| 场景 | 为什么知乎有价值 |
|---|---|
| 工具/产品深度评测 | 长文系统化分析，比小红书情绪化吐槽更理性 |
| 省钱技巧/替代方案 | 用户分享接第三方 API、多账号薅积分等实操方法 |
| "如何评价 X"类问题 | 多回答对比，能看到正反两方观点 |
| 技术原理/架构分析 | 深度长文质量高，适合需要理解底层机制的调研 |
| 行业趋势/职业讨论 | 从业者真实声音，比媒体报道更接地气 |

## 与小红书的互补关系

| 维度 | 小红书 | 知乎 |
|---|---|---|
| 内容风格 | 情绪化、口语化、短平快 | 理性、系统化、长文 |
| 负面舆情 | 集中（吐槽/踩坑笔记高赞） | 分散（嵌入回答中） |
| 正面/技巧 | 少（种草笔记多但质量参差） | 多（省钱技巧、替代方案详细） |
| 评论区价值 | 高（"我也是"+替代方案） | 中（评论区质量不如回答正文） |
| 反爬严格度 | 高（3 连发风控） | 低（6 连发无异常） |
| 适合任务 | 风评/口碑/用户情绪 | 深度分析/技巧/原理 |

**舆情调研组合策略**：小红书抓负面情绪和高赞吐槽，知乎补深度分析和省钱技巧，两者交叉验证同一槽点是否普遍存在。

## 本次实战经验（2026-09-03 AI 办公产品风评调研）

1. **关键词选择**：产品名 + "积分/额度/会员/性价比/踩坑/吐槽"，如 "WorkBuddy 积分"、"豆包会员 坑"
2. **筛选策略**：search 结果中 type=answer 且 votes > 5 的优先，votes > 50 的必精读
3. **answer-detail 提取 ID**：从 url 末尾提取，PowerShell `($url -split '/')[-1]`
4. **正文质量**：answer-detail 返回完整 Markdown 正文，包含代码块、列表、引用，质量远高于小红书 note 的 content 字段
5. **评论区补充**：answer-comments 可获取高赞评论，用于发现争议点和补充信息，但价值不如小红书评论区
6. **效率**：知乎一次 search + 2 次 answer-detail 即可获得 2 篇高质量长文，比小红书（需 search + note + comments + download 图片）效率高

---

*本文件最后更新：2026-09-03*
