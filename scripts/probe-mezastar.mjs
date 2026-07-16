// Phase 0 probe: fetch official MEZASTAR cassette page raw HTML and analyze structure.
// Run: node scripts/probe-mezastar.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const URL = 'https://www.pokemonmezastar.com.tw/cassette/11';
const OUT = join(__dirname, '_probe_cassette11.html');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

function uniq(arr) { return [...new Set(arr)]; }

(async () => {
  console.log('[probe] fetching', URL);
  const res = await fetch(URL, {
    headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'zh-TW,zh;q=0.9' },
    redirect: 'follow',
  });
  const html = await res.text();
  writeFileSync(OUT, html);
  console.log('[probe] status', res.status, '| bytes', html.length, '| saved', OUT);

  // 1. card-number-like patterns
  const cardNums = uniq((html.match(/2-2-\d{3}|R-2-\d/g) || []));
  console.log('\n[1] card-number-like matches:', cardNums.length);
  console.log('    sample:', cardNums.slice(0, 10).join(', '));

  // 2. image tags (src / data-src / data-lazy)
  const imgRe = /<img\b[^>]*>/gi;
  const imgs = html.match(imgRe) || [];
  const srcs = uniq(imgs.flatMap(t => {
    const m = t.match(/(?:data-src|src|data-original|data-lazy-src)\s*=\s*["']([^"']+)["']/i);
    return m ? [m[1]] : [];
  }));
  console.log('\n[2] <img> tags:', imgs.length, '| unique src-ish:', srcs.length);
  console.log('    sample srcs:');
  srcs.slice(0, 25).forEach(s => console.log('      ', s));

  // 3. links containing cassette
  const links = uniq((html.match(/href=["'][^"']*cassette[^"']*["']/gi) || []));
  console.log('\n[3] cassette links:', links.length);
  links.slice(0, 20).forEach(l => console.log('      ', l));

  // 4. framework detection
  console.log('\n[4] framework hints:');
  for (const kw of ['__NEXT_DATA__', 'next/data', 'window.__NUXT__', 'application/json', '_app/',
                    'react', 'vue', 'wp-content', 'cdn', 'lazyload', 'data-src']) {
    if (html.includes(kw)) console.log('      found:', kw);
  }

  // 5. stat labels present?
  console.log('\n[5] stat/label keywords:');
  for (const kw of ['HP', '攻擊', '防禦', '特攻', '特防', '速度', '招式', '星', '★', '橫式', '直式']) {
    const c = (html.match(new RegExp(kw, 'g')) || []).length;
    if (c) console.log(`      ${kw}: ${c}`);
  }

  // 6. windows around first few card numbers
  console.log('\n[6] context windows around card numbers:');
  const nums = html.match(/2-2-\d{3}|R-2-\d/g) || [];
  for (const n of nums.slice(0, 4)) {
    const i = html.indexOf(n);
    const win = html.slice(Math.max(0, i - 120), i + 220).replace(/\s+/g, ' ');
    console.log(`      [${n}] ...${win}...`);
  }

  console.log('\n[probe] done. Raw HTML at', OUT);
})().catch(e => { console.error('[probe] ERROR', e); process.exit(1); });
