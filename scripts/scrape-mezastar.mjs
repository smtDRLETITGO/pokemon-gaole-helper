// Phase 1: reconcile official-site identity+photos with existing pokemonDb.js stats.
// Output: src/data/pokemonDb.cards.generated.js (unified PRESET_POKEMON_DB) + scripts/_generated_cards.json
// Run: node scripts/scrape-mezastar.mjs [cassetteId]   (default 11 = 銀河第二彈)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CASSETTE_ID = process.argv[2] || '11';
const SERIES_NAME = '銀河第二彈';
const SITE_LIST_URL = `https://www.pokemonmezastar.com.tw/cassette/${CASSETTE_ID}`;
const SAVE_HTML = join(__dirname, `_probe_cassette${CASSETTE_ID}.html`);
const IMG_DIR = join(ROOT, 'public', 'cards', CASSETTE_ID);
const OUT_JS = join(ROOT, 'src', 'data', 'pokemonDb.cards.generated.js');
const OUT_JSON = join(__dirname, '_generated_cards.json');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36';

const norm = (s) => String(s).replace(/\s+/g, '').replace(/TC$/i, '');

function log(...a) { console.log('[scrape]', ...a); }

async function getHtml() {
  if (existsSync(SAVE_HTML)) {
    log('using saved HTML', SAVE_HTML);
    return readFileSync(SAVE_HTML, 'utf8');
  }
  log('fetching', SITE_LIST_URL);
  const res = await fetch(SITE_LIST_URL, { headers: { 'User-Agent': UA, 'Accept': 'text/html' }, redirect: 'follow' });
  const html = await res.text();
  writeFileSync(SAVE_HTML, html);
  log('saved', SAVE_HTML, res.status, html.length, 'bytes');
  return html;
}

// parse <li class="cassette-list__item"> ... <img src=...> ... <p>ID <br> NAME</p>
function parseCards(html) {
  const out = [];
  const liRe = /<li class="cassette-list__item"[^>]*>([\s\S]*?)<\/li>/gi;
  let m;
  while ((m = liRe.exec(html))) {
    const block = m[1];
    const imgs = [...block.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/gi)].map(x => x[1]);
    const photo = imgs.find(u => /uploads\/images/.test(u)) || imgs[0] || null;
    const pM = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    let cardId = null, name = null;
    if (pM) {
      const txt = pM[1].replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      const sp = txt.split(' ');
      cardId = sp[0]; name = sp.slice(1).join(' ');
    }
    if (!cardId) continue;
    const layout = /aspect-vertical/i.test(block) ? 'vertical' : 'horizontal';
    out.push({ cardId: norm(cardId), rawCardId: cardId, name, layout, photo });
  }
  return out;
}

// load existing stats from pokemonDb.js WITHOUT executing browser-side code:
// extract the PRESET_POKEMON_DB array literal and eval it in a function scope.
function loadExistingDb() {
  const file = join(ROOT, 'src', 'data', 'pokemonDb.js');
  const src = readFileSync(file, 'utf8');
  const m = src.match(/PRESET_POKEMON_DB\s*=\s*(\[[\s\S]*?\n\];)/);
  if (!m) { log('WARN: PRESET_POKEMON_DB not found in pokemonDb.js'); return []; }
  try {
    const arr = new Function('return ' + m[1])();
    log('loaded', arr.length, 'cards from existing pokemonDb.js');
    return arr;
  } catch (e) {
    log('WARN: failed to eval existing DB:', e.message);
    return [];
  }
}

async function downloadImages(cards) {
  mkdirSync(IMG_DIR, { recursive: true });
  let ok = 0, fail = 0;
  for (const c of cards) {
    if (!c.photo) { fail++; continue; }
    const dest = join(IMG_DIR, `${c.cardId}.png`);
    if (existsSync(dest)) { ok++; continue; }
    try {
      const res = await fetch(c.photo, { headers: { 'User-Agent': UA, 'Referer': 'https://www.pokemonmezastar.com.tw/' } });
      if (!res.ok) { log('  img HTTP', res.status, c.cardId); fail++; continue; }
      const buf = Buffer.from(await res.arrayBuffer());
      writeFileSync(dest, buf);
      ok++;
    } catch (e) { log('  img ERR', c.cardId, e.message); fail++; }
    await new Promise(r => setTimeout(r, 120)); // polite delay
  }
  log('images: downloaded/exists', ok, '| failed', fail);
}

function reconcile(siteCards, dbCards) {
  const byId = new Map(dbCards.map(d => [norm(d.cardId || d.diskCode), d]));
  const merged = siteCards.map(sc => {
    const db = byId.get(sc.cardId) || null;
    return {
      cardId: sc.cardId,
      diskCode: sc.cardId,
      name: sc.name,
      series: db?.series || SERIES_NAME,
      stars: db?.stars ?? null,
      type1: db?.type1 ?? null,
      type2: db?.type2 ?? null,
      moveName: db?.moveName ?? null,
      moveType: db?.moveType ?? null,
      moveCategory: db?.moveCategory ?? null,
      hp: db?.hp ?? null,
      attack: db?.attack ?? null,
      defense: db?.defense ?? null,
      spAtk: db?.spAtk ?? null,
      spDef: db?.spDef ?? null,
      speed: db?.speed ?? null,
      layout: sc.layout,
      frontPhoto: `/cards/${CASSETTE_ID}/${sc.cardId}.png`,
      needsStats: !db,
    };
  });
  const missing = merged.filter(c => c.needsStats).map(c => c.cardId);
  if (missing.length) log('cards WITHOUT stats (flagged needsStats):', missing.join(', '));
  else log('all', merged.length, 'cards have stats from existing DB ✅');
  return merged;
}

(async () => {
  const html = await getHtml();
  const siteCards = parseCards(html);
  log('parsed', siteCards.length, 'cards from site');
  if (!siteCards.length) { console.error('[scrape] no cards parsed, abort'); process.exit(1); }

  await downloadImages(siteCards);
  const dbCards = loadExistingDb();
  const merged = reconcile(siteCards, dbCards);

  const header = `// AUTO-GENERATED by scripts/scrape-mezastar.mjs — do not edit by hand.\n` +
    `// Reconciled from official site (identity+photo, cassette ${CASSETTE_ID}) and existing pokemonDb.js (stats).\n` +
    `// cardId canonical = without "TC" suffix. needsStats:true cards lack stats in source DB.\n\n`;
  writeFileSync(OUT_JS, header + `export const PRESET_POKEMON_DB = ${JSON.stringify(merged, null, 2)};\n`);
  writeFileSync(OUT_JSON, JSON.stringify(merged, null, 2));
  log('wrote', OUT_JS, '(' + merged.length + ' cards)');
  log('wrote', OUT_JSON);
  log('DONE. Next: edit src/data/pokemonDb.js to import PRESET_POKEMON_DB from "./pokemonDb.cards.generated.js" and drop the inline array.');
})().catch(e => { console.error('[scrape] ERROR', e); process.exit(1); });
