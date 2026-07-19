#!/usr/bin/env python3
"""
ocr_back_stats.py — 用 easyocr 從 MEZASTAR 背面圖讀取六維數值
策略：easyocr 讀全文 → 篩選純數字(2-3位) → 按 Y 座標排序 → 對應 [HP, atk, def, spAtk, spDef, spd]

用法：
  python ocr_back_stats.py test              # 測試已知卡片（驗證準確度）
  python ocr_back_stats.py batch             # 批量處理全部 73 張
  python ocr_back_stats.py debug 2-2-026     # 單張除錯（印出所有偵測結果）
"""

import re
import sys
import json
import time
import os
from pathlib import Path

import cv2
import numpy as np

# ── 路徑 ──
SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
BACK_DIR = PROJECT_DIR / "public" / "cards" / "10" / "back"
OUTPUT_FILE = SCRIPT_DIR / "_ocr_galaxy1_stats.json"

# ── 已知真值（用於測試）──
GROUND_TRUTH = {
    "2-2-001": {"hp": 194, "atk": 226, "def_": 154, "spAtk": 109, "spDef": 154, "spd": 197},
    "2-2-026": {"hp": 103, "atk": 72, "def_": 57, "spAtk": 55, "spDef": 57, "spd": 74},
    "2-2-066": {"hp": 61, "atk": 39, "def_": 24, "spAtk": 40, "spDef": 34, "spd": 56},
}

STAT_KEYS = ["hp", "atk", "def_", "spAtk", "spDef", "spd"]
STAT_LABELS = ["HP", "攻擊", "防禦", "特攻", "特防", "速度"]


def load_image(card_id):
    """載取背面圖"""
    path = BACK_DIR / f"{card_id}.png"
    if not path.exists():
        return None
    img = cv2.imread(str(path))
    return img


def extract_stats_easyocr(img):
    """
    用 easyocr 讀取圖片中所有文字，提取六維數值。
    
    回傳：dict with keys: hp, atk, def_, spAtk, spDef, spd 或 None（失敗）
    """
    import easyocr

    reader = easyocr.Reader(["en"], gpu=False, verbose=False)
    results = reader.readtext(img)

    # 解析所有偵測到的文字
    # easyocr 回傳格式：(bbox, text, confidence)
    detections = []
    for item in results:
        text = str(item[1]).strip()   # item[1] = 文字
        bbox = item[0]                # item[0] = 邊界框
        try:
            pts = np.array(bbox).reshape(4, 2)
            cy = float(np.mean(pts[:, 1]))
            cx = float(np.mean(pts[:, 0]))
        except (ValueError, TypeError):
            cy = cx = 9999
        detections.append({"text": text, "cy": cy, "cx": cx})

    # 只保留看起來像數值的項目（純數字或以數字開頭的）
    # 六維數值的特徵：2~3 位整數，通常在右側區域
    number_candidates = []
    for d in detections:
        text = d["text"]
        # 匹配純數字（2~3 位）
        m = re.match(r"^(\d{2,3})$", text)
        if m:
            val = int(m.group(1))
            # 合理範圍過濾：MEZASTAR 數值一般在 10~300 之間
            if 10 <= val <= 300:
                number_candidates.append({"val": val, "cy": d["cy"], "cx": d.get("cx", 0), "text": text})

    # 如果剛好有 6 個數字候選，按 Y 排序直接映射
    # 當 Y 座標太接近（<5px 差異）時，用 X 座標作為決勝（左列先於右列）
    if len(number_candidates) == 6:
        number_candidates.sort(key=lambda x: (x["cy"] // 5, x.get("cx", 0)))
        stats = {}
        for i, key in enumerate(STAT_KEYS):
            stats[key] = number_candidates[i]["val"]
        return stats

    # 如果不是 6 個，嘗試寬鬆匹配
    if len(number_candidates) > 6:
        # 取 Y 位置最靠上的 6 個（排除底部的版權文字等干擾）
        number_candidates.sort(key=lambda x: (x["cy"] // 5, x.get("cx", 0)))
        stats = {}
        for i, key in enumerate(STAT_KEYS):
            stats[key] = number_candidates[i]["val"]
        return stats

    if len(number_candidates) < 6:
        # 嘗試包含更多模式（如帶小數點、帶空格等）
        # 注意：寶可夢六維數值可以有重複（如攻擊=特攻），不去重
        for d in detections:
            text = d["text"]
            m = re.search(r"(\d{2,3})", text)
            if m:
                val = int(m.group(1))
                if 10 <= val <= 300:
                    number_candidates.append({"val": val, "cy": d["cy"], "cx": d.get("cx", 0), "text": text})

        if len(number_candidates) >= 6:
            number_candidates.sort(key=lambda x: (x["cy"] // 5, x.get("cx", 0)))
            stats = {}
            for i, key in enumerate(STAT_KEYS):
                stats[key] = number_candidates[i]["val"]
            return stats

    return None


def run_test():
    """用已知真值測試 OCR 準確度"""
    print("=" * 60)
    print("OCR 測試模式 — 對照已知真值")
    print("=" * 60)

    correct = 0
    total_checks = 0

    for card_id, expected in GROUND_TRUTH.items():
        img = load_image(card_id)
        if img is None:
            print(f"❌ {card_id}: 圖片不存在")
            continue

        print(f"\n--- {card_id} ---")
        start = time.time()
        result = extract_stats_easyocr(img)
        elapsed = time.time() - start

        if result is None:
            print(f"  ❌ 無法提取數值 ({elapsed:.1f}s)")
            continue

        row_parts = []
        all_match = True
        for i, key in enumerate(STAT_KEYS):
            exp_val = expected.get(key, "?")
            got_val = result.get(key, "?")
            match = "✓" if exp_val == got_val else "✗"
            if exp_val != got_val:
                all_match = False
            total_checks += 1
            if match == "✓":
                correct += 1
            row_parts.append(f"{STAT_LABELS[i]}={got_val}{match}")

        status = "✓ 全部正確" if all_match else "⚠ 有差異"
        print(f"  {status} ({elapsed:.1f}s)")
        for p in row_parts:
            print(f"    {p}")

    acc = correct / total_checks * 100 if total_checks > 0 else 0
    print(f"\n{'=' * 60}")
    print(f"準確度: {correct}/{total_checks} = {acc:.0f}%")
    print("=" * 60)


def run_debug(card_id):
    """單張除錯：列印所有偵測到的文字"""
    import easyocr

    img = load_image(card_id)
    if img is None:
        print(f"❌ 圖片不存在: {card_id}")
        return

    print(f"=== Debug: {card_id} ===")
    reader = easyocr.Reader(["en"], gpu=False, verbose=False)
    results = reader.readtext(img)

    for item in results:
        text = str(item[1]).strip()   # item[1] = 文字
        bbox = item[0]                # item[0] = 邊界框
        try:
            pts = np.array(bbox).reshape(4, 2)
            cy = float(np.mean(pts[:, 1]))
            cx = float(np.mean(pts[:, 0]))
        except (ValueError, TypeError):
            cy = cx = 0
        print(f"  [{cy:7.0f}y {cx:7.0f}x] {text}")

    # 也顯示提取結果
    result = extract_stats_easyocr(img)
    if result:
        print(f"\n  提取結果:")
        for i, key in enumerate(STAT_KEYS):
            print(f"    {STAT_LABELS[i]} = {result.get(key, '?')}")
    else:
        print("\n  ❌ 無法提取")


def run_batch():
    """批量處理全部背面圖"""
    import easyocr

    back_files = sorted(BACK_DIR.glob("*.png"))
    print(f"找到 {len(back_files)} 張背面圖")

    # 初始化 reader（只做一次）
    print("初始化 easyocr...")
    reader = easyocr.Reader(["en"], gpu=False, verbose=False)

    results = []
    t0 = time.time()
    success = 0
    fail = 0

    for idx, img_path in enumerate(back_files):
        card_id = img_path.stem  # e.g., "2-2-001"

        if (idx + 1) % 10 == 0 or idx == 0:
            elapsed = time.time() - t0
            eta = elapsed / (idx + 1) * (len(back_files) - idx - 1)
            print(f"[{idx+1}/{len(back_files)}] {card_id}... (已用{elapsed:.0f}s, 預估剩餘{eta:.0f}s)")

        img = cv2.imread(str(img_path))
        if img is None:
            results.append({"cardId": card_id, "error": "read_failed"})
            fail += 1
            continue

        # 使用已初始化的 reader
        detections = reader.readtext(img)

        # 解析（同 extract_stats_easyocr 但復用 reader）
        # easyocr: (bbox, text, confidence)
        parsed = []
        for item in detections:
            text = str(item[1]).strip()
            bbox = item[0]
            try:
                pts = np.array(bbox).reshape(4, 2)
                cy = float(np.mean(pts[:, 1]))
                cx = float(np.mean(pts[:, 0]))
            except (ValueError, TypeError):
                cy = cx = 9999
            parsed.append({"text": text, "cy": cy, "cx": cx})

        # 篩選數字候選
        number_candidates = []
        for d in parsed:
            text = d["text"]
            m = re.match(r"^(\d{2,3})$", text)
            if m:
                val = int(m.group(1))
                if 10 <= val <= 300:
                    number_candidates.append({"val": val, "cy": d["cy"], "cx": d["cx"]})

        # 寬鬆回退
        if len(number_candidates) < 6:
            for d in parsed:
                text = d["text"]
                m = re.search(r"(\d{2,3})", text)
                if m:
                    val = int(m.group(1))
                if 10 <= val <= 300:
                    # 注意：寶可夢數值可以有重複，不去重
                    number_candidates.append({"val": val, "cy": d["cy"], "cx": d["cx"]})

        if len(number_candidates) >= 6:
            number_candidates.sort(key=lambda x: (x["cy"] // 5, x.get("cx", 0)))
            stats = {}
            for i, key in enumerate(STAT_KEYS):
                stats[key] = number_candidates[i]["val"]
            entry = {"cardId": card_id}
            entry.update(stats)
            results.append(entry)
            success += 1
        else:
            found_vals = [c["val"] for c in number_candidates]
            results.append({
                "cardId": card_id,
                "error": f"insufficient_numbers: got {len(number_candidates)}",
                "found": found_vals,
            })
            fail += 1

    total_time = time.time() - t0

    # 寫入輸出 JSON
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\n{'=' * 60}")
    print(f"完成！成功={success}, 失敗={fail}, 耗時={total_time:.0f}s")
    print(f"輸出: {OUTPUT_FILE}")
    print("=" * 60)


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "batch"

    if mode == "test":
        run_test()
    elif mode == "debug":
        card_id = sys.argv[2] if len(sys.argv) > 2 else "2-2-026"
        run_debug(card_id)
    elif mode == "batch":
        run_batch()
    else:
        print(f"用法: {sys.argv[0]} [test|batch|debug <card_id>]")
