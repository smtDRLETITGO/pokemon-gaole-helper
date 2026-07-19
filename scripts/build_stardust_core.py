#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_stardust_core.py — 組裝星塵第1/2/3彈 (cassette 2/7/8) 核心資料庫。

資料來源（全部確定性，非 VLM）：
  cardId/name/圖 : 官網 _backs_{2,7,8}.json（含 R 卡/經典卡匣）
  name/types     : 52poke 等級表 _grade_{gen}.json（繁中屬性）
  stars          : 52poke 等級（grade）
  hp~speed       : easyocr 六維 _ocr_{gen}_stats.json
  layout         : 由正面圖長寬比判斷（橫>直 → horizontal）
  R 卡/經典卡匣  : 不在 52poke 主表 → category="special", stars=0

未含欄位（待後續 VLM 補）：moveName/moveType/moveCategory/move2*/ability。
  app 戰鬥計算對缺招式可優雅降級（moveType 缺→中性、moveCategory 預設物理），
  故可先上線核心資料，招式/特性為後續增強。
"""
import json, os
from PIL import Image
from datetime import datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
GENS = [
    ("stardust1", "2", "星塵第1彈"),
    ("stardust2", "7", "星塵第2彈"),
    ("stardust3", "8", "星塵第3彈"),
]
# 52poke 簡體/異體 → app 繁體屬性正規化
TYPE_NORM = {"虫": "蟲"}
OCR_KEYS = ["hp", "atk", "def_", "spAtk", "spDef", "spd"]
CARD_KEYS = ["hp", "attack", "defense", "spAttack", "spDefense", "speed"]


def norm_type(t):
    return TYPE_NORM.get(t, t)


def load(name):
    p = os.path.join(ROOT, name)
    if not os.path.exists(p):
        return None
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def build(gen, cassette, series):
    backs = {c["id"]: c for c in load(f"_backs_{cassette}.json")}
    grade = {c["id"]: c for c in load(f"_grade_{gen}.json")}
    _ocr_raw = load(f"_ocr_{gen}_stats.json")
    ocr = {c["cardId"]: c for c in _ocr_raw} if _ocr_raw else {}
    cards = []
    missing_stats = []
    special_cards = []
    for cid, b in backs.items():
        g = grade.get(cid)
        if g:
            name = g.get("name") or b.get("name")
            types = [norm_type(t) for t in g.get("types", [])]
            grade_val = g.get("grade")
            is_special = False
        else:
            # R 卡 / 經典卡匣：不在 52poke 主表
            name = b.get("name")
            types = []
            grade_val = None
            is_special = True
            special_cards.append(cid)
        type1 = types[0] if len(types) > 0 else None
        type2 = types[1] if len(types) > 1 else None
        # stats
        st = ocr.get(cid, {})
        if "error" in st or not st:
            stats = {k: 0 for k in CARD_KEYS}
            needs_stats = True
            missing_stats.append(cid)
        else:
            stats = {
                "hp": st.get("hp", 0),
                "attack": st.get("atk", 0),
                "defense": st.get("def_", 0),
                "spAttack": st.get("spAtk", 0),
                "spDefense": st.get("spDef", 0),
                "speed": st.get("spd", 0),
            }
            needs_stats = False
        # layout from front image dimension
        fp = os.path.join(ROOT, "..", "public", "cards", cassette, f"{cid}.png")
        layout = "vertical"
        if os.path.exists(fp):
            try:
                w, h = Image.open(fp).size
                layout = "horizontal" if w > h else "vertical"
            except Exception:
                pass
        card = {
            "cardId": cid,
            "diskCode": cid,
            "name": name,
            "series": series,
            "stars": 0 if is_special else (grade_val or 0),
            "type1": type1,
            "type2": type2,
            "moveName": None,
            "moveType": None,
            "moveCategory": None,
            "move2Name": None,
            "move2Type": None,
            "move2Category": None,
            "hp": stats["hp"],
            "attack": stats["attack"],
            "defense": stats["defense"],
            "spAttack": stats["spAttack"],
            "spDefense": stats["spDefense"],
            "speed": stats["speed"],
            "layout": layout,
            "frontPhoto": f"/cards/{cassette}/{cid}.png",
            "needsStats": needs_stats,
            "_meta": {
                "source": "52poke_grade + easyocr_stats + official_backs (core; moves/ability pending VLM)",
                "timestamp": datetime.now().isoformat(),
                "has_move": False,
                "has_ability": False,
            },
        }
        if is_special:
            card["category"] = "special"
            special_cards  # already appended
        cards.append(card)
    # sort by cardId naturally: numeric main cards first, then R/special cards
    def sort_key(c):
        cid = c["cardId"]
        parts = cid.split("-")
        is_r = 0 if parts[0].isdigit() else 1  # main cards (0) before R cards (1)
        nums = [int(p) if p.isdigit() else 0 for p in parts]
        return (is_r, nums)
    cards.sort(key=sort_key)
    gt = {
        "_generated_at": datetime.now().isoformat(),
        "generation": gen,
        "cassette": cassette,
        "source": "52poke_grade + easyocr_stats + official_backs",
        "total_cards": len(cards),
        "errors": {"missing_stats": missing_stats, "special_cards": special_cards},
        "cards": cards,
    }
    return gt, cards, missing_stats, special_cards


def main():
    for gen, cassette, series in GENS:
        gt, cards, missing, special = build(gen, cassette, series)
        # write ground_truth
        gt_path = os.path.join(ROOT, f"{gen}.ground_truth.json")
        with open(gt_path, "w", encoding="utf-8") as f:
            json.dump(gt, f, ensure_ascii=False, indent=1)
        # write generated js
        header = (
            f"// pokemonDb.cards.{gen}.generated.js — {series} (cassette/{cassette}) 自動生成檔\n"
            f"// 由 scripts/build_stardust_core.py 從 52poke 等級 + easyocr 六維 + 官網 backs 組裝。\n"
            f"// 核心欄位（cardId/name/type/stars/hp~speed/圖）為確定性來源。\n"
            f"// 招式(move*)與特性(ability)待 VLM 補齊（app 對缺招式可優雅降級）。\n"
            f"// Schema: moveName/moveType/moveCategory = 第一招式；move2* = 第二招式(null=無)\n"
        )
        # export name: stardust1 -> STARDUST_1_CARDS (generation number, not cassette)
        gen_num = "".join(ch for ch in gen if ch.isdigit())
        export_name = f"STARDUST_{gen_num}_CARDS" if gen.startswith("stardust") else f"{gen.upper()}_CARDS"
        body = f"export const {export_name} = " + json.dumps(cards, ensure_ascii=False, indent=1) + ";\n"
        out_path = os.path.join(ROOT, "..", "src", "data", f"pokemonDb.cards.{gen}.generated.js")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(header + "\n" + body)
        dist = {}
        for c in cards:
            s = c.get("category") or ("SPECIAL" if c.get("category") == "special" else str(c.get("stars")))
            dist[s] = dist.get(s, 0) + 1
        print(f"[{gen}] cards={len(cards)} special={len(special)} missing_stats={len(missing)}")
        print(f"  star dist: {json.dumps(dist, ensure_ascii=False)}")
        print(f"  -> {gt_path}")
        print(f"  -> {out_path}")


if __name__ == "__main__":
    main()
