// merge_ocr_stats.mjs — 將 easyocr 六維數值結果合併進 generated DB
// 用法: node scripts/merge_ocr_stats.mjs
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OCR_JSON = join(ROOT, 'scripts', '_ocr_stats.json');
const DB_JS = join(ROOT, 'src', 'data', 'pokemonDb.cards.generated.js');

// 1. 讀取 OCR 結果
const ocrResults = JSON.parse(readFileSync(OCR_JSON, 'utf-8'));
const ocrMap = {};
for (const r of ocrResults) {
    if (r.error) continue; // 跳過失敗的
    ocrMap[r.cardId] = r;
}

console.log(`OCR 結果: ${ocrResults.length} 筆, 成功 ${Object.keys(ocrMap).length} 筆`);

// 2. 讀取現有 DB
const dbSrc = readFileSync(DB_JS, 'utf-8');
const match = dbSrc.match(/export\s+const\s+PRESET_POKEMON_DB\s*=\s*(\[[\s\S]*\]);?\s*$/);
if (!match) { console.error('Cannot parse PRESET_POKEMON_DB'); process.exit(1); }
const db = new Function('return ' + match[1].replace(/,(\s*\])/g, '$1').replace(/\/\/[^\n]*/g, ''))();

// 3. 合併六維數值
// 欄位對應: hp→hp, atk→attack, def_→defense, spAtk→spAtk, spDef→spDef, spd→speed
const FIELD_MAP = {
    'hp': 'hp',
    'atk': 'attack',
    'def_': 'defense',
    'spAtk': 'spAtk',
    'spDef': 'spDef',
    'spd': 'speed'
};

let updated = 0;
let skipped = 0;
let unchanged = 0;

for (const card of db) {
    const ocr = ocrMap[card.cardId];
    if (!ocr) { skipped++; continue; }

    let cardUpdated = false;
    for (const [ocrKey, dbKey] of Object.entries(FIELD_MAP)) {
        if (ocr[ocrKey] === undefined) continue;
        const newVal = ocr[ocrKey];
        const oldVal = card[dbKey];

        // 檢查是否需要更新（跳過 0 和 undefined/null）
        if (newVal === oldVal) continue;
        if (oldVal === undefined || oldVal === null || oldVal === 0) {
            console.log(`  [set] ${card.cardId} ${card.name}: ${dbKey}=${oldVal} → ${newVal}`);
        } else {
            console.log(`  [fix] ${card.cardId} ${card.name}: ${dbKey}=${oldVal} → ${newVal} ⚠️`);
        }

        card[dbKey] = newVal;
        cardUpdated = true;
    }

    if (cardUpdated) updated++;
    else unchanged++;
}

// 4. 寫回（保留原有 header 註解，更新六維來源說明）
const missingStatsCards = db.filter(c => !ocrMap[c.cardId])
    .map(c => `//   - ${c.cardId}: ${c.name}`);

const output = `// pokemonDb.cards.generated.js — 由合併腳本自動產生\n` +
    `// 星等來源：OpenCV skeleton 分析 + 視覺校正 (scripts/count_stars_cv.py)\n` +
    `// 六維數值來源：easyocr 背面圖 OCR (scripts/ocr_back_stats.py) — 官網背面圖權威資料\n` +
    (missingStatsCards.length ? `// ⚠️ 以下卡片缺少 OCR 六維數值（需手動校正）：\n` + missingStatsCards.map(c => c).join('\n') + '\n' : '') +
    `\nexport const PRESET_POKEMON_DB = ${JSON.stringify(db, null, 2)};\n`;

writeFileSync(DB_JS, output, 'utf-8');

console.log(`\n✓ Updated: ${updated}, Unchanged: ${unchanged}, Skipped (no OCR): ${skipped}`);
console.log(`Total cards: ${db.length}`);
console.log(`Written to ${DB_JS}`);
