// enum_all_images.mjs — Enumerate ALL card images across every cassette (generation)
// page on the official MEZASTAR site, by scraping each /cassette/N page's
// embedded Nuxt payload. Counts unique image URLs (the /uploads/images/ bucket
// is shared across generations, so we dedupe globally).
//
// Usage: node scripts/enum_all_images.mjs [maxCassette]

import { writeFileSync } from 'node:fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36';
const IMG = /https?:\/\/www\.pokemonmezastar\.com\.tw\/uploads\/images\/[0-9a-f]{64}\.png/g;
// Card row pattern: id?, name?, front, back (adjacent URLs)
const ROW = /(?:\s*"([A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)")?(?:\s*,\s*"([^"]*)")?\s*,\s*"(https?:\/\/www\.pokemonmezastar\.com\.tw\/uploads\/images\/[0-9a-f]{64}\.png)"\s*,\s*"(https?:\/\/www\.pokemonmezastar\.com\.tw\/uploads\/images\/[0-9a-f]{64}\.png)"/g;

const MAX = parseInt(process.argv[2] || '20', 10);

async function probe(id) {
  const url = `https://www.pokemonmezastar.com.tw/cassette/${id}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
    if (!res.ok) return { id, status: res.status, imgs: [], pairs: [] };
    const html = await res.text();
    const imgs = new Set(html.match(IMG) || []);

    // card front+back pairs
    ROW.lastIndex = 0;
    const pairs = [];
    let m;
    while ((m = ROW.exec(html))) {
      pairs.push({ id: m[1] || null, name: m[2] || null, front: m[3], back: m[4] });
    }
    return { id, status: res.status, imgs: [...imgs], pairs, htmlLen: html.length };
  } catch (e) {
    return { id, status: 'ERR', imgs: [], pairs: [], err: e.message };
  }
}

(async () => {
  const perGen = [];
  const globalImgs = new Map(); // url -> Set(cassettes)
  const globalPairs = new Map(); // cardKey -> {front, back, cassettes:Set}

  let emptyStreak = 0;
  for (let id = 1; id <= MAX; id++) {
    const r = await probe(id);
    const hasData = r.imgs.length > 0;
    if (!hasData) emptyStreak++; else emptyStreak = 0;

    for (const u of r.imgs) {
      if (!globalImgs.has(u)) globalImgs.set(u, new Set());
      globalImgs.get(u).add(id);
    }
    for (const p of r.pairs) {
      const key = p.front; // front URL is unique per card
      if (!globalPairs.has(key)) globalPairs.set(key, { id: p.id, name: p.name, front: p.front, back: p.back, cassettes: new Set() });
      globalPairs.get(key).cassettes.add(id);
    }

    perGen.push({ id, status: r.status, totalImgs: r.imgs.length, cardPairs: r.pairs.length });
    console.error(`  cassette/${id}: status=${r.status} imgs=${r.imgs.length} cardPairs=${r.pairs.length}`);

    await new Promise(res => setTimeout(res, 120));
    if (emptyStreak >= 12) { console.error(`  (stopped: ${emptyStreak} consecutive empty pages)`); break; }
  }

  // Summarize
  const totalUniqueImgs = globalImgs.size;
  const totalUniqueCards = globalPairs.size;
  // cards appearing in exactly one cassette
  let singleGen = 0;
  for (const v of globalPairs.values()) if (v.cassettes.size === 1) singleGen++;

  console.error('\n=== SUMMARY ===');
  console.error(`Unique image URLs (all types): ${totalUniqueImgs}`);
  console.error(`Unique card front+back pairs:   ${totalUniqueCards}`);
  console.error(`  (if every card has front+back, that's ${totalUniqueCards * 2} card images)`);
  console.error(`Cards in exactly 1 generation:    ${singleGen}`);

  const out = {
    perGen,
    totalUniqueImgs,
    totalUniqueCards,
    estimatedCardImages: totalUniqueCards * 2,
    cards: [...globalPairs.values()].map(v => ({ id: v.id, name: v.name, front: v.front, back: v.back, cassettes: [...v.cassettes] })),
  };
  writeFileSync('_all_images.json', JSON.stringify(out, null, 2));
  console.error(`\nWrote _all_images.json (${out.cards.length} unique cards)`);
})().catch(e => { console.error('ERROR', e); process.exit(1); });
