// generations.js — 多代別註冊表
// 每個代別對應官網 cassette/N 編號，cards 為該代完整卡牌陣列。
// 新增代別時：建好該代 cards 陣列 + 下載 public/cards/<cassette>/ 正面圖，再加入此表即可。
import { PRESET_POKEMON_DB as GALAXY_2_CARDS } from './pokemonDb.cards.generated.js';
import { GALAXY_1_CARDS } from './pokemonDb.cards.galaxy1.generated.js';
import { STARDUST_4_CARDS } from './pokemonDb.cards.stardust4.generated.js';
import { STARDUST_3_CARDS } from './pokemonDb.cards.stardust3.generated.js';
import { STARDUST_2_CARDS } from './pokemonDb.cards.stardust2.generated.js';
import { STARDUST_1_CARDS } from './pokemonDb.cards.stardust1.generated.js';

// 代別順序：依上市時間由新到舊（selector 顯示順序）
// ⚠️ 資料狀態（2026-07-19）：
//   galaxy2      ：核心欄位完整（名稱/屬性/星等/六維/招式/特性）。
//   galaxy1/stardust4：核心完整（名稱/屬性/星等/六維/招式），特性(ability)待 VLM 補齊。
//   stardust1/2/3：核心完整（名稱/屬性/星等/六維/圖），招式(move*)與特性(ability)待 VLM/第三方資料集補齊。
//     星等來源=52poke 等級表（官網海報交叉驗證）；六維=easyocr；屬性=52poke。
//     app 對缺招式可優雅降級（moveType 缺→中性、moveCategory 預設物理），故可先上線核心資料。
export const GENERATIONS = [
  { id: 'galaxy2',    label: '銀河第二彈',      cassette: '11', release: '2026-07-02', cards: GALAXY_2_CARDS },
  { id: 'galaxy1',    label: '銀河第一彈',      cassette: '10', release: '2026-04-02', cards: GALAXY_1_CARDS },
  { id: 'stardust4',  label: '星塵第4彈',      cassette: '9',  release: '2025-12-01', cards: STARDUST_4_CARDS },
  { id: 'stardust3',  label: '星塵第3彈',      cassette: '8',  release: '2025-09-25', cards: STARDUST_3_CARDS },
  { id: 'stardust2',  label: '星塵第2彈',      cassette: '7',  release: '2025-06-05', cards: STARDUST_2_CARDS },
  { id: 'stardust1',  label: '星塵第1彈',      cassette: '2',  release: '2025-04-02', cards: STARDUST_1_CARDS },
  // { id: 'event',   label: 'MEZASTAR活動卡匣', cassette: '6',  release: null,       cards: EVENT_CARDS }, // 待建置
];

export default GENERATIONS;
