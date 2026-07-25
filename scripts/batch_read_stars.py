"""
批量從官網正面參考圖讀取星等（純本地 PIL，不需要 API / VLM）

用途：
  public/cards/11/*.png 是從官網下載的高清正面圖
  每張正面圖左下角都印有金黃色 ★ 星等
  用 PIL 裁切 + 金黃色閾值 + 上尖端計數 → 對比 DB 舊值 → 輸出修正清單

用法：
  python scripts/batch_read_stars.py              # 讀取並報告差異
  python scripts/batch_read_stars.py --fix        # 讀取 + 自動覆寫 generated.js
  python scripts/batch_read_stars.py --card 2-2-026 # 單張除錯
  python scripts/batch_read_stars.py --visual      # 存裁切後的星等區域圖（除錯用）
"""

import json
import re
import sys
import os
from pathlib import Path

from PIL import Image
import numpy as np
from scipy import ndimage

# ── 路徑設定 ───────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
CARDS_DIR = PROJECT_ROOT / "public" / "cards" / "11"
GENERATED_DB = PROJECT_ROOT / "src" / "data" / "pokemonDb.cards.generated.js"
VISUAL_DIR = PROJECT_ROOT / "_star_debug"

# ── CLI 參數 ───────────────────────────────────────────────
args = sys.argv[1:]
do_fix = "--fix" in args
do_visual = "--visual" in args
target_card = None
for i, a in enumerate(args):
    if a == "--card" and i + 1 < len(args):
        target_card = args[i + 1]


def load_generated_db():
    """從 generated JS 檔解析 PRESET_POKEMON_DB 陣列"""
    code = GENERATED_DB.read_text("utf-8")
    match = re.search(
        r"export\s+const\s+PRESET_POKEMON_DB\s*=\s*(\[[\s\S]*?\n\]);", code
    )
    if not match:
        raise ValueError(f"Cannot parse PRESET_POKEMON_DB from {GENERATED_DB}")
    # 安全 eval — 只包含 JSON-like 陣列
    arr = json.loads(match.group(1))
    return arr


# ═══════════════════════════════════════════════════════════
# 星等偵測（移植自 cardTemplateMatcher.js 的 countStarsByTips）
# ═══════════════════════════════════════════════════════════

def crop_star_region(img: Image.Image) -> Image.Image:
    """
    裁切卡片左下角的星等+名字區域。
    官網正面圖（橫式和直式的星等都在左下角）：
      x: 5%~42% (w), y: 68%~96% (h)
    """
    w, h = img.size
    sx = int(w * 0.05)
    sy = int(h * 0.68)
    sw = max(1, int(w * 0.37))
    sh = max(1, int(h * 0.28))
    return img.crop((sx, sy, sx + sw, sy + sh))


def crop_star_region_auto(img: Image.Image) -> tuple:
    """統一用左下角裁切（橫直式皆適用），返回 (region, 'lower-left', debug)。"""
    region = crop_star_region(img)
    return region, "lower-left", {}


def count_star_cc(star_img: Image.Image) -> dict:
    """
    連通元件法數星等（適用於高清官網參考圖）。

    基於實際像素分析（2-2-001 蒼響裁切區域）：
      星星像素真實色值：R≈210~235, G≈95~220, B≈40~85
      核心特徵：R-B 差值大 (>100)，B 偏低 (<120)
    演算法：
      1. 寬鬆金色閾值 → 二值 mask（容許漸層/光暈）
      2. 形態學閉運算（dilate→erode）連接碎片化像素
      3. scipy.ndimage.label() 連通元件標記
      4. 過濾面積（每顆星至少 N px）
      5. 有效元件數 = 星等

    回傳: {"count": int, "confidence": float, "debug": dict}
    """
    w, h = star_img.size
    if w < 4 or h < 4:
        return {"count": 0, "confidence": 0}

    if star_img.mode != "RGBA":
        star_img = star_img.convert("RGBA")

    arr = np.array(star_img)  # (h, w, 4) RGBA
    r, g, b = arr[:,:,0].astype(int), arr[:,:,1].astype(int), arr[:,:,2].astype(int)

    # Step 1: 寬鬆金色閾值（基於官網圖實測色值優化）
    # 條件：足夠亮(R+G>300)、偏暖(R>B+80)、不太藍(B<120)、偏黃(G>B*0.7)
    yellow_mask = (
        ((r + g) > 280) &
        (r > b + 80) &
        (b < 125) &
        (g > b * 0.6)
    ).astype(np.uint8)

    total_yellow = int(yellow_mask.sum())
    min_area = max(30, int(w * h * 0.005))  # 降低門檻：至少佔 0.5%
    if total_yellow < min_area:
        return {"count": 0, "confidence": 0, "debug": {"reason": "below_min_area", "total_yellow": total_yellow}}

    # Step 2: 形態學閉運算 — 連接同一顆星內的碎片像素
    # 用 5x5 的十字形結構元素做 dilate，再用 erode 恢復大小
    cross = np.array([[0,1,0],[1,1,1],[0,1,0]], dtype=np.uint8)
    dilated = ndimage.binary_dilation(yellow_mask, structure=cross, iterations=3)
    cleaned = ndimage.binary_erosion(dilated, structure=cross, iterations=3)

    # Step 3: 連通元件標記（8-connectivity）
    labeled, num_features = ndimage.label(cleaned)

    if num_features == 0:
        return {"count": 0, "confidence": 0}

    # Step 4: 計算每個元件的面積
    component_sizes = ndimage.sum(cleaned, labeled, range(1, num_features + 1))

    # 最小星等面積：至少佔裁切區域的 0.8%（星星有光暈會稍大）
    min_star_area = max(50, int(w * h * 0.008))

    valid_sizes = component_sizes[component_sizes >= min_star_area]
    star_count = min(len(valid_sizes), 6)

    # Step 5: Confidence
    area_ratio = total_yellow / (w * h)
    valid_total = int(valid_sizes.sum()) if len(valid_sizes) > 0 else 0
    coverage = valid_total / (w * h) if w * h > 0 else 0

    if len(valid_sizes) > 1:
        avg_size = np.mean(valid_sizes)
        size_cv = np.std(valid_sizes) / avg_size if avg_size > 0 else 1
        size_uniformity = max(0, 1 - size_cv * 3)
    elif len(valid_sizes) == 1:
        size_uniformity = 1.0
    else:
        size_uniformity = 0

    confidence = round(min(1, coverage * 15 * size_uniformity + 0.05), 3)

    return {
        "count": star_count,
        "confidence": confidence,
        "debug": {
            "total_yellow": total_yellow,
            "area_ratio": round(area_ratio, 4),
            "num_components": int(num_features),
            "valid_components": int(len(valid_sizes)),
            "component_sizes": [int(s) for s in valid_sizes],
            "min_threshold": min_star_area,
            "coverage": round(coverage, 4),
        }
    }


# ═══════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════

def main():
    db = load_generated_db()
    results = []

    targets = [c for c in db if not target_card or c.get("cardId") == target_card or c.get("diskCode") == target_card]

    print(f"\n{'═' * 65}")
    print(f"  批量星等偵測 — 官網正面圖 ({len(targets)} 張)")
    print(f"{'═' * 65}\n")
    print(f"{'cardId':<12} {'名稱':<10} {'DB星':>4} → {'偵測':>4}  {'信心':>6}  狀態")
    print("─" * 67)

    changed = matched = error = 0

    for card in targets:
        card_id = card["cardId"]
        img_path = CARDS_DIR / f"{card_id}.png"
        try:
            img = Image.open(img_path).convert("RGBA")
            region, layout_used, crop_debug = crop_star_region_auto(img)
            result = count_star_cc(region)

            db_stars = card.get("stars", "?")
            is_match = db_stars == result["count"]
            status = "✓ OK" if is_match else f"⚠ 差異"

            if not is_match:
                changed += 1
            else:
                matched += 1

            print(
                f"{card_id:<12} {(card.get('name', '') or ''):<10} "
                f"{str(db_stars):>4} → {str(result['count']):>4}  "
                f"{int(result['confidence']*100):>4}%  {status}"
            )

            results.append({
                **card,
                "_detectedStars": result["count"],
                "_confidence": result["confidence"],
                "_changed": not is_match,
                "_debug": result.get("debug"),
            })

            # Visual debug: save cropped star region
            if do_visual:
                VISUAL_DIR.mkdir(exist_ok=True)
                vis_path = VISUAL_DIR / f"{card_id}_stars.png"
                region.save(vis_path)

        except Exception as e:
            error += 1
            print(f"{card_id:<12} {(card.get('name','') or ''):<10} ERROR: {e}")

    print("─" * 67)
    print(f"總計: {len(targets)} 張 | ✓ 匹配 {matched} | ⚠ 差異 {changed} | ✗ 錯誤 {error}")

    diffs = [r for r in results if r.get("_changed")]
    if diffs:
        print(f"\n⚠ 需要修正的卡片 ({len(diffs)} 張)：")
        print(f"{'cardId':<12} {'DB舊值':>6} → {'應改為':>6}  {'名稱'}")
        for d in diffs:
            dbg = d.get("_debug", {})
            details = (
                f"  debug: clusters={dbg.get('clusters_valid')} yellow_px={dbg.get('total_yellow')} area={dbg.get('area_ratio')}"
                if do_fix or target_card
                else ""
            )
            print(
                f"{d['cardId']:<12} {str(d.get('stars','?')):>6} → "
                f"{str(d['_detectedStars']):>6}  {d.get('name','')}{details}"
            )

    # ── Auto-fix ──────────────────────────────────────────
    if do_fix and diffs:
        print(f"\n🔧 正在自動修正 {len(diffs)} 張卡的星等...")

        code = GENERATED_DB.read_text("utf-8")
        new_code = code
        fixed_count = 0

        for d in diffs:
            old_pattern = re.compile(
                rf"(cardId:\s*['\"]{re.escape(d['cardId'])}['\"][^\n]*?stars:\s*)\d+"
            )
            replacement = new_code  # track if replace worked
            new_code = old_pattern.sub(rf"\g<1>{d['_detectedStars']}", new_code, count=1)
            if new_code != replacement:
                fixed_count += 1
                print(f"  ✓ {d['cardId']} {d.get('name','')}: {d.get('stars','?')} → {d['_detectedStars']}")
            else:
                print(f"  ✗ {d['cardId']}: regex replace failed — 需手動編輯")

        if fixed_count > 0:
            GENERATED_DB.write_text(new_code, "utf-8")
            print(f"\n已寫回 {GENERATED_DB}（{fixed_count}/{len(diffs)} 張已修正）")
        else:
            print("\n無法自動修正任何卡片 — 需手動檢查 regex 匹配")

    if do_visual and VISUAL_DIR.exists():
        print(f"\n📷 星等區域裁切圖已存至 {VISUAL_DIR}/")

    print()


if __name__ == "__main__":
    main()
