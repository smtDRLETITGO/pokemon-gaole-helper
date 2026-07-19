#!/usr/bin/env python3
"""從 ground_truth.json 重新產生 generated.js（保留 VLM 更新）"""
import json, os

ROOT_SCRIPTS = "C:/Users/DRW/.gemini/antigravity/scratch/pokemon-gaole-helper/scripts"
ROOT_SRC = "C:/Users/DRW/.gemini/antigravity/scratch/pokemon-gaole-helper/src/data"

GENS = [
    ("stardust1", "STARDUST_1_CARDS", "星塵第1彈 (cassette/2)"),
    ("stardust2", "STARDUST_2_CARDS", "星塵第2彈 (cassette/7)"),
    ("stardust3", "STARDUST_3_CARDS", "星塵第3彈 (cassette/8)"),
]

for gen, export, series in GENS:
    gt = json.load(open(os.path.join(ROOT_SCRIPTS, f"{gen}.ground_truth.json")))
    cards = gt["cards"]
    
    header = (
        f"// pokemonDb.cards.{gen}.generated.js — {series} 自動生成檔\n"
        f"// 由 scripts/gen_from_groundtruth.py 從 ground_truth.json 生成（含 agy VLM 招式資料）\n"
        f"// Schema: moveName/moveType/moveCategory = 第一招式；move2* = 第二招式(null=無)\n"
    )
    body = f"export const {export} = " + json.dumps(cards, ensure_ascii=False, indent=1) + ";\n"
    
    out = os.path.join(ROOT_SRC, f"pokemonDb.cards.{gen}.generated.js")
    with open(out, "w", encoding="utf-8") as f:
        f.write(header + body)
    
    has_type = sum(1 for c in cards if c.get("moveType"))
    print(f"{gen}: {len(cards)} cards, moveType={has_type}/{len(cards)} -> {out}")

print("\nDONE. Now run verify_gens.mjs and npm run build.")
