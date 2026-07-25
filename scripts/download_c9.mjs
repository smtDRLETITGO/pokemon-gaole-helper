// download_c9.mjs — 下載 cassette/9 (星塵第4彈) 的正/背圖，並正規化特卡 ID
// 特卡（經典卡匣）：夢幻/蒼響/藏瑪然特 → 對應 ASCII 卡號，避免中文檔名問題
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CASSETTE = '9';
const BACKS = JSON.parse(readFileSync(join(__dirname, '_backs_9.json'), 'utf8'));

const SPECIAL_MAP = { '夢幻': '1-4-071', '蒼響': '1-4-072', '藏瑪然特': '1-4-073' };
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36';

const frontDir = join(ROOT, 'public', 'cards', CASSETTE);
const backDir = join(frontDir, 'back');
mkdirSync(frontDir, { recursive: true });
mkdirSync(backDir, { recursive: true });

const norm = BACKS.map(b => {
  const normId = SPECIAL_MAP[b.id] || b.id;
  return { id: normId, name: b.name, front: b.front, back: b.back };
});

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

async function dl(url, dest){
  if (existsSync(dest)) return 'skip';
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Referer': 'https://www.pokemonmezastar.com.tw/' } });
  if (!res.ok) throw new Error('HTTP '+res.status);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  return 'ok';
}

(async () => {
  let fOk=0, fSkip=0, fFail=0, bOk=0, bSkip=0, bFail=0;
  for (const c of norm) {
    try { const r = await dl(c.front, join(frontDir, `${c.id}.png`)); r==='ok'?fOk++:fSkip++; }
    catch(e){ fFail++; console.error(`front FAIL ${c.id}: ${e.message}`); }
    try { const r = await dl(c.back, join(backDir, `${c.id}.png`)); r==='ok'?bOk++:bSkip++; }
    catch(e){ bFail++; console.error(`back FAIL ${c.id}: ${e.message}`); }
    await sleep(80);
  }
  console.error(`FRONT ok=${fOk} skip=${fSkip} fail=${fFail} | BACK ok=${bOk} skip=${bSkip} fail=${bFail}`);
  writeFileSync(join(__dirname, '_backs_9_norm.json'), JSON.stringify(norm, null, 2));
  console.error(`wrote _backs_9_norm.json (${norm.length} cards)`);
})().catch(e=>{ console.error('ERROR', e); process.exit(1); });
