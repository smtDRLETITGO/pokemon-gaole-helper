#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fetch_abilities.py — 為 MEZASTAR 卡表建立「特性 (ability)」欄位資料來源。

來源：PokeAPI（確定性、非 OCR/VLM）。
方法：
  1. 中文卡名 -> 英文物種名（CH2EN 手動對映，已逐隻核對）
  2. pokemon/{en} -> abilities，取 primary（非隱藏、slot 最小）
  3. ability/{id} -> zh-hant 中文特性名
輸出：scripts/galaxy2_abilities.json = { cardId: {name, abilityEn, abilityZh, isHidden, speciesEn}, _meta:{...} }

注意：
  - 多型態物種（蒼響/藏瑪然特 Crowned 等）取基礎型態 primary ability；絕大多數與卡片一致。
  - 若某卡 fetch 失敗會列在 _meta.misses，需人工補。
"""
import json
import os
import time
import urllib.request
import urllib.error

ROOT = os.path.dirname(os.path.abspath(__file__))
GT = os.path.join(ROOT, "galaxy2.ground_truth.json")
OUT = os.path.join(ROOT, "galaxy2_abilities.json")

# 中文卡名 -> 英文物種名（已逐隻核對；區域/悖謬型態用 PokeAPI 型態名）
CH2EN = {
    "蒼響": "zacian",
    "藏瑪然特": "zamazenta",
    "鋁鋼龍": "duraludon",
    "噴火龍": "charizard",
    "薩戮德": "zarude",
    "路卡利歐": "lucario",
    "烈空坐": "rayquaza",
    "拉帝亞斯": "latias",
    "拉帝歐斯": "latios",
    "四顎針龍": "naganadel",
    "巨金怪": "metagross",
    "雙斧戰龍": "haxorus",
    "化石翼龍": "aerodactyl",
    "雷鳥龍": "arctozolt",
    "鰓魚龍": "arctovish",
    "胡地": "alakazam",
    "雷鳥海獸": "dracozolt",
    "具甲武者": "sirfetchd",
    "君主蛇": "serperior",
    "炎武王": "emboar",
    "大劍鬼": "samurott",
    "鐵轍跡": "iron-treads",
    "毒貝比": "poipole",
    "布莉姆溫": "hatterene",
    "阿勃梭魯": "absol",
    "蒂蕾喵": "sprigatito",
    "魔幻假面喵": "meowscarada",
    "炙燙鱷": "skeledirge",
    "骨紋巨聲鱷": "toxtricity-amped",  # Toxtricity 是變種種，基名不存在；兩型態能力相同(技術高手)
    "湧躍鴨": "quaxly",
    "狂歡浪舞鴨": "quaquaval",
    "藤藤蛇": "snivy",
    "青藤蛇": "servine",
    "暖暖豬": "tepig",
    "炒炒豬": "pignite",
    "水水獺": "oshawott",
    "雙刃丸": "dewott",
    "蚊香蝌蚪": "poliwag",
    "蚊香君": "poliwhirl",
    "蚊香泳士": "poliwrath",
    "醜醜魚": "feebas",
    "美納斯": "milotic",
    "麻麻小魚": "tynamo",
    "麻麻鰻": "eelektrik",
    "麻麻鰻魚王": "eelektross",
    "拉魯拉絲": "ralts",
    "奇魯莉安": "kirlia",
    "沙奈朵": "gardevoir",
    "艾路雷朵": "gallade",
    "百足蜈蚣": "venipede",
    "車輪毬": "whirlipede",
    "蜈蚣王": "scolipede",
    "貪心栗鼠": "skwovet",
    "藏飽栗鼠": "greedent",
    "海豹球": "spheal",
    "海魔獅": "sealeo",
    "帝牙海獅": "walrein",
    "含羞苞": "budew",
    "毒薔薇": "roselia",
    "羅絲雷朵": "roserade",
    "小仙奶": "milcery",
    "霜奶仙": "alcremie",
    "電擊怪": "elekid",
    "電擊獸": "electabuzz",
    "電擊魔獸": "electivire",
    "伽勒爾喵喵": "meowth-galar",
    "喵頭目": "perrserker",
    "皮卡丘": "pikachu",
    "耿鬼": "gengar",
}

UA = {"User-Agent": "Mozilla/5.0 (pokemon-gaole-helper ability fetch)"}


def get(url, retries=4):
    last = None
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=25) as r:
                return json.load(r)
        except Exception as e:
            last = e
            time.sleep(1.2 * (i + 1))
    raise last


def main():
    gt = json.load(open(GT, encoding="utf-8"))
    cards = gt["cards"]
    out = {}
    misses = []
    seen = {}  # speciesEn -> ability dict
    for c in cards:
        cid = c["cardId"]
        zh = c["name"]
        en = CH2EN.get(zh)
        if not en:
            misses.append({"cardId": cid, "name": zh, "reason": "no CH2EN mapping"})
            out[cid] = {"name": zh, "speciesEn": None, "abilityEn": None,
                        "abilityZh": None, "isHidden": None}
            continue
        if en in seen:
            ab = seen[en]
        else:
            try:
                pk = get(f"https://pokeapi.co/api/v2/pokemon/{en}")
                abs_list = pk["abilities"]
                prim = None
                for a in abs_list:
                    if not a["is_hidden"]:
                        if prim is None or a["slot"] < prim["slot"]:
                            prim = a
                if prim is None and abs_list:
                    prim = abs_list[0]
                abinfo = get(prim["ability"]["url"])
                zh_name = None
                for n in abinfo.get("names", []):
                    if n["language"]["name"] == "zh-hant":
                        zh_name = n["name"]
                        break
                ab = {"en": prim["ability"]["name"], "zh": zh_name,
                      "isHidden": prim["is_hidden"]}
            except Exception as e:
                misses.append({"cardId": cid, "name": zh, "en": en,
                               "reason": f"fetch error: {e}"})
                ab = {"en": None, "zh": None, "isHidden": None}
            seen[en] = ab
            time.sleep(0.06)
        out[cid] = {
            "name": zh,
            "speciesEn": en,
            "abilityEn": ab["en"],
            "abilityZh": ab["zh"],
            "isHidden": ab["isHidden"],
        }

    meta = {
        "source": "pokeapi.co",
        "method": "CH2EN map -> pokemon/{en}/abilities (primary) -> ability/{id} zh-hant",
        "total": len(cards),
        "resolved": sum(1 for v in out.values() if v["abilityEn"]),
        "misses": misses,
        "note": "多型態物種取基礎型態 primary ability；若與卡片不符請人工覆寫",
    }
    out["_meta"] = meta
    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"[done] resolved {meta['resolved']}/{meta['total']}; misses={len(misses)}")
    for m in misses:
        print("  MISS:", m)


if __name__ == "__main__":
    main()
