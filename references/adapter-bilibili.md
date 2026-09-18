# B站适配器经验

> 验证日期：2026-09-17（探针批次）
> 版本：opencli v1.8.7
> 状态：**精简版，待完善**。仅记录 09-17 AntiGravity 委托探针批次的实测发现，完整命令清单和输出结构待后续实测补充。

## 认证方式

COOKIE 策略——通过浏览器扩展在页面内执行 JS 抓取数据。
**必须在 Chrome 中登录 B站账号**。

登录验证：`opencli bilibili whoami -f json`

## 已验证可用命令

| 命令 | 用途 | 示例 | 状态 |
|---|---|---|---|
| `search <query>` | 搜索视频 | `opencli bilibili search "校招简历" -f json` | ✅ |
| `summary <bvid>` | **视频官方 AI 总结**（分段大纲+时间戳） | `opencli bilibili summary BV1xx411c7mD -f json` | ✅ 零成本精读入口 |
| `subtitle <bvid>` | 视频字幕 | `opencli bilibili subtitle BV1xx411c7mD -f json` | 待实测 |
| `download <bvid>` | 下载视频 | 待实测 | 待实测 |

## 关键发现（2026-09-17）

### summary 是零成本精读入口（P1）

`opencli bilibili summary <bvid>` 直接返回视频的官方 AI 总结（分段大纲+时间戳），**无需下载转写**。

**采集策略优先级**：
```
search → summary（零成本，覆盖 80% 干货）→ 有价值才 ASR 转写（最贵）
```

09-17 实测：用 summary 精读"校招大模型算法简历修改"视频（22750 分），获取了逐行修改建议，全程零下载零转写。

### 其他发现

- HR 简历套路类视频播放量极高（137 万播放），是简历方法论的优质信源
- 搜索结果按相关度排序，高播放量视频通常在前列

## 反爬风险评估

**低**——B站对搜索和 summary 的限流较宽松。批量下载视频需注意频率。

## 待完善

- [ ] 完整命令清单（`opencli bilibili --help`）
- [ ] search 输出字段结构
- [ ] summary 输出字段结构
- [ ] subtitle 命令可用性和输出格式
- [ ] download 命令参数和输出路径
- [ ] 批量采集限流节奏
