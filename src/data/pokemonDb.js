import { PRESET_POKEMON_DB } from './pokemonDb.cards.generated.js';
// 重新匯出，讓 cardTemplateMatcher / ScreenOcr / CardRegister 等仍可直接從本模組取用
export { PRESET_POKEMON_DB };
import { GENERATIONS } from './generations.js';
export { GENERATIONS };

// series 標籤 → 代別 id 對照（供「我的卡匣」收藏卡判定代別）
const SERIES_TO_GEN = {};
GENERATIONS.forEach(g => { SERIES_TO_GEN[g.label] = g.id; });

// ═══════════════════════════════════════════════════════
// 全代別合併卡牌池（跨代登錄 / 掃描 / 收藏歸類用）
// 每張卡附加 generation (id) 與 generationLabel；套用 localOverrides 熱更新。
// ═══════════════════════════════════════════════════════
let ALL_CARDS_CACHE = [];

function buildAllCards() {
  const all = [];
  GENERATIONS.forEach(g => {
    g.cards.forEach(p => {
      const override = localOverrides[p.cardId];
      const base = override ? { ...p, ...override } : { ...p };
      base.generation = g.id;
      base.generationLabel = g.label;
      all.push(base);
    });
  });
  // 自定義新增（不在任何官方代別內）也納入
  Object.keys(localOverrides).forEach(id => {
    const inAny = GENERATIONS.some(g => g.cards.some(p => p.cardId === id));
    if (!inAny) {
      const o = localOverrides[id];
      all.push({ ...o, generation: o.generation || null, generationLabel: o.generationLabel || null });
    }
  });
  ALL_CARDS_CACHE = all;
}

export function getAllCards() {
  if (ALL_CARDS_CACHE.length === 0) buildAllCards();
  return ALL_CARDS_CACHE;
}

export function getCardsByGeneration(genId) {
  return getAllCards().filter(c => c.generation === genId);
}

export function getGenerationLabel(genId) {
  const g = GENERATIONS.find(x => x.id === genId);
  return g ? g.label : null;
}

// 判定一張卡（含收藏卡）所屬代別：優先 generation 欄位 → 否則 series 對照 → 否則 null
export function getGenerationOfCard(card) {
  if (!card) return null;
  if (card.generation) return card.generation;
  if (card.series && SERIES_TO_GEN[card.series]) return SERIES_TO_GEN[card.series];
  return null;
}

// ============================================================
// 0. 多代別管理（代別選擇器）
// ============================================================
let _activeGenId = (typeof localStorage !== 'undefined')
  ? (localStorage.getItem('mezastar_active_gen') || GENERATIONS[0].id)
  : GENERATIONS[0].id;

export function getActiveGeneration() {
  return GENERATIONS.find(g => g.id === _activeGenId) || GENERATIONS[0];
}

export function setActiveGeneration(id) {
  const gen = GENERATIONS.find(g => g.id === id);
  if (!gen) return;
  _activeGenId = id;
  try { localStorage.setItem('mezastar_active_gen', id); } catch (e) {}
  reloadActiveDb();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mezastar:gen-change', { detail: id }));
  }
}
// ============================================================
// Pokémon MEZASTAR（銀河系列）完整卡匣資料庫
// 專屬：銀河第二彈 (2-2-xxx TC) - 2026年7月2日上市
// 數據更新：已全面校對為「實體卡匣背面官方印製的真實機台戰鬥參數」
// 特別感謝玩家提供實體卡 2-2-031 TC 及 2-2-024 TC 真實數據與後綴校對！
// ============================================================

// 1. 18 屬性列表
export const POKEMON_TYPES = [
  "一般", "火", "水", "草", "電", "冰", "格鬥", "毒", "地面",
  "飛行", "超能力", "蟲", "岩石", "幽靈", "龍", "惡", "鋼", "妖精"
];

// 2. 屬性相剋矩陣 (進攻方倍率)
export const TYPE_MATCHUPS = {
  "一般": { "岩石": 0.5, "鋼": 0.5, "幽靈": 0 },
  "火":   { "火": 0.5, "水": 0.5, "草": 2, "冰": 2, "蟲": 2, "岩石": 0.5, "龍": 0.5, "鋼": 2 },
  "水":   { "火": 2, "水": 0.5, "草": 0.5, "地面": 2, "岩石": 2, "龍": 0.5 },
  "草":   { "火": 0.5, "水": 2, "草": 0.5, "毒": 0.5, "地面": 2, "飛行": 0.5, "蟲": 0.5, "岩石": 2, "龍": 0.5, "鋼": 0.5 },
  "電":   { "水": 2, "草": 0.5, "電": 0.5, "地面": 0, "飛行": 2, "龍": 0.5 },
  "冰":   { "火": 0.5, "水": 0.5, "草": 2, "冰": 0.5, "地面": 2, "飛行": 2, "龍": 2, "鋼": 0.5 },
  "格鬥": { "一般": 2, "冰": 2, "毒": 0.5, "飛行": 0.5, "超能力": 0.5, "蟲": 0.5, "岩石": 2, "幽靈": 0, "惡": 2, "鋼": 2, "妖精": 0.5 },
  "毒":   { "草": 2, "毒": 0.5, "地面": 0.5, "岩石": 0.5, "幽靈": 0.5, "鋼": 0, "妖精": 2 },
  "地面": { "火": 2, "電": 2, "草": 0.5, "毒": 2, "飛行": 0, "蟲": 0.5, "岩石": 2, "鋼": 2 },
  "飛行": { "草": 2, "電": 0.5, "格鬥": 2, "蟲": 2, "岩石": 0.5, "鋼": 0.5 },
  "超能力":{ "格鬥": 2, "毒": 2, "超能力": 0.5, "鋼": 0.5, "惡": 0 },
  "蟲":   { "火": 0.5, "草": 2, "格鬥": 0.5, "毒": 0.5, "飛行": 0.5, "超能力": 2, "幽靈": 0.5, "惡": 2, "鋼": 0.5, "妖精": 0.5 },
  "岩石": { "火": 2, "冰": 2, "格鬥": 0.5, "地面": 0.5, "飛行": 2, "蟲": 2, "鋼": 0.5 },
  "幽靈": { "一般": 0, "超能力": 2, "幽靈": 2, "惡": 0.5 },
  "龍":   { "龍": 2, "鋼": 0.5, "妖精": 0 },
  "惡":   { "格鬥": 0.5, "超能力": 2, "幽靈": 2, "惡": 0.5, "妖精": 0.5 },
  "鋼":   { "火": 0.5, "水": 0.5, "電": 0.5, "冰": 2, "岩石": 2, "鋼": 0.5, "妖精": 2 },
  "妖精": { "火": 0.5, "格鬥": 2, "毒": 0.5, "龍": 2, "惡": 2, "鋼": 0.5 }
};

// ============================================================
// 3. MEZASTAR 銀河第二彈 靜態卡匣原始資料庫
// 數值說明：以台灣代理實體卡匣背面印製之六維真實數值為準
// stars: 6=超級明星, 5=明星, 4=精選, 3=普通, 2=普通, 1=普通
// ============================================================
// PRESET_POKEMON_DB is now imported from ./pokemonDb.cards.generated.js
// (reconciled: official-site identity+photo + existing pokemonDb.js stats; 2026-07-16T14:17:00.417Z)

// ============================================================
// 4. 自學習型動態資料庫 (Local Override System)
// 確保當玩家透過大模型掃描或手動修改卡匣時，系統資料庫會同步更新並變聰明！
// ============================================================

export let ACTIVE_PRESET_DB = [];
let localOverrides = {};

export function reloadActiveDb() {
  try {
    const saved = localStorage.getItem('mezastar_db_overrides');
    if (saved) {
      localOverrides = JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to load DB overrides:", e);
  }

  // 清空並重新組合 merged 資料庫（使用當前選定代別的卡牌）
  const activeCards = getActiveGeneration().cards;
  ACTIVE_PRESET_DB.length = 0;
  activeCards.forEach(preset => {
    if (localOverrides[preset.cardId]) {
      ACTIVE_PRESET_DB.push({ ...preset, ...localOverrides[preset.cardId] });
    } else {
      ACTIVE_PRESET_DB.push({ ...preset });
    }
  });

  // 同步也加入自定義新增的卡匣（不在預設裡面的）
  Object.keys(localOverrides).forEach(id => {
    const exists = activeCards.some(p => p.cardId === id);
    if (!exists) {
      ACTIVE_PRESET_DB.push({ ...localOverrides[id] });
    }
  });

  // 同步重建全代別合併快取（供跨代登錄 / 掃描 / 收藏歸類）
  buildAllCards();
}

// 供 OCR 及手動登錄呼叫，即時覆蓋/新增卡匣數值到全域 Preset 圖譜中
export function updateLocalDbOverride(card) {
  if (!card || !card.cardId) return;
  
  localOverrides[card.cardId] = {
    cardId: card.cardId,
    diskCode: card.cardId,
    name: card.name,
    series: card.series || "自定義新增",
    category: card.category,
    stars: card.category === 'special' ? 0 : (Number(card.stars) || 3),
    type1: card.type1,
    type2: card.type2 || "",
    moveName: card.moveName,
    moveType: card.moveType,
    moveCategory: card.moveCategory || "物理",
    hp: Number(card.hp) || 0,
    attack: Number(card.attack) || 0,
    defense: Number(card.defense) || 0,
    spAtk: Number(card.spAtk) || 0,
    spDef: Number(card.spDef) || 0,
    speed: Number(card.speed) || 0
  };
  
  try {
    localStorage.setItem('mezastar_db_overrides', JSON.stringify(localOverrides));
  } catch (e) {
    console.error("Failed to save DB overrides to localStorage:", e);
  }
  
  // 重新加載 active 圖譜，實現即時熱更新
  reloadActiveDb();
}

// 執行初始加載
reloadActiveDb();

// ============================================================
// 5. Helper 工具函式 (使用跨代合併池 getAllCards)
// ============================================================

export function findPokemonByName(name) {
  if (!name) return null;
  const cleanName = name.trim();
  const pool = getAllCards();
  let found = pool.find(p => p.name === cleanName);
  if (found) return found;
  found = pool.find(p =>
    cleanName.includes(p.name) || p.name.includes(cleanName)
  );
  return found || null;
}

export function findPokemonByCode(code) {
  if (!code) return null;
  return getAllCards().find(p => p.diskCode === code.trim()) || null;
}

export function getEffectiveness(attackType, defenderTypes) {
  let multiplier = 1.0;
  const types = Array.isArray(defenderTypes) ? defenderTypes : [defenderTypes];
  for (const defType of types) {
    if (!defType) continue;
    const matchups = TYPE_MATCHUPS[attackType];
    if (matchups && matchups[defType] !== undefined) {
      multiplier *= matchups[defType];
    }
  }
  return multiplier;
}

export function getRecommendations(collection, opponent) {
  if (!opponent || !collection || collection.length === 0) return [];
  const opponentTypes = [opponent.type1, opponent.type2].filter(Boolean);

  const scored = collection.map(card => {
    const offenseMult = getEffectiveness(card.moveType, opponentTypes);
    const defenderTypes = [card.type1, card.type2].filter(Boolean);
    let worstDefenseMult = 1.0;
    opponentTypes.forEach(oppType => {
      const m = getEffectiveness(oppType, defenderTypes);
      if (m > worstDefenseMult) worstDefenseMult = m;
    });
    
    // 智慧傷害計算優化：根據招式類型 (物理/特殊) 動態選取對應的攻擊力參數進行評分
    const activeAttack = card.moveCategory === "特殊" ? (card.spAtk || card.attack) : card.attack;
    const statSum = (Number(card.hp) || 0) + (Number(activeAttack) || 0) + (Number(card.defense) || 0);
    const starWeight = (card.category === 'special' ? 0 : (Number(card.stars) || 1)) * 35;
    
    let score = 0;
    if (offenseMult > 1.0) {
      score += (offenseMult - 1.0) * 200;
    } else if (offenseMult < 1.0) {
      score += (offenseMult - 1.0) * 150;
    }
    score += (1.0 - worstDefenseMult) * 80;
    score += statSum * 0.3 + starWeight;

    return { card, score: Math.round(score), offenseMult, defenseMult: worstDefenseMult };
  });

  return scored.sort((a, b) => b.score - a.score);
}
