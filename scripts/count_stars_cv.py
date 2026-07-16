#!/usr/bin/env python3
"""
count_stars_cv.py — 用 OpenCV + Skeleton 分析快速計算 MEZASTAR 星等
策略：HSV 金色閾值 → 上半區域裁切 → Skeletonize → 分支點/端點計數

核心洞察（從實驗驗證）：
- 水平卡（小星）：skeleton 分支點數 = 星數 - 1（線性鏈）
- 直立卡（大星）：skeleton 端點數 ≈ 星數 × 5（每顆五角星約5個尖端）
- 星等區域底部可能有非星金色元素（文字/裝飾），需裁掉下半部
用法：
  python count_stars_cv.py test              # 測試已知卡片
  python count_stars_cv.py batch             # 批量處理全部 73 張
  python count_stars_cv.py debug 2-2-001     # 單張除錯
"""
import sys
import json
from pathlib import Path

import cv2
import numpy as np
from skimage.morphology import skeletonize

# ── 路徑設定 ──
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
CARDS_DIR = PROJECT_ROOT / "public" / "cards" / "11_small"
DEBUG_DIR = PROJECT_ROOT / "_star_debug"

# ── 裁切參數 ──
STAR_REGION = {"x1": 0.02, "x2": 0.40, "y1": 0.65, "y2": 0.98}
# 只分析裁切區的上半部（避免底部非星元素）
STAR_CROP_UPPER_FRAC = 0.70  # 只用上面 70%

GROUND_TRUTH = {
    "2-2-001": 6,
    "2-2-026": 3,
    "2-2-066": 2,
}


def load_image(card_id):
    for ext in ['.jpg', '.png']:
        p = CARDS_DIR / f"{card_id}{ext}"
        if p.exists():
            img = cv2.imread(str(p))
            if img is not None:
                return img
    return None


def crop_star_region(img):
    h, w = img.shape[:2]
    x1 = int(w * STAR_REGION["x1"])
    x2 = int(w * STAR_REGION["x2"])
    y1 = int(h * STAR_REGION["y1"])
    y2 = int(h * STAR_REGION["y2"])
    return img[y1:y2, x1:x2]


def analyze_skeleton(mask):
    """
    對二值 mask 做 skeleton 分析，回傳分支點和端點數量。
    
    回傳: {n_branches, n_ends, skeleton_image}
    """
    if np.count_nonzero(mask) < 10:
        return {"n_branches": 0, "n_ends": 0, "skeleton": None}
    
    skel = skeletonize(mask > 0).astype(np.uint8) * 255
    
    # 8-連通鄰居計數
    padded = np.pad(skel > 0, 1, mode='constant', constant_values=0)
    neighbor_count = np.zeros_like(skel, dtype=np.int32)
    for dr, dc in [(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]:
        neighbor_count += padded[1+dr:1+dr+skel.shape[0], 1+dc:1+dc+skel.shape[1]]
    
    skel_px = skel > 0
    n_branches = int(np.count_nonzero(skel_px & (neighbor_count >= 3)))
    n_ends = int(np.count_nonzero(skel_px & (neighbor_count == 1)))
    
    return {"n_branches": n_branches, "n_ends": n_ends, "skeleton": skel,
            "neighbor_count": neighbor_count, "skel_px": skel_px}


def detect_stars(cropped):
    """
    主策略：多閾值嘗試 → skeleton 分析 → 智能選最佳結果
    
    對每個 HSV 閾值：
      1. 產生金色 mask
      2. 裁到上半部（排除底部非星元素）
      3. Skeletonize → 數 branch/end points
      4. 估計星數：branch+1 或 round(ends/5)
    選擇最合理的結果（1~6 範圍，最高信心度）
    """
    if cropped is None or cropped.size == 0:
        return {"count": 0, "confidence": 0, "method": "empty"}
    
    h_full, w = cropped.shape[:2]
    
    # 只分析上半部（避免底部非星元素）
    # 自適應：水平卡（矮裁切區）保留更多，直立卡積極裁掉底部
    if h_full < 120:
        h_use = int(h_full * 0.90)   # 水平卡：只裁 10%
    elif h_full < 180:
        h_use = int(h_full * 0.82)   # 中等：裁 18%
    else:
        h_use = int(h_full * STAR_CROP_UPPER_FRAC)  # 直立卡：裁 30%
    cropped_upper = cropped[:h_use, :]
    
    hsv = cv2.cvtColor(cropped_upper, cv2.COLOR_BGR2HSV)
    
    # 多組閾值候選（從嚴格到寬鬆）
    thresholds = [
        ("tight",   np.array([12, 80, 110]), np.array([32, 255, 255])),
        ("normal",  np.array([8, 60, 90]),  np.array([38, 255, 255])),
        ("wide",    np.array([5, 50, 80]),  np.array([45, 255, 255])),
        ("loose",   np.array([0, 35, 65]),  np.array([50, 255, 255])),
        ("xloose",  np.array([0, 20, 50]),  np.array([55, 255, 255])),
    ]
    
    candidates = []
    
    for label, lo, hi in thresholds:
        mask = cv2.inRange(hsv, lo, hi)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN,
                                cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2, 2)))
        
        px = np.count_nonzero(mask)
        if px < 8:
            continue
        
        sk = analyze_skeleton(mask)
        br = sk["n_branches"]
        ends = sk["n_ends"]
        
        # 方法 A：分支點推算（適合水平/小星排列成鏈狀）
        est_a = br + 1

        # 方法 B：端點推算（適合直立/大星，每星約 5 個端點）
        est_b = max(1, round(ends / 5.0))

        # 收集所有合理估計
        local_estimates = []

        if 1 <= est_a <= 6:
            # 分支點法在 br 小於等於 5 時很可靠（線性鏈）
            conf_a = 0.85 if 1 <= br <= 5 else 0.5
            # 端點交叉驗證
            expected_ends = est_a * 5
            end_err = abs(ends - expected_ends)
            if ends >= 3 and end_err <= max(3, expected_ends * 0.4):
                conf_a += 0.15
            local_estimates.append((est_a, conf_a, f"br{br}+1"))

        if 1 <= est_b <= 6:
            # 端點法在 ends 接近 5 的倍數時可靠
            remainder = ends % 5
            conf_b = 0.80 if remainder in (0, 1, 4) else 0.55
            if 2 <= est_b <= 5:
                conf_b += 0.05
            # 分支交叉驗證
            if 1 <= br <= 5 and est_b == br + 1:
                conf_b += 0.20  # 兩種方法一致 → 強信任
            elif br == 0 and est_b <= 3:
                conf_b += 0.10  # 無分支（單一 blob）+ 少量星 → 合理
            local_estimates.append((est_b, conf_b, f"end{ends}/5"))

        for est, conf, reason in local_estimates:
            candidates.append((est, conf, label, reason, px, br, ends))
    
    # 從所有候選中選最佳 — 用訊號品質加權分數（不是單純投票）
    
    def quality_score(est, conf, thresh_label, px, br, ends):
        """計算這個候選的整體品質分數"""
        score = conf * 100  # 基礎分來自信心度
        
        # 1. 像素量合理性獎勵（避免太少=缺漏 或太多=含噪）
        if 50 <= px <= 3000:
            score += 15
        elif 20 <= px <= 5000:
            score += 5
        
        # 2. 端點品質：越多端點且越接近 5 的倍數越好（太少則不可信）
        if ends >= 8:  # 至少 8 個端點才有統計意義
            rem = ends % 5
            if rem == 0:
                score += 25  # 完美整除且足夠樣本
            elif rem in (1, 4):
                score += 15
            elif rem in (2, 3):
                score += 8
        elif ends >= 4:
            if ends % 5 == 0:
                score += 5  # 少量但整除，小獎勵
        
        # 3. 分支點品質：br 在合理範圍表示乾淨的線性排列
        if 1 <= br <= 5:
            score += 15
        elif br == 0 and est <= 3:
            score += 5  # 無分支 + 少星 = 合理（大星完全融合）
        
        # 4. 閾值偏好：normal > wide > tight > loose（中間值最穩定）
        pref = {"normal": 10, "wide": 8, "tight": 3, "loose": 0}
        score += pref.get(thresh_label, 0)
        
        return score
    
    if not candidates:
        return {"count": 0, "confidence": 0.05, "method": "no_valid_candidate"}
    
    # 計算每個候選的品質分
    scored = []
    for est, conf, thresh_label, reason, px, br, ends in candidates:
        qs = quality_score(est, conf, thresh_label, px, br, ends)
        scored.append((qs, est, conf, thresh_label, reason, px, br, ends))
    
    # 選最高分
    scored.sort(reverse=True)
    best = scored[0]
    qs, best_est, conf, thresh_label, reason, px, br, ends = best
    
    # 同分的額外投票加成
    same_est_count = sum(1 for s in scored if s[1] == best_est)
    final_conf = min(conf + min(0.05 * (same_est_count - 1), 0.10), 1.0)
    
    return {
        "count": best_est,
        "confidence": final_conf,
        "method": f"skeleton({thresh_label},{reason},Q={qs:.0f})",
        "debug": {"threshold": thresh_label, "px": px, "branches": br, "ends": ends,
                  "quality": qs, "all_scores": [(s[1], f"Q={s[0]:.0f}") for s in scored[:5]]},
    }


def count_stars(card_id, debug=False):
    """主入口"""
    img = load_image(card_id)
    if img is None:
        return {"cardId": card_id, "count": -1, "error": "image_not_found"}
    
    cropped = crop_star_region(img)
    result = detect_stars(cropped)
    result["cardId"] = card_id
    
    if debug and DEBUG_DIR:
        DEBUG_DIR.mkdir(exist_ok=True)
        cv2.imwrite(str(DEBUG_DIR / f"{card_id}_crop.png"), cropped)
        
        # 也產出各閾值的 skeleton debug
        h_full_dbg = cropped.shape[0]
        if h_full_dbg < 120:
            h_use_dbg = int(h_full_dbg * 0.90)
        elif h_full_dbg < 180:
            h_use_dbg = int(h_full_dbg * 0.82)
        else:
            h_use_dbg = int(h_full_dbg * STAR_CROP_UPPER_FRAC)
        cropped_upper = cropped[:h_use_dbg, :]
        hsv = cv2.cvtColor(cropped_upper, cv2.COLOR_BGR2HSV)
        
        for label, lo, hi in [("normal", np.array([8,60,90]), np.array([38,255,255])),
                               ("wide", np.array([5,50,80]), np.array([45,255,255]))]:
            mask = cv2.inRange(hsv, lo, hi)
            mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN,
                                    cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2, 2)))
            sk = analyze_skeleton(mask)
            if sk["skeleton"] is not None:
                dbg = cv2.cvtColor(sk["skeleton"], cv2.COLOR_GRAY2BGR)
                dbg[sk["skel_px"] & (sk["neighbor_count"] >= 3)] = [0, 0, 255]
                dbg[sk["skel_px"] & (sk["neighbor_count"] == 1)] = [0, 255, 0]
                ct = result.get("count", "?")
                cv2.putText(dbg, f"{ct}★ [{label}]", (3, 15),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 0), 1)
                cv2.imwrite(str(DEBUG_DIR / f"{card_id}_skel_{label}.png"), dbg)
    
    return result


def cmd_test():
    print("=== Star Counter Test (Skeleton v2) ===\n")
    print(f"{'Card':<12} {'Pred':>5} {'Actual':>7} {'Conf':>6} {'Method':<48} {'Status'}")
    print("-" * 100)
    
    ok = 0
    total = len(GROUND_TRUTH)
    
    for cid, exp in sorted(GROUND_TRUTH.items()):
        r = count_stars(cid, debug=True)
        p = r.get("count", -1)
        c = r.get("confidence", 0)
        m = r.get("method", "")
        s = "✓" if p == exp else f"✗ ({exp})"
        if p == exp: ok += 1
        print(f"{cid:<12} {p:>5} {exp:>7} {c:>6.2f} {m:<48} {s}")
    
    print("-" * 100)
    print(f"\nAccuracy: {ok}/{total} ({100*ok/total:.0f}%)")


def cmd_batch():
    print("=== Batch Star Count (Skeleton v2) ===\n")
    
    files = sorted([f.stem for f in CARDS_DIR.glob("*.jpg")])
    if not files:
        files = sorted([f.stem for f in CARDS_DIR.glob("*.png")])
    
    print(f"Found {len(files)} images\n")
    
    results = []
    errs = []
    
    for i, cid in enumerate(files):
        r = count_stars(cid)
        c = r.get("count", -1)
        conf = r.get("confidence", 0)
        m = r.get("method", "")
        results.append({"cardId": cid, "stars": c, "confidence": conf, "method": m})
        
        flag = ""
        if c < 0: flag = " [ERR]"; errs.append(cid)
        elif c == 0 or c > 6: flag = " [WARN]"
        print(f"[{i+1:3d}/{len(files)}] {cid}: {c}★ ({conf:.2f}) {m}{flag}")
    
    dist = {}
    for r in results:
        dist[r["stars"]] = dist.get(r["stars"], 0) + 1
    
    print(f"\n--- Distribution ---")
    for s in sorted(dist):
        print(f"  {s}★: {dist[s]}")
    
    out = SCRIPT_DIR / "_cv_stars.json"
    with open(out, "w") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"\n→ {out}")
    if errs:
        print(f"Errors: {errs}")


if __name__ == "__main__":
    a = sys.argv[1:] if len(sys.argv) > 1 else []
    if not a or a[0] == "test":
        cmd_test()
    elif a[0] == "batch":
        cmd_batch()
    elif a[0] == "debug" and len(a) >= 2:
        r = count_stars(a[1], debug=True)
        print(json.dumps(r, indent=2, ensure_ascii=False, default=str))
    else:
        print(f"Usage: {sys.argv[0]} [test|batch|debug <id>]")
