# 公开 API 适配器经验

> 验证日期：2026-08-19
> 这些适配器不需要浏览器，通过 Node.js 直接 fetch 公开 API，零反爬风险。

## 已验证适配器

| 适配器 | 命令示例 | 输出格式 | 备注 |
|---|---|---|---|
| `hackernews` | `opencli hackernews top --limit 5 -f json` | ✅ 标准 JSON | 正常 |
| `wttr` | `opencli wttr current shanghai -f json` | ✅ 标准 JSON | 正常 |
| `arxiv` | `opencli arxiv search "optical spectroscopy" --limit 5 -f json` | ✅ 标准 JSON | 正常 |
| `npm` | `opencli npm search @jackwener/opencli -f json` | ✅ 标准 JSON | 正常 |
| `coingecko` | `opencli coingecko top --limit 3 -f json` | ⚠️ 非标准 JSON | 需调整解析方式 |
| `bilibili` | `opencli bilibili hot --limit 5 -f json` | ✅ 标准 JSON | 浏览器桥接，已验证正常 |

## 常用命令速查

### HackerNews

```bash
opencli hackernews top --limit 10 -f json       # 热门故事
opencli hackernews best --limit 10 -f json      # 最佳故事
opencli hackernews new --limit 10 -f json       # 最新故事
```

### 天气 (wttr)

```bash
opencli wttr current shanghai -f json            # 当前天气
opencli wttr forecast shanghai --days 3 -f json # 天气预报
```

### arXiv

```bash
opencli arxiv search "关键词" --limit 10 -f json  # 论文搜索
```

### B站

```bash
opencli bilibili hot --limit 10 -f json          # 热门视频
opencli bilibili search "关键词" --limit 10 -f json  # 搜索视频
```

## 注意事项

1. **coingecko 输出非标准 JSON**：不要直接用 JSON 解析，改用纯文本模式 `-f plain` 或手动处理。
2. **所有公开 API 适配器无需浏览器**：daemon 和扩展不影响这些命令。
3. **arxiv 搜索支持中英文**：但英文关键词结果更丰富。
4. **wttr 城市名用拼音或英文**：如 `shanghai`、`beijing`，不支持中文城市名。

## 探索更多公开 API 适配器

运行 `opencli --help` 查看完整适配器列表，名称中不含浏览器依赖的通常为公开 API 类型。
常见的还有：`pubmed`、`pypi`、`reddit`、`reuters`、`yahoo-finance`、`youtube` 等。
验证新适配器后，将经验追加到本文件。
