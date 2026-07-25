// vlm_c9.mjs — 用 OpenRouter 多模態 API 讀 cassette/9 背面圖，抽取
//   stars / layout / move1(name,type,category) / move2(...) / hasMove2
// 含每張請求逾時 + 增量寫檔（可續跑，重跑會跳過已成功卡）。
// 用法：
//   node scripts/vlm_c9.mjs test 1-4-001 R-1-1
//   node scripts/vlm_c9.mjs all
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BACK_DIR = join(ROOT, 'public', 'cards', '9', 'back');
const NORM = JSON.parse(readFileSync(join(__dirname, '_backs_9_norm.json'), 'utf8'));
const API_KEY = process.env.OPENROUTER_API_KEY;
const OUT_FILE = join(__dirname, '_vlm_stardust4.json');
const MODELS = ['qwen/qwen2.5-vl-72b-instruct:free', 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free'];
const REQ_TIMEOUT = 55000;

const PROMPT = `這是一張寶可夢 MEZASTAR (加傲樂) 卡片的背面圖。請仔細觀察並嚴格以 JSON 格式回覆，不要任何其他文字：
{
  "stars": <整數1-6，數頂部金色橫幅中的★數量>,
  "layout": <"horizontal" 若卡片明顯較寬(橫向), 否則 "vertical">,
  "type1": "<這隻寶可夢的種族屬性1（左側大圖標）：一般/火/水/草/電/冰/格鬥/毒/地面/飛行/超能力/蟲/岩石/幽靈/龍/惡/鋼/妖精>",
  "type2": "<種族屬性2，無則空字串>",
  "move1Name": "<第一招式中文名>",
  "move1Type": "<第一招式屬性：一般/火/水/草/電/冰/格鬥/毒/地面/飛行/超能力/蟲/岩石/幽靈/龍/惡/鋼/妖精>",
  "move1Category": "<物理 或 特殊（D圖示=物理，X圖示=特殊）>",
  "hasMove2": <true 若還有第二招式, 否則 false>,
  "move2Name": "<第二招式中文名，無則空字串>",
  "move2Type": "<第二招式屬性，無則空字串>",
  "move2Category": "<物理 或 特殊，無則空字串>"
}`;

function b64(path){ return readFileSync(path).toString('base64'); }
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

async function callVLM(model, id){
  const imgPath = join(BACK_DIR, `${id}.png`);
  if (!existsSync(imgPath)) return { id, error: 'no_image' };
  const dataUrl = `data:image/png;base64,${b64(imgPath)}`;
  const body = JSON.stringify({
    model,
    messages: [{ role:'user', content:[
      { type:'text', text: PROMPT },
      { type:'image_url', image_url:{ url: dataUrl } }
    ]}],
    max_tokens: 400,
    temperature: 0
  });
  const ctrl = new AbortController();
  const t = setTimeout(()=>ctrl.abort(), REQ_TIMEOUT);
  let res;
  try {
    res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${API_KEY}`,
        'HTTP-Referer':'https://smtDRLETITGO.github.io/pokemon-gaole-helper/', 'X-Title':'MEZASTAR Back Reader' },
      body, signal: ctrl.signal
    });
  } finally { clearTimeout(t); }
  if (!res.ok) return { id, error: `HTTP ${res.status}` };
  const j = await res.json();
  const text = j.choices?.[0]?.message?.content || '';
  const m = text.match(/\{[\s\S]*\}/);
  let parsed = null;
  if (m){ try { parsed = JSON.parse(m[0]); } catch(e){ parsed = { raw: text }; } }
  return { id, model, parsed, raw: text };
}

async function tryModels(id){
  for (const model of MODELS){
    try {
      const r = await callVLM(model, id);
      if (r.parsed && r.parsed.stars) return r;
    } catch(e){ /* try next */ }
    await sleep(400);
  }
  return { id, error: 'all_models_failed' };
}

function loadDone(){
  if (existsSync(OUT_FILE)){
    try { return new Map(JSON.parse(readFileSync(OUT_FILE,'utf8')).map(r=>[r.id,r])); }
    catch(e){ return new Map(); }
  }
  return new Map();
}
function saveAll(results){
  writeFileSync(OUT_FILE, JSON.stringify([...results.values()], null, 2));
}

(async () => {
  const mode = process.argv[2] || 'test';
  const ids = mode === 'all' ? NORM.map(c=>c.id) : process.argv.slice(3);
  const done = loadDone();
  const out = done;
  let n=0;
  for (const id of ids){
    if (out.has(id) && out.get(id).parsed && out.get(id).parsed.stars){
      process.stderr.write(`skip ${id} (done)\n`);
      continue;
    }
    process.stderr.write(`reading ${id} [${++n}/${ids.length}]...\n`);
    const r = await tryModels(id);
    out.set(id, r);
    console.log(`${id}: ${JSON.stringify(r.parsed || { error: r.error })}`);
    if (mode === 'all' && n % 5 === 0) saveAll(out);
    await sleep(700);
  }
  saveAll(out);
  process.stderr.write(`done. total=${out.size}\n`);
})().catch(e=>{ console.error('FATAL', e); process.exit(1); });
