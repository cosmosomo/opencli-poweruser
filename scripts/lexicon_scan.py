#!/usr/bin/env python3
"""议题词典扫描器：从调研原始数据提取词频、标签与热度分层。

方法论见 references/topic-lexicon.md。本脚本不含任何议题专属词，
候选词表由调用方提供（或自动从语料 tags 中挖），因此可跨议题复用。

数据前提（由调研流程产出）：
  <research-dir>/raw/kw*.json        各关键词 search 结果
  <research-dir>/raw/notes/*.json    精读全文（opencli note 返回 [{field,value}]）

用法：
  python lexicon_scan.py tags   <research-dir>                 # 扫 tags 全量标签 + 频次
  python lexicon_scan.py freq   <research-dir> <words.txt>     # 统计候选词表频次
  python lexicon_scan.py tier   <research-dir> <words.txt>     # 频次 + 热度分层(🔥/♨️/❄️)
  python lexicon_scan.py inventory <research-dir>              # 由 kw*.json 生成去重清单

words.txt：一行一个候选词（支持中英文、含空格短语）；# 开头为注释。
建议把 AI 先验状态写在词后，用 ` | ` 分隔，例如：
  inputModalities | 不认识
  时空可组合性 | 模糊
脚本会把该标注原样带进输出，便于人工补 🔮/⚙️ 评估。
"""
import json
import re
import sys
from collections import Counter
from pathlib import Path

TIER_HOT = 40      # n >= 40  → 🔥 核心
TIER_WARM = 5      # n >= 5   → ♨️ 常用；否则 ❄️ 外层


# ---------- 读取工具 ----------

def read_json(path):
    """BOM 嗅探：PowerShell 5.1 Tee-Object 落盘是 UTF-16 LE，opencli 输出是 UTF-8。"""
    raw = Path(path).read_bytes()
    if raw[:2] in (b"\xff\xfe", b"\xfe\xff"):
        text = raw.decode("utf-16")
    elif raw[:3] == b"\xef\xbb\xbf":
        text = raw.decode("utf-8-sig")
    else:
        text = raw.decode("utf-8", errors="replace")
    return json.loads(text.strip() or "[]")


def flatten(data):
    """opencli note 返回 [{field,value},...]，摊平成 dict。"""
    if isinstance(data, list):
        out = {}
        for it in data:
            if isinstance(it, dict) and "field" in it:
                out[it["field"]] = it.get("value")
        return out
    return data if isinstance(data, dict) else {}


def load_notes(raw):
    notes = {}
    d = raw / "notes"
    if d.exists():
        for f in d.glob("*.json"):
            try:
                notes[f.stem] = flatten(read_json(f))
            except Exception as exc:
                print(f"[warn] skip {f.name}: {exc}", file=sys.stderr)
    return notes


def load_searches(raw):
    out = {}
    for f in sorted(raw.glob("kw*.json")):
        try:
            out[f.stem] = read_json(f)
        except Exception as exc:
            print(f"[warn] skip {f.name}: {exc}", file=sys.stderr)
    return out


def build_corpus(raw):
    """精读正文 + 搜索命中数据合并为扫描语料。"""
    parts = []
    for o in load_notes(raw).values():
        parts.append("\n".join(str(v) for v in o.values() if v))
    for rows in load_searches(raw).values():
        for r in rows or []:
            parts.append(" ".join(str(v) for v in r.values() if v))
    return "\n".join(parts)


# ---------- 子命令 ----------

def cmd_tags(raw):
    tags = Counter()
    for o in load_notes(raw).values():
        for t in re.split(r"[,，]\s*", o.get("tags", "") or ""):
            t = t.strip()
            if t:
                tags[t] += 1
    print(f"# tags 全量扫描：{len(tags)} 个标签（来自 {len(list((raw/'notes').glob('*.json')))} 篇精读）")
    print("# 提示：#xxx_engineering / #xxxRuntime 这类是领域自我命名进行时，属高前沿信号")
    for t, c in tags.most_common():
        print(f"{c}\t{t}")


def load_words(path):
    words = []
    for line in Path(path).read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        term, _, prior = line.partition("|")
        words.append((term.strip(), prior.strip()))
    return words


def count_term(term, corpus):
    if re.fullmatch(r"[A-Za-z0-9 ._\-]+", term):
        pat = r"(?<![A-Za-z0-9_])" + re.escape(term) + r"(?![A-Za-z0-9_])"
        return len(re.findall(pat, corpus, flags=re.IGNORECASE))
    return len(re.findall(re.escape(term), corpus))


def cmd_freq(raw, words_path):
    corpus = build_corpus(raw)
    rows = []
    seen = set()
    for term, prior in load_words(words_path):
        key = term.lower()
        if key in seen:
            continue
        seen.add(key)
        rows.append((count_term(term, corpus), term, prior))
    rows.sort(key=lambda x: -x[0])
    print("n\t词条\tAI先验")
    for n, t, p in rows:
        print(f"{n}\t{t}\t{p or '-'}")


def cmd_tier(raw, words_path):
    corpus = build_corpus(raw)
    rows = []
    seen = set()
    for term, prior in load_words(words_path):
        key = term.lower()
        if key in seen:
            continue
        seen.add(key)
        n = count_term(term, corpus)
        tier = "🔥核心" if n >= TIER_HOT else ("♨️常用" if n >= TIER_WARM else "❄️外层")
        rows.append((n, term, prior, tier))
    rows.sort(key=lambda x: -x[0])
    buckets = Counter(r[3] for r in rows)
    print(f"# 热度分层（阈值：🔥 n>={TIER_HOT} / ♨️ n>={TIER_WARM} / ❄️ n<{TIER_WARM}）")
    print(f"# 分布：{dict(buckets)}")
    print("# 人工补评：前沿🔮（指向未定型事物）/ 本质⚙️（直击机制而非包装）")
    print("# 最高价值区 = ❄️低热 + 🔮高前沿 + ⚙️高本质")
    print("n\t词条\tAI先验\t分层")
    for n, t, p, tier in rows:
        print(f"{n}\t{t}\t{p or '-'}\t{tier}")


def to_int(v):
    m = re.search(r"[\d,]+", str(v))
    return int(m.group().replace(",", "")) if m else 0


def note_id(url):
    m = re.search(r"/(?:explore|search_result|item)/([0-9a-f]{20,})", url)
    return m.group(1) if m else re.sub(r"\W", "", url)[-24:]


def cmd_inventory(raw):
    """由 kw*.json 生成去重清单 TSV（同笔记取最高赞），供批量精读与词频统计使用。"""
    seen = {}
    for kw, rows in load_searches(raw).items():
        for r in rows or []:
            url = r.get("url", "")
            if not url:
                continue
            key = note_id(url)
            likes = to_int(r.get("likes", 0))
            if key not in seen or likes > seen[key]["likes"]:
                seen[key] = {
                    "id": key, "likes": likes,
                    "title": re.sub(r"\s+", " ", str(r.get("title", ""))).strip(),
                    "author": str(r.get("author", "")),
                    "published": str(r.get("published_at", "")),
                    "url": url, "src": kw,
                }
    rows = sorted(seen.values(), key=lambda x: -x["likes"])
    out = raw / "notes_inventory.tsv"
    with out.open("w", encoding="utf-8") as fh:
        fh.write("i\tlikes\tpublished\tauthor\tid\ttitle\turl\tsrc\n")
        for i, r in enumerate(rows):
            fh.write(f"{i}\t{r['likes']}\t{r['published']}\t{r['author']}\t"
                     f"{r['id']}\t{r['title']}\t{r['url']}\t{r['src']}\n")
    print(f"unique notes: {len(rows)} -> {out}")
    for i, r in enumerate(rows):
        print(f"{i:3d} | {r['likes']:5d} | {r['published']} | {r['title'][:44]}")


# ---------- 入口 ----------

USAGE = __doc__


def main():
    if len(sys.argv) < 3:
        print(USAGE)
        return 1
    cmd, research_dir = sys.argv[1], Path(sys.argv[2])
    raw = research_dir / "raw" if (research_dir / "raw").exists() else research_dir
    if not raw.exists():
        print(f"[error] 找不到数据目录：{raw}", file=sys.stderr)
        return 1
    if cmd == "tags":
        cmd_tags(raw)
    elif cmd in ("freq", "tier"):
        if len(sys.argv) < 4:
            print(f"[error] {cmd} 需要候选词表文件路径", file=sys.stderr)
            return 1
        (cmd_freq if cmd == "freq" else cmd_tier)(raw, sys.argv[3])
    elif cmd == "inventory":
        cmd_inventory(raw)
    else:
        print(USAGE)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
