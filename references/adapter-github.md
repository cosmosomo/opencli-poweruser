# GitHub 适配器经验

> 验证日期：2026-09-17（探针批次）
> 版本：opencli v1.8.7
> 状态：**精简版，待完善**。仅记录 09-17 AntiGravity 委托探针批次的实测发现。

## 认证方式

GitHub API token 或浏览器 COOKIE。适配器只有 `whoami` 命令可用，发现走 `github-trending`，读仓库走 API/clone。

## 已验证可用命令

| 命令 | 用途 | 示例 | 状态 |
|---|---|---|---|
| `whoami` | 当前登录用户 | `opencli github whoami -f json` | ✅ |
| `trending` | GitHub Trending 项目 | 待实测 | 待实测 |

**⚠️ 适配器能力有限**：只有 whoami 确认可用，搜索和仓库读取需走 GitHub API 或 clone。

## 关键发现（2026-09-17）

### 中文搜索需 URL encode（P2）

用 Python urllib 直接调 GitHub API 搜索中文关键词（如"校招"）时，会报：
```
UnicodeEncodeError: 'ascii' codec can't encode characters
```

**正确写法**：
```python
import urllib.parse
query = urllib.parse.quote("校招")
url = f"https://api.github.com/search/repositories?q={query}"
```

### 求职工具发现（09-17 探针）

发现 5 个高 star 求职相关工具：
- career-ops（71.8K stars）
- reactive-resume（43.1K stars）
- Resume-Matcher（28.4K stars）
- （其余 2 个待补充）

GitHub 是发现求职工具/开源项目的优质渠道，但**不是求职情报的直接来源**（岗位信息少）。

## 反爬风险评估

**中**——GitHub API 有速率限制（未认证 60 次/小时，认证 5000 次/小时）。搜索 API 限制更严。

## 待完善

- [ ] 完整命令清单（`opencli github --help`）
- [ ] trending 命令可用性和输出格式
- [ ] GitHub API 搜索的完整用法（认证、速率、分页）
- [ ] 求职相关高 star 项目完整清单
- [ ] 与其他渠道的互补策略
