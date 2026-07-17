// generations.js — 多代別註冊表
// 每個代別對應官網 cassette/N 編號，cards 為該代完整卡牌陣列。
// 新增代別時：建好該代 cards 陣列 + 下載 public/cards/<cassette>/ 正面圖，再加入此表即可。
import { PRESET_POKEMON_DB as GALAXY_2_CARDS } from './pokemonDb.cards.generated.js';

// 代別順序：依上市時間由新到舊（selector 顯示順序）
export const GENERATIONS = [
  { id: 'galaxy2',    label: '銀河第二彈',      cassette: '11', release: '2026-07-02', cards: GALAXY_2_CARDS },
  // —— 以下為待建置代別（資料+正面圖就位後啟用）——
  // { id: 'galaxy1',    label: '銀河第一彈',      cassette: '10', release: '2026-04-02', cards: GALAXY_1_CARDS },
  // { id: 'stardust3',  label: '星塵第3彈',      cassette: '8',  release: '2025-09-25', cards: STARDUST_3_CARDS },
  // { id: 'stardust2',  label: '星塵第2彈',      cassette: '7',  release: '2025-06-05', cards: STARDUST_2_CARDS },
  // { id: 'stardust1',  label: '星塵第1彈',      cassette: '2',  release: '2025-04-02', cards: STARDUST_1_CARDS },
  // { id: 'event',      label: 'MEZASTAR活動卡匣', cassette: '6',  release: null,       cards: EVENT_CARDS },
];

export default GENERATIONS;
