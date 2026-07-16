#!/usr/bin/env node
// rebuild-from-official.mjs — 從官網 + 正面圖重構 DB 參數（Phase 5.5）
//
// 做三件事：
//   1. 從官網 HTML 提取 layout 分類（橫式/直式）— 零誤差來源
//   2. 可選：用 VLM 批量讀取已下載正面圖的星等 — 取代舊 DB 的猜測值
//   3. 輸出修正後的 pokemonDb.cards.generated.js
//
// 用法：
//   node scripts/rebuild-from-official.mjs              # 只更新 layout（快速）
//   node scripts/rebuild-from-official.mjs --stars      # layout + VLM 讀星等（慢，需 OPENROUTER_API_KEY）
//   node scripts/rebuild-from-official.mjs --stars --dry # 只印出結果不寫檔

import https from 'https';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const GENERATED_DB = join(PROJECT_ROOT, 'src/data/pokemonDb.cards.generated.js');
const CARDS_DIR = join(PROJECT_ROOT, 'public/cards/11');

// ── 官網 layout 分類（從 /cassette/11 HTML 靜態提取） ──
const HORIZONTAL_IDS = new Set([
  '2-2-001','2-2-002','2-2-003','2-2-004','2-2-005','2-2-006','2-2-007','2-2-008',
  '2-2-009','2-2-010','2-2-011','2-2-012','2-2-013','2-2-014','2-2-015','2-2-016',
  '2-2-017','2-2-018','2-2-022','2-2-023','2-2-024','2-2-025'
]);
// 其餘所有 ID 都是直式

function getLayout(cardId) {
  return HORIZONTAL_IDS.has(cardId) ? 'horizontal' : 'vertical';
}

// ── 讀取現有 generated DB ──
function loadGeneratedDb() {
  const src = readFileSync(GENERATED_DB, 'utf-8');
  // 解析 export const PRESET_POKEMON_DB = [...]
  const match = src.match(/export\s+const\s+PRESET_POKEMON_DB\s*=\s*(\[[\s\S]*\]);?\s*$/);
  if (!match) throw new Error('Cannot parse PRESET_POKEMON_DB from ' + GENERATED_DB);
  // 用 eval 安全解析 JSON-like（已知來源可信）
  const jsonStr = match[1]
    .replace(/,(\s*\])/g, '$1')  // trailing commas
    .replace(/\/\/[^\n]*/g, '');   // strip comments
  return new Function('return ' + jsonStr)();
}

// ── Step 1: 修正 layout ──
function fixLayout(db) {
  let changed = 0;
  for (const card of db) {
    const correct = getLayout(card.cardId);
    if (card.layout !== correct) {
      console.log(`  [layout] ${card.cardId} ${card.name}: ${card.layout || '?'} → ${correct}`);
      card.layout = correct;
      changed++;
    }
  }
  return changed;
}

// ── Step 2: VLM 讀取星等（可選）──
async function readStarsFromVLM(db, dryRun = false) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('  ERROR: OPENROUTER_API_KEY not set. Set it or skip --stars.');
    process.exit(1);
  }

  let updated = 0;
  const errors = [];

  for (const card of db) {
    const imgPath = join(CARDS_DIR, `${card.cardId}.png`);
    if (!existsSync(imgPath)) {
      errors.push(`${card.cardId}: image not found`);
      continue;
    }

    try {
      const imgBase64 = readFileSync(imgPath).toString('base64');
      const dataUrl = `data:image/png;base64,${imgBase64}`;

      const body = JSON.stringify({
        model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: '這是一張寶可夢 MEZASTAR 卡片的正面圖。請只回覆一個數字：這張卡左下角有幾顆金黃色的五角星（★）？只回覆數字，不要其他文字。' },
            { type: 'image_url', image_url: { url: dataUrl } }
          ]
        }],
        max_tokens: 5
      });

      const result = await fetchVLM(apiKey, body);
      const stars = parseStarResponse(result);

      if (stars !== null && stars !== card.stars) {
        console.log(`  [stars] ${card.cardId} ${card.name}: ${card.stars} → ${stars}`);
        if (!dryRun) card.stars = stars;
        updated++;
      } else {
        console.log(`  [ok]    ${card.cardId} ${card.name}: ${card.stars}★ (unchanged)`);
      }

      // 避免速率限制
      await sleep(1500);
    } catch (e) {
      errors.push(`${card.cardId}: ${e.message}`);
      console.error(`  [err]   ${card.cardId}: ${e.message}`);
    }
  }

  console.log(`\n  Stars: ${updated} updated, ${errors.length} errors`);
  if (errors.length > 0) console.log('  Errors:', errors.join(', '));
  return updated;
}

function fetchVLM(apiKey, body) {
  return new Promise((resolve, reject) => {
    const req = https.request('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://smtDRLETITGO.github.io/pokemon-gaole-helper/',
        'X-Title': 'Pokemon MEZASTAR Star Counter'
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Invalid JSON: ' + data.slice(0, 200))); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function parseStarResponse(vlmResult) {
  try {
    const text = vlmResult.choices?.[0]?.message?.content?.trim() || '';
    const m = text.match(/\d+/);
    return m ? parseInt(m[0], 10) : null;
  } catch { return null; }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── 寫回 generated JS ──
function writeGeneratedDb(db) {
  const output = `// pokemonDb.cards.generated.js — 由 scripts/rebuild-from-official.mjs 自動產生\n` +
    `// 來源：官網 pokemonmezastar.com.tw/cassette/11 (identity/photo/layout) + VLM 星等讀取\n` +
    `// ⚠️ 六維數值(hp/attack/defense/spAtk/spDef/speed)仍來自舊 DB，需以實卡背面 OCR 校正\n` +
    `\nexport const PRESET_POKEMON_DB = ${JSON.stringify(db, null, 2)};\n`;
  writeFileSync(GENERATED_DB, output, 'utf-8');
  console.log(`\n✓ Written ${db.length} cards to ${GENERATED_DB}`);
}

// ── Main ──
async function main() {
  const args = process.argv.slice(2);
  const doStars = args.includes('--stars');
  const dryRun = args.includes('--dry');

  console.log('=== MEZASTAR DB Rebuild from Official Source ===\n');

  const db = loadGeneratedDb();
  console.log(`Loaded ${db.length} cards from generated DB\n`);

  // Step 1: Layout（永遠執行）
  console.log('--- Step 1: Fix layout (from official site grouping) ---');
  const layoutChanges = fixLayout(db);
  console.log(`  Layout: ${layoutChanges} corrected\n`);

  // Step 2: Stars（僅 --stars 時）
  if (doStars) {
    console.log('--- Step 2: Read stars from front images via VLM ---');
    await readStarsFromVLM(db, dryRun);
    console.log('');
  }

  // Write
  if (!dryRun) {
    writeGeneratedDb(db);
  } else {
    console.log('[DRY RUN] No files written');
  }

  // Summary
  console.log('\n=== Summary ===');
  const hCount = db.filter(c => c.layout === 'horizontal').length;
  const vCount = db.filter(c => c.layout === 'vertical').length;
  const starGroups = {};
  for (const c of db) {
    const s = c.stars | 0;
    starGroups[s] = (starGroups[s] || 0) + 1;
  }
  console.log(`  Horizontal: ${hCount}, Vertical: ${vCount}, Total: ${db.length}`);
  console.log(`  Stars distribution:`);
  Object.entries(starGroups).sort((a,b) => a[0]-b[0]).forEach(([k,v]) =>
    console.log(`    ${k}★: ${v} cards`)
  );
}

main().catch(e => { console.error(e); process.exit(1); });
