#!/usr/bin/env python3
"""
count_stars_cv.py — 用 OpenCV + Skeleton 分析快速計算 MEZASTAR 星等
策略：HSV 金色閾值 → 版型偵測(直式/橫式) → 版型專用裁切 → Skeleton 分析

核心洞察（從實驗驗證）：
- 直式卡（大星，垂直堆疊）：skeleton 端點數 ≈ 星數 × 5（每顆五角星約5個尖端）
- 橫式卡（小星，水平排列）：skeleton 分支點數 ≈ 星數 - 1（線性鏈）或輪廓計數
- 星等區域底部可能有非星金色元素（文字/裝飾），需裁掉
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

# ── 裁切參數（依版型分開） ──
# 直式卡（h > w）：星星在左下角，垂直堆疊
STAR_REGION_VERTICAL = {"x1": 0.02, "x2": 0.40, "y1": 0.65, "y2": 0.98}
# 橫式卡（w > h）：星星在左側，但垂直位置因卡面設計而異（可能在上方或下方）
# 解法：裁切整個左側條帶，讓分析演算法自行找到星等區域
STAR_REGION_HORIZONTAL = {"x1": 0.01, "x2": 0.38, "y1": 0.08, "y2": 0.88}

# 只分析裁切區的上半部（避免底部非星元素）
STAR_CROP_UPPER_FRAC = 0.70  # 直式卡：只用上面 70%

GROUND_TRUTH = {
    "2-2-001": 6,   # 直式 6★
    "2-2-002": 5,   # 橫式 5★
    "2-2-026": 3,   # 直式 3★
    "2-2-066": 2,   # 直式 2★
    "2-2-017": 4,   # 橫式 4★
}


def load_image(card_id):
    for ext in ['.jpg', '.png']:
        p = CARDS_DIR / f"{card_id}{ext}"
        if p.exists():
            img = cv2.imread(str(p))
            if img is not None:
                return img
    return None


def detect_layout(img):
    """偵測卡片版型：直式(vertical) 或 橫式(horizontal)，依長寬比判斷"""
    h, w = img.shape[:2]
    aspect = w / h if h > 0 else 1.0
    # 橫式卡：寬 > 高（aspect > 1.05）；直式卡：高 >= 寬
    return "horizontal" if aspect > 1.05 else "vertical"


def find_horizontal_star_row(img, x2_frac=0.38):
    """
    對橫式卡，用 Y 軸投影找到星等所在的水平條帶。
    
    策略：在左側 x:[0, x2_frac] 區域內，對每個 Y 做金色像素投影，
    找到金色密度最高的連續區段（即星星所在行）。
    回傳最佳裁切後的圖片。
    """
    h, w = img.shape[:2]
    x_max = int(w * x2_frac)
    left_region = img[:, :x_max]
    
    hsv = cv2.cvtColor(left_region, cv2.COLOR_BGR2HSV)
    # 用較寬鬆的閾值捕捉所有可能的金色
    loose_mask = cv2.inRange(hsv, np.array([0, 25, 50]), np.array([55, 255, 255]))
    
    # Y 軸投影：每行的金色像素數
    y_proj = np.sum(loose_mask > 0, axis=1)
    
    if np.max(y_proj) < 5:
        # 沒找到足夠金色，fallback 到固定裁切
        y1 = int(h * 0.42)
        y2 = int(h * 0.82)
        return img[y1:y2, :x_max], (y1, y2)
    
    # 用 sliding window 找最高密度的行區段
    # 星星高度約佔圖片高度的 12-20%
    min_row_h = max(int(h * 0.10), 8)
    max_row_h = max(int(h * 0.25), 15)
    
    best_score = -1
    best_y1, best_y2 = 0, h
    
    for row_h in range(min_row_h, max_row_h + 1, 2):
        # 用均滑投影避免噪點干擾
        kernel_size = min(row_h // 2, 5) | 1  # ensure odd
        if kernel_size >= 3:
            smoothed = np.convolve(y_proj, np.ones(kernel_size)/kernel_size, mode='same')
        else:
            smoothed = y_proj.copy()
        
        for y_start in range(0, h - row_h + 1, 2):
            score = smoothed[y_start:y_start + row_h].sum()
            if score > best_score:
                best_score = score
                best_y1 = y_start
                best_y2 = y_start + row_h
    
    # 加一些 padding
    pad = max(int(h * 0.03), 3)
    best_y1 = max(0, best_y1 - pad)
    best_y2 = min(h, best_y2 + pad)
    
    return img[best_y1:best_y2, :x_max], (best_y1, best_y2)


def crop_star_region(img, layout=None):
    """依版型裁切星星區域"""
    if layout is None:
        layout = detect_layout(img)
    
    if layout == "horizontal":
        cropped, (y1, y2) = find_horizontal_star_row(img)
        return cropped, layout
    
    # 直式卡：固定左下角區域
    h, w = img.shape[:2]
    x1 = int(w * STAR_REGION_VERTICAL["x1"])
    x2 = int(w * STAR_REGION_VERTICAL["x2"])
    y1 = int(h * STAR_REGION_VERTICAL["y1"])
    y2 = int(h * STAR_REGION_VERTICAL["y2"])
    return img[y1:y2, x1:x2], layout


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


def detect_stars(cropped, layout="vertical"):
    """
    主策略：多閾值嘗試 → skeleton 分析 / 輪廓計數 → 智能選最佳結果
    
    對直式卡：skeleton 端點法為主（每顆五角星約5個尖端）
    對橫式卡：skeleton 分支點法 + 輔助輪廓計數（小星水平排列）
    """
    if cropped is None or cropped.size == 0:
        return {"count": 0, "confidence": 0, "method": "empty"}
    
    h_full, w = cropped.shape[:2]
    
    # 自適應上半裁切（排除非星元素）— 橫式卡因已精確裁切可少裁
    if layout == "horizontal":
        h_use = int(h_full * 0.95)  # 橫式卡：幾乎全用（精確裁切區內）
    elif h_full < 120:
        h_use = int(h_full * 0.90)
    elif h_full < 180:
        h_use = int(h_full * 0.82)
    else:
        h_use = int(h_full * STAR_CROP_UPPER_FRAC)
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

        # 方法 C：輔廓計數（橫式卡專用 — 數獨立金色 blob）
        if layout == "horizontal" and px >= 15:
            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            # 過濾太小的輪廓（噪點）；不設上限（大星不應被排除）
            valid_contours = [c for c in contours
                             if 10 <= cv2.contourArea(c)]
            n_contours = len(valid_contours)
            if 1 <= n_contours <= 6:
                # 輪廓數 ≈ 星數（每顆星是一個 blob）
                conf_c = 0.70 if 2 <= n_contours <= 6 else 0.45
                # 輪廓面積均勻性加成（同大小的星面積應接近）
                if len(valid_contours) >= 2:
                    areas = sorted([cv2.contourArea(c) for c in valid_contours])
                    # 去掉最大輪廓（可能是非星元素）後檢查均勻性
                    areas_no_max = areas[:-1] if len(areas) > 2 else areas
                    if len(areas_no_max) >= 2:
                        area_std = np.std(areas_no_max) / (np.mean(areas_no_max) + 1e-6)
                        if area_std < 0.7:
                            conf_c += 0.15
                            n_contours = len(areas_no_max)
                local_estimates.append((n_contours, conf_c, f"cont{n_contours}"))

        # 方法 D：X軸投影峰值計數（橫式卡 — 星星水平排列，各產生一個 X 峰值）
        if layout == "horizontal" and px >= 20:
            x_proj = np.sum(mask > 0, axis=0)
            if np.max(x_proj) >= 3:
                try:
                    from scipy.ndimage import uniform_filter1d
                    smooth = uniform_filter1d(x_proj.astype(float), size=max(3, w//20))
                    mean_val = np.mean(smooth[smooth > 0]) if np.any(smooth > 0) else 1
                    peaks = []
                    for i in range(1, len(smooth) - 1):
                        if smooth[i] > smooth[i-1] and smooth[i] > smooth[i+1] and smooth[i] > mean_val * 0.4:
                            peaks.append(i)
                    n_peaks = len(peaks)
                    if 1 <= n_peaks <= 6:
                        conf_d = 0.65 if 2 <= n_peaks <= 6 else 0.40
                        if len(peaks) >= 2:
                            gaps = np.diff(peaks)
                            gap_cv = np.std(gaps) / (np.mean(gaps) + 1e-6)
                            if gap_cv < 0.5:
                                conf_d += 0.15
                        local_estimates.append((n_peaks, conf_d, f"peak{n_peaks}"))
                except ImportError:
                    pass  # scipy 不可用時跳過

        for est, conf, reason in local_estimates:
            candidates.append((est, conf, label, reason, px, br, ends))
    
    # 從所有候選中選最佳 — 用訊號品質加權分數（不是單純投票）
    
    def quality_score(est, conf, thresh_label, px, br, ends, reason=""):
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
        qs = quality_score(est, conf, thresh_label, px, br, ends, reason)
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
    """主入口 — 自動偵測版型並選擇對應策略"""
    img = load_image(card_id)
    if img is None:
        return {"cardId": card_id, "count": -1, "error": "image_not_found"}
    
    cropped, layout = crop_star_region(img)
    result = detect_stars(cropped, layout=layout)
    result["cardId"] = card_id
    result["layout"] = layout
    
    if debug and DEBUG_DIR:
        DEBUG_DIR.mkdir(exist_ok=True)
        cv2.imwrite(str(DEBUG_DIR / f"{card_id}_crop.png"), cropped)

        # 也產出各閾值的 skeleton debug
        h_full_dbg = cropped.shape[0]
        if layout == "horizontal":
            h_use_dbg = int(h_full_dbg * 0.95)
        elif h_full_dbg < 120:
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
