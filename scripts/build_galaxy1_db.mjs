#!/usr/bin/env node
// build_galaxy1_db.mjs — 從多源合併生成銀河第一彈完整卡牌 DB
// 來源：
//   1. scripts/_backs_10.json        — Nuxt payload（cardId/name/front/back URL）
//   2. scripts/_ocr_galaxy1_stats.json  — easyocr 六維數值（73/73=100%）
//   3. GOLD_DATA                     — 逐張背面圖 VLM 讀取的招式/星等/型態（本檔案內嵌）
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const BACKS = JSON.parse(readFileSync(resolve(ROOT, 'scripts/_backs_10.json'), 'utf-8'));
const STATS = JSON.parse(readFileSync(resolve(ROOT, 'scripts/_ocr_galaxy1_stats.json'), 'utf-8'));

// ═══════════════════════════════════════════
// GOLD DATA — 逐張背面圖讀取的金標準數據
// 格式：{ cardId, stars, type1, type2,
//         moveName, moveType, moveCategory,
//         move2Name?, move2Type?, move2Category?,
//         layout }
// ═══════════════════════════════════════════
const GOLD = [
  // ── ★5 超級明星 / 傳說 / 幻（雙招式）──
  { id:"2-1-001", s:5, t1:"草", t2:"",    m:"鼓擊",      mt:"草", mc:"物理", m2:"超極巨狂播亂打", m2t:"草", m2c:"特殊", l:"horizontal" },
  { id:"2-1-002", s:5, t1:"火", t2:"飛行",  m:"火焰球",      mt:"火", mc:"特殊", m2:"超極巨破陣火球", m2t:"火", m2c:"特殊", l:"horizontal" },
  { id:"2-1-003", s:5, t1:"水", t2:"",      m:"狙擊",      mt:"水", mc:"物理", m2:"超極巨狙擊神射", m2t:"水", m2c:"特殊", l:"horizontal" },
  { id:"2-1-004", s:5, t1:"電", t2:"",      m:"十萬伏特",    mt:"電", mc:"特殊", m2:"超極巨萬雷轟頂", m2t:"電", m2c:"特殊", l:"horizontal" },
  { id:"2-1-005", s:5, t1:"電", t2:"",      m:"打雷",       mt:"電", mc:"物理", m2:"咬碎",          m2t:"惡", m2c:"物理", l:"horizontal" },
  { id:"2-1-006", s:5, t1:"火", t2:"",      m:"大字爆炎",    mt:"火", mc:"物理", m2:"鐵頭",          m2t:"鋼", m2c:"物理", l:"horizontal" },
  { id:"2-1-007", s:5, t1:"水", t2:"",      m:"水炮",       mt:"水", mc:"物理", m2:"暗影球",        m2t:"幽靈",m2c:"特殊", l:"horizontal" },
  { id:"2-1-008", s:5, t1:"超能力",t2:"",   m:"精神擊破",    mt:"超能力",mc:"特殊", m2:"極巨超能",      m2t:"超能力",m2c:"特殊",l:"horizontal" },
  // ── ★5 單招式 ──
  { id:"2-1-009", s:5, t1:"一般",t2:"",     m:"制裁光礫",    mt:"一般",mc:"特殊",                                 l:"horizontal" },
  { id:"2-1-010", s:5, t1:"幽靈",t2:"一般", m:"冤冤相報",    mt:"幽靈",mc:"特殊",                                 l:"horizontal" },
  { id:"2-1-013", s:5, t1:"水", t2:"格鬥",  m:"聖劍",       mt:"鋼", mc:"物理", m2:"全力無雙激烈拳",m2t:"格鬥",m2c:"物理",l:"horizontal" },

  // ── ★4 明星（部分雙招式）──
  { id:"2-1-011", s:4, t1:"蟲", t2:"",      m:"蠻力",       mt:"一般",mc:"物理",                                 l:"vertical" },
  { id:"2-1-012", s:4, t1:"蟲", t2:"格鬥",  m:"超級角擊",    mt:"蟲", mc:"物理",                                 l:"vertical" },
  { id:"2-1-014", s:4, t1:"惡", t2:"冰",     m:"地獄突刺",    mt:"惡", mc:"物理", m2:"極巨惡毒",      m2t:"惡", m2c:"特殊",l:"vertical" },
  { id:"2-1-015", s:4, t1:"格鬥",t2:"",      m:"流星突擊",    mt:"格鬥",mc:"物理", m2:"極巨拳門",      m2t:"格鬥",m2c:"特殊",l:"vertical" },
  { id:"2-1-016", s:4, t1:"毒", t2:"地面",   m:"大地之力",    mt:"地面",mc:"特殊", m2:"極巨大地",      m2t:"地面",m2c:"特殊",l:"vertical" },
  // ★4 單招式
  { id:"2-1-017", s:4, t1:"地面",t2:"龍",   m:"地震",       mt:"地面",mc:"物理",                                 l:"vertical" },
  { id:"2-1-018", s:4, t1:"水", t2:"岩石",   m:"水炮",       mt:"水", mc:"物理",                                 l:"vertical" },
  { id:"2-1-019", s:4, t1:"電", t2:"",        m:"瘋狂伏特",    mt:"電", mc:"特殊",                                 l:"vertical" },
  { id:"2-1-020", s:4, t1:"火", t2:"",        m:"噴射火焰",    mt:"火", mc:"特殊",                                 l:"vertical" },
  { id:"2-1-021", s:4, t1:"電", t2:"",        m:"破音",       mt:"電", mc:"特殊",                                 l:"vertical" },
  { id:"2-1-022", s:4, t1:"電", t2:"毒",      m:"污泥波",      mt:"毒", mc:"特殊",                                 l:"vertical" },
  { id:"2-1-023", s:4, t1:"一般",t2:"",       m:"近身戰",     mt:"格鬥",mc:"物理",                                 l:"vertical" },
  { id:"2-1-024", s:4, t1:"蟲", t2:"鋼",     m:"十字剪",     mt:"蟲", mc:"物理",                                 l:"vertical" },
  { id:"2-1-025", s:4, t1:"冰", t2:"草",      m:"暴風雪",     mt:"冰", mc:"特殊",                                 l:"vertical" },
  { id:"2-1-034", s:4, t1:"草", t2:"",        m:"種子機關槍",  mt:"草", mc:"物理",                                 l:"vertical" },
  { id:"2-1-037", s:4, t1:"火", t2:"",        m:"火焰踢",     mt:"火", mc:"物理",                                 l:"vertical" },
  { id:"2-1-040", s:4, t1:"水", t2:"",        m:"潛水",       mt:"水", mc:"物理",                                 l:"vertical" },
  { id:"2-1-042", s:4, t1:"冰", t2:"草",      m:"冰凍拳",     mt:"冰", mc:"物理",                                 l:"vertical" },
  { id:"2-1-044", s:4, t1:"幽靈",t2:"飛行",   m:"禍不單行",    mt:"幽靈",mc:"特殊",                                 l:"vertical" },
  { id:"2-1-046", s:4, t1:"一般",t2:"幽靈",   m:"高速星星",    mt:"一般",mc:"特殊",                                 l:"vertical" },
  { id:"2-1-048", s:4, t1:"草", t2:"岩石",    m:"終極吸取",    mt:"草", mc:"物理",                                 l:"vertical" },
  { id:"2-1-050", s:4, t1:"格鬥",t2:"",       m:"劈瓦",       mt:"格鬥",mc:"物理",                                 l:"vertical" },
  { id:"2-1-052", s:4, t1:"地面",t2:"鋼",     m:"直衝鑽",     mt:"地面",mc:"物理",                                 l:"vertical" },
  { id:"2-1-055", s:4, t1:"火", t2:"",        m:"火焰拳",     mt:"火", mc:"物理",                                 l:"vertical" },
  { id:"2-1-057", s:4, t1:"火", t2:"",        m:"火焰牙",     mt:"火", mc:"物理",                                 l:"vertical" },
  { id:"2-1-059", s:4, t1:"電", t2:"毒",      m:"放電",       mt:"電", mc:"特殊",                                 l:"vertical" },
  { id:"2-1-060", s:4, t1:"電", t2:"毒",      m:"毒擊",       mt:"毒", mc:"物理",                                 l:"vertical" },
  { id:"2-1-062", s:4, t1:"草", t2:"妖精",    m:"青草攪拌器",  mt:"草", mc:"特殊",                                 l:"vertical" },
  { id:"2-1-064", s:4, t1:"惡", t2:"冰",      m:"暗襲要害",    mt:"惡", mc:"物理",                                 l:"vertical" },
  { id:"2-1-067", s:4, t1:"毒", t2:"地面",    m:"咬碎",       mt:"惡", mc:"物理",                                 l:"vertical" },
  { id:"2-1-070", s:4, t1:"毒", t2:"地面",    m:"毒擊",       mt:"毒", mc:"物理",                                 l:"vertical" },

  // ── ★3 中階進化 ──
  { id:"2-1-033", s:3, t1:"草", t2:"",        m:"飛葉快刀",    mt:"草", mc:"物理",                                 l:"vertical" },
  { id:"2-1-036", s:3, t1:"火", t2:"格鬥",    m:"蓄能焰襲",    mt:"火", mc:"物理",                                 l:"vertical" },
  { id:"2-1-039", s:3, t1:"水", t2:"",        m:"水之波動",    mt:"水", mc:"特殊",                                 l:"vertical" },
  { id:"2-1-041", s:3, t1:"冰", t2:"",        m:"冰磔",       mt:"冰", mc:"特殊",                                 l:"vertical" },
  { id:"2-1-043", s:3, t1:"幽靈",t2:"飛行",   m:"驚嚇",       mt:"幽靈",mc:"特殊",                                 l:"vertical" },
  { id:"2-1-045", s:3, t1:"幽靈",t2:"一般",    m:"影子偷襲",    mt:"幽靈",mc:"物理",                                 l:"vertical" },
  { id:"2-1-047", s:3, t1:"草", t2:"岩石",    m:"超級吸取",    mt:"草", mc:"物理",                                 l:"vertical" },
  { id:"2-1-051", s:3, t1:"地面",t2:"鋼",     m:"金屬爪",     mt:"鋼", mc:"物理",                                 l:"vertical" },
  { id:"2-1-054", s:3, t1:"火", t2:"",        m:"火焰輪",     mt:"火", mc:"特殊",                                 l:"vertical" },
  { id:"2-1-056", s:3, t1:"火", t2:"",        m:"火花",       mt:"火", mc:"特殊",                                 l:"vertical" },
  { id:"2-1-061", s:3, t1:"草", t2:"妖精",     m:"樹葉",       mt:"草", mc:"物理",                                 l:"vertical" },
  { id:"2-1-063", s:3, t1:"惡", t2:"冰",      m:"以牙還牙",    mt:"惡", mc:"物理",                                 l:"vertical" },
  { id:"2-1-066", s:3, t1:"毒", t2:"",        m:"咬住",       mt:"惡", mc:"物理",                                 l:"vertical" },
  { id:"2-1-069", s:3, t1:"格鬥",t2:"",       m:"二連踢",     mt:"格鬥",mc:"物理",                                 l:"vertical" },

  // ── ★2 初始 / 低階 ──
  { id:"2-1-026", s:2, t1:"草", t2:"",        m:"樹葉",       mt:"草", mc:"物理",                                 l:"vertical" },
  { id:"2-1-027", s:2, t1:"火", t2:"",        m:"火花",       mt:"火", mc:"特殊",                                 l:"vertical" },
  { id:"2-1-028", s:2, t1:"水", t2:"",        m:"水槍",       mt:"水", mc:"特殊",                                 l:"vertical" },
  { id:"2-1-029", s:2, t1:"火", t2:"",        m:"火花",       mt:"火", mc:"特殊",                                 l:"vertical" },
  { id:"2-1-030", s:2, t1:"龍", t2:"",        m:"撞擊",       mt:"一般",mc:"物理",                                l:"vertical" },
  { id:"2-1-031", s:2, t1:"一般",t2:"",       m:"抓",         mt:"一般",mc:"物理",                                 l:"vertical" },
  { id:"2-1-032", s:2, t1:"草", t2:"",        m:"木枝突刺",    mt:"草", mc:"物理",                                 l:"vertical" },
  { id:"2-1-035", s:2, t1:"火", t2:"",        m:"火花",       mt:"火", mc:"特殊",                                 l:"vertical" },
  { id:"2-1-038", s:2, t1:"水", t2:"",        m:"水槍",       mt:"水", mc:"特殊",                                 l:"vertical" },
  { id:"2-1-049", s:2, t1:"一般",t2:"飛行",   m:"碎岩",       mt:"岩石",mc:"物理",                                l:"vertical" },
  { id:"2-1-053", s:2, t1:"水", t2:"飛行",    m:"火花",       mt:"火", mc:"特殊",                                 l:"vertical" },
  { id:"2-1-058", s:2, t1:"電", t2:"毒",      m:"蹭蹭臉頰",    mt:"電", mc:"特殊",                                 l:"vertical" },
  { id:"2-1-065", s:2, t1:"毒", t2:"",        m:"毒針",       mt:"毒", mc:"物理",                                 l:"vertical" },
  { id:"2-1-068", s:2, t1:"毒", t2:"",        m:"毒針",       mt:"毒", mc:"物理",                                 l:"vertical" },

  // ── R-Special 卡（無標準星等，用 4 表示）──
  { id:"R-2-1",   s:4, t1:"電", t2:"",        m:"十萬伏特",    mt:"電", mc:"特殊", m2:"超極巨萬雷轟頂",m2t:"電",m2c:"特殊",l:"horizontal" },
  { id:"R-2-2",   s:4, t1:"火", t2:"飛行",     m:"噴射火焰",    mt:"火", mc:"特殊", m2:"超極巨地獄滅焰",m2t:"火",m2c:"特殊",l:"horizontal" },
  { id:"R-2-3",   s:4, t1:"幽靈",t2:"毒",      m:"暗影球",      mt:"幽靈",mc:"特殊", m2:"超極巨幻影幽魂",m2t:"幽靈",m2c:"特殊",l:"horizontal" },
];

const goldMap = new Map(GOLD.map(g => [g.id, g]));

// 官方 Nuxt payload 中 13 張卡的 name 欄位直接是 cardId 字串（無真名）
// 這裡用標準台灣繁體寶可夢譯名補齊，與其餘 60 張官方名稱拼法一致
const NAME_OVERRIDE = {
  "2-1-022": "顫弦蠑螈",   // Toxtricity (Low Key)
  "2-1-034": "轟擂金剛猩", // Rillaboom
  "2-1-037": "閃焰王牌",     // Cinderace
  "2-1-040": "千面避役",     // Inteleon
  "2-1-042": "暴雪王",       // Abomasnow
  "2-1-046": "洗翠索羅亞",   // Hisuian Zorua
  "2-1-050": "蔥遊兵",       // Sirfetch'd
  "2-1-055": "鴨嘴火獸",     // Magmortar
  "2-1-059": "顫弦蠑螈",     // Toxtricity (Low Key)
  "2-1-060": "顫弦蠑螈",     // Toxtricity (Low Key)
  "2-1-064": "狃拉",         // Sneasel
  "2-1-070": "尼多王",       // Nidoking
  "R-2-1":   "皮卡丘",       // Pikachu (R-Special)
};

// Build lookup tables
const backMap = new Map(BACKS.map(b => [b.id, b]));
const statMap = new Map(STATS.map(s => [s.cardId, s]));

const SERIES = "銀河第一彈";
const output = [];

for (const [id, gold] of goldMap) {
  const back = backMap.get(id);
  const stat = statMap.get(id);
  if (!back || !stat) {
    console.warn(`MISSING data for ${id}: back=${!!back}, stat=${!!stat}`);
    continue;
  }

  const name = NAME_OVERRIDE[id] || back.name;

  output.push({
    cardId: id,
    diskCode: id,
    name,
    series: SERIES,
    stars: gold.s,
    type1: gold.t1,
    type2: gold.t2,
    moveName: gold.m,
    moveType: gold.mt,
    moveCategory: gold.mc,
    ...(gold.m2 ? {
      move2Name: gold.m2,
      move2Type: gold.m2t,
      move2Category: gold.m2c,
    } : {}),
    hp: stat.hp,
    attack: stat.atk,
    defense: stat.def_,
    spAtk: stat.spAtk,
    spDef: stat.spDef,
    speed: stat.spd,
    layout: gold.l,
    frontPhoto: `/cards/10/${id}.png`,
    needsStats: false,
  });
}

// Verify count
console.log(`Generated ${output.length} cards (expected ${GOLD.length})`);

// Write output
const header = `// pokemonDb.cards.galaxy1.generated.js — 銀第一彈完整卡牌資料庫
// ═══════════════════════════════════════════
// 星等來源：背面圖 VLM 直接讀取（背面頂部橫幅金色 ★ 標記）
// 六維來源：easyocr 背面圖 OCR (scripts/ocr_back_stats.py) — 73/73=100%
// 屬性/招式/型態來源：背面圖 VLM 逐張讀取（招式欄位 + 屬性圖示 + D/X 標記）
//   D = 物理（紅色圓點標）, X = 特殊（紅色 X 標記）
// ═══════════════════════════════════════════
// Schema 同 galaxy2：moveName/moveType/moveCategory = 第一招
//   move2Name/move2Type/move2Category = 第二招（★5傳說/Special卡才有，null=無）

export const GALAXY_1_CARDS = ${JSON.stringify(output, null, 2)};
`;

writeFileSync(resolve(ROOT, 'src/data/pokemonDb.cards.galaxy1.generated.js'), header, 'utf-8');
console.log(`→ src/data/pokemonDb.cards.galaxy1.generated.js (${output.length} cards)`);

// Summary stats
const starDist = {};
for (const c of output) { starDist[c.stars] = (starDist[c.stars]||0)+1; }
console.log('Star distribution:', starDist);
const twoMoveCount = output.filter(c => c.move2Name).length;
console.log(`Two-move cards: ${twoMoveCount}`);
const nullType = output.filter(c => !c.type2).length;
console.log(`Single-type cards: ${nullType} / Dual-type: ${output.length - nullType}`);
