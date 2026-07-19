#!/usr/bin/env node
// fix_g14.mjs — 用 52poke 等級表修正 galaxy1 / stardust4 的星等，並將 R-* 卡標為 SPECIAL。
// 其餘欄位（name/type/move/stats/ability）沿用既有生成檔（已從圖像 VLM 取得且正確），僅覆寫 stars + special。
import { GALAXY_1_CARDS } from '../src/data/pokemonDb.cards.galaxy1.generated.js';
import { STARDUST_4_CARDS } from '../src/data/pokemonDb.cards.stardust4.generated.js';
import fs from 'fs';

function loadGrade(gen){
  return JSON.parse(fs.readFileSync(`scripts/_grade_${gen}.json`,'utf-8'));
}
const g1map = Object.fromEntries(loadGrade('galaxy1').map(c=>[c.id,c.grade]));
const s4map = Object.fromEntries(loadGrade('stardust4').map(c=>[c.id,c.grade]));

function fix(arr, map, label){
  let changed=0, special=0, missing=0;
  for(const c of arr){
    if(c.cardId && c.cardId.startsWith('R-')){
      c.category='special'; c.stars=0; special++; changed++;
      c._meta = c._meta||{}; c._meta.starSource='special_r_card';
    } else if(map[c.cardId]!=null){
      if(c.stars!==map[c.cardId]){ c.stars=map[c.cardId]; changed++; }
      c._meta = c._meta||{}; c._meta.starSource='52poke_grade';
    } else { missing++; }
  }
  console.log(`${label}: changed=${changed} special=${special} missingGrade=${missing}`);
  return arr;
}
const g1=fix(GALAXY_1_CARDS, g1map, 'galaxy1');
const s4=fix(STARDUST_4_CARDS, s4map, 'stardust4');

// 重生成 .generated.js（勿手改；此腳本為生成器）
function emit(exportName, arr){
  const header =
`// pokemonDb.cards.${exportName.toLowerCase()}.generated.js — 由 scripts/fix_g14.mjs 自 52poke 等級重生成
// stars 取自 52poke 等級表（官方卡表 PDF 星等權威）；R-* 卡為 SPECIAL(category:"special",stars:0)。
// name/type/move/stats/ability 沿用既有 VLM 圖像辨識結果。此檔為生成物，請改 ground_truth 後重跑，勿手改。

export const ${exportName} = `;
  return header + JSON.stringify(arr,null,2) + ";\n";
}
fs.writeFileSync('scripts/galaxy1.ground_truth.json', JSON.stringify(g1,null,1));
fs.writeFileSync('scripts/stardust4.ground_truth.json', JSON.stringify(s4,null,1));
fs.writeFileSync('src/data/pokemonDb.cards.galaxy1.generated.js', emit('GALAXY_1_CARDS', g1));
fs.writeFileSync('src/data/pokemonDb.cards.stardust4.generated.js', emit('STARDUST_4_CARDS', s4));

// 印出分布做 sanity check
function dist(arr){
  const d={};
  for(const c of arr){ const k=c.category==='special'?'SPECIAL':(c.stars??'?'); d[k]=(d[k]||0)+1; }
  return d;
}
console.log('galaxy1 dist:', JSON.stringify(dist(g1)));
console.log('stardust4 dist:', JSON.stringify(dist(s4)));
console.log('OK');
