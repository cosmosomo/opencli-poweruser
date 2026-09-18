#!/usr/bin/env python3
"""nav_audit.py —— skill 导航可达性自检

为什么需要它：agent 只常驻 SKILL.md，靠导航表决定读哪个 reference。
**没被 SKILL.md 引用的文件，对下一个 agent 等于不存在。**
新建 reference 后忘了登记 → 写得再好也是死存储（已发生过，见 CHANGELOG 2026-09-17）。

纪律靠不住（本仓回流率曾是 1/3），所以做成脚本。

检查四项：
  1. 孤儿   磁盘上有、SKILL.md 没引用的 references/ 与 scripts/ 文件
  2. 死链   SKILL.md 引用了、磁盘上没有的文件
  3. 计数   SKILL.md 里 "references/ 共 N 份" 与实际份数是否一致
  4. 内链   references/ 之间的相对链接是否指向真实文件

用法：
    python scripts/nav_audit.py                # 在 skill 根目录跑
    python scripts/nav_audit.py --root <path>  # 指定 skill 根目录
    python scripts/nav_audit.py --quiet        # 只在有问题时输出

退出码：0 = 全部通过；1 = 存在问题（可用于 CI / 收尾门禁）
"""

import argparse
import re
import sys
from pathlib import Path

# Markdown 链接里的路径部分：[文字](路径) 与 裸反引号路径 `references/x.md`
LINK_RE = re.compile(r"\]\(([^)\s#]+)")
BACKTICK_RE = re.compile(r"`((?:references|scripts|adapters|platforms)/[^`\s]+)`")
COUNT_RE = re.compile(r"references/\s*共\s*(\d+)\s*份")

# 审计范围：这些目录下的文件应当可从 SKILL.md 到达
AUDITED_DIRS = ("references", "scripts")
AUDITED_SUFFIXES = (".md", ".py")


def read_text(path: Path) -> str:
    """BOM 安全读取（PowerShell 落盘常带 UTF-16/UTF-8 BOM，见 pitfalls §12）。"""
    for enc in ("utf-8-sig", "utf-8", "utf-16"):
        try:
            return path.read_text(encoding=enc)
        except (UnicodeDecodeError, UnicodeError):
            continue
    return path.read_bytes().decode("utf-8", errors="replace")


def extract_links(text: str) -> set[str]:
    links = set(LINK_RE.findall(text))
    links |= set(BACKTICK_RE.findall(text))
    return {ln.strip() for ln in links if not ln.startswith(("http://", "https://", "mailto:"))}


def audit(root: Path) -> list[str]:
    problems: list[str] = []
    skill_md = root / "SKILL.md"
    if not skill_md.is_file():
        return [f"找不到 {skill_md}——用 --root 指定 skill 根目录"]

    skill_text = read_text(skill_md)
    referenced = extract_links(skill_text)

    # 磁盘上应当可达的文件
    on_disk: set[str] = set()
    for d in AUDITED_DIRS:
        for p in sorted((root / d).glob("*")):
            if p.is_file() and p.suffix in AUDITED_SUFFIXES:
                on_disk.add(f"{d}/{p.name}")

    # 1. 孤儿
    orphans = sorted(on_disk - referenced)
    for o in orphans:
        problems.append(f"孤儿：{o} 存在但 SKILL.md 未引用 → 登记进导航表，否则下一个 agent 找不到")

    # 2. 死链（只查被审计目录下的，外部路径不管）
    for link in sorted(referenced):
        if link.startswith(AUDITED_DIRS) and not (root / link).exists():
            problems.append(f"死链：SKILL.md 引用了 {link}，但文件不存在")

    # 3. 计数断言
    m = COUNT_RE.search(skill_text)
    if m:
        declared = int(m.group(1))
        actual = len([f for f in on_disk if f.startswith("references/")])
        if declared != actual:
            problems.append(f"计数：SKILL.md 写「references/ 共 {declared} 份」，实际 {actual} 份")
    else:
        problems.append("计数：SKILL.md 里找不到「references/ 共 N 份」声明，无法校验")

    # 4. references/ 内部链接
    #    注意：文里两种写法并存——`data-quality-checklist.md`（同目录相对）
    #    与 `references/pitfalls.md`（仓库根相对）。两种都算数，任一解析得到即通过。
    #    `adapter-<name>.md` 这类含尖括号的是模板占位符，不是链接。
    for p in sorted((root / "references").glob("*.md")):
        for link in extract_links(read_text(p)):
            if link.startswith(("/", "~")) or "<" in link or ">" in link:
                continue
            if (p.parent / link).exists() or (root / link).exists():
                continue
            problems.append(f"内链：references/{p.name} → {link} 指向的文件不存在")

    return problems


def main() -> int:
    ap = argparse.ArgumentParser(description="skill 导航可达性自检")
    ap.add_argument("--root", default=None, help="skill 根目录（默认：本脚本的上级目录）")
    ap.add_argument("--quiet", action="store_true", help="只在有问题时输出")
    args = ap.parse_args()

    root = Path(args.root).resolve() if args.root else Path(__file__).resolve().parent.parent
    problems = audit(root)

    if problems:
        print(f"[nav_audit] {root}")
        print(f"[nav_audit] 发现 {len(problems)} 个问题：\n")
        for p in problems:
            print(f"  ✗ {p}")
        print("\n处理方式见 EVOLUTION.md §6.7（可达性优先于完整性）")
        return 1

    if not args.quiet:
        print(f"[nav_audit] {root}")
        print("[nav_audit] ✓ 无孤儿、无死链、计数一致、内链完好")
    return 0


if __name__ == "__main__":
    sys.exit(main())
