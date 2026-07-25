#!/usr/bin/env node
// build_stardust4_db.mjs — 合併三源生成星塵第4彈(cassette/9)完整卡牌 DB
//   1. scripts/_backs_9_norm.json     — Nuxt payload (id/name/front/back URL)，特卡已正規化為 1-4-07x
//   2. scripts/_ocr_stardust4_stats.json — easyocr 六維 (76/76=100%)
//   3. scripts/_vlm_stardust4.json    — VLM 讀背面圖：stars/layout/type1/type2/move1*/move2*/hasMove2
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const BACKS = JSON.parse(readFileSync(resolve(ROOT, 'scripts/_backs_9_norm.json'), 'utf-8'));
const STATS = JSON.parse(readFileSync(resolve(ROOT, 'scripts/_ocr_stardust4_stats.json'), 'utf-8'));
const VLM   = JSON.parse(readFileSync(resolve(ROOT, 'scripts/_vlm_stardust4.json'), 'utf-8'));

const backMap = new Map(BACKS.map(b => [b.id, b]));
const statMap = new Map(STATS.map(s => [s.cardId, s]));
const vlmMap  = new Map(VLM.map(v => [v.id, v.parsed]));

const SERIES = '星塵第4彈';
const CASSETTE = '9';
const output = [];
const issues = [];

for (const back of BACKS) {
  const id = back.id;
  const stat = statMap.get(id);
  const v = vlmMap.get(id);
  if (!stat) { issues.push(`NO_STAT ${id}`); continue; }
  if (!v || !v.stars) { issues.push(`NO_VLM ${id}`); continue; }

  const name = back.name;
  const t1 = (v.type1 || '').trim();
  const t2 = (v.type2 || '').trim();
  const layout = (v.layout === 'horizontal') ? 'horizontal' : 'vertical';

  const card = {
    cardId: id,
    diskCode: id,
    name,
    series: SERIES,
    stars: v.stars,
    type1: t1 || '一般',
    type2: t2 || '',
    moveName: v.move1Name || '',
    moveType: v.move1Type || '一般',
    moveCategory: v.move1Category || '物理',
    hp: stat.hp,
    attack: stat.atk,
    defense: stat.def_,
    spAtk: stat.spAtk,
    spDef: stat.spDef,
    speed: stat.spd,
    layout,
    frontPhoto: `/cards/${CASSETTE}/${id}.png`,
    needsStats: false,
  };

  const hasMove2 = v.hasMove2 === true || (v.move2Name && v.move2Name.trim());
  if (hasMove2 && v.move2Name && v.move2Name.trim()) {
    card.move2Name = v.move2Name.trim();
    card.move2Type = (v.move2Type || '').trim() || card.moveType;
    card.move2Category = (v.move2Category || '').trim() || '物理';
  }

  // 欄位完整性檢查
  if (!card.name) issues.push(`NO_NAME ${id}`);
  if (!t1) issues.push(`NO_TYPE1 ${id}`);
  if (!card.moveName) issues.push(`NO_MOVE ${id}`);
  if (!(card.hp>0 && card.attack>0 && card.defense>0 && card.spAtk>0 && card.spDef>0 && card.speed>0))
    issues.push(`ZERO_STAT ${id}`);

  output.push(card);
}

console.log(`Generated ${output.length} cards (expected ${BACKS.length})`);
if (issues.length) console.log('ISSUES:\n' + issues.join('\n'));

const header = `// pokemonDb.cards.stardust4.generated.js — 星塵第4彈 (cassette/9) 完整卡牌資料庫
// ═══════════════════════════════════════════
// 星等/種族屬性/招式/分類/版型/雙招式：背面圖 VLM (OpenRouter 多模態) 逐張讀取
// 六維來源：easyocr 背面圖 OCR (scripts/ocr_back_stats_9.py) — 76/76=100%
// 特卡(經典卡匣)：夢幻/蒼響/藏瑪然特 → 卡號 1-4-071/072/073
// Schema 同 galaxy2：type1/type2=種族屬性；moveName/moveType/moveCategory=第一招；
//   move2Name/move2Type/move2Category=第二招（★5傳說/Special卡才有）

export const STARDUST_4_CARDS = ${JSON.stringify(output, null, 2)};
`;

writeFileSync(resolve(ROOT, 'src/data/pokemonDb.cards.stardust4.generated.js'), header, 'utf-8');
console.log(`→ src/data/pokemonDb.cards.stardust4.generated.js (${output.length} cards)`);

const starDist = {};
for (const c of output) starDist[c.stars] = (starDist[c.stars]||0)+1;
console.log('Star distribution:', starDist);
console.log(`Two-move cards: ${output.filter(c=>c.move2Name).length}`);
console.log(`Dual-type: ${output.filter(c=>c.type2).length} / Single: ${output.filter(c=>!c.type2).length}`);
