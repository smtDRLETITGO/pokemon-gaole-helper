#!/usr/bin/env python3
"""
count_stars_v4.py — Robust MEZASTAR star counter v4 FINAL
Algorithm:
  1. Generous initial crop of star-region candidate
  2. Auto-find exact star row via Y-projection peak (brightest horizontal band)
  3. Tight sub-crop around that row only
  4. Gold threshold on dark-background sub-crop
  5. Count stars via X-projection peaks (primary) + contour cross-check
Calibrated: 2-2-001=6★(horiz), 2-2-029=4★(vert)
"""
import sys, json
from pathlib import Path
import cv2
import numpy as np
from scipy import ndimage

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
CARDS_DIR = PROJECT_ROOT / "public" / "cards" / "11_small"
DEBUG_DIR = PROJECT_ROOT / "_star_debug"

GROUND_TRUTH = {"2-2-001": 6, "2-2-029": 4}


def load_back(card_id):
    p = CARDS_DIR / f"{card_id}.jpg"
    return cv2.imread(str(p))


def detect_layout(img):
    return "horizontal" if img.shape[1] > img.shape[0] else "vertical"


def find_star_row(img, layout):
    """
    Auto-detect the Y-position of the star row within a generous crop.
    Returns (tight_sub_crop, coords).
    """
    h, w = img.shape[:2]

    if layout == "horizontal":
        # Generous upper-left crop covering banner area
        x1, x2 = int(w * 0.00), int(w * 0.55)
        y1, y2 = int(h * 0.48), int(h * 0.92)
    else:
        # Generous lower-left crop
        x1, x2 = int(w * 0.00), int(w * 0.65)
        # Vertical cards: star row is typically 65%-88% down
        y1 = int(h * 0.58)
        y2 = int(h * 0.92)

    region = img[y1:y2, x1:x2].copy()
    rh, rw = region.shape[:2]

    hsv = cv2.cvtColor(region, cv2.COLOR_BGR2HSV)

    # Broad gold-yellow mask to find ANY bright yellow/gold pixels
    broad = cv2.inRange(hsv, np.array([10, 40, 100]), np.array([55, 255, 255]))

    if np.count_nonzero(broad) < 20:
        # Fallback: return the full region
        return region, (x1, y1, x2, y2)

    # Y-projection: sum of gold pixels per row
    y_proj = np.sum(broad > 0, axis=1).astype(float)

    # Smooth and find the tallest contiguous band of gold
    smooth_y = ndimage.uniform_filter1d(y_proj, size=max(3, rh // 15))

    # Find rows with above-average gold density
    mean_gold = np.mean(smooth_y[smooth_y > 0]) if np.any(smooth_y > 0) else 1
    thresh = max(mean_gold * 0.35, 2.0)

    gold_rows = np.where(smooth_y > thresh)[0]
    if len(gold_rows) == 0:
        return region, (x1, y1, x2, y2)

    # Find the densest cluster of consecutive gold rows
    # Group consecutive rows
    clusters = []
    if len(gold_rows) > 0:
        start = gold_rows[0]
        prev = gold_rows[0]
        for r in gold_rows[1:]:
            if r - prev > 4:  # gap > 4 rows = new cluster
                clusters.append((start, prev))
                start = r
            prev = r
        clusters.append((start, prev))

    # Pick cluster with highest total gold density
    best_cluster = max(clusters, key=lambda c: smooth_y[c[0]:c[1]+1].sum()) if clusters else (0, rh - 1)

    cy1 = max(0, best_cluster[0] - 4)   # small padding above
    cy2 = min(rh, best_cluster[1] + 6)   # padding below

    # Also tighten X range slightly based on where gold pixels actually are
    sub = region[cy1:cy2, :].copy()
    sh, sw = sub.shape[:2]

    # Find actual X extent of gold in this row
    sub_hsv = cv2.cvtColor(sub, cv2.COLOR_BGR2HSV)
    sub_mask = cv2.inRange(sub_hsv, np.array([10, 40, 100]), np.array([55, 255, 255]))
    xs_with_gold = np.where(np.sum(sub_mask > 0, axis=0) > 1)[0]
    if len(xs_with_gold) >= 2:
        sx1 = max(0, xs_with_gold[0] - 5)
        sx2 = min(sw, xs_with_gold[-1] + 10)
        sub = sub[:, sx1:sx2]

    return sub, (x1, y1, x2, y2)


def count_stars_in_roi(roi, debug=False):
    """Count stars in an already-tightly-cropped ROI."""
    h, w = roi.shape[:2]
    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)

    # ── Threshold calibrated for dark-background star regions ──
    mask = cv2.inRange(hsv, np.array([14, 60, 130]), np.array([45, 255, 255]))
    px_tight = np.count_nonzero(mask)

    # If tight gives too few, widen
    if px_tight < 15:
        mask = cv2.inRange(hsv, np.array([10, 45, 115]), np.array([50, 255, 255]))
        px_tight = np.count_nonzero(mask)

    if px_tight < 10:
        return {"count": 0, "confidence": 0.02, "method": "no_gold",
                "debug": {"px": px_tight}}

    # Gentle cleanup
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2, 2))
    cleaned = cv2.morphologyEx(mask, cv2.MORPH_OPEN, k)
    cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_CLOSE, k)
    px_c = np.count_nonzero(cleaned)

    results_local = {}

    # ── Method A: X-projection peaks (PRIMARY) ──
    x_proj = np.sum(cleaned > 0, axis=0).astype(float)
    n_peaks = 0; pk_conf = 0.0; pk_gap_cv = 999
    if len(x_proj) > 4 and np.max(x_proj) >= 2:
        smooth = ndimage.uniform_filter1d(x_proj, size=max(3, w // 16))
        mean_val = np.mean(smooth[smooth > 1]) if np.any(smooth > 1) else 1
        thresh_val = max(mean_val * 0.30, 1.5)
        peaks_idx = []
        for i in range(1, len(smooth) - 1):
            if smooth[i] > smooth[i - 1] and smooth[i] > smooth[i + 1] and \
               smooth[i] > thresh_val:
                peaks_idx.append(i)
        n_peaks = len(peaks_idx)
        if 1 <= n_peaks <= 6:
            pk_conf = 0.82
            if 2 <= n_peaks <= 5:
                pk_conf += 0.06
            if len(peaks_idx) >= 2:
                gaps = np.diff(peaks_idx)
                pk_gap_cv = float(np.std(gaps) / (np.mean(gaps) + 1e-6))
                pk_conf += max(0, 0.12 - pk_gap_cv * 0.20)
        elif n_peaks == 1:
            pk_conf = 0.45

    results_local["peaks"] = (n_peaks, pk_conf)

    # ── Method B: Contour count ──
    ct, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    roi_area = h * w
    lo_a = max(3, int(roi_area * 0.002))
    hi_a = int(roi_area * 0.25)
    valid_ct = [c for c in ct if lo_a <= cv2.contourArea(c) <= hi_a]
    n_ct = len(valid_ct)
    ct_conf = 0.50
    if 1 <= n_ct <= 6:
        ct_conf = 0.72
        if n_ct >= 2:
            areas_s = sorted(cv2.contourArea(c) for c in valid_ct)
            ar_std = np.std(areas_s) / (np.mean(areas_s) + 1e-6)
            if ar_std < 0.7:
                ct_conf += 0.10
        if 2 <= n_ct <= 5:
            ct_conf += 0.04

    results_local["contours"] = (n_ct, ct_conf)

    # ── Method C: Erosion split count ──
    ke = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    eroded = cv2.erode(cleaned, ke, iterations=2)
    cte, _ = cv2.findContours(eroded, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    n_erode = sum(1 for c in cte if lo_a // 2 <= cv2.contourArea(c) <= hi_a * 2)
    er_conf = 0.45
    if 1 <= n_erode <= 6:
        er_conf = 0.60
        if n_erode == n_ct:
            er_conf += 0.08

    results_local["erode"] = (n_erode, er_conf)

    # ── Decision ──
    candidates = []
    for name, (val, conf) in results_local.items():
        if 1 <= val <= 6:
            candidates.append((val, conf, name))

    if not candidates:
        est = max(0, min(6, round(px_c / 80)))
        return {"count": est, "confidence": 0.10, "method": "area_fb",
                "debug": dict(results_local)}

    best = max(candidates, key=lambda x: x[1])
    bc, bconf, bmethod = best
    agreeing = sum(1 for c in candidates if c[0] == bc)
    if agreeing >= 2:
        bconf = min(bconf + 0.08, 0.99)

    result = {
        "count": bc,
        "confidence": round(bconf, 3),
        "method": f"v4({bmethod})",
        "debug": {k: (v[0], round(v[1], 3)) for k, v in results_local.items()}
    }

    if debug and DEBUG_DIR.exists():
        DEBUG_DIR.mkdir(exist_ok=True)
        ann = roi.copy()
        ann[cleaned > 0] = [0, 230, 80]
        for c in valid_ct:
            cv2.drawContours(ann, [c], -1, (0, 0, 255), 1)
        cv2.putText(ann, f"{bc}*({bmethod})", (5, 14),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.42, (0, 255, 0), 1)
        cv2.imwrite(str(DEBUG_DIR / f"v4_{bmethod}_{bc}st.png"), ann)

    return result


def count_stars(card_id, debug=False):
    img = load_back(card_id)
    if img is None:
        return {"cardId": card_id, "count": -1, "error": "not_found"}
    layout = detect_layout(img)
    roi, coords = find_star_row(img, layout)
    result = count_stars_in_roi(roi, debug=debug)
    result["cardId"] = card_id
    result["layout"] = layout
    if debug and DEBUG_DIR.exists():
        cv2.imwrite(str(DEBUG_DIR / f"v4_{card_id}_roi.png"), roi)
    return result


def cmd_test():
    print("=== Star Counter v4 Final Test ===\n")
    print(f"{'Card':<12} {'Pred':>5} {'Actual':>7} {'Conf':>6} {'Method':<18} {'Pk':>4} {'Ct':>4} {'Er':>4} {'St'}")
    print("-" * 75)
    ok = 0
    for cid, exp in sorted(GROUND_TRUTH.items()):
        r = count_stars(cid, debug=True)
        p, c, m = r["count"], r["confidence"], r["method"]
        d = r.get("debug", {})
        s = "✓" if p == exp else f"✗ ({exp})"
        if p == exp: ok += 1
        print(f"{cid:<12} {p:>5} {exp:>7} {c:>6.2f} {m:<18}{d.get('peaks',(0,0))[0]:>4}{d.get('contours',(0,0))[0]:>4}{d.get('erode',(0,0))[0]:>4} {s}")
    print("-" * 75)
    print(f"\nAccuracy: {ok}/{len(GROUND_TRUTH)}")


def cmd_batch():
    print("=== Star Counter v4 Batch ===\n")
    files = sorted([f.stem for f in CARDS_DIR.glob("*.jpg")])
    if not files:
        files = sorted([f.stem for f in CARDS_DIR.glob("*.png")])
    print(f"Found {len(files)} images\n")

    results, errs = [], []
    for i, cid in enumerate(files):
        r = count_stars(cid)
        c, conf, m = r["count"], r["confidence"], r["method"]
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

    out = SCRIPT_DIR / "_star_count_v4.json"
    with open(out, "w") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"\n→ {out}")
    if errs:
        print(f"Errors: {errs}")
    return results


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
