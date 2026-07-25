/**
 * 批量從官網正面參考圖讀取星等（純本地 Canvas，不需要 API / VLM）
 *
 * 用途：
 *   public/cards/11/*.png 是從官網下載的高清正面圖
 *   每張正面圖左下角都印有金黃色 ★ 星等
 *   用 countStarsByTips() 本地計數 → 對比 DB 舊值 → 輸出修正清單
 *
 * 用法：
 *   node scripts/batch-read-stars.mjs              ← 讀取並報告差異
 *   node scripts/batch-read-stars.mjs --fix        ← 讀取 + 自動覆寫 generated.js
 *   node scripts/batch-read-stars.mjs --card 2-2-026 ← 單張除錯
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from 'canvas';
import { cropStarRegion, countStarsByTips } from '../src/data/cardTemplateMatcher.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const CARDS_DIR = resolve(PROJECT_ROOT, 'public/cards/11');
const GENERATED_DB = resolve(PROJECT_ROOT, 'src/data/pokemonDb.cards.generated.js');

// ── Parse CLI args ──────────────────────────────────────
const args = process.argv.slice(2);
const doFix = args.includes('--fix');
const targetCard = (() => { const i = args.indexOf('--card'); return i >= 0 ? args[i+1] : null; })();

// ── Load DB ──────────────────────────────────────────────
function loadGeneratedDb() {
  const code = readFileSync(GENERATED_DB, 'utf-8');
  // Extract PRESET_POKEMON_DB array from the module code
  const match = code.match(/export\s+const\s+PRESET_POKEMON_DB\s*=\s*(\[[\s\S]*?\n\]);/);
  if (!match) throw new Error('Cannot parse PRESET_POKEMON_DB from ' + GENERATED_DB);
  // eslint-disable-next-line no-eval
  return eval('(' + match[1] + ')');
}

// ── Simulate browser canvas for an image file ────────────
async function imageToCanvas(imgPath) {
  const img = await loadImage(imgPath);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  return canvas;
}

// ── Main ─────────────────────────────────────────────────
async function main() {
  const db = loadGeneratedDb();
  const results = [];
  
  const targets = targetCard 
    ? db.filter(c => c.cardId === targetCard || c.diskCode === targetCard)
    : db;

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  批量星等偵測 — 官網正面圖 (${targets.length} 張)`);
  console.log(`${'═'.repeat(60)}\n`);
  console.log(`${'cardId'.padEnd(12)} ${'名稱'.padEnd(10)} ${'DB星'.padStart(4)} → ${'偵測星'.padStart(4)}  ${'信心'.padStart(6)}  狀態`);
  console.log('─'.repeat(65));

  let changed = 0, matched = 0, error = 0;

  for (const card of targets) {
    const imgPath = resolve(CARDS_DIR, `${card.cardId}.png`);
    try {
      const canvas = await imageToCanvas(imgPath);
      const starRegion = cropStarRegion(canvas);
      const { count: detected, confidence } = countStarsByTips(starRegion);

      const dbStars = card.stars ?? '?';
      const match = dbStars === detected ? '✓ OK' : `⚠  差異`;
      
      if (dbStars !== detected) changed++;
      else matched++;

      const line = `${String(card.cardId).padEnd(12)} ${(card.name || '').padEnd(10)} ${String(dbStars).padStart(4)} → ${String(detected).padStart(4)}  ${(confidence * 100 | 0).toString().padStart(4)}%  ${match}`;
      console.log(line);

      results.push({ ...card, _detectedStars: detected, _confidence: confidence, _changed: dbStars !== detected });
    } catch (e) {
      error++;
      console.log(`${String(card.cardId).padEnd(12)} ${(card.name||'').padEnd(10)} ERROR: ${e.message}`);
    }
  }

  console.log('─'.repeat(65));
  console.log(`總計: ${targets.length} 張 | ✓ 匹配 ${matched} | ⚠ 差異 ${changed} | ✗ 錯誤 ${error}`);
  
  // Summary of changes
  const diffs = results.filter(r => r._changed);
  if (diffs.length > 0) {
    console.log(`\n⚠ 需要修正的卡片 (${diffs.length} 張)：`);
    console.log(`${'cardId'.padEnd(12)} ${'DB舊值'.padStart(4)} → ${'應改為'.padStart(4)}  ${'名稱'}`);
    for (const d of diffs) {
      console.log(`${String(d.cardId).padEnd(12)} ${String(d.stars ?? '?').padStart(4)} → ${String(d._detectedStars).padStart(4)}  ${d.name || ''}`);
    }
  }

  // Auto-fix
  if (doFix && diffs.length > 0) {
    console.log(`\n🔧 正在自動修正 ${diffs.length} 張卡的星等...`);
    
    const genCode = readFileSync(GENERATED_DB, 'utf-8');
    let newCode = genCode;
    
    for (const d of diffs) {
      // Replace stars field for this specific card entry
      const oldPattern = new RegExp(
        `(cardId:\\s*['"]${escapeRegex(d.cardId)}['"][\\s\\S]*?stars:\\s*)\\d+`
      );
      const newCodeTest = newCode.replace(oldPattern, `$1${d._detectedStars}`);
      if (newCodeTest !== newCode) {
        newCode = newCodeTest;
        console.log(`  ✓ ${d.cardId} ${d.name}: ${d.stars} → ${d._detectedStars}`);
      } else {
        console.log(`  ✗ ${d.cardId}: regex replace failed (manual edit needed)`);
      }
    }
    
    writeFileSync(GENERATED_DB, newCode, 'utf-8');
    console.log(`\n已寫回 ${GENERATED_DB}`);
  }

  console.log('');
}

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

main().catch(e => { console.error(e); process.exit(1); });
