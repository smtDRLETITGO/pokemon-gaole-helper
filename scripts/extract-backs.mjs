// extract-backs.mjs — Robustly extract front+back image URLs from a MEZASTAR
// cassette page's embedded Nuxt payload, and (optionally) download the BACK images.
//
// The page HTML embeds a serialized data table like:
//   {"serial_number":N,"name":M,"image":O,"back_image":P},
//   "2-2-045","美納斯",
//   "https://.../front.png",
//   "https://.../back.png"
// NOTE: some rows OMIT the name: "id","front","back"  (e.g. R-2-2)
//
// Usage:
//   node scripts/extract-backs.mjs 11                 # extract + print JSON, no download
//   node scripts/extract-backs.mjs 11 --download      # also download back images
//   node scripts/extract-backs.mjs 11 --html file.html# use saved HTML instead of fetch
//
// Prints JSON array of { id, name, front, back } to stdout.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const args = process.argv.slice(2);
const CASSETTE_ID = args[0] || '11';
const DO_DOWNLOAD = args.includes('--download');
const htmlArg = args.indexOf('--html');
const HTML_FILE = htmlArg >= 0 ? args[htmlArg + 1] : null;

const SITE_URL = `https://www.pokemonmezastar.com.tw/cassette/${CASSETTE_ID}`;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36';
const IMG = 'https://www\\.pokemonmezastar\\.com\\.tw/uploads/images/[0-9a-f]{64}\\.png';
// MEZASTAR ids: "2-2-045" style (gen-card-seq) or "R-2-1" rarity cards.
const ID = '[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*';
const ROW = new RegExp(
  '(?:\\s*"(' + ID + ')")?(?:\\s*,\\s*"([^"]*)")?\\s*,\\s*"(' + IMG + ')"\\s*,\\s*"(' + IMG + ')"',
  'g'
);

async function getHtml() {
  if (HTML_FILE && existsSync(HTML_FILE)) return readFileSync(HTML_FILE, 'utf8');
  const res = await fetch(SITE_URL, {
    headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'zh-TW,zh;q=0.9' },
    redirect: 'follow',
  });
  const html = await res.text();
  const save = join(__dirname, `_live_cassette${CASSETTE_ID}.html`);
  writeFileSync(save, html);
  console.error(`[extract] fetched ${SITE_URL} -> ${res.status} ${html.length}b (saved ${save})`);
  return html;
}

function extract(html) {
  const out = [];
  let m;
  while ((m = ROW.exec(html))) {
    const id = m[1] || null;
    const name = m[2] || null;
    // If there was no explicit id token, fall back to the name as the key.
    out.push({ id: id || name, name, front: m[3], back: m[4] });
  }
  return out;
}

async function download(cards) {
  const dir = join(ROOT, 'public', 'cards', CASSETTE_ID, 'back');
  mkdirSync(dir, { recursive: true });
  let ok = 0, fail = 0, skip = 0;
  for (const c of cards) {
    if (!c.back || !c.id) { fail++; continue; }
    const dest = join(dir, `${c.id}.png`);
    if (existsSync(dest)) { skip++; continue; }
    try {
      const res = await fetch(c.back, { headers: { 'User-Agent': UA, 'Referer': 'https://www.pokemonmezastar.com.tw/' } });
      if (!res.ok) { console.error(`  back HTTP ${res.status} ${c.id}`); fail++; continue; }
      writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
      ok++;
    } catch (e) { console.error(`  back ERR ${c.id} ${e.message}`); fail++; }
    await new Promise(r => setTimeout(r, 120));
  }
  console.error(`[extract] back images: downloaded=${ok} skipped=${skip} failed=${fail}`);
}

(async () => {
  const html = await getHtml();
  let cards = extract(html);
  const seenId = new Set();
  const seenBack = new Set();
  cards = cards.filter(c => {
    if (!c.back) return false;
    if (seenBack.has(c.back)) return false;
    if (c.id && seenId.has(c.id)) return false;
    seenBack.add(c.back);
    if (c.id) seenId.add(c.id);
    return true;
  });
  console.error(`[extract] parsed ${cards.length} cards (front+back) from cassette ${CASSETTE_ID}`);
  if (DO_DOWNLOAD) await download(cards);
  process.stdout.write(JSON.stringify(cards, null, 2) + '\n');
})().catch(e => { console.error('[extract] ERROR', e); process.exit(1); });
