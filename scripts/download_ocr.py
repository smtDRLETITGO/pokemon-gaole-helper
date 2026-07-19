#!/usr/bin/env python3
# download_ocr.py — 下載 stardust1/2/3 正背圖 + easyocr 六維
import json, os, re, requests
import cv2, numpy as np
import easyocr

BACKS = {
    'stardust1': ('2', 'scripts/_backs_2.json'),
    'stardust2': ('7', 'scripts/_backs_7.json'),
    'stardust3': ('8', 'scripts/_backs_8.json'),
}
STAT_KEYS = ["hp", "atk", "def_", "spAtk", "spDef", "spd"]

def download(gen, cassette, backs):
    front_dir = f"public/cards/{cassette}"
    back_dir = f"public/cards/{cassette}/back"
    os.makedirs(front_dir, exist_ok=True)
    os.makedirs(back_dir, exist_ok=True)
    for c in backs:
        cid = c["id"]; front = c.get("front"); back = c.get("back")
        for url, dst in [(front, f"{front_dir}/{cid}.png"), (back, f"{back_dir}/{cid}.png")]:
            if url and not os.path.exists(dst):
                try:
                    r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=30)
                    if r.status_code == 200:
                        open(dst, "wb").write(r.content)
                except Exception as e:
                    print("dl err", cid, e)

def ocr(cassette, backs, out):
    reader = easyocr.Reader(["en"], gpu=False, verbose=False)
    results = []
    back_dir = f"public/cards/{cassette}/back"
    for c in backs:
        cid = c["id"]; bp = f"{back_dir}/{cid}.png"
        if not os.path.exists(bp):
            results.append({"cardId": cid, "error": "no_back"}); continue
        # cv2.imread fails on Unicode (Chinese) paths on Windows → load via PIL/numpy
        img = cv2.imread(bp)
        if img is None:
            try:
                from PIL import Image as _PILImage
                pil = _PILImage.open(bp).convert("RGB")
                img = cv2.cvtColor(np.array(pil), cv2.COLOR_RGB2BGR)
            except Exception as _e:
                results.append({"cardId": cid, "error": f"decode_fail:{_e}"}); continue
        dets = reader.readtext(img)
        nums = []
        for item in dets:
            text = str(item[1]).strip(); bbox = item[0]
            try:
                pts = np.array(bbox).reshape(4, 2); cy = float(np.mean(pts[:, 1])); cx = float(np.mean(pts[:, 0]))
            except Exception:
                cy = cx = 9999
            m = re.match(r"^(\d{2,3})$", text)
            if m:
                v = int(m.group(1))
                if 10 <= v <= 300: nums.append({"val": v, "cy": cy, "cx": cx})
        if len(nums) < 6:
            for item in dets:
                text = str(item[1]).strip(); bbox = item[0]
                try:
                    pts = np.array(bbox).reshape(4, 2); cy = float(np.mean(pts[:, 1])); cx = float(np.mean(pts[:, 0]))
                except Exception:
                    cy = cx = 9999
                m = re.search(r"(\d{2,3})", text)
                if m:
                    v = int(m.group(1))
                    if 10 <= v <= 300: nums.append({"val": v, "cy": cy, "cx": cx})
        if len(nums) >= 6:
            nums.sort(key=lambda x: (x["cy"] // 5, x["cx"]))
            st = {k: nums[i]["val"] for i, k in enumerate(STAT_KEYS)}
            st["cardId"] = cid; results.append(st)
        else:
            results.append({"cardId": cid, "error": "insufficient", "found": [n["val"] for n in nums]})
    json.dump(results, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(out, "entries=", len(results))

if __name__ == "__main__":
    for gen, (cassette, bf) in BACKS.items():
        backs = json.load(open(bf, encoding="utf-8"))
        print("=== download", gen, "n=", len(backs))
        download(gen, cassette, backs)
        ocr(cassette, backs, f"scripts/_ocr_{gen}_stats.json")
    print("ALL DONE")
