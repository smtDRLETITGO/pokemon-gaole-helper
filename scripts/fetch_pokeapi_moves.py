#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fetch_pokeapi_moves.py — 抓取全部招式的中英文 + 屬性，快取為 _pokeapi_moves_zh.json。
產出：{ "巨獸斬": {"en":"behemoth-blade","type":"steel"}, ... }
用途：OCR 讀到中文招式名 → 直接查這個表得 moveType（確定、不靠 agy）。
"""
import json, os, time, sys
import requests

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_pokeapi_moves_zh.json")
BASE = "https://pokeapi.co/api/v2"
HEAD = {"User-Agent": "pokemon-gaole-helper/1.0"}


def get(url):
    for _ in range(4):
        try:
            r = requests.get(url, headers=HEAD, timeout=20)
            if r.status_code == 200:
                return r.json()
        except Exception as e:
            print("  retry", url, e, file=sys.stderr)
        time.sleep(1.5)
    return None


def main():
    idx = get(f"{BASE}/move?limit=5000&offset=0")
    results = idx.get("results", []) if idx else []
    print(f"total moves: {len(results)}")
    out = {}
    for i, m in enumerate(results):
        d = get(m["url"])
        if not d:
            continue
        zh = None
        for nm in d.get("names", []):
            if nm.get("language", {}).get("name") == "zh-Hant":
                zh = nm["name"]
                break
        if not zh:
            continue
        out[zh] = {
            "en": d["name"],
            "type": d.get("type", {}).get("name"),
            "category": d.get("damage_class", {}).get("name"),  # physical/special/status
        }
        if (i + 1) % 100 == 0:
            print(f"  {i+1}/{len(results)} cached {len(out)} zh moves")
    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"DONE -> {OUT} ({len(out)} zh-hant moves)")


if __name__ == "__main__":
    main()
