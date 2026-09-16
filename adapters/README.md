# 自建适配器源码

> 这些是本 skill 在实战中自行编写、并通过官方 `opencli browser verify --strict-memory` 的适配器。
> OpenCLI 的自定义适配器加载目录是 `~/.opencli/clis/`，**不在任何仓库里**——
> 放一份源码在这里，换机器/换平台时可直接复制启用。

## 安装

```bash
# Windows (Git Bash)
mkdir -p ~/.opencli/clis/maimai && cp adapters/maimai/*.js ~/.opencli/clis/maimai/
opencli maimai --help          # 确认新命令已注册
```

## 清单

| 适配器 | 站点 | 作用 | Strategy | 经验文档 |
|---|---|---|---|---|
| `maimai/search-gossip.js` | 脉脉 | 职言/实名动态搜索，返回帖子**全文** + 稳定 `gid` | DOM_STATE / visible-ui | [adapter-maimai.md](../references/adapter-maimai.md) |
| `maimai/quota.js` | 脉脉 | 搜索配额探针（`is_limited` / 1h / 24h 计数） | PAGE_FETCH / internal-unstable | 同上 |

## 注意

- 适配器依赖浏览器登录态，复制过去后仍需在目标机器的 Chrome 里登录对应站点
- 站点改版会让适配器失效：`search-gossip` 输出的 `source` 列若从 `props` 全变成 `dom`，即为改版早期告警
