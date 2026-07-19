// patch_s4_classic.mjs — 設定星塵4 三張經典卡匣 (1-4-071 夢幻/1-4-072 蒼響/1-4-073 藏瑪然特) 星等。
// 來源：VLM (agy 正面圖 071=6★；gate 072/073=5★)。官網海報未含經典卡匣分區，待海報確認。
import { readFileSync, writeFileSync } from 'fs';
const F = 'src/data/pokemonDb.cards.stardust4.generated.js';
let src = readFileSync(F, 'utf-8');
// extract JSON array
const start = src.indexOf('[');
const end = src.lastIndexOf(']') + 1;
const arr = JSON.parse(src.slice(start, end));
const OVERRIDE = { '1-4-071': 6, '1-4-072': 5, '1-4-073': 5 };
let n = 0;
for (const c of arr) {
  if (c.cardId in OVERRIDE) {
    c.stars = OVERRIDE[c.cardId];
    c._meta = c._meta || {};
    c._meta.stars_source = 'VLM (agy/gate); pending official poster confirmation';
    n++;
  }
}
const header = src.slice(0, start);
writeFileSync(F, header + JSON.stringify(arr, null, 2) + '\n', 'utf-8');
console.log(`patched ${n} classic cards in ${F}`);
const dist = {};
for (const c of arr) { const k = c.category || String(c.stars); dist[k] = (dist[k]||0)+1; }
console.log('star dist:', JSON.stringify(dist));
