// merge_cv_stars.mjs — 將 OpenCV skeleton 星等計數結果合併進 generated DB
// 用法: node scripts/merge_cv_stars.mjs
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CV_JSON = join(ROOT, 'scripts', '_cv_stars.json');
const DB_JS = join(ROOT, 'src', 'data', 'pokemonDb.cards.generated.js');

// 1. 讀取 CV 結果
const cvResults = JSON.parse(readFileSync(CV_JSON, 'utf-8'));
const cvMap = {};
for (const r of cvResults) {
    cvMap[r.cardId] = r;
}

// 2. 讀取現有 DB
const dbSrc = readFileSync(DB_JS, 'utf-8');
const match = dbSrc.match(/export\s+const\s+PRESET_POKEMON_DB\s*=\s*(\[[\s\S]*\]);?\s*$/);
if (!match) { console.error('Cannot parse PRESET_POKEMON_DB'); process.exit(1); }
const db = new Function('return ' + match[1].replace(/,(\s*\])/g, '$1').replace(/\/\/[^\n]*/g, ''))();

// 3. 合併星等
let updated = 0;
let skipped = 0;
let unchanged = 0;

for (const card of db) {
    const cv = cvMap[card.cardId];
    if (!cv) { skipped++; continue; }
    if (cv.stars < 1 || cv.stars > 6) { skipped++; continue; }
    if (cv.confidence < 0.5) { skipped++; continue; }
    
    if (card.stars === cv.stars) { unchanged++; continue; }
    
    console.log(`  [update] ${card.cardId} ${card.name}: ${card.stars}★ → ${cv.stars}★ (${cv.method})`);
    card.stars = cv.stars;
    updated++;
}

// 4. 寫回
const output = `// pokemonDb.cards.generated.js — 由 scripts/merge_cv_stars.mjs 自動產生\n` +
    `// 星等來源：OpenCV skeleton 分析 (scripts/count_stars_cv.py)\n` +
    `// ⚠️ 六維數值(hp/attack/defense/spAtk/spDef/speed)仍來自舊 DB，需以實卡背面 OCR 校正\n` +
    `// ⚠️ 以下卡片的星等為舊值或預設（CV 未成功偵測，需手動/VLM 校正）：\n` +
    db.filter(c => !cvMap[c.cardId] || cvMap[c.cardId].stars < 1 || cvMap[c.cardId].confidence < 0.5)
     .map(c => `//   - ${c.cardId}: ${c.stars}★`).join('\n') + '\n' +
    `\nexport const PRESET_POKEMON_DB = ${JSON.stringify(db, null, 2)};\n`;

writeFileSync(DB_JS, output, 'utf-8');

console.log(`\n✓ Updated: ${updated}, Unchanged: ${unchanged}, Skipped: ${skipped}`);
console.log(`Total cards: ${db.length}`);
console.log(`Written to ${DB_JS}`);

// 統計
const dist = {};
for (const c of db) { dist[c.stars] = (dist[c.stars] || 0) + 1; }
console.log('\nStar distribution:');
for (const s of Object.keys(dist).sort((a,b)=>a-b)) {
    console.log(`  ${s}★: ${dist[s]} cards`);
}
