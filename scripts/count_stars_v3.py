#!/usr/bin/env python3
"""
count_stars_v3.py — 精確星等計數器（v3，全解析度背面圖版）
原理：
  1. 載入背面圖 → 定位左上角星等區域（直式/橫式自動判定）
  2. HSV 金色閾值提取 → 形態學去噪
  3. 找獨立輪廓（每顆 ★ = 一個 blob）→ 按面積排序過濾
  4. 用「輪廓間距離均勻性」驗證合理性（同星等的星大小相近、間距規律）
用法：
  python count_stars_v3.py galaxy2      # 銀河第二彈 (cassette/11)
  python count_stars_v3.py galaxy1      # 銀河第一彈 (cassette/10)
  python count_stars_v3.py stardust4    # 星塵第4彈 (cassette/9)
  python count_stars_v3.py all          # 全部已建置代別
"""
import sys, json
from pathlib import Path
import cv2
import numpy as np

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent

# ── 各代別的背面圖目錄 ──
CASSETTE_BACK_DIRS = {
    "galaxy2":   PROJECT_ROOT / "public" / "cards" / "11" / "back",
    "galaxy1":   PROJECT_ROOT / "public" / "cards" / "10" / "back",
    "stardust4": PROJECT_ROOT / "public" / "cards" / "9"  / "back",
}


def detect_layout(h, w):
    """依長寬比判斷版型"""
    return "horizontal" if w > h * 1.05 else "vertical"


def crop_star_region(img):
    """
    裁切星等所在區域。
    直式卡：左上角（星垂直堆疊）
    橫式卡：左側偏上（星水平排列）
    """
    h, w = img.shape[:2]
    layout = detect_layout(h, w)

    if layout == "vertical":
        # 直式卡：星在左上角區域
        x1, x2 = int(w * 0.02), int(w * 0.38)
        y1, y2 = int(h * 0.05), int(h * 0.35)
    else:
        # 橫式卡：星在左側中上區域
        x1, x2 = int(w * 0.01), int(w * 0.42)
        y1, y2 = int(h * 0.08), int(h * 0.40)

    return img[y1:y2, x1:x2], layout


def count_gold_stars(img_path):
    """對單張背面圖計算金★數量"""
    img = cv2.imread(str(img_path))
    if img is None:
        return {"error": "cannot_read", "stars": -1}

    cropped, layout = crop_star_region(img)
    if cropped.size == 0 or cropped.shape[0] < 5 or cropped.shape[1] < 5:
        return {"error": "crop_empty", "stars": 0}

    hsv = cv2.cvtColor(cropped, cv2.COLOR_BGR2HSV)

    # 金色 HSV 範圍（黃~橙金色，覆蓋 ★ 的主色域）
    # ★ 的主色約在 H:15-35(S:150-255,V:180-255)，但不同卡面色調有差異，
    # 所以用較寬的範圍再靠形態學篩選
    gold_mask = cv2.inRange(hsv,
                             np.array([8, 60, 100]),   # 下界
                             np.array([42, 255, 255]))   # 上界

    # 形態學開運算去除小噪點
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    gold_mask = cv2.morphologyEx(gold_mask, cv2.MORPH_OPEN, kernel, iterations=1)

    # 再做一次閉運算連接斷裂的星尖
    kernel_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    gold_mask = cv2.morphologyEx(gold_mask, cv2.MORPH_CLOSE, kernel_close, iterations=1)

    px_total = np.count_nonzero(gold_mask)
    if px_total < 20:
        # 太少像素 → 可能沒抓到，試更寬閾值
        gold_mask_loose = cv2.inRange(hsv,
                                       np.array([0, 30, 70]),
                                       np.array([55, 255, 255]))
        gold_mask_loose = cv2.morphologyEx(gold_mask_loose, cv2.MORPH_OPEN, kernel, iterations=1)
        gold_mask_loose = cv2.morphologyEx(gold_mask_loose, cv2.MORPH_CLOSE, kernel_close, iterations=1)
        if np.count_nonzero(gold_mask_loose) > px_total:
            gold_mask = gold_mask_loose
            px_total = np.count_nonzero(gold_mask)

    if px_total < 15:
        return {"stars": 0, "method": "no_gold_pixels", "px": px_total, "layout": layout}

    # 找外輪廓
    contours, _ = cv2.findContours(gold_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if len(contours) == 0:
        return {"stars": 0, "method": "no_contours", "px": px_total, "layout": layout}

    # 計算每個輪廓的面積
    contour_data = []
    for i, c in enumerate(contours):
        area = cv2.contourArea(c)
        if area < 15:  # 太小的當噪點忽略
            continue
        bbox = cv2.boundingRect(c)
        aspect = bbox[2] / max(bbox[3], 1)  # 寬高比
        contour_data.append({
            "idx": i, "area": area, "bbox": bbox, "aspect": aspect,
            "contour": c
        })

    if len(contour_data) == 0:
        return {"stars": 0, "method": "all_too_small", "px": px_total, "layout": layout}

    # 按面積降序排列
    contour_data.sort(key=lambda x: x["area"], reverse=True)

    # 策略：找「合理的星等數」
    # 星的特徵：面積相近（同星等）、大小在合理範圍內
    # 先用最大輪廓的面積作為參考（最大那顆星）

    areas_sorted = [d["area"] for d in contour_data]
    max_area = areas_sorted[0]

    # 合理的星面積範圍：不超過最大星的 6 倍（考慮光暈黏連），不小於最大星的 5%
    min_star_area = max(20, max_area * 0.05)
    max_star_area = max_area * 7.0

    candidates = [d for d in contour_data if min_star_area <= d["area"] <= max_star_area]

    # 如果候選太多（可能把背景裝飾也算進去了），用更嚴格的閾值
    if len(candidates) > 6:
        # 只保留前 N 個最大的，或用面積中位數來篩
        median_area = np.median([d["area"] for d in candidates])
        candidates = [d for d in candidates if d["area"] >= median_area * 0.25]

    n_stars = min(len(candidates), 6)  # 星等上限為 6

    # 二次驗證：如果 n_stars 在 2-6 之間，檢查面積均勻性
    if 2 <= n_stars <= 6:
        candidate_areas = sorted([d["area"] for d in candidates[:n_stars]])
        # 去掉可能的最大異常值後看標準差
        check_areas = candidate_areas[:min(n_stars, 5)]
        if len(check_areas) >= 2:
            area_std_ratio = np.std(check_areas) / (np.mean(check_areas) + 1e-6)
            # 如果面積差異太大（>1.5），說明可能混入了非星元素，減少計數
            if area_std_ratio > 1.5:
                # 重新用更嚴格的面積下限
                tighter_min = max(min_star_area, np.median(check_areas) * 0.4)
                candidates_tight = [d for d in candidates if d["area"] >= tighter_min]
                if 1 <= len(candidates_tight) <= 6:
                    n_stars = len(candidates_tight)

    n_stars = max(0, min(n_stars, 6))  # clamp 到 [0, 6]

    return {
        "stars": n_stars,
        "layout": layout,
        "method": f"contour_{len(contours)}cand_{n_stars}",
        "px": px_total,
        "n_contours": len(contours),
        "n_candidates": len(candidates),
        "candidate_areas": [d["area"] for d in candidates[:min(n_stars+1, 8)]],
    }


def process_generation(gen_name):
    """處理單個代別的所有卡片"""
    back_dir = CASSETTE_BACK_DIRS.get(gen_name)
    if not back_dir or not back_dir.exists():
        print(f"[!] {gen_name}: back dir not found ({back_dir})")
        return []

    png_files = sorted(back_dir.glob("*.png"))
    print(f"\n{'='*60}")
    print(f"  {gen_name} — {len(png_files)} 張背面圖 @ {back_dir.name}")
    print(f"{'='*60}")

    results = []
    errs = []

    for i, img_path in enumerate(png_files):
        card_id = img_path.stem
        r = count_gold_stars(img_path)
        stars = r.get("stars", -1)
        method = r.get("method", "?")

        results.append({"cardId": card_id, "stars": stars, "method": method})

        flag = ""
        if stars < 0:
            flag = " ⚠️ ERR"
            errs.append(card_id)
        elif stars == 0:
            flag = " ⚠️ ZERO"
        elif stars > 6:
            flag = " ⚠️ >6"

        print(f"  [{i+1:3d}/{len(png_files)}] {card_id:<14} → {stars}★  ({method}){flag}")

    # 分佈統計
    dist = {}
    for r in results:
        s = r["stars"]
        dist[s] = dist.get(s, 0) + 1

    print(f"\n  星等分佈:")
    for s in sorted(dist):
        print(f"    {s}★: {dist[s]} 張")
    if errs:
        print(f"  ❌ Errors: {errs}")

    # 存結果
    out_file = SCRIPT_DIR / f"_star_count_{gen_name}.json"
    with open(out_file, "w") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"  📝 → {out_file.name}")

    return results


def main():
    args = sys.argv[1:] if len(sys.argv) > 1 else ["galaxy2"]

    if "all" in args:
        gens = list(CASSETTE_BACK_DIRS.keys())
    else:
        gens = [a for a in args if a in CASSETTE_BACK_DIRS]

    if not gens:
        print(f"Usage: {sys.argv[0]} [{'|'.join(CASSETTE_BACK_DIRS.keys())}|all]")
        sys.exit(1)

    all_results = {}
    for gen in gens:
        all_results[gen] = process_generation(gen)

    # 產出摘要對照表（與 DB 比較）
    print(f"\n{'='*60}")
    print(f"  匯總 — 可用於修正 DB 的 star mapping")
    print(f"{'='*60}")

    for gen, results in all_results.items():
        print(f"\n  {gen}:")
        for r in results:
            print(f"    {r['cardId']}: {r['stars']}")


if __name__ == "__main__":
    main()
