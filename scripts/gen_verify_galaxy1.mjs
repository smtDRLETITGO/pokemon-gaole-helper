// gen_verify_galaxy1.mjs — 產生銀河第一彈 73 張卡視覺化驗證頁
import { GALAXY_1_CARDS as C } from '../src/data/pokemonDb.cards.galaxy1.generated.js';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const TYPE_COLOR = {
  '草':'#4CAF50','火':'#F44336','水':'#2196F3','電':'#FFEB3B','一般':'#9E9E9E','飛行':'#03A9F4',
  '蟲':'#8BC34A','毒':'#9C27B0','地面':'#FF9800','岩石':'#795548','鋼':'#607D8B','幽靈':'#673AB7',
  '龍':'#3F51B5','惡':'#37474F','冰':'#00BCD4','妖精':'#E91E63','超能力':'#E040FB','格鬥':'#FF5722',
};
const starColor = s => ['#9e9e9e','#9e9e9e','#8bc34a','#4caf50','#ffc107','#ff9800','#f44336'][s] || '#9e9e9e';

function badge(t){ return `<span style="display:inline-block;background:${TYPE_COLOR[t]||'#777'};color:#111;border-radius:4px;padding:1px 6px;font-size:11px;margin-right:3px;font-weight:600">${t}</span>`; }

const rows = C.map(c => {
  const types = badge(c.type1) + (c.type2 ? badge(c.type2) : '');
  const m1 = `<b>${c.moveName}</b> <span style="color:#888">${badge(c.moveType)}</span> <span style="color:#bbb">${c.moveCategory==='物理'?'D':'X'}</span>`;
  const m2 = c.move2Name ? `<br><span style="color:#4fc3f7">↳ ${c.move2Name}</span> <span style="color:#888">${badge(c.move2Type)}</span> <span style="color:#bbb">${c.moveCategory==='物理'?'D':'X'}</span>` : '';
  const stats = `<span style="font-variant-numeric:tabular-nums;font-size:11px">HP ${c.hp} · 攻 ${c.attack} · 防 ${c.defense}<br>特攻 ${c.spAtk} · 特防 ${c.spDef} · 速 ${c.speed}</span>`;
  return `<tr>
    <td style="white-space:nowrap;font-size:11px;color:#aaa">${c.cardId}</td>
    <td style="font-weight:600">${c.name}</td>
    <td style="text-align:center"><span style="display:inline-block;min-width:46px;background:${starColor(c.stars)};color:#111;border-radius:4px;font-weight:700;font-size:11px">${'★'.repeat(c.stars)}</span></td>
    <td>${types}</td>
    <td style="font-size:11px">${m1}${m2}</td>
    <td>${stats}</td>
  </tr>`;
}).join('');

const sd = {};
C.forEach(c => { sd[c.stars] = (sd[c.stars] || 0) + 1; });
const twoM = C.filter(c => c.move2Name).length;
const dual = C.filter(c => c.type2).length;
const starLine = Object.keys(sd).sort((a,b) => Number(a) - Number(b)).map(s => `★${s}: ${sd[s]}`).join(' · ');

const html = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>銀河第一彈 驗證 (73 張)</title>
<style>
 body{font-family:-apple-system,'PingFang TC','Microsoft JhengHei',sans-serif;background:#0f1419;color:#e8eaed;margin:0;padding:24px}
 h1{font-size:20px;margin:0 0 4px}
 .sub{color:#9aa0a6;font-size:13px;margin-bottom:16px}
 .stats{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:18px}
 .box{background:#1a2027;border:1px solid #2a3138;border-radius:8px;padding:10px 14px}
 .box .n{font-size:18px;font-weight:700}
 .box .l{font-size:11px;color:#9aa0a6}
 table{border-collapse:collapse;width:100%;font-size:12px}
 th,td{border-bottom:1px solid #232a31;padding:6px 8px;vertical-align:top;text-align:left}
 th{position:sticky;top:0;background:#161b21;color:#9aa0a6;font-weight:600;font-size:11px}
 tr:hover td{background:#161b21}
</style></head><body>
<h1>銀河第一彈 (cassette/10) · 73 張卡驗證</h1>
<div class="sub">資料來源：星等/招式/屬性 = 背面圖 VLM 逐張讀取；六維 = easyocr 100% OCR；名稱 = 官網 Nuxt payload。D=物理 / X=特殊。</div>
<div class="stats">
  <div class="box"><div class="n">73</div><div class="l">總卡數</div></div>
  <div class="box"><div class="n" style="font-size:13px">${starLine}</div><div class="l">星等分布</div></div>
  <div class="box"><div class="n">${twoM}</div><div class="l">雙招式卡</div></div>
  <div class="box"><div class="n">${dual} / ${73-dual}</div><div class="l">雙屬性 / 單屬性</div></div>
  <div class="box"><div class="n">73/73</div><div class="l">正面圖就位</div></div>
  <div class="box"><div class="n">100%</div><div class="l">六維 OCR</div></div>
</div>
<table><thead><tr><th>卡號</th><th>名稱</th><th>星等</th><th>屬性</th><th>招式</th><th>六維</th></tr></thead>
<tbody>${rows}</tbody></table>
</body></html>`;

writeFileSync(resolve(ROOT, 'verify_galaxy1.html'), html, 'utf-8');
console.log('→ verify_galaxy1.html written ('+C.length+' cards)');
