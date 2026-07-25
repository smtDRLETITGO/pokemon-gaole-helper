#!/usr/bin/env python3
"""Diff AGY VLM results vs Phase-5.9 human baseline; emit verification HTML."""
import json, subprocess, html, sys
from pathlib import Path
from datetime import datetime

PROJECT = Path(__file__).resolve().parent.parent
NODE    = Path(r"C:\Users\DRW\.workbuddy\binaries\node\versions\22.22.2\node.exe")
AGY_GT  = PROJECT / "scripts" / "galaxy2.ground_truth.json"
EXTRACT = PROJECT / "scripts" / "_extract_db_baseline.mjs"
OUT     = PROJECT / "scripts" / "verify_galaxy2_agy_vs_base.html"

# --- Load AGY ground truth ---
agy = json.loads(AGY_GT.read_text(encoding="utf-8"))
agy_cards = {c["cardId"]: c for c in agy["cards"]}

# Normalize AGY moveCategory D/X/S -> 物理/特殊/狀態 (matches DB baseline format)
CATMAP = {"D": "物理", "X": "特殊", "S": "狀態"}
for c in agy_cards.values():
    mc = c.get("moveCategory")
    if isinstance(mc, str) and mc in CATMAP: c["moveCategory"] = CATMAP[mc]
    mc2 = c.get("move2Category")
    if isinstance(mc2, str) and mc2 in CATMAP: c["move2Category"] = CATMAP[mc2]

# --- Load baseline from live DB (Phase-5.9 human) ---
out = subprocess.run([str(NODE), str(EXTRACT)], capture_output=True, text=True, cwd=str(PROJECT))
if out.returncode != 0:
    print("NODE ERR:", out.stderr); sys.exit(1)
base = json.loads(out.stdout.strip())

FIELDS = [
    ("stars", "星等"), ("name", "名稱"), ("type1", "屬性1"), ("type2", "屬性2"),
    ("hp", "HP"), ("attack", "攻"), ("defense", "防"), ("spAtk", "特攻"), ("spDef", "特防"), ("speed", "速"),
    ("moveName", "招1"), ("moveType", "招1屬"), ("moveCategory", "招1類"),
    ("move2Name", "招2"), ("move2Type", "招2屬"), ("move2Category", "招2類"),
]

def norm(v):
    """Treat None and '' as equivalent (representation, not content)."""
    return None if v in (None, "") else v

rows = []
star_mismatch = []
for cid in sorted(set(list(agy_cards) + list(base)), key=lambda x: (x.startswith("R"), x)):
    a = agy_cards.get(cid, {})
    b = base.get(cid, {})
    diffs = []
    for fkey, flabel in FIELDS:
        av = norm(a.get(fkey)); bv = norm(b.get(fkey))
        if av != bv:
            diffs.append((flabel, bv, av))
    rows.append({"cid": cid, "a": a, "b": b, "diffs": diffs})
    if a.get("stars") != b.get("stars"):
        star_mismatch.append((cid, b.get("name"), b.get("stars"), a.get("stars")))

# --- Distribution ---
def dist(cards, key):
    d = {}
    for c in cards:
        s = c.get(key)
        d[s] = d.get(s, 0) + 1
    return d
ad = dist(list(agy_cards.values()), "stars")
bd = dist(list(base.values()), "stars")

def bar(n): return "█" * n

# --- HTML ---
parts = []
parts.append(f"""<!doctype html><html lang="zh"><head><meta charset="utf-8">
<title>銀河2 AGY vs 人工基線 比對</title>
<style>
body{{font-family:system-ui,'Microsoft JhengHei',sans-serif;margin:0;padding:20px;background:#0f1420;color:#e6e6e6}}
h1{{font-size:20px}} h2{{font-size:16px;margin-top:28px;color:#9ad}}
table{{border-collapse:collapse;width:100%;font-size:13px}}
th,td{{border:1px solid #2a3344;padding:5px 7px;text-align:left;vertical-align:top}}
th{{background:#1a2333;position:sticky;top:0}}
.mismatch{{background:#3a1f1f}}
.ok{{background:#16241a}}
.star6{{color:#ffd34d;font-weight:bold}}
img{{width:120px;height:auto;border:1px solid #333;border-radius:4px;display:block;margin-bottom:2px}}
.tag{{display:inline-block;padding:1px 5px;border-radius:3px;font-size:11px;margin:1px}}
.up{{background:#5a3a00;color:#ffd34d}} .down{{background:#0a3a4a;color:#7fd}}
.summary{{background:#161d2b;padding:14px;border-radius:8px;margin-bottom:18px}}
code{{color:#9ad}}
</style></head><body>
<h1>銀河第二彈 (cassette/11) — AGY/Gemini VLM 讀取 vs Phase-5.9 人工基線</h1>
<div class="summary">
<h2 style="margin-top:0">星等分佈對比</h2>
<table><tr><th>星等</th>""")
for s in [6,5,4,3,2,1]:
    parts.append(f"<th>{s}★</th>")
parts.append("</tr><tr><td>AGY 讀</td>")
for s in [6,5,4,3,2,1]:
    n = ad.get(s,0); parts.append(f"<td class='{'star6' if s==6 else ''}'>{n}<br>{bar(n)}</td>")
parts.append("</tr><tr><td>人工基線</td>")
for s in [6,5,4,3,2,1]:
    n = bd.get(s,0); parts.append(f"<td class='{'star6' if s==6 else ''}'>{n}<br>{bar(n)}</td>")
parts.append("</tr></table>")
parts.append(f"<p>⚠️ <b>6★ 差 {ad.get(6,0)-bd.get(6,0)} 張</b>（AGY {ad.get(6,0)} vs 人工 {bd.get(6,0)}）；5★ 差 {ad.get(5,0)-bd.get(5,0)} 張。"
             f"AGY 疑似把部分 5★ 數成 6★。下方逐張列出所有差異，請對圖裁定。</p>")
parts.append(f"<p>星等不一致共 <b>{len(star_mismatch)}</b> 張：</p><ul>")
for cid, name, bs, as_ in star_mismatch:
    arrow = "↑" if as_ > bs else ("↓" if as_ < bs else "")
    parts.append(f"<li><code>{cid}</code> {html.escape(str(name))}：人工 {bs}★ → AGY <b>{as_}★</b> {arrow}</li>")
parts.append("</ul></div>")

parts.append("<h2>逐張差異表（僅列出與人工基線不同的欄位；無差異不顯示）</h2>")
parts.append("<table><tr><th>#</th><th>卡號</th><th>正面圖</th><th>背面圖</th><th>AGY 讀取</th><th>人工基線</th><th>差異欄位</th></tr>")
idx = 0
for r in rows:
    if not r["diffs"]:
        continue
    idx += 1
    cid = r["cid"]
    a, b = r["a"], r["b"]
    front = f"file:///{PROJECT}/public/cards/11_small/{cid}.png".replace("\\","/")
    back  = f"file:///{PROJECT}/public/cards/11_small/{cid}.jpg".replace("\\","/")
    # AGY cell
    acell = []
    if "stars" in [d[0] for d in r["diffs"]]:
        acell.append(f"<span class='star6'>{a.get('stars')}★</span>")
    else:
        acell.append(f"{a.get('stars')}★")
    acell.append(html.escape(str(a.get('name',''))))
    acell.append(f"屬:{html.escape(str(a.get('type1')))}/{html.escape(str(a.get('type2')))}")
    acell.append(f"HP{a.get('hp')} 攻{a.get('attack')} 防{a.get('defense')} 特{a.get('spAtk')}/{a.get('spDef')} 速{a.get('speed')}")
    acell.append(f"招:{html.escape(str(a.get('moveName')))}/{html.escape(str(a.get('moveType')))}/{html.escape(str(a.get('moveCategory')))}")
    if a.get('move2Name'): acell.append(f"招2:{html.escape(str(a.get('move2Name')))}/{html.escape(str(a.get('move2Type')))}/{html.escape(str(a.get('move2Category')))}")
    # base cell
    bcell = []
    bcell.append(f"{b.get('stars')}★")
    bcell.append(html.escape(str(b.get('name',''))))
    bcell.append(f"屬:{html.escape(str(b.get('type1')))}/{html.escape(str(b.get('type2')))}")
    bcell.append(f"HP{b.get('hp')} 攻{b.get('attack')} 防{b.get('defense')} 特{b.get('spAtk')}/{b.get('spDef')} 速{b.get('speed')}")
    bcell.append(f"招:{html.escape(str(b.get('moveName')))}/{html.escape(str(b.get('moveType')))}/{html.escape(str(b.get('moveCategory')))}")
    if b.get('move2Name'): bcell.append(f"招2:{html.escape(str(b.get('move2Name')))}/{html.escape(str(b.get('move2Type')))}/{html.escape(str(b.get('move2Category')))}")
    # diff tags
    dtags = []
    for flabel, bv, av in r["diffs"]:
        dtags.append(f"<span class='tag {'up' if (flabel=='星等' and av>bv) else 'down'}'>{flabel}: {html.escape(str(bv))}→{html.escape(str(av))}</span>")
    cls = "mismatch"
    parts.append(f"<tr class='{cls}'><td>{idx}</td><td><code>{cid}</code></td>"
                 f"<td><img src='{front}'></td><td><img src='{back}'></td>"
                 f"<td>{'<br>'.join(acell)}</td><td>{'<br>'.join(bcell)}</td>"
                 f"<td>{' '.join(dtags)}</td></tr>")
parts.append("</table>")
if idx == 0:
    parts.append("<p>✅ 無差異</p>")
parts.append(f"<p style='margin-top:20px;color:#889'>生成於 {datetime.now().isoformat()} · 共 {idx} 張有差異 · 圖來源 public/cards/11_small</p>")
parts.append("</body></html>")

OUT.write_text("\n".join(parts), encoding="utf-8")
print(f"Wrote {OUT.name}: {idx} cards with diffs (star mismatches={len(star_mismatch)})")
