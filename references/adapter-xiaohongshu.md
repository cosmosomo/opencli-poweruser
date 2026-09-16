# 小红书适配器经验

> 验证日期：2026-08-19
> 版本：opencli v1.8.6
> 结论：feed/search/whoami/comments 完全可用；note 需完整签名 URL

## 认证方式

COOKIE 策略——通过浏览器扩展在页面内执行 JS 抓取数据。
**必须在 Chrome 中登录小红书账号**，否则部分接口返回空或被限流。

登录验证：`opencli xiaohongshu whoami -f json`，返回 `logged_in: true` 即正常。

## 可用命令

### 只读（安全）

| 命令 | 用途 | 示例 |
|---|---|---|
| `whoami` | 当前登录用户 | `opencli xiaohongshu whoami -f json` |
| `feed [--limit N]` | 首页推荐流 | `opencli xiaohongshu feed --limit 15 -f json` |
| `search <query>` | 搜索笔记 | `opencli xiaohongshu search "上海周末" --limit 10 -f json` |
| `note <url>` | 笔记详情（需完整 URL） | `opencli xiaohongshu note "<full_url>" -f json` |
| `comments <note-id>` | 笔记评论（含楼中楼） | `opencli xiaohongshu comments "<note-id>" -f json` |
| `user <id>` | 用户公开笔记 | `opencli xiaohongshu user "<user-id>" -f json` |
| `liked` | 赞过的笔记 | `opencli xiaohongshu liked -f json` |
| `saved` | 收藏的笔记 | `opencli xiaohongshu saved -f json` |
| `notifications` | 通知 | `opencli xiaohongshu notifications -f json` |
| `creator-profile` | 创作者账号信息 | `opencli xiaohongshu creator-profile -f json` |
| `creator-stats` | 创作者数据总览 | `opencli xiaohongshu creator-stats -f json` |
| `creator-notes` | 创作者笔记列表 | `opencli xiaohongshu creator-notes -f json` |
| `drafts` | 本地草稿箱 | `opencli xiaohongshu drafts -f json` |
| `download <note-id>` | 下载笔记图片/视频 | `opencli xiaohongshu download "<note-id>" -f json` |

### 写操作（需用户明确授权）

`publish`、`ask`、`follow`、`unfollow`、`delete-note`、`draft-clear`、`draft-delete` —— 禁止自动执行。

## 关键注意事项

### note 命令必须传完整签名 URL

**错误用法**：`opencli xiaohongshu note 6a6c95b1000000002402f61c`
**正确用法**：`opencli xiaohongshu note "https://www.xiaohongshu.com/explore/6a6c95b1...?xsec_token=xxx&xsec_source="`

**铁律**：
1. URL **必须**从 search/feed 结果的 `url` 字段原样复制，**绝对不要手动拼接或截断**（xsec_token 很长，手动写极易截断导致静默失败）
2. 用**单引号**包裹 URL，避免 `&` 被 PowerShell 解析
3. note/comments/download 三个命令都需要完整签名 URL，不只是 note

### ⚠️ 核心命令输出格式（极易踩坑，必读）

#### note 命令输出：field-value 对列表，不是 dict

`note` 命令返回的是 `[{"field":"title","value":"..."}, {"field":"content","value":"..."}, ...]` 格式，**不是直接的 dict**。

**错误写法**：
```python
data = json.load(fh)
title = data.get('title', '')  # ❌ 'list' object has no attribute 'get'
```

**正确写法**：
```python
data = json.load(fh)
note = {item['field']: item['value'] for item in data}  # ✅ 先转成 dict
title = note.get('title', '')
content = note.get('content', '')
```

可用字段：`title, author, content, likes, collects, comments, tags`

#### search 结果没有 id 字段，去重需从 URL 提取

search 输出字段只有 `rank, title, author, author_url, likes, url, published_at`（**无 id 字段**，去重见上文），**没有 id 字段**（feed 结果才有 id）。

**错误写法**：
```python
nid = note.get('id', '')  # ❌ search 结果永远返回空，去重全失效
```

**正确写法**：
```python
url = note.get('url', '')
if '/explore/' in url:
    nid = url.split('/explore/')[1].split('?')[0]
elif '/search_result/' in url:
    nid = url.split('/search_result/')[1].split('?')[0]
```

#### download 图片输出路径固定，不可指定

download 命令的图片固定保存在 `xiaohongshu-downloads/<note-id>/<note-id>_N.jpg`，**无法通过参数指定输出目录**。

download 输出包含大量进度条，必须过滤：
```powershell
opencli xiaohongshu download '<full_url>' -f json 2>&1 | Select-String -Pattern "✓|Download complete|error"
```

#### comments 命令输出：dict 列表，不是 field-value 对

`comments` 命令返回的是 **dict 列表**（和 note 的 field-value 对列表不同！），每个评论是一个 dict。

**输出字段**：
| 字段 | 含义 |
|---|---|
| `rank` | 评论排序 |
| `author` | 评论者昵称 |
| `userId` | 评论者用户 ID |
| `profileUrl` | 评论者主页链接 |
| `text` | 评论正文 |
| `likes` | 点赞数 |
| `time` | 评论时间 |
| `is_reply` | 是否为楼中楼回复（true/false） |
| `reply_to` | 回复的目标评论 ID |

**正确读取方式**：
```python
with open(f, 'r', encoding='utf-8-sig') as fh:
    comments = json.load(fh)  # ✅ 直接是 dict 列表，不需要转换
for c in comments:
    print(c['author'], c['text'][:50], c['likes'])
```

**注意**：comments 默认返回 10 条评论，楼中楼通过 `is_reply=true` 和 `reply_to` 标识。comments 命令同样需要完整签名 URL（含 xsec_token）。

### PowerShell 输出编码（所有适配器通用）

PowerShell 的 `Out-File` 默认输出 **UTF-16 LE BOM** 编码，不是 UTF-8。Python 读取时必须用 `utf-8-sig`：

```python
# ❌ 会报错或乱码
with open(f, 'r', encoding='utf-8') as fh:
    data = json.load(fh)

# ✅ 正确
with open(f, 'r', encoding='utf-8-sig') as fh:
    data = json.load(fh)
```

### ⚠️ note/comments 命令偶发静默失败（必须检查+重试）

**现象**：批量连续调用 note/comments 时，偶发输出 **0B 空文件**，无任何报错信息，exit code 为 0。实测 5 篇连续 note 调用中 2 篇出现空文件，重试后全部成功。

**可能原因**：
- 连续调用时偶发超时或浏览器会话波动
- `2>$null` 重定向在某些情况下与管道交互异常
- 部分笔记首次访问需要建立会话，第二次才成功

**必须的防护措施**：
1. **批量脚本中检查输出文件大小**，0B 视为失败
2. **失败后自动重试 1 次**（间隔 5 秒），重试成功率接近 100%
3. 不要假设"命令没报错就是成功"——空文件是最常见的静默失败

**示例防护代码**：
```python
import os, subprocess, time

def safe_note(url, output_path, max_retries=2):
    for attempt in range(max_retries):
        # 调用 opencli
        result = subprocess.run(
            ['opencli', 'xiaohongshu', 'note', url, '-f', 'json'],
            capture_output=True, text=True
        )
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(result.stdout)
        # 检查文件大小
        if os.path.getsize(output_path) > 100:
            return True
        print(f'  空文件，重试 ({attempt+1}/{max_retries})...')
        time.sleep(5)
    return False
```

### search 输出字段

`rank, title, author, author_url, likes, url, published_at`（**无 id 字段**，去重见上文）

### feed 输出字段

`id, title, type(normal/video), author, likes, url`

## 已知问题

| 问题 | 原因 | 解决 |
|---|---|---|
| `note now requires a full signed URL` | note 命令不再接受纯 ID | 传完整 URL（含 xsec_token） |
| `AUTH_REQUIRED: 登录已过期` | Chrome 中小红书登录过期 | 在 Chrome 中重新登录 xiaohongshu.com，或运行 `opencli xiaohongshu login` |
| search 返回空 | 关键词过于冷门或被过滤 | 换更通用的关键词，或检查登录状态 |

## 反爬风险评估

- 只读操作（feed/search/comments）：**低风险**，COOKIE 方式模拟正常浏览
- 批量抓取：建议单次 limit ≤ 20，间隔 > 5 秒
- 写操作（publish/follow）：**中风险**，频繁操作可能触发风控

## 实测反爬教训（2026-08-27 新增）

**现象**：连续执行 3 次 `search`（每次 `--limit 20`，中间 sleep 3 秒）即触发风控，
3 次全部返回空数组 `[]`（非报错，无任何提示）。冷却 20 秒后，单测 1 次 `search "大模型 面试" --limit 10` 仍返回空。

**判断**：
- 小红书对连续 search 的容忍度比本文件此前标注的"3 次/分钟、间隔 >5 秒"更严格；
- 空数组 `[]` 是风控信号，不是"关键词太冷门"——冷门词通常也至少返回 1-2 条；
- 触发后需较长冷却时间（≥60 秒）才会恢复，短时间内反复试探只会拉长冷却。

**对策（小红书 search 的保守节奏）**：
1. 每批只跑 **1 个关键词**，跑完等 **30 秒以上**再跑下一个，绝不 3 连发；
2. 单次 `--limit ≤ 10`，避免一次拉太多触发特征；
3. 连续 2 次返回空数组 → **立即停止搜索**，等待 ≥60 秒冷却，期间可用 `feed --limit 5` 探活判断是限流还是关键词问题；
4. 若长时间不恢复，改用 `--window foreground --site-session persistent` 重建一次会话后再回 background；
5. 把搜索总量压到最少：先想清关键词矩阵，宁少而精。

## 命令参数补遗（2026-09-01 滨寿司调研实测）

- `comments` 和 `download` 命令**同样需要完整签名 URL**（含 xsec_token），不能只传 note-id。报错信息为 `now requires a full signed URL`。从 search/feed 结果取 `url` 字段即可。
- 传 URL 时用双引号包裹，避免 `&` 被 shell 解析。

## 图片型笔记处理 SOP（2026-09-01 新增，非常重要）

小红书高赞笔记大量为**图文笔记**：`note` 命令返回的 `content` 字段只有 `#标签`，菜品/价格/评分等核心信息全部写在图片里。遇到 content 只有标签时，**立即转 download 图片**，不要在正文里找信息。

处理流程：
1. `note <full_url>` 检查 content——若只有标签，判定为图片型笔记。
2. `download <full_url>` 下载全部图片到 `xiaohongshu-downloads/<note-id>/`。
3. **download 输出必须过滤**：多图笔记的进度条会刷屏浪费 token，用：
   ```powershell
   opencli xiaohongshu download "<full_url>" -f json 2>&1 | Select-String -Pattern "✓|Download complete|index|status|error"
   ```
4. **并行 Read 图片**：Read 工具支持并行调用，一次读 3~4 张。`thumbnail_size=large` 足够看清菜品文字和价格，不需要 full。
5. **封面图优先**：多图笔记第 1 张通常是汇总页（直接列出全部推荐项+价格+评分），先读封面判断价值，再决定是否读完全部。
6. 图片路径：`E:\program\media\xiaohongshu-downloads\<note-id>\<note-id>_N.jpg`

## 评论区读取策略（2026-09-01 新增）

- 评论区对**图片型笔记**有补充价值：用户常在评论区补充推荐菜品、反馈争议款。
- **只读高赞笔记的评论**（点赞 >5000），低赞笔记评论信息量低。
- `comments <full_url>` 同样需要完整签名 URL。
- 评论区价值场景：发现争议款（如牛肉鹅肝有人说"天作之合"、有人说"柴+腻没咽下去"）、补充推荐（如评论区推荐火炙焦糖鳗鱼、辣辣骨汤乌冬）。

## 调研工作流优化（2026-09-01 滨寿司调研总结）

1. **关键词矩阵**：2~3 个互补关键词即可（如"必点"+"性价比"），近义词重复搜索结果重复率约 40%，浪费反爬配额。
2. **先筛选再精读**：search 返回的标题+点赞数足够判断价值，只精读点赞 >3000 或标题含"红黑榜/从夯到拉/攻略/测评"的笔记。
3. **交叉验证定置信度**：同一菜品在 ≥3 篇独立笔记中被推荐 → 高置信度必吃；只在 1 篇出现 → 标注"个人推荐"。
4. **复用原生分类**：小红书滨寿司等品类已有成熟的"从夯到拉"四档分类（夯夯组/人上人组/NPC组/拉完了），直接复用比自己重新分类效率高且符合用户认知。
5. **daemon 状态**：`opencli daemon status` 可能显示 `not running`，但命令实际可用（通过浏览器扩展直连）。whoami 正常返回即说明通道可用，不必纠结 daemon 状态。

## 本次调研效率数据（2026-09-01 滨寿司）

- 3 组关键词搜索 → 去重后约 15 篇独特笔记
- 精读 7 篇正文 + 2 篇图片红黑榜（共 10 张图）+ 2 篇评论区
- 产出 47 款菜品四档分级 + 2 套验证过的性价比方案 + 8 篇信源链接
- 总耗时：约 15 分钟（含反爬等待约 2 分钟）

## 舆情/风评调研场景经验（2026-09-03 验证）

> 来源：AI 办公三产品（豆包/WorkBuddy/千问）真实风评调研，精读 13 篇小红书笔记 + 2 篇评论区

### 关键词策略（风评专用）

产品/工具类风评调研，关键词分两类：
- **负面触发词**：产品名 + "踩坑/吐槽/避雷/坑/后悔/退款/骗/垃圾/智商税"
- **额度/价格词**：产品名 + "积分/额度/会员/性价比/值不值/耐用/消耗"

实际案例：
- "豆包会员 坑" → 命中 388 赞高赞负面笔记
- "WorkBuddy 积分" → 命中 141 赞严重吐槽 + 52 赞消费欺诈
- "千问 积分" → 命中 61 赞治好积分焦虑 + 69 赞敢放肆跑 Agent

经验：负面词比中性词命中率高 3-5 倍，风评调研优先用负面词搜。

### 高赞负面笔记筛选

- 点赞 > 100 且标题含负面词 → 必精读（高置信度普遍槽点）
- 点赞 20-100 → 选择性精读（可能是个人极端体验，需交叉验证）
- 点赞 < 20 → 跳过（样本量不足，参考价值低）
- 标题含"实测/对比/从入门到放弃/使用一个月后" → 即使点赞不高也值得看（通常有具体数据）

### 评论区挖掘（风评调研的金矿）

小红书评论区对风评调研价值极高，远超普通内容调研：
1. **"我也是"效应**：高赞负面笔记评论区常出现大量"我也遇到了"+具体细节，能验证槽点是否普遍
2. **替代方案**：评论区常有人分享"我后来改用 X 了""接 Y API 省钱"，是正面技巧的重要来源
3. **争议点**：同一笔记评论区可能出现正反两方争论，能看到不同用户群体的体验差异
4. **补充细节**：正文没说的具体消耗数据、退款流程、客服回复，常在评论区

读取策略：只对点赞 > 100 的笔记读评论区，低赞笔记评论区信息量低。

### 反爬节奏验证（2026-09-03）

本次舆情调研严格执行保守节奏，**全程零风控**：
- search：每批 1 个关键词，间隔 ≥ 30 秒，limit=10 → 6 次 search 全部正常返回
- note：连续调用 8 次（不同笔记 URL），间隔 5-10 秒 → 全部正常
- comments：连续调用 2 次，间隔 5 秒 → 全部正常

**关键发现**：note 和 comments 的反爬严格度远低于 search。search 需 30 秒间隔，但 note/comments 可以 5-10 秒连续调用。原因可能是 search 是高频接口（爬虫主要入口），note/comments 是浏览行为（模拟正常用户）。

**优化后的节奏建议**：
1. search 阶段：1 关键词 / 30 秒 / limit≤10（严格保守）
2. 精读阶段：note + comments 可以批量连续调用，5-10 秒间隔即可
3. 先搜完所有关键词（攒够笔记列表），再批量精读 note/comments，效率最高

### 图文笔记在风评调研中的处理

风评调研中图文笔记比例较高（用户常截图消耗记录、退款聊天记录）：
- content 只有标签 → 立即 download 图片
- 图片中常包含：积分消耗截图、客服对话截图、套餐价格对比表
- Read 图片时 thumbnail_size=large 足够看清文字，不需要 full
- 封面图优先：第 1 张通常是总结页（直接列出槽点+证据）

### 与知乎的互补

小红书抓负面情绪和高赞吐槽，知乎补深度分析和省钱技巧。同一槽点在两个平台都出现 → 高置信度普遍问题；只在小红书出现 → 可能是情绪化个体体验，需甄别。

---

## 探活与批量精读实战（2026-09-12 Agent Harness 调研）

- **whoami 不可靠，别用它探活**：whoami/creator-* 走 creator.xiaohongshu.com 登录态（常掉线、60s 超时），与 www 浏览态是两套 cookie。探活固定用 `feed --limit 3`。
- **批量精读规模上限再验证**：单会话连续 51 篇 note（7s 间隔，其中含一批 33 篇连打）全部成功零风控。note 通道的实际耐受度可能比"5-10 秒间隔"标注的还要宽，但 search 累积限流仍在第 6 词左右出现（四连空数组、feed 正常）——**search 配额省着用，优先把关键词矩阵想清楚再开枪**。
- **限流后的正确姿势**：search 全线空时不要干等，转 note 精读已攒下的列表，调研照样完成；冷却窗口留给下一批关键词。

---

---

## 核心命令正确用法补遗（2026-09-14 Agent做PPT调研）

> 来源：25 篇高赞笔记精读实战中暴露的 5 个核心命令使用错误，全部已写入上方"关键注意事项"章节。

- **note 输出格式未文档化**：之前只写了"note 需完整签名 URL"，完全没提 note 返回的是 field-value 对列表而非 dict。导致 data.get('title') 直接报错。已补充错误/正确写法对比。
- **search 无 id 字段未提醒**：search 输出字段列了 7 个字段但没强调"无 id"，导致去重时 note.get('id','') 全部返回空。已补充从 URL 提取 id 的正确写法。
- **URL 截断静默失败**：强调了"需完整 URL"但没说"从哪取、不能手拼"。手动硬编码 URL 时 xsec_token 被截断，download 静默失败。已升级为"铁律"三条。
- **PowerShell 编码陷阱**：Out-File 默认 UTF-16 LE BOM，Python json.load 用 utf-8 读取直接报错。所有适配器通用，已补充 utf-8-sig 正确写法。
- **download 输出路径不可指定**：之前只提了路径示例，没强调"无法通过参数指定输出目录"。已补充说明。

**经验总结**：适配器经验文件不能只写"命令能跑通"，必须写清：输出的精确数据结构、常见错误写法与正确写法对比、静默失败的识别方法。

---

## 第二轮实战补遗（2026-09-14 评论区+低赞笔记挖掘）

> 来源：在第一轮 25 篇精读基础上，追加 3 篇高赞笔记评论区 + 5 篇低赞笔记精读，暴露 2 个新坑。

### 新坑 1：comments 输出格式与 note 完全不同

- note 返回 field-value 对列表 `[{"field":"title","value":...}]`
- comments 返回 **dict 列表**，每个评论直接是 `{"rank":1,"author":"...","text":"...","likes":"15","is_reply":false,...}`
- 之前完全没文档化，第一次用会困惑为什么格式不一样
- 已补充完整字段说明表和正确读取代码

### 新坑 2：note/comments 偶发静默失败（0B 空文件）

- 实测 5 篇连续 note 调用中 2 篇输出 0B 空文件，exit code 0，无任何报错
- 重试后全部成功（重试成功率接近 100%）
- 可能原因：连续调用超时/会话波动、`2>$null` 与管道交互异常
- **铁律**：批量脚本必须检查输出文件大小，0B 视为失败并自动重试 1 次
- 已补充 safe_note 防护函数示例代码

### 评论区高价值补充

- 581 赞高赞评论给出新工作流：AI 生成逐页大纲 → ChatGPT 生成逐页修改提示词 → NotebookLM 修改 PPT，不容易乱码
- 81 赞评论：自己定制 PPT 模板喂给 AI + 详细说明大纲注意事项，输出更稳定
- 12 赞评论：NotebookLM 不如 GPT-Image-2，中文渲染和配图完胜

### 低赞笔记高价值发现

- 92 赞：ppt-default-style skill 提炼 Anthropic PPT 7 条核心 DNA（Goga Bold 标题、衬线正文对比、10 色固定编号色板等）
- 77 赞：六步工作流（丢材料→Story Map→任务卡→生图 prompt→反向 review→讲稿），核心观点"AI 不是替你想 PPT 的人，是帮你把判断可视化的人"
- 30 赞：四步审美规范法（定受众→定信息层级→定配色版式→生成验收），有可直接复制的提示词

---

*本文件最后更新：2026-09-14（第二轮实战补遗）*
