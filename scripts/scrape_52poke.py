#!/usr/bin/env python3
# scrape_52poke.py v2 — parse 52poke Mezastar card tables for (id -> grade, types, name_simp)
# Output: scripts/_grade_<gen>.json  [{id, name, types:[...], grade}]
import requests, re, json, os

GEN_URLS = {
    "stardust1": "https://wiki.52poke.com/zh/%E6%98%9F%E5%85%89%E7%AC%AC1%E5%BC%B9%EF%BC%88%E5%9B%BD%E9%99%85%E7%89%88%E6%98%8E%E8%80%80%E4%B9%8B%E6%98%9F%EF%BC%89",
    "stardust2": "https://wiki.52poke.com/zh-hans/%E6%98%9F%E5%85%89%E7%AC%AC2%E5%BC%B9%EF%BC%88%E5%9B%BD%E9%99%85%E7%89%88%E6%98%8E%E8%80%80%E4%B9%8B%E6%98%9F%EF%BC%89",
    "stardust3": "https://wiki.52poke.com/zh/%E6%98%9F%E5%85%89%E7%AC%AC3%E5%BC%B9%EF%BC%88%E5%9B%BD%E9%99%85%E7%89%88%E6%98%8E%E8%80%80%E4%B9%8B%E6%98%9F%EF%BC%89",
    "stardust4": "https://wiki.52poke.com/wiki/%E6%98%9F%E5%85%89%E7%AC%AC4%E5%BC%B9%EF%BC%88%E5%9B%BD%E9%99%85%E7%89%88%E6%98%8E%E8%80%80%E4%B9%8B%E6%98%9F%EF%BC%89",
    "galaxy1":   "https://wiki.52poke.com/wiki/%E9%93%B6%E6%B2%B3%E7%AC%AC1%E5%BC%B9%EF%BC%88%E5%9B%BD%E9%99%85%E7%89%88%E6%98%8E%E8%80%80%E4%B9%8B%E6%98%9F%EF%BC%89",
}

TYPE_MAP = {
    "草":"草","火":"火","水":"水","電":"電","电":"電","龍":"龍","冰":"冰","岩":"岩石","岩石":"岩石",
    "蟲":"虫","虫":"虫","毒":"毒","鋼":"鋼","钢":"鋼","妖精":"妖精","惡":"惡","恶":"惡",
    "飛行":"飛行","飞行":"飛行","地面":"地面","格鬥":"格鬥","格斗":"格鬥","幽靈":"幽靈","幽灵":"幽靈",
    "超能力":"超能力","超":"超能力","一般":"一般","普通":"一般",
}
VALID_TYPES = set(TYPE_MAP.values())

def scrape(gen, url):
    html = requests.get(url, headers={"User-Agent":"Mozilla/5.0"}, timeout=30).text
    rows = re.split(r"<tr", html)
    cards = []
    for r in rows:
        m = re.search(r'width="100">\s*(\d-\d-\d{3})', r)
        if not m:
            continue
        cid = m.group(1)
        # name: link whose title contains （PM
        nm = re.search(r'title="[^"]*（PM[^"]*）">\s*([一-鿿]+)\s*</a>', r)
        if not nm:
            nm = re.search(r'>\s*([一-鿿]{2,5})\s*</a>', r)
        name = nm.group(1) if nm else ""
        # types: title/alt attrs with 1-3 CJK that are known types
        types = []
        for tm in re.finditer(r'(?:title|alt)="([一-鿿]{1,3})"', r):
            t = tm.group(1)
            if t in TYPE_MAP and TYPE_MAP[t] not in types:
                types.append(TYPE_MAP[t])
        # grade: encoded as title="等级N" in the star-icon cell
        gm = re.search(r'等级([1-6])', r)
        grade = int(gm.group(1)) if gm else None
        cards.append({"id": cid, "name": name, "types": types, "grade": grade})
    return cards

if __name__ == "__main__":
    for gen, url in GEN_URLS.items():
        try:
            cards = scrape(gen, url)
            cards.sort(key=lambda c: c["id"])
            out = f"scripts/_grade_{gen}.json"
            json.dump(cards, open(out,"w",encoding="utf-8"), ensure_ascii=False, indent=1)
            dist = {}
            for c in cards:
                dist[c["grade"]] = dist.get(c["grade"],0)+1
            print(f"{gen}: parsed {len(cards)}  dist={dist}")
            print("  sample:", json.dumps(cards[:2], ensure_ascii=False))
            # sanity: check all grades present
            missing = [c["id"] for c in cards if c["grade"] is None]
            if missing: print("  MISSING GRADE:", missing[:10])
        except Exception as e:
            print(f"{gen}: ERROR {e}")
