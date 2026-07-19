// verify_gens.mjs — 驗證所有已註冊代別的資料完整性
import { GENERATIONS } from '../src/data/generations.js';

let problems = 0;
for (const g of GENERATIONS) {
  const cards = g.cards || [];
  const dist = {};
  let noName = 0, noType = 0, noStat = 0, noImg = 0, noStars = 0, special = 0;
  const types = new Set();
  for (const c of cards) {
    const s = c.category ? 'SPECIAL' : String(c.stars ?? '?');
    dist[s] = (dist[s] || 0) + 1;
    if (c.category === 'special') special++;
    if (!c.name) noName++;
    if (!c.type1) noType++;
    if (!(c.hp || c.attack)) noStat++;
    if (!c.frontPhoto) noImg++;
    if (c.stars == null && !c.category) noStars++;
    if (c.type1) types.add(c.type1);
    if (c.type2) types.add(c.type2);
  }
  console.log(`\n=== ${g.id} (${g.label}) cassette ${g.cassette} | n=${cards.length} ===`);
  console.log('  star dist:', JSON.stringify(dist));
  console.log(`  noName=${noName} noType=${noType} noStat=${noStat} noImg=${noImg} noStars=${noStars} special=${special}`);
  const moves = cards.filter(c => c.moveName).length;
  const abil = cards.filter(c => c.ability).length;
  console.log(`  with moves=${moves}/${cards.length}  with ability=${abil}/${cards.length}`);
  if (noName || noImg || noStars) problems++;
  if (cards.length === 0) { console.log('  ⚠️ EMPTY'); problems++; }
}
console.log('\n=== total cards:', GENERATIONS.reduce((a,g)=>a+(g.cards?.length||0),0), '===');
console.log(problems ? `⚠️ ${problems} generation(s) have problems` : '✅ all generations structurally OK');
process.exit(problems ? 1 : 0);
