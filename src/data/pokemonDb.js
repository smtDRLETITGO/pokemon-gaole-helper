// ============================================================
// Pokémon MEZASTAR（銀河系列）完整卡匣資料庫
// 專屬：銀河第二彈 (2-2-xxx) - 2026年7月2日上市
// 數據更新：已全面校對為「實體卡匣背面官方印製的真實機台戰鬥參數」
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
// 3. MEZASTAR 銀河第二彈 完整卡匣資料庫
// 數值說明：以卡匣背面印製的「實際 HP、攻擊力(こうげき)、防禦力(ぼうぎょ)」為準
// stars: 6=超級明星, 5=明星, 4=精選, 3=普通, 2=普通, 1=普通
// ============================================================
export const PRESET_POKEMON_DB = [

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 【銀河第二彈】2-2-001 ~ 2-2-073
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // --- ★6 超級明星 ---
  { cardId:"2-2-001", diskCode:"2-2-001", name:"蒼響", series:"銀河第二彈", stars:6,
    type1:"鋼", type2:"妖精", moveName:"巨獸斬", moveType:"鋼",
    hp:220, attack:256, defense:175, spAtk:123, spDef:175, speed:224 },

  { cardId:"2-2-002", diskCode:"2-2-002", name:"藏瑪然特", series:"銀河第二彈", stars:6,
    type1:"鋼", type2:"格鬥", moveName:"巨獸彈", moveType:"鋼",
    hp:220, attack:208, defense:215, spAtk:123, spDef:215, speed:204 },

  { cardId:"2-2-003", diskCode:"2-2-003", name:"鋁鋼龍", series:"銀河第二彈", stars:6,
    type1:"鋼", type2:"龍", moveName:"逆鱗", moveType:"龍",
    hp:205, attack:180, defense:201, spAtk:211, spDef:98, speed:142 },

  { cardId:"2-2-004", diskCode:"2-2-004", name:"噴火龍", series:"銀河第二彈", stars:6,
    type1:"火", type2:"飛行", moveName:"超極巨地獄滅焰", moveType:"火",
    hp:212, attack:230, defense:150, spAtk:200, spDef:150, speed:180 },

  { cardId:"2-2-005", diskCode:"2-2-005", name:"薩戮德", series:"銀河第二彈", stars:6,
    type1:"草", type2:"惡", moveName:"強力鞭打", moveType:"草",
    hp:231, attack:211, defense:162, spAtk:116, spDef:150, speed:180 },

  { cardId:"2-2-006", diskCode:"2-2-006", name:"路卡利歐", series:"銀河第二彈", stars:6,
    type1:"格鬥", type2:"鋼", moveName:"真氣彈", moveType:"格鬥",
    hp:181, attack:208, defense:123, spAtk:208, spDef:123, speed:168 },

  { cardId:"2-2-007", diskCode:"2-2-007", name:"烈空坐", series:"銀河第二彈", stars:6,
    type1:"龍", type2:"飛行", moveName:"畫龍點睛", moveType:"飛行",
    hp:225, attack:260, defense:160, spAtk:260, spDef:160, speed:188 },

  { cardId:"2-2-008", diskCode:"2-2-008", name:"拉帝亞斯", series:"銀河第二彈", stars:6,
    type1:"龍", type2:"超能力", moveName:"薄霧球", moveType:"超能力",
    hp:198, attack:140, defense:165, spAtk:182, spDef:220, speed:198 },

  { cardId:"2-2-009", diskCode:"2-2-009", name:"拉帝歐斯", series:"銀河第二彈", stars:6,
    type1:"龍", type2:"超能力", moveName:"潔淨光芒", moveType:"超能力",
    hp:198, attack:175, defense:140, spAtk:220, spDef:198, speed:198 },

  { cardId:"2-2-010", diskCode:"2-2-010", name:"四顎針龍", series:"銀河第二彈", stars:6,
    type1:"毒", type2:"龍", moveName:"毒液衝擊", moveType:"毒",
    hp:185, attack:168, defense:132, spAtk:234, spDef:132, speed:220 },

  // --- ★5 明星 ---
  { cardId:"2-2-011", diskCode:"2-2-011", name:"巨金怪", series:"銀河第二彈", stars:5,
    type1:"鋼", type2:"超能力", moveName:"彗星拳", moveType:"鋼",
    hp:175, attack:205, defense:195, spAtk:140, spDef:135, speed:115 },

  { cardId:"2-2-012", diskCode:"2-2-012", name:"雙斧戰龍", series:"銀河第二彈", stars:5,
    type1:"龍", type2:"", moveName:"究極無敵大衝撞", moveType:"龍",
    hp:171, attack:222, defense:140, spAtk:102, spDef:115, speed:149 },

  { cardId:"2-2-013", diskCode:"2-2-013", name:"化石翼龍", series:"銀河第二彈", stars:5,
    type1:"岩石", type2:"飛行", moveName:"終極非凡空中爆擊", moveType:"飛行",
    hp:175, attack:175, defense:112, spAtk:105, spDef:125, speed:202 },

  { cardId:"2-2-014", diskCode:"2-2-014", name:"雷鳥龍", series:"銀河第二彈", stars:5,
    type1:"電", type2:"龍", moveName:"電擊猛攻", moveType:"電",
    hp:195, attack:155, defense:140, spAtk:125, spDef:115, speed:122 },

  { cardId:"2-2-015", diskCode:"2-2-015", name:"鰓魚龍", series:"銀河第二彈", stars:5,
    type1:"水", type2:"龍", moveName:"鰓咬", moveType:"水",
    hp:195, attack:140, defense:155, spAtk:112, spDef:125, speed:122 },

  { cardId:"2-2-016", diskCode:"2-2-016", name:"胡地", series:"銀河第二彈", stars:5,
    type1:"超能力", type2:"", moveName:"精神強念", moveType:"超能力",
    hp:140, attack:85, defense:80, spAtk:202, spDef:147, speed:182 },

  { cardId:"2-2-017", diskCode:"2-2-017", name:"雷鳥海獸", series:"銀河第二彈", stars:5,
    type1:"電", type2:"冰", moveName:"電擊光束", moveType:"電",
    hp:195, attack:140, defense:140, spAtk:140, spDef:125, speed:95 },

  { cardId:"2-2-018", diskCode:"2-2-018", name:"具甲武者", series:"銀河第二彈", stars:5,
    type1:"蟲", type2:"水", moveName:"迎頭一擊", moveType:"蟲",
    hp:180, attack:185, defense:205, spAtk:100, spDef:140, speed:75 },

  { cardId:"2-2-019", diskCode:"2-2-019", name:"君主蛇", series:"銀河第二彈", stars:5,
    type1:"草", type2:"", moveName:"飛葉風暴", moveType:"草",
    hp:180, attack:122, defense:147, spAtk:122, spDef:147, speed:172 },

  { cardId:"2-2-020", diskCode:"2-2-020", name:"炎武王", series:"銀河第二彈", stars:5,
    type1:"火", type2:"格鬥", moveName:"閃焰衝鋒", moveType:"火",
    hp:215, attack:188, defense:108, spAtk:156, spDef:108, speed:108 },

  { cardId:"2-2-021", diskCode:"2-2-021", name:"大劍鬼", series:"銀河第二彈", stars:5,
    type1:"水", type2:"", moveName:"水炮", moveType:"水",
    hp:195, attack:155, defense:134, spAtk:166, spDef:112, speed:112 },

  { cardId:"2-2-022", diskCode:"2-2-022", name:"鐵轍跡", series:"銀河第二彈", stars:5,
    type1:"地面", type2:"鋼", moveName:"鐵頭", moveType:"鋼",
    hp:195, attack:172, defense:180, spAtk:116, spDef:112, speed:162 },

  { cardId:"2-2-023", diskCode:"2-2-023", name:"毒貝比", series:"銀河第二彈", stars:5,
    type1:"毒", type2:"", moveName:"毒針", moveType:"毒",
    hp:147, attack:116, defense:108, spAtk:116, spDef:108, speed:116 },

  { cardId:"2-2-024", diskCode:"2-2-024", name:"布莉姆溫", series:"銀河第二彈", stars:5,
    type1:"超能力", type2:"妖精", moveName:"精神強念", moveType:"超能力",
    hp:167, attack:140, defense:147, spAtk:204, spDef:158, speed:59 },

  { cardId:"2-2-025", diskCode:"2-2-025", name:"阿勃梭魯", series:"銀河第二彈", stars:5,
    type1:"惡", type2:"", moveName:"暗襲要害", moveType:"惡",
    hp:165, attack:195, defense:100, spAtk:115, spDef:100, speed:115 },

  // --- ★4 精選 ---
  { cardId:"2-2-026", diskCode:"2-2-026", name:"蒂蕾喵", series:"銀河第二彈", stars:4,
    type1:"草", type2:"", moveName:"樹葉", moveType:"草",
    hp:135, attack:90, defense:70, spAtk:80, spDef:70, speed:100 },

  { cardId:"2-2-027", diskCode:"2-2-027", name:"魔幻假面喵", series:"銀河第二彈", stars:4,
    type1:"草", type2:"惡", moveName:"千變萬花", moveType:"草",
    hp:150, attack:120, defense:80, spAtk:95, spDef:80, speed:130 },

  { cardId:"2-2-028", diskCode:"2-2-028", name:"炙燙鱷", series:"銀河第二彈", stars:4,
    type1:"火", type2:"", moveName:"火花", moveType:"火",
    hp:140, attack:85, defense:75, spAtk:85, spDef:75, speed:60 },

  { cardId:"2-2-029", diskCode:"2-2-029", name:"骨紋巨聲鱷", series:"銀河第二彈", stars:4,
    type1:"火", type2:"幽靈", moveName:"閃焰歌聲", moveType:"火",
    hp:170, attack:85, defense:110, spAtk:120, spDef:85, speed:70 },

  { cardId:"2-2-030", diskCode:"2-2-030", name:"湧躍鴨", series:"銀河第二彈", stars:4,
    type1:"水", type2:"", moveName:"水槍", moveType:"水",
    hp:135, attack:95, defense:70, spAtk:85, spDef:70, speed:80 },

  { cardId:"2-2-031", diskCode:"2-2-031", name:"狂歡浪舞鴨", series:"銀河第二彈", stars:4,
    type1:"水", type2:"格鬥", moveName:"流水旋舞", moveType:"水",
    hp:155, attack:130, defense:85, spAtk:95, spDef:85, speed:95 },

  { cardId:"2-2-032", diskCode:"2-2-032", name:"藤藤蛇", series:"銀河第二彈", stars:4,
    type1:"草", type2:"", moveName:"藤鞭", moveType:"草",
    hp:115, attack:50, defense:65, spAtk:50, spDef:65, speed:73 },

  { cardId:"2-2-033", diskCode:"2-2-033", name:"青藤蛇", series:"銀河第二彈", stars:4,
    type1:"草", type2:"", moveName:"葉刃", moveType:"草",
    hp:135, attack:70, defense:85, spAtk:70, spDef:85, speed:93 },

  { cardId:"2-2-034", diskCode:"2-2-034", name:"暖暖豬", series:"銀河第二彈", stars:4,
    type1:"火", type2:"", moveName:"撞擊", moveType:"一般",
    hp:120, attack:55, defense:45, spAtk:45, spDef:45, speed:45 },

  { cardId:"2-2-035", diskCode:"2-2-035", name:"炒炒豬", series:"銀河第二彈", stars:4,
    type1:"火", type2:"格鬥", moveName:"猛推", moveType:"格鬥",
    hp:150, attack:85, defense:55, spAtk:75, spDef:55, speed:55 },

  { cardId:"2-2-036", diskCode:"2-2-036", name:"水水獺", series:"銀河第二彈", stars:4,
    type1:"水", type2:"", moveName:"撞擊", moveType:"一般",
    hp:115, attack:55, defense:45, spAtk:50, spDef:45, speed:45 },

  { cardId:"2-2-037", diskCode:"2-2-037", name:"雙刃丸", series:"銀河第二彈", stars:4,
    type1:"水", type2:"", moveName:"貝殼刃", moveType:"水",
    hp:135, attack:75, defense:60, spAtk:83, spDef:60, speed:60 },

  // --- ★3 普通 ---
  { cardId:"2-2-038", diskCode:"2-2-038", name:"電擊怪", series:"銀河第二彈", stars:3,
    type1:"電", type2:"", moveName:"電光", moveType:"電",
    hp:110, attack:73, defense:47, spAtk:65, spDef:55, speed:95 },

  { cardId:"2-2-039", diskCode:"2-2-039", name:"電擊獸", series:"銀河第二彈", stars:3,
    type1:"電", type2:"", moveName:"十萬伏特", moveType:"電",
    hp:135, attack:93, defense:67, spAtk:85, spDef:85, speed:105 },

  { cardId:"2-2-040", diskCode:"2-2-040", name:"電擊魔獸", series:"銀河第二彈", stars:3,
    type1:"電", type2:"", moveName:"雷電拳", moveType:"電",
    hp:165, attack:123, defense:77, spAtk:105, spDef:85, speed:95 },

  { cardId:"2-2-041", diskCode:"2-2-041", name:"醜醜魚", series:"銀河第二彈", stars:3,
    type1:"水", type2:"", moveName:"撞擊", moveType:"一般",
    hp:90, attack:25, defense:30, spAtk:20, spDef:65, speed:80 },

  { cardId:"2-2-042", diskCode:"2-2-042", name:"美納斯", series:"銀河第二彈", stars:3,
    type1:"水", type2:"", moveName:"水流尾", moveType:"水",
    hp:175, attack:90, defense:95, spAtk:110, spDef:125, speed:91 },

  { cardId:"2-2-043", diskCode:"2-2-043", name:"麻麻小魚", series:"銀河第二彈", stars:3,
    type1:"電", type2:"", moveName:"電擊", moveType:"電",
    hp:95, attack:45, defense:40, spAtk:35, spDef:40, speed:60 },

  { cardId:"2-2-044", diskCode:"2-2-044", name:"麻麻鰻", series:"銀河第二彈", stars:3,
    type1:"電", type2:"", moveName:"火花", moveType:"電",
    hp:125, attack:75, defense:70, spAtk:65, spDef:70, speed:40 },

  { cardId:"2-2-045", diskCode:"2-2-045", name:"麻麻鰻魚王", series:"銀河第二彈", stars:3,
    type1:"電", type2:"", moveName:"野性伏特", moveType:"電",
    hp:165, attack:115, defense:90, spAtk:105, spDef:90, speed:60 },

  // --- ★2 普通 ---
  { cardId:"2-2-046", diskCode:"2-2-046", name:"海豹球", series:"銀河第二彈", stars:2,
    type1:"冰", type2:"水", moveName:"細雪", moveType:"冰",
    hp:110, attack:50, defense:55, spAtk:60, spDef:60, speed:25 },

  { cardId:"2-2-047", diskCode:"2-2-047", name:"海魔獅", series:"銀河第二彈", stars:2,
    type1:"冰", type2:"水", moveName:"極光束", moveType:"冰",
    hp:140, attack:70, defense:75, spAtk:80, spDef:80, speed:45 },

  { cardId:"2-2-048", diskCode:"2-2-048", name:"帝牙海獅", series:"銀河第二彈", stars:2,
    type1:"冰", type2:"水", moveName:"暴風雪", moveType:"冰",
    hp:185, attack:95, defense:100, spAtk:105, spDef:100, speed:65 },

  { cardId:"2-2-049", diskCode:"2-2-049", name:"貪心栗鼠", series:"銀河第二彈", stars:2,
    type1:"一般", type2:"", moveName:"撞擊", moveType:"一般",
    hp:115, attack:55, defense:65, spAtk:35, spDef:45, speed:25 },

  { cardId:"2-2-050", diskCode:"2-2-050", name:"伽勒爾喵喵", series:"銀河第二彈", stars:2,
    type1:"鋼", type2:"", moveName:"金屬爪", moveType:"鋼",
    hp:105, attack:65, defense:55, spAtk:40, spDef:40, speed:40 },

  { cardId:"2-2-051", diskCode:"2-2-051", name:"喵頭目", series:"銀河第二彈", stars:2,
    type1:"鋼", type2:"", moveName:"鐵頭", moveType:"鋼",
    hp:145, attack:110, defense:100, spAtk:50, spDef:60, speed:50 },

  // --- ★1 普通 ---
  { cardId:"2-2-052", diskCode:"2-2-052", name:"小仙奶", series:"銀河第二彈", stars:1,
    type1:"妖精", type2:"", moveName:"撞擊", moveType:"一般",
    hp:95, attack:40, defense:40, spAtk:50, spDef:61, speed:34 },

  { cardId:"2-2-053", diskCode:"2-2-053", name:"霜奶仙", series:"銀河第二彈", stars:1,
    type1:"妖精", type2:"", moveName:"裝飾", moveType:"妖精",
    hp:145, attack:60, defense:75, spAtk:110, spDef:121, speed:64 },

  { cardId:"2-2-054", diskCode:"2-2-054", name:"含羞苞", series:"銀河第二彈", stars:1,
    type1:"草", type2:"毒", moveName:"吸收", moveType:"草",
    hp:90, attack:30, defense:35, spAtk:50, spDef:70, speed:55 },

  { cardId:"2-2-055", diskCode:"2-2-055", name:"羅絲雷朵", series:"銀河第二彈", stars:1,
    type1:"草", type2:"毒", moveName:"魔法葉", moveType:"草",
    hp:135, attack:70, defense:65, spAtk:125, spDef:105, speed:90 },

  { cardId:"2-2-056", diskCode:"2-2-056", name:"拉魯拉絲", series:"銀河第二彈", stars:1,
    type1:"超能力", type2:"妖精", moveName:"念力", moveType:"超能力",
    hp:90, attack:25, defense:25, spAtk:45, spDef:35, speed:40 },

  { cardId:"2-2-057", diskCode:"2-2-057", name:"奇魯莉安", series:"銀河第二彈", stars:1,
    type1:"超能力", type2:"妖精", moveName:"幻象光線", moveType:"超能力",
    hp:110, attack:35, defense:35, spAtk:65, spDef:55, speed:50 },

  { cardId:"2-2-058", diskCode:"2-2-058", name:"沙奈朵", series:"銀河第二彈", stars:1,
    type1:"超能力", type2:"妖精", moveName:"精神強念", moveType:"超能力",
    hp:145, attack:65, defense:65, spAtk:125, spDef:115, speed:80 },

  { cardId:"2-2-059", diskCode:"2-2-059", name:"艾路雷朵", series:"銀河第二彈", stars:1,
    type1:"超能力", type2:"格鬥", moveName:"近身戰", moveType:"格鬥",
    hp:145, attack:125, defense:65, spAtk:65, spDef:115, speed:80 },

  { cardId:"2-2-060", diskCode:"2-2-060", name:"車輪毬", series:"銀河第二彈", stars:1,
    type1:"蟲", type2:"毒", moveName:"毒針", moveType:"毒",
    hp:110, attack:55, defense:99, spAtk:40, spDef:79, speed:47 },

  { cardId:"2-2-061", diskCode:"2-2-061", name:"蜈蚣王", series:"銀河第二彈", stars:1,
    type1:"蟲", type2:"毒", moveName:"十字毒刃", moveType:"毒",
    hp:135, attack:100, defense:89, spAtk:55, spDef:69, speed:112 },

  { cardId:"2-2-062", diskCode:"2-2-062", name:"百足蜈蚣", series:"銀河第二彈", stars:1,
    type1:"蟲", type2:"毒", moveName:"撞擊", moveType:"一般",
    hp:90, attack:45, defense:59, spAtk:30, spDef:39, speed:57 },

  { cardId:"2-2-063", diskCode:"2-2-063", name:"蚊香蝌蚪", series:"銀河第二彈", stars:1,
    type1:"水", type2:"", moveName:"水槍", moveType:"水",
    hp:95, attack:50, defense:40, spAtk:40, spDef:40, speed:90 },

  { cardId:"2-2-064", diskCode:"2-2-064", name:"蚊香君", series:"銀河第二彈", stars:1,
    type1:"水", type2:"", moveName:"泡沫光線", moveType:"水",
    hp:125, attack:65, defense:65, spAtk:50, spDef:50, speed:90 },

  { cardId:"2-2-065", diskCode:"2-2-065", name:"蚊香泳士", series:"銀河第二彈", stars:1,
    type1:"水", type2:"格鬥", moveName:"地獄翻滾", moveType:"格鬥",
    hp:165, attack:95, defense:95, spAtk:70, spDef:90, speed:70 }
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. Helper 工具函式
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function findPokemonByName(name) {
  if (!name) return null;
  const cleanName = name.trim();
  let found = PRESET_POKEMON_DB.find(p => p.name === cleanName);
  if (found) return found;
  found = PRESET_POKEMON_DB.find(p =>
    cleanName.includes(p.name) || p.name.includes(cleanName)
  );
  return found || null;
}

export function findPokemonByCode(code) {
  if (!code) return null;
  return PRESET_POKEMON_DB.find(p => p.diskCode === code.trim()) || null;
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
    
    // 使用機台真實戰鬥數值進行評分 (HP + 物理攻擊 + 物理防禦)
    const statSum = (Number(card.hp) || 0) + (Number(card.attack) || 0) + (Number(card.defense) || 0);
    const starWeight = (Number(card.stars) || 1) * 35;
    
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
