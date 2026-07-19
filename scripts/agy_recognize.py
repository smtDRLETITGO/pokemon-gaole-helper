#!/usr/bin/env python3
"""
AGY/Gemini VLM MEZASTAR Card Recognition Pipeline v2
=======================================================
Two-pass per card: FRONT (stars/name/types/hp/layout) + BACK (6stats/moves).
Proven accurate on 2-2-004 and 2-2-029.

Usage:
  python scripts/agy_recognize.py              # batch all 73 cards (resume-friendly)
  python scripts/agy_recognize.py --card 2-2-001  # single card debug
  python scripts/agy_recognize.py --merge        # merge → ground_truth.json
  python scripts/agy_recognize.py --validate     # check distribution sanity
"""

import json, subprocess, sys, os, time, argparse, tempfile, base64, urllib.request, urllib.error
from pathlib import Path
from datetime import datetime
from PIL import Image

# --- Config ---
PROJECT = Path(__file__).resolve().parent.parent
FRONT_DIR = PROJECT / "public" / "cards" / "11_small"   # small front png (~250KB) — avoids AGY timeout on full-res
BACK_DIR  = PROJECT / "public" / "cards" / "11_small"
RESULTS_DIR   = PROJECT / "scripts" / "_agy_results"
GATE      = Path(r"C:\Users\DRW\.workbuddy\skills\gemini-offload\gemini_gate.py")
PYTHON    = Path(r"C:\Users\DRW\.workbuddy\binaries\python\versions\3.13.12\python.exe")

# --- OpenRouter fallback (Gemma 4 31B, multimodal) ---
# Key loaded from .env (gitignored) → env OPENROUTER_API_KEY.
# Model defaults to the FREE tier; set OPENROUTER_MODEL to the paid slug if needed.
OPENROUTER_KEY   = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.environ.get("OPENROUTER_MODEL", "google/gemma-4-31b-it:free")
OPENROUTER_URL   = "https://openrouter.ai/api/v1/chat/completions"

CARD_IDS = [
    "2-2-001","2-2-002","2-2-003","2-2-004","2-2-005","2-2-006","2-2-007","2-2-008","2-2-009","2-2-010",
    "2-2-011","2-2-012","2-2-013","2-2-014","2-2-015","2-2-016","2-2-017","2-2-018","2-2-019","2-2-020",
    "2-2-021","2-2-022","2-2-023","2-2-024","2-2-025","2-2-026","2-2-027","2-2-028","2-2-029","2-2-030",
    "2-2-031","2-2-032","2-2-033","2-2-034","2-2-035","2-2-036","2-2-037","2-2-038","2-2-039","2-2-040",
    "2-2-041","2-2-042","2-2-043","2-2-044","2-2-045","2-2-046","2-2-047","2-2-048","2-2-049","2-2-050",
    "2-2-051","2-2-052","2-2-053","2-2-054","2-2-055","2-2-056","2-2-057","2-2-058","2-2-059","2-2-060",
    "2-2-061","2-2-062","2-2-063","2-2-064","2-2-065","2-2-066","2-2-067","2-2-068","2-2-069","2-2-070",
    "R-2-1","R-2-2","R-2-3",
]

# Type reference: MEZASTAR uses 18 types with unique icons
# 一般/格鬥/毒/地面/飛行/蟲/岩石/幽靈/鋼/火/水/電/草/冰/超能力/龍/惡/妖精
TYPE_REF = """MEZASTAR屬性圖示對照表（共18種）：
一般(灰白圓) 格鬥(紅紫拳) 毒(紫色骷髏) 地面(棕波) 飛行(藍翼F) 蟲(綠蟲) 岩石(黃石) 幽靈(鬼臉) 鋼(青圈) 火(火焰) 水(水滴) 電(黃閃) 草(綠葉) 冰(雪花) 超能力(粉眼) 龍(金冠) 惡(紅眼) 妖精(粉X)
卡片上的type1/type2請根據這些圖示的顏色和形狀辨識。"""

FRONT_PROMPT = '''你是一位MEZASTAR寶可夢卡片的專業辨識員。請仔細觀察卡片正面圖（{img_ref}），辨識以下所有欄位並回傳嚴格JSON：

{type_ref}

必須辨識的欄位：
1. cardId: 卡片編號（格式如 2-2-XXX 或 R-2-X）
2. name: 寶可夢名稱（繁體中文）
3. stars: 左下角金色★數量（1-6顆，仔細數）
4. type1: 第一屬性（從上面18種中選，看卡片底部或側邊的屬性圖示顏色+形狀）
5. type2: 第二屬性（如果沒有雙屬性則填 null）
6. hp_front: 正面顯示的HP數值（寶可能量/能量成本，通常是三位數如150）
7. layout: "horizontal"（橫式）或 "vertical"（直式）
8. hasSuperStar: 是否有「超級明星」文字標記（true/false）
9. hasGigantamax: 是否有極巨化(Gigantamax)符號（true/false）

回傳格式：{{"cardId":"?","name":"?","stars":?,"type1":"?","type2":?,"hp_front":?,"layout":"?","hasSuperStar":?,"hasGigantamax":?}}
只輸出JSON，不要其他文字。不確定的欄位標註 null。'''

BACK_PROMPT = '''你是一位MEZASTAR寶可夢卡片的專業辨識員。請仔細觀察卡片背面圖（{img_ref}），辨識以下欄位並回傳嚴格JSON：

必須辨識的欄位：
1. hp: HP六維中的HP值
2. attack: 攻擊值
3. defense: 防禦值
4. spAtk: 特攻值
5. spDef: 特防值
6. speed: 速度值
7. moveName: 第一招式名稱
8. moveType: 第一招式屬性（從18種MEZASTAR屬性中選：一般/格鬥/毒/地面/飛行/蟲/岩石/幽靈/鋼/火/水/電/草/冰/超能力/龍/惡/妖精）
9. moveCategory: 招式分類（"D"=物理/"X"=特殊/"S"=狀態）
10. move2Name: 第二招式名稱（如果沒有則 null）
11. move2Type: 第二招式屬性（如果沒有則 null）
12. move2Category: 第二招式分類（如果沒有則 null）

回傳格式：{{"hp":?,"attack":?,"defense":?,"spAtk":?,"spDef":?,"speed":?,"moveName":"?","moveType":"?","moveCategory":"?","move2Name":?,"move2Type":?,"move2Category":"?"}}
只輸出JSON，不要其他文字。'''

RATE_LIMIT = 5  # seconds between calls (gentler on AGY backend)
MAX_RETRIES = 3


def prep_image(src: Path, max_side: int = 1024) -> Path:
    """Downscale image to max_side px (longest edge) and return a temp PNG path.
    Keeps AGY payload small + fast. Returns src unchanged if already small."""
    try:
        im = Image.open(src)
        w, h = im.size
        if max(w, h) <= max_side:
            return src
        scale = max_side / max(w, h)
        im = im.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
        tmp = Path(tempfile.gettempdir()) / f"agy_{src.stem}.png"
        im.save(tmp, "PNG")
        return tmp
    except Exception:
        return src


def call_agy(prompt: str, timeout: int = 150) -> dict:
    """Call AGY Gate, return parsed result."""
    cmd = [str(PYTHON), str(GATE), "--task", "generic_code", "--prompt", prompt, "--exec"]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, cwd=str(PROJECT))
        out = r.stdout.strip()
        if not out:
            return {"ok": False, "err": "empty_output"}
        resp = json.loads(out)
        if resp.get("decision") != "ALLOW":
            return {"ok": False, "err": f"blocked:{resp.get('reason')}"}
        text = resp.get("gemini_output", "").strip()
        if not text or "Error:" in text:
            return {"ok": False, "err": f"no_output or error: {text[:200]}"}
        # Strip markdown code blocks
        if "```json" in text: text = text.split("```json")[1].split("```")[0]
        elif "```" in text: text = text.split("```")[1].split("```")[0]
        # Find JSON
        s = text.find("{"); e = text.rfind("}") + 1
        if s < 0 or e <= s:
            return {"ok": False, "err": "no_json", "raw": text[:300]}
        data = json.loads(text[s:e])
        return {"ok": True, "data": data, "model": resp.get("models_tried", ["?"])[0] if isinstance(resp.get("models_tried"), list) else "?"}
    except subprocess.TimeoutExpired:
        return {"ok": False, "err": "timeout"}
    except Exception as ex:
        return {"ok": False, "err": str(ex)}


def build_front_prompt(img_ref: str) -> str:
    return FRONT_PROMPT.format(img_ref=img_ref, type_ref=TYPE_REF)

def build_back_prompt(img_ref: str) -> str:
    return BACK_PROMPT.format(img_ref=img_ref)


def call_openrouter(prompt: str, image_path: Path, timeout: int = 180) -> dict:
    """Fallback VLM via OpenRouter (Gemma 4 31B, multimodal).
    Reads the local image and base64-embeds it (OpenRouter cannot access local FS).
    Retries on transient upstream 429/5xx so the FREE tier's rate-limit blips don't fail a card."""
    if not OPENROUTER_KEY:
        return {"ok": False, "err": "no_openrouter_key"}
    try:
        with open(image_path, "rb") as fh:
            b64 = base64.b64encode(fh.read()).decode("ascii")
    except Exception as ex:
        return {"ok": False, "err": f"read_img: {ex}"}
    mime = "image/png" if image_path.suffix.lower() == ".png" else "image/jpeg"
    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}}
            ]
        }],
        "max_tokens": 1024,
        "temperature": 0.0,
    }
    req = urllib.request.Request(
        OPENROUTER_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {OPENROUTER_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://pokemon-gaole-helper.local",
            "X-Title": "MEZASTAR Recognizer",
        },
        method="POST",
    )
    last_err = "unknown"
    for attempt in range(3):  # 1 try + 2 retries on transient errors
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                out = json.loads(resp.read().decode("utf-8"))
            text = out["choices"][0]["message"]["content"].strip()
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            elif "```" in text:
                text = text.split("```")[1].split("```")[0]
            s = text.find("{"); e = text.rfind("}") + 1
            if s < 0 or e <= s:
                return {"ok": False, "err": "no_json", "raw": text[:300]}
            data = json.loads(text[s:e])
            return {"ok": True, "data": data, "model": OPENROUTER_MODEL}
        except urllib.error.HTTPError as he:
            last_err = f"http_{he.code}: {he.read().decode('utf-8','ignore')[:160]}"
            if he.code in (429, 500, 502, 503) and attempt < 2:
                time.sleep(8 * (attempt + 1))
                continue
            return {"ok": False, "err": last_err}
        except Exception as ex:
            last_err = str(ex)[:160]
            if attempt < 2:
                time.sleep(5)
                continue
            return {"ok": False, "err": last_err}
    return {"ok": False, "err": last_err}


def _recognize(agy_prompt: str, or_prompt: str, img_path: Path) -> dict:
    """Primary: AGY/Gemini Flash. On exhaustion, fall back to OpenRouter Gemma."""
    last = {"ok": False, "err": "unknown"}
    for attempt in range(MAX_RETRIES + 1):
        r = call_agy(agy_prompt)
        if r.get("ok"):
            return r
        last = r
        if attempt < MAX_RETRIES:
            time.sleep(3)
    if OPENROUTER_KEY:
        print(" [→Gemma]", end="", flush=True)
        r = call_openrouter(or_prompt, img_path)
        if r.get("ok"):
            r["fallback"] = True
            return r
        last = r
    return last


def process_one(cid: str, force: bool = False) -> dict:
    """Process single card: front + back → save merged result.
    AGY (Gemini Flash) is primary; OpenRouter Gemma 4 31B is auto-fallback on AGY failure."""
    rf = RESULTS_DIR / f"{cid}.json"
    if rf.exists() and not force:
        try:
            d = json.loads(rf.read_text(encoding="utf-8"))
            if d.get("ok"):
                return d
        except Exception:
            pass

    fp = prep_image(FRONT_DIR / f"{cid}.png")
    bp = prep_image(BACK_DIR  / f"{cid}.jpg")

    result = {"cardId": cid, "timestamp": datetime.now().isoformat()}

    # Pass 1: Front image (AGY → Gemma fallback)
    print(f"  {cid} F...", end="", flush=True)
    fres = _recognize(build_front_prompt(str(fp)), build_front_prompt("the attached card front image"), fp)
    if fres.get("ok"):
        result["front"] = fres["data"]
        result["front_model"] = fres["model"]
        result["front_fallback"] = fres.get("fallback", False)
    else:
        result["front"] = None
        result["front_err"] = fres.get("err", "?")
        print(f"[FRONT_FAIL:{fres.get('err','?')[:30]}]", end="", flush=True)

    time.sleep(RATE_LIMIT)

    # Pass 2: Back image (AGY → Gemma fallback)
    print(" B...", end="", flush=True)
    bres = _recognize(build_back_prompt(str(bp)), build_back_prompt("the attached card back image"), bp)
    if bres.get("ok"):
        result["back"] = bres["data"]
        result["back_model"] = bres["model"]
        result["back_fallback"] = bres.get("fallback", False)
    else:
        result["back"] = None
        result["back_err"] = bres.get("err", "?")
        print(f"[BACK_FAIL:{bres.get('err','?')[:30]}]", end="", flush=True)

    result["ok"] = result.get("front") is not None and result.get("back") is not None

    rf.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    status = "OK" if result["ok"] else "PARTIAL"
    stars = result.get("front", {}).get("stars", "?")
    name  = result.get("front", {}).get("name", "?")
    tag = " (Gemma)" if (result.get("front_fallback") or result.get("back_fallback")) else ""
    print(f" {status} {stars}★ {name}{tag}")

    return result


def merge_to_gt() -> dict:
    """Merge _agy_results/*.json → galaxy2.ground_truth.json"""
    cards, errs = [], []
    for cid in CARD_IDS:
        rf = RESULTS_DIR / f"{cid}.json"
        if not rf.exists():
            errs.append(cid); continue
        raw = json.loads(rf.read_text(encoding="utf-8"))
        if not raw.get("front") or not raw.get("back"):
            errs.append(cid); continue
        
        f = raw["front"]
        b = raw["back"]
        
        card = {
            "cardId": cid,
            "diskCode": cid,
            "name": f.get("name"),
            "series": "銀河第二彈",
            "stars": f.get("stars"),
            "type1": f.get("type1"),
            "type2": f.get("type2") or None,
            "moveName": b.get("moveName"),
            "moveType": b.get("moveType"),
            "moveCategory": b.get("moveCategory"),
            "move2Name": b.get("move2Name") or None,
            "move2Type": b.get("move2Type") or None,
            "move2Category": b.get("move2Category") or None,
            "hp": b.get("hp"),           # six-stat HP from back
            "attack": b.get("attack"),
            "defense": b.get("defense"),
            "spAtk": b.get("spAtk"),
            "spDef": b.get("spDef"),
            "speed": b.get("speed"),
            "layout": f.get("layout"),
            "frontPhoto": f"/cards/11/{cid}.png",
            "needsStats": False,
            "_meta": {
                "source": "agy_gemini_vlm_v2",
                "front_model": raw.get("front_model"),
                "back_model": raw.get("back_model"),
                "front_fallback": raw.get("front_fallback"),
                "back_fallback": raw.get("back_fallback"),
                "timestamp": raw.get("timestamp"),
                "hp_front": f.get("hp_front"),       # front display HP (energy cost)
                "hasSuperStar": f.get("hasSuperStar"),
                "hasGigantamax": f.get("hasGigantamax"),
            },
        }
        cards.append(card)
    
    gt = {
        "_generated_at": datetime.now().isoformat(),
        "generation": "galaxy2", "cassette": 11,
        "source": "AGY/Gemini VLM v2 (two-pass: front+back)",
        "total_cards": len(cards), "errors": errs, "cards": cards,
    }
    
    outfile = PROJECT / "scripts" / "galaxy2.ground_truth.json"
    outfile.write_text(json.dumps(gt, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nMerged: {len(cards)} OK, {len(errors)} errors → {outfile.name}" if 'errors' in dir() else f"\nMerged: {len(cards)} OK, {len(errs)} errors → {outfile.name}")
    if errs: print(f"  Errors: {errs}")
    return gt


def validate(gt: dict):
    c = gt.get("cards", [])
    sc = {}
    special = 0
    for x in c:
        if x.get("category") == "special":
            special += 1; continue
        s = x.get("stars"); sc[s] = sc.get(s, 0) + 1
    print("\n=== Star Distribution (non-special) ===")
    for s in sorted(sc.keys()):
        print(f"  {s}★: {sc[s]:3d}  {'█'*sc[s]}")
    if special:
        print(f"  SPECIAL: {special:3d}  (非星等，精選卡匣)")
    has_6 = sc.get(6,0)>0
    if not has_6:
        print("  ⚠️ No 6★ — suspicious!")
    else:
        print(f"  ✓ Has 6★({sc.get(6,0)})")
    nulls = {}
    for x in c:
        for k in ["stars","name","type1","hp"]:
            if x.get(k) is None: nulls[k] = nulls.get(k,0)+1
    if nulls: print(f"  ⚠️ Nulls: {nulls}")
    else: print(f"  ✓ All core fields populated ({len(c)} cards)")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--card", help="Single card ID")
    p.add_argument("--force", action="store_true")
    p.add_argument("--merge", action="store_true")
    p.add_argument("--validate", action="store_true")
    args = p.parse_args()
    
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    
    if args.validate:
        validate(json.loads((PROJECT/"scripts"/"galaxy2.ground_truth.json").read_text(encoding="utf-8"))); return
    if args.merge:
        gt = merge_to_gt(); validate(gt); return
    if args.card:
        r = process_one(args.card, force=args.force); print(json.dumps(r, ensure_ascii=False, indent=2)); return
    
    # Batch
    def _is_done(cid):
        rf = RESULTS_DIR/f"{cid}.json"
        if not rf.exists(): return False
        try: return json.loads(rf.read_text(encoding="utf-8")).get("ok")
        except Exception: return False
    remaining = [c for c in CARD_IDS if not _is_done(c)]
    done = len(CARD_IDS)-len(remaining)
    targets = CARD_IDS if args.force else remaining
    print(f"AGY v2 Pipeline: {len(CARD_IDS)} total, {done} done, {len(targets)} to process\n")
    
    ok=0; fail=0
    for i,cid in enumerate(targets):
        print(f"[{i+1}/{len(targets)}]", end="")
        r = process_one(cid, force=args.force)
        ok += 1 if r.get("ok") else 0
        fail += 1 if not r.get("ok") else 0
        time.sleep(RATE_LIMIT)
    
    print(f"\n=== Done: {ok} OK, {fail} partial/fail ===")
    if ok>0: merge_to_gt()


if __name__ == "__main__":
    main()
