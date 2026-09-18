# GitHub 适配器经验

> 登录态验证：2026-08-27 · 命令清单 L0 复核：2026-09-17（opencli v1.8.7）· 两版并集合并：2026-09-18
> 渠道职能：**发现机制**——找到你不知道存在的工具/项目。不是内容采集渠道。

## ⚠️ 先看这条：`github` 适配器只有 2 条命令

L0 实录，全部：

| 命令 | 类型 | 用途 |
|---|---|---|
| `whoami` | [read] | 当前登录账号 |
| `login` | [write] | 打开登录页并等待认证 |

**没有 search、没有 repo、没有 issues、没有 trending。**

> ⚠️ 别把 `trending` 当成本适配器的命令——它是**另一个独立适配器** `github-trending`。
> 曾有记录把它列进 `github` 的命令表并标"待实测"，L0 实录已确认 `github` 下不存在该命令。

**认证方式**：GitHub API token 或浏览器 Cookie。但认证只影响 `whoami`——

## 能力边界：鉴权再完美也拿不到任何内容

| ✅ 取得到 | ❌ 取不到 |
|---|---|
| 当前登录身份（`whoami`） | **仓库、代码、README、issue、star、提交——一样都拿不到** |

这是**能力边界判定**（[channel-probing.md](channel-probing.md) §一）的教科书案例：
命令清单里根本没有数据命令，**鉴权再完美也没有任何产出**。判定能力边界要先于调鉴权。

替代路径（都不经本适配器）：

| 要什么 | 走哪 |
|---|---|
| 发现热门仓库 | `github-trending` 适配器（每日/每周/每月，可按语言筛选；详见 [adapter-public-api.md](adapter-public-api.md)） |
| 仓库元数据（star / 最近提交 / 语言） | GitHub REST API（公开仓库免 token，注意速率限制） |
| README / 代码 | `git clone` 或直接读网页 |
| 搜仓库 | 网页搜索或 API `/search/repositories` |

```bash
opencli github-trending --help        # 先看它支持什么参数
```

## 踩坑：中文关键词搜 API 必须 URL encode

用 Python urllib 直接调 GitHub API 搜中文关键词（如"校招"）会报：

```
UnicodeEncodeError: 'ascii' codec can't encode characters
```

正确写法：

```python
import urllib.parse
query = urllib.parse.quote("校招")
url = f"https://api.github.com/search/repositories?q={query}"
```

## 速率限制（反爬风险：中）

| 场景 | 限制 |
|---|---|
| 未认证 | 60 次/小时 |
| 认证后 | 5000 次/小时 |
| 搜索 API | 更严，另计 |

## 使用纪律

1. **高 star ≠ 适用**：star 是热度信号，必须读 README + 看最近提交时间再判断。
   > 实例：2026-09-17 核实三个第三方项目的真实 star 数（3 / 1 / 1）与最后提交时间，走的是
   > GitHub API 而非适配器——**这次核实直接推翻了"参照业界成熟项目"的方案依据**。
   > 其中那个 1-star、5 年未更新的"成熟项目"就是反例。
2. **AI 不认识但 star 高的新工具 = 最强前沿信号** → 优先反查 + 精读
   （见 [topic-lexicon.md](topic-lexicon.md) §一 AI 盲区自觉）。
3. **发现优先于检索**：`github-trending` 扫热门比关键词搜索更能撞见"你不知道它存在"的东西。

## 渠道定位实例：求职工具发现（2026-09-17 探针）

一轮探针发现 5 个高 star 求职相关工具，其中 3 个：

| 项目 | star |
|---|---|
| career-ops | 71.8K |
| reactive-resume | 43.1K |
| Resume-Matcher | 28.4K |

**结论**：GitHub 是发现求职工具/开源项目的优质渠道，但**不是求职情报的直接来源**（岗位信息少）。
这条同时印证了渠道职能的判断——发现机制，不是内容采集渠道。

## 待完善

- [ ] `github-trending` 的输出格式与参数实测
- [ ] GitHub API 搜索的完整用法（认证、分页）
- [ ] 求职相关高 star 项目完整清单（还有 2 个待补）
- [ ] 与其他渠道的互补策略

## 变更记录

| 日期 | 变更 |
|---|---|
| 2026-08-27 | 登录态首验（原记于 verified-platforms.md） |
| 2026-09-17 | 独立成卡；L0 复核确认只有 2 条命令；补"需要仓库内容时走 API/clone"的替代路径与 star 核实纪律 |
| 2026-09-17 | AntiGravity 委托探针批次：中文搜索 URL encode 踩坑、速率限制、求职工具发现 |
| 2026-09-18 | 两个智能体各写一版，按语义并集合并；澄清 `trending` 属 `github-trending` 而非本适配器；去掉合并前的重复段落 |

---

*本文件最后更新：2026-09-18*
