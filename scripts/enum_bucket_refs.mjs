// enum_bucket_refs.mjs
// 全站掃描所有對 /uploads/images/<hash>.<ext> 的引用，去重後統計「圖床裡被引用到的檔案總數」
// 因為 /uploads/images/ 不開放目錄列表(404)，這是逼近「裡面有多少檔」的唯一可靠方法。
import fs from 'fs';

const BASE = 'https://www.pokemonmezastar.com.tw';
const IMG_RE = /\/uploads\/images\/([a-z0-9]+)\.(png|jpe?g|webp|gif)/gi;

const seen = new Map(); // url -> first-seen page
const perPage = [];

async function fetchHtml(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (research)' } });
    if (!r.ok) return { url, status: r.status, imgs: [] };
    const txt = await r.text();
    const found = new Set();
    let m;
    IMG_RE.lastIndex = 0;
    while ((m = IMG_RE.exec(txt)) !== null) {
      found.add(BASE + '/uploads/images/' + m[1] + '.' + m[2].toLowerCase());
    }
    return { url, status: r.status, imgs: [...found] };
  } catch (e) {
    return { url, status: 'ERR', imgs: [] };
  }
}

async function main() {
  const pages = [];

  // 1) sitemap 列出來的頂層頁
  let smTxt = '';
  try {
    const r = await fetch(BASE + '/sitemap.xml');
    smTxt = await r.text();
  } catch {}
  const locs = [...smTxt.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x => x[1]);
  for (const l of locs) pages.push(l);

  // 2) cassette 頁面（動態，sitemap 不列），擴大到 1..40 保險
  for (let n = 1; n <= 40; n++) pages.push(`${BASE}/cassette/${n}`);

  console.error(`掃描 ${pages.length} 個頁面...`);
  let done = 0;
  for (const p of pages) {
    const res = await fetchHtml(p);
    if (res.imgs.length) {
      for (const u of res.imgs) if (!seen.has(u)) seen.set(u, p);
      perPage.push({ page: p, n: res.imgs.length });
    }
    done++;
    if (done % 10 === 0) console.error(`  ${done}/${pages.length} pages, 目前累計 ${seen.size} 張`);
    await new Promise(r => setTimeout(r, 80));
  }

  // 統計副檔名分佈
  const byExt = {};
  for (const u of seen.keys()) {
    const ext = u.split('.').pop();
    byExt[ext] = (byExt[ext] || 0) + 1;
  }

  // 各 cassette 頁引用數
  const cassetteRows = perPage
    .filter(r => r.page.includes('/cassette/'))
    .map(r => ({ gen: r.page.split('/cassette/')[1], n: r.n }))
    .filter(r => r.n > 0)
    .sort((a, b) => a.gen - b.gen);

  const out = {
    totalUnique: seen.size,
    byExt,
    cassettePagesWithImages: cassetteRows,
    topPages: perPage.sort((a, b) => b.n - a.n).slice(0, 15),
    allUrls: [...seen.keys()].sort(),
  };
  fs.writeFileSync('scripts/_bucket_refs.json', JSON.stringify(out, null, 2));
  console.log('總去重圖片數:', seen.size);
  console.log('副檔名分佈:', JSON.stringify(byExt));
  console.log('有圖的 cassette 代別:', cassetteRows.map(r => `G${r.gen}=${r.n}`).join(' '));
}

main();
