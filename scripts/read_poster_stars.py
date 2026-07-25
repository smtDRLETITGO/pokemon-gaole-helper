#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
read_poster_stars.py — Read star grades from official MEZASTAR catalog posters
via AGY/Gemini VLM (routed through gemini_gate.py as generic_code).

The official PDFs are image-only posters grouped by star band
(超級明星 / 明星 / ★★★ / ★★ / ★). Each card shows its ID (e.g. 1-4-001, R-2-1)
in the lower-left. We ask the VLM to map every card ID -> star grade.

Usage:
  python scripts/read_poster_stars.py --gen stardust4 [--max-side 1700] [--force]
  python scripts/read_poster_stars.py --gen galaxy1 --max-side 2000
"""
import json, subprocess, sys, os, time, argparse
from pathlib import Path
from PIL import Image

PROJECT = Path(__file__).resolve().parent.parent
POSTER_DIR = PROJECT / "scripts" / "_posters"
GATE = Path(r"C:\Users\DRW\.workbuddy\skills\gemini-offload\gemini_gate.py")
PYTHON = Path(r"C:\Users\DRW\.workbuddy\binaries\python\versions\3.13.12\python.exe")
RESULTS_DIR = PROJECT / "scripts" / "_poster_stars"
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

PROMPT = '''這是MEZASTAR寶可夢卡牌一覽海報（{gen}）。卡片按「星等」分區排列，分區標題通常為：超級明星 / 明星 / ★★★ / ★★ / ★（也可能標示具體星數）。每張卡片左下角有編號（格式如 1-4-001 或 R-2-1）。

請仔細閱讀圖中每一張卡片的編號，並依據它所在的星等分區標題判斷星等，回傳JSON陣列：
[{{"id":"1-4-001","stars":6}}, {{"id":"R-2-1","stars":"SPECIAL"}}, ...]
- stars 為 1~6 的整數；若該卡屬「超級明星」精選卡匣（非普通星等），stars 填字串 "SPECIAL"。
- 請務必列出圖中「所有」卡片，不要遺漏；同一張卡只列一次。
- 只輸出JSON陣列，不要其他文字。不確定的編號標註 "?"。'''


def prep_image(src: Path, max_side: int) -> Path:
    try:
        im = Image.open(src)
        w, h = im.size
        if max(w, h) <= max_side:
            return src
        scale = max_side / max(w, h)
        im = im.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
        tmp = Path(tempfile_getdir()) / f"poster_{src.stem}_{max_side}.png"
        im.save(tmp, "PNG")
        return tmp
    except Exception as ex:
        print(f"  [prep_err {ex}]")
        return src


def call_agy(prompt: str, timeout: int = 180) -> dict:
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
            return {"ok": False, "err": f"no_output:{text[:200]}"}
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]
        s = text.find("["); e = text.rfind("]") + 1
        if s < 0 or e <= s:
            s = text.find("{"); e = text.rfind("}") + 1
        if s < 0 or e <= s:
            return {"ok": False, "err": "no_json", "raw": text[:400]}
        data = json.loads(text[s:e])
        return {"ok": True, "data": data, "model": (resp.get("models_tried") or ["?"])[0]}
    except subprocess.TimeoutExpired:
        return {"ok": False, "err": "timeout"}
    except Exception as ex:
        return {"ok": False, "err": str(ex)[:200]}


def tempfile_getdir():
    import tempfile
    d = PROJECT / "scripts" / "_posters" / "_tmp"
    d.mkdir(parents=True, exist_ok=True)
    return str(d)


def read_gen(gen: str, max_side: int, force: bool) -> dict:
    rf = RESULTS_DIR / f"{gen}.json"
    if rf.exists() and not force:
        try:
            d = json.loads(rf.read_text(encoding="utf-8"))
            if d.get("ok"):
                print(f"  [{gen}] cached ({len(d.get('data',[]))} entries)"); return d
        except Exception:
            pass

    poster = POSTER_DIR / f"{gen}_p0.png"
    if not poster.exists():
        # try any page
        cands = sorted(POSTER_DIR.glob(f"{gen}_p*.png"))
        if not cands:
            return {"ok": False, "err": f"no poster for {gen}"}
        poster = cands[0]

    print(f"  [{gen}] poster={poster.name} ({max_side}px max) -> agy...")
    pp = prep_image(poster, max_side)
    prompt = PROMPT.format(gen=gen, img=rf"file:///{pp}")
    # agy reads image from path referenced in prompt
    prompt = PROMPT.format(gen=gen) + f"\n圖片路徑：{pp}"
    res = call_agy(prompt)
    if res.get("ok"):
        out = {"ok": True, "gen": gen, "model": res.get("model"),
               "poster": str(poster), "data": res["data"],
               "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S")}
        rf.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  [{gen}] OK {len(res['data'])} entries via {res.get('model')}")
    else:
        print(f"  [{gen}] FAIL {res.get('err')}")
        out = {"ok": False, "gen": gen, "err": res.get("err"),
               "raw": res.get("raw", "")}
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--gen", required=True, help="generation key (stardust1..4, galaxy1)")
    ap.add_argument("--max-side", type=int, default=1700)
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()
    r = read_gen(args.gen, args.max_side, args.force)
    if r.get("ok"):
        # quick distribution
        dist = {}
        special = 0
        for x in r["data"]:
            s = x.get("stars")
            if s == "SPECIAL":
                special += 1; continue
            try:
                s = int(s)
                dist[s] = dist.get(s, 0) + 1
            except Exception:
                dist.setdefault("?", 0); dist["?"] += 1
        print("  Distribution:", {k: dist[k] for k in sorted([x for x in dist if isinstance(x, int)], key=lambda z: -z)} if dist else dist,
              f"| SPECIAL={special}")
        print(json.dumps(r["data"], ensure_ascii=False)[:1200])
    else:
        print("RESULT:", json.dumps(r, ensure_ascii=False)[:500])


if __name__ == "__main__":
    main()
