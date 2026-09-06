#!/usr/bin/env python3
"""
调研目录一键初始化脚本。

用法：
    python init_research.py "议题名称"
    python init_research.py "议题名称" --base E:\\path\\to\\knowledge-space

创建结构：
    YYYY-MM-DD_议题名称/
    ├── README.md      # 调研概要（结束时填）
    ├── notes.md       # 随手记（调研过程中随时写）
    ├── raw/           # 原始数据（JSON、截图、HTML，什么都往里扔）
    └── output/        # 整理后的产出（报告、摘要，以后慢慢整理）
"""

import argparse
import os
import sys
from datetime import datetime
from pathlib import Path

# 默认知识空间根目录（可通过 --base 覆盖，或环境变量 RESEARCH_BASE）
DEFAULT_BASE = os.environ.get(
    "RESEARCH_BASE",
    r"E:\program\media\knowledge-space\research-logs"
)

README_TEMPLATE = """# {title}

> 调研日期：{date}
> 状态：🔄 进行中

## 议题与目标

<!-- 一句话说明为什么做这个调研，想搞清楚什么 -->

## 关键发现

<!-- 调研结束时填 3-5 条最有价值的发现 -->

1.
2.
3.

## 信息来源

| 平台 | 关键词/URL | 条数 | 备注 |
|---|---|---|---|
| | | | |

## 后续待整理

<!-- 哪些原始数据需要进一步分析、哪些线索值得跟进 -->

"""

NOTES_TEMPLATE = """# 调研随手记 — {title}

> 想到什么写什么，不需要结构化。原始想法比工整重要。

## {date}

- 开始调研：
- 关键词：
- 发现：
- 疑问：
- 下一步：

"""


def sanitize_filename(name: str) -> str:
    """清理文件名中的非法字符"""
    illegal = '<>:"/\\|?*'
    for ch in illegal:
        name = name.replace(ch, "_")
    return name.strip()[:80]  # 限制长度


def main():
    parser = argparse.ArgumentParser(description="初始化调研目录")
    parser.add_argument("title", help="调研议题名称")
    parser.add_argument("--base", default=DEFAULT_BASE,
                        help=f"知识空间根目录（默认: {DEFAULT_BASE}）")
    args = parser.parse_args()

    date_str = datetime.now().strftime("%Y-%m-%d")
    safe_title = sanitize_filename(args.title)
    dir_name = f"{date_str}_{safe_title}"
    research_dir = Path(args.base) / dir_name

    # 创建目录结构
    (research_dir / "raw").mkdir(parents=True, exist_ok=True)
    (research_dir / "output").mkdir(parents=True, exist_ok=True)

    # 生成模板文件（不覆盖已有文件）
    readme_path = research_dir / "README.md"
    if not readme_path.exists():
        readme_path.write_text(
            README_TEMPLATE.format(title=args.title, date=date_str),
            encoding="utf-8"
        )

    notes_path = research_dir / "notes.md"
    if not notes_path.exists():
        notes_path.write_text(
            NOTES_TEMPLATE.format(title=args.title, date=date_str),
            encoding="utf-8"
        )

    # 输出结果
    print(f"✅ 调研目录已创建: {research_dir}")
    print(f"")
    print(f"目录结构:")
    print(f"  {dir_name}/")
    print(f"  ├── README.md    ← 结束时填概要")
    print(f"  ├── notes.md     ← 随手记")
    print(f"  ├── raw/         ← 原始数据（JSON/截图/HTML）")
    print(f"  └── output/      ← 整理后的产出（以后慢慢填）")
    print(f"")
    print(f"接下来:")
    print(f"  1. 搜索结果直接存到 raw/ 目录")
    print(f"  2. 有想法随时追加到 notes.md")
    print(f"  3. 调研结束时花 1 分钟填 README.md 的关键发现")

    # 返回目录路径（方便脚本调用方获取）
    return str(research_dir)


if __name__ == "__main__":
    result = main()
    # 最后一行输出纯路径，方便 shell 捕获
    print(f"DIR={result}", file=sys.stderr)
