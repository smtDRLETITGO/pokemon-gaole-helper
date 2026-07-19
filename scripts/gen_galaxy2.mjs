// gen_galaxy2.mjs — 從 ground-truth JSON 重新生成銀河2 資料檔
// ⚠️ 本檔產出的 src/data/pokemonDb.cards.generated.js 是「生成物」，請勿直接手改。
//    要改資料 → 改 scripts/galaxy2.ground_truth.json → 重跑本腳本。
//    舊 DB 自動辨識初值已廢棄，一切以掃描圖萃取真值為準。
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const gt = JSON.parse(readFileSync(resolve(__dirname, 'galaxy2.ground_truth.json'), 'utf-8'));
const cards = gt.cards;

const header = `// pokemonDb.cards.generated.js — 銀河第二彈 (cassette/11) 自動生成檔
// ════════════════════════════════════════════════════════════════
// ⚠️ 本檔由 scripts/gen_galaxy2.mjs 從 scripts/galaxy2.ground_truth.json
//    重新生成。「請勿直接手改本檔」——改資料請改 ground-truth JSON 後重跑生成器。
// 資料來源（全部來自掃描圖，非舊 DB 自動初值）：
//   cardId/name : 官網 cassette/11 列表頁 <p>ID NAME</p> 文字
//   stars       : 背面圖 ★ 數「人工逐一目視」確認 (2026-07-17, 73/73)
//   hp~speed    : 背面圖 easyocr OCR (73/73)
//   type*/move* : 背面圖 VLM 直接讀取 + 玩家參考表交叉驗證
//   ability     : PokeAPI 按物種查特性 zh-hant (確定性來源，非 OCR/VLM)
// ════════════════════════════════════════════════════════════════
// Schema: moveName/moveType/moveCategory = 第一招式；move2* = 第二招式(★4~6/特殊卡才有, null=無)
`;

const body = 'export const PRESET_POKEMON_DB = ' + JSON.stringify(cards, null, 2) + ';\n';

writeFileSync(resolve(ROOT, 'src/data/pokemonDb.cards.generated.js'), header + '\n' + body, 'utf-8');
console.log('→ src/data/pokemonDb.cards.generated.js regenerated from ground-truth (' + cards.length + ' cards)');
