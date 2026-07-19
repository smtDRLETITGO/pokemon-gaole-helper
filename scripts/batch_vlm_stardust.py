#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
batch_vlm_stardust.py — 用 agy VLM 批次讀取星塵1/2/3 卡背招式資訊。
每批 5 張，自動 resume，解析結果後更新 ground_truth.json。
agy 配額不足時 fallback 輸出提示。

用法:
  python batch_vlm_stardust.py
"""
import json, os, sys, re, subprocess, time, shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
GATE = "C:/Users/DRW/.workbuddy/skills/gemini-offload/gemini_gate.py"
PY = "C:/Users/DRW/.workbuddy/binaries/python/versions/3.13.12/python.exe"

# 代別設定：gen -> (cassette, ground_truth_file)
GENERATIONS = {
    "stardust1": ("2", "stardust1.ground_truth.json"),
    "stardust2": ("7", "stardust2.ground_truth.json"),
    "stardust3": ("8", "stardust3.ground_truth.json"),
}

BATCH_SIZE = 2
RESUME_FILE = os.path.join(ROOT, "_vlm_batch_progress.json")
OUTPUT_DIR = os.path.join(ROOT, "_vlm_results")
os.makedirs(OUTPUT_DIR, exist_ok=True)

PROMPT_TEMPLATE = """Read EACH card back image ONE AT A TIME and identify:

For each card:
- moveName: move name in traditional Chinese
- moveType: one of 火/水/草/電/一般/格鬥/毒/地面/飛行/超能力/蟲/岩石/幽靈/龍/惡/鋼/妖精
- moveCategory: 物理/特殊/變化
- ability: ability in Chinese (or null if not visible)
- hasGigantamax: true if gigantamax badge visible
- hasSuperStar: true if super star badge visible

Return ONLY a JSON array like this:
[{"cardId":"...","moveName":null,"moveType":null,"moveCategory":null,"ability":null,"hasGigantamax":false,"hasSuperStar":false}]"""


def call_agy(prompt):
    """Call agy through the gate, return (success, output_text, error_info)."""
    try:
        result = subprocess.run(
            [PY, GATE, "--task", "generic_code", "--prompt", prompt, "--exec"],
            capture_output=True, text=True, timeout=200
        )
        out = result.stdout or ""
        err = result.stderr or ""
        
        # Parse gate JSON output
        try:
            gate_data = json.loads(out)
        except json.JSONDecodeError:
            return False, None, f"gate JSON parse failed: {out[:200]}"
        
        # Check gate decision
        if gate_data.get("decision") == "DENY":
            return False, None, f"gate DENY: {gate_data.get('reason')}"
        
        # Check gemini status
        status = gate_data.get("gemini_status")
        output = gate_data.get("gemini_output")
        
        if status == "DEGRADED_TO_NATIVE":
            return False, None, "QUOTA_EXHAUSTED"
        if status == "UNAVAILABLE":
            return False, None, f"UNAVAILABLE: {output}"
        if status != "OK":
            return False, None, f"gemini_status={status}"
        if not output:
            return False, None, "empty gemini_output"
        
        return True, output, None
        
    except subprocess.TimeoutExpired:
        return False, None, "timeout (200s)"
    except Exception as e:
        return False, None, str(e)


def parse_cards_from_response(text, expected_ids):
    """Parse JSON array from Gemini's response text."""
    # Try to find JSON array in the text
    # Sometimes Gemini wraps in ```json ... ``` blocks
    m = re.search(r'```(?:json)?\s*(\[[\s\S]*?\])\s*```', text)
    if m:
        json_str = m.group(1)
    else:
        # Try direct JSON array parse
        m = re.search(r'(\[[\s\S]*?"cardId"[\s\S]*?\])', text)
        if m:
            json_str = m.group(1)
        else:
            return [], f"no JSON array found in response"
    
    try:
        cards = json.loads(json_str)
        # Validate - get the ones with expected cardIds
        result = {}
        for c in cards:
            cid = c.get("cardId")
            if cid and cid in expected_ids:
                result[cid] = c
        return result, None
    except json.JSONDecodeError as e:
        return [], f"JSON parse error: {e}"


def load_progress():
    if os.path.exists(RESUME_FILE):
        return json.load(open(RESUME_FILE, encoding="utf-8"))
    return {"processed": {}, "failed": []}


def save_progress(progress):
    json.dump(progress, open(RESUME_FILE, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


def update_ground_truth(gen, results):
    """Update ground_truth.json with VLM results."""
    fn = os.path.join(ROOT, GENERATIONS[gen][1])
    gt = json.load(open(fn, encoding="utf-8"))
    updated = 0
    for card in gt["cards"]:
        cid = card["cardId"]
        if cid in results:
            vlm = results[cid]
            changed = False
            for key in ["moveName", "moveType", "moveCategory", "ability", "hasGigantamax", "hasSuperStar"]:
                if key in vlm and vlm[key] is not None:
                    if card.get(key) != vlm[key]:
                        card[key] = vlm[key]
                        changed = True
            # Also handle second move
            for key2 in ["move2Name", "move2Type", "move2Category"]:
                if key2 in vlm and vlm[key2] is not None:
                    if card.get(key2) != vlm[key2]:
                        card[key2] = vlm[key2]
                        changed = True
            if changed:
                card["_meta"] = card.get("_meta", {})
                card["_meta"]["vlm_update"] = "agy_batch_vlm"
                card["_meta"]["vlm_updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%S+08:00")
                updated += 1
    
    json.dump(gt, open(fn, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    return updated


def process_gen(gen, progress):
    cassette, fn = GENERATIONS[gen]
    gt = json.load(open(os.path.join(ROOT, fn), encoding="utf-8"))
    cards = gt["cards"]
    prj_prefix = os.path.join(ROOT, "..", "public", "cards", cassette)
    
    # Build batch list of cards that still need VLM (no moveType)
    pending = []
    for card in cards:
        cid = card["cardId"]
        if card.get("moveType"):  # already has moveType → skip
            continue
        if cid in progress.get("processed", {}):  # already processed in this session
            continue
        if cid in progress.get("failed", []):  # previously failed → retry
            continue
        back_path = os.path.join(prj_prefix, "back", f"{cid}.png")
        if not os.path.exists(back_path):
            print(f"  WARN: {back_path} not found, skipping {cid}")
            continue
        pending.append((cid, back_path))
    
    if not pending:
        print(f"  {gen}: no pending cards to process")
        return True
    
    print(f"\n{'='*60}")
    print(f"{gen}: {len(pending)} cards pending (all need VLM)")
    print(f"{'='*60}")
    
    # Batch
    batches = [pending[i:i+BATCH_SIZE] for i in range(0, len(pending), BATCH_SIZE)]
    print(f"  Batches: {len(batches)} (batch size={BATCH_SIZE})")
    
    all_ok = True
    for bidx, batch in enumerate(batches):
        n = len(batch)
        paths = [bp for _, bp in batch]
        id_set = {cid for cid, _ in batch}
        
        # Build prompt: include card IDs as the path hint
        card_list = "\n".join([f"  {i+1}. {cid}" for i, (cid, _) in enumerate(batch)])
        prompt = f"Read these {n} Pokémon MEZASTAR card back image files. Each file is at one of these paths:\n"
        prompt += "\n".join([f"  {i+1}. {bp}" for i, (_, bp) in enumerate(batch)])
        prompt += f"\n\nCards to identify (filename = cardId):\n{card_list}\n\n"
        prompt += PROMPT_TEMPLATE
        
        print(f"\n  Batch {bidx+1}/{len(batches)} ({n} cards, agy call) ...", end=" ", flush=True)
        
        success, output, error = call_agy(prompt)
        
        if not success:
            if error == "QUOTA_EXHAUSTED":
                print(f"QUOTA EXHAUSTED!")
                print(f"  agy 配額不足！已處理 {len(progress['processed'])} 張，失敗 {len(batches)-bidx} 批。")
                print(f"  剩餘批次將由當前模型（WorkBuddy）處理。")
                all_ok = False
                break
            else:
                print(f"FAIL: {error[:80]}")
                for cid, _ in batch:
                    progress.setdefault("failed", []).append(cid)
                continue
        
        # Parse Gemini output
        result_cards, parse_err = parse_cards_from_response(output, id_set)
        
        if parse_err:
            print(f"PARSE FAIL: {parse_err}")
            # Save raw output for debugging
            debug_fn = os.path.join(OUTPUT_DIR, f"batch_{gen}_{bidx}_raw.txt")
            with open(debug_fn, "w", encoding="utf-8") as f:
                f.write(output)
            for cid, _ in batch:
                progress.setdefault("failed", []).append(cid)
            continue
        
        matched = len(result_cards)
        print(f"OK ({matched}/{n} cards matched)")
        
        # Save parsed results
        batch_fn = os.path.join(OUTPUT_DIR, f"batch_{gen}_{bidx}.json")
        json.dump(result_cards, open(batch_fn, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        
        # Update ground truth
        updated = update_ground_truth(gen, result_cards)
        
        # Mark as processed
        for cid in id_set:
            if cid in result_cards:
                progress.setdefault("processed", {})[cid] = gen
            else:
                progress.setdefault("failed", []).append(cid)
        
        save_progress(progress)
        
        # Brief pause between batches to avoid rate limiting
        if bidx < len(batches) - 1:
            time.sleep(2)
    
    return all_ok


def main():
    print("=== 星塵1/2/3 VLM 批處理（agy）===")
    print(f"Batch size: {BATCH_SIZE}, resume: {RESUME_FILE}")
    print(f"Output: {OUTPUT_DIR}/")
    
    progress = load_progress()
    print(f"Already processed: {len(progress.get('processed', {}))} cards")
    print(f"Previously failed: {len(progress.get('failed', []))} cards")
    
    for gen in ["stardust1", "stardust2", "stardust3"]:
        ok = process_gen(gen, progress)
        if not ok:
            print(f"\n⚠️ {gen}: agy quota exhausted. Processing stopped.")
            break
    
    # Summary
    processed = len(progress.get("processed", {}))
    failed = len(progress.get("failed", []))
    print(f"\n{'='*60}")
    print(f"SUMMARY: processed={processed}, failed={failed}")
    print(f"{'='*60}")
    
    # Show current state of all 3 gens
    for gen in ["stardust1", "stardust2", "stardust3"]:
        fn = os.path.join(ROOT, GENERATIONS[gen][1])
        gt = json.load(open(fn, encoding="utf-8"))
        has_type = sum(1 for c in gt["cards"] if c.get("moveType"))
        has_move = sum(1 for c in gt["cards"] if c.get("moveName"))
        has_ability = sum(1 for c in gt["cards"] if c.get("ability"))
        total = gt["total_cards"]
        print(f"  {gen}: moveType={has_type}/{total}, moveName={has_move}/{total}, ability={has_ability}/{total}")


if __name__ == "__main__":
    main()
