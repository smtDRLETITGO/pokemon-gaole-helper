// extract_galaxy2_gt.mjs — 把已圖校正的銀河2 資料萃取為 ground-truth JSON
// 來源：src/data/pokemonDb.cards.generated.js (stars=人工複讀, 其餘=easyocr/VLM 圖萃取)
// 產出：scripts/galaxy2.ground_truth.json (圖萃取真值，作為唯一權威來源)
import { PRESET_POKEMON_DB as C } from '../src/data/pokemonDb.cards.generated.js';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 完整欄位 schema（缺欄位補 null，保證每張卡結構一致）
const SCHEMA = ['cardId','diskCode','name','series','stars','type1','type2',
  'moveName','moveType','moveCategory','move2Name','move2Type','move2Category',
  'hp','attack','defense','spAtk','spDef','speed','layout','frontPhoto','needsStats'];

const norm = c => { const o = {}; SCHEMA.forEach(k => o[k] = (k in c) ? c[k] : null); return o; };

const gt = {
  meta: {
    generation: 'galaxy2',
    cassette: '11',
    buildFrom: 'image (scanned backs + official list), NOT legacy DB auto-values',
    provenance: {
      cardId_name: '官網 cassette/11 列表頁 <p>ID NAME</p> 文字',
      stars: '背面圖 ★ 數「人工逐一目視」確認 (2026-07-17, 73/73 重校)',
      hp_speed: '背面圖 easyocr OCR (73/73)',
      type_move: '背面圖 VLM 直接讀取 + 玩家參考表交叉驗證',
    },
    count: C.length,
    regeneratedBy: 'scripts/gen_galaxy2.mjs',
  },
  cards: C.map(norm),
};

writeFileSync(resolve(__dirname, 'galaxy2.ground_truth.json'), JSON.stringify(gt, null, 2) + '\n', 'utf-8');
console.log('→ galaxy2.ground_truth.json written (' + gt.cards.length + ' cards, normalized to ' + SCHEMA.length + ' fields)');
