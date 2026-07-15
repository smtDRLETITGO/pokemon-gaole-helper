// ============================================================
// Pokémon MEZASTAR（星塵系列）完整卡匣資料庫
// 涵蓋：星塵第一彈 (1-1-xxx) + 星塵第二彈 (1-2-xxx)
// 搜尋策略：以「星等 + 中文名稱」為主要識別，卡號為輔
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
// 3. MEZASTAR 完整卡匣資料庫
// stars: 6=超級明星, 5=明星, 4=精選, 3=普通, 2=普通, 1=普通
// ============================================================
export const PRESET_POKEMON_DB = [

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 【星塵第一彈】1-1-001 ~ 1-1-073
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // --- ★6 超級明星 ---
  { cardId:"1-1-001", diskCode:"1-1-001", name:"超夢", series:"星塵第一彈", stars:6,
    type1:"超能力", type2:"", moveName:"精神擊破", moveType:"超能力",
    hp:212, attack:130, defense:110, spAtk:194, spDef:110, speed:150 },

  { cardId:"1-1-002", diskCode:"1-1-002", name:"夢幻", series:"星塵第一彈", stars:6,
    type1:"超能力", type2:"", moveName:"精神強念", moveType:"超能力",
    hp:200, attack:100, defense:100, spAtk:100, spDef:100, speed:100 },

  { cardId:"1-1-003", diskCode:"1-1-003", name:"蒼響", series:"星塵第一彈", stars:6,
    type1:"鋼", type2:"", moveName:"巨獸斬", moveType:"鋼",
    hp:193, attack:177, defense:137, spAtk:89, spDef:115, speed:109 },

  { cardId:"1-1-004", diskCode:"1-1-004", name:"藏瑪然特", series:"星塵第一彈", stars:6,
    type1:"鋼", type2:"", moveName:"巨獸彈", moveType:"鋼",
    hp:173, attack:145, defense:143, spAtk:75, spDef:155, speed:85 },

  { cardId:"1-1-005", diskCode:"1-1-005", name:"班基拉斯", series:"星塵第一彈", stars:6,
    type1:"岩石", type2:"惡", moveName:"咬碎", moveType:"惡",
    hp:205, attack:164, defense:130, spAtk:115, spDef:120, speed:71 },

  { cardId:"1-1-006", diskCode:"1-1-006", name:"巨金怪", series:"星塵第一彈", stars:6,
    type1:"鋼", type2:"超能力", moveName:"彗星拳", moveType:"鋼",
    hp:185, attack:160, defense:150, spAtk:115, spDef:110, speed:85 },

  { cardId:"1-1-007", diskCode:"1-1-007", name:"密勒頓", series:"星塵第一彈", stars:6,
    type1:"電", type2:"龍", moveName:"閃電驅馳", moveType:"電",
    hp:205, attack:105, defense:115, spAtk:165, spDef:135, speed:165 },

  { cardId:"1-1-008", diskCode:"1-1-008", name:"超級妙蛙花", series:"星塵第一彈", stars:6,
    type1:"草", type2:"毒", moveName:"飛葉風暴", moveType:"草",
    hp:188, attack:122, defense:143, spAtk:122, spDef:152, speed:80 },

  { cardId:"1-1-009", diskCode:"1-1-009", name:"超級噴火龍X", series:"星塵第一彈", stars:6,
    type1:"火", type2:"龍", moveName:"噴射火焰", moveType:"火",
    hp:188, attack:172, defense:112, spAtk:159, spDef:115, speed:100 },

  { cardId:"1-1-010", diskCode:"1-1-010", name:"超級水箭龜", series:"星塵第一彈", stars:6,
    type1:"水", type2:"", moveName:"水炮", moveType:"水",
    hp:188, attack:103, defense:190, spAtk:135, spDef:155, speed:78 },

  // --- ★5 明星 ---
  { cardId:"1-1-011", diskCode:"1-1-011", name:"水伊布", series:"星塵第一彈", stars:5,
    type1:"水", type2:"", moveName:"水之波動", moveType:"水",
    hp:185, attack:65, defense:60, spAtk:110, spDef:95, speed:65 },

  { cardId:"1-1-012", diskCode:"1-1-012", name:"火伊布", series:"星塵第一彈", stars:5,
    type1:"火", type2:"", moveName:"火焰衝擊", moveType:"火",
    hp:155, attack:65, defense:65, spAtk:130, spDef:110, speed:65 },

  { cardId:"1-1-013", diskCode:"1-1-013", name:"月亮伊布", series:"星塵第一彈", stars:5,
    type1:"惡", type2:"", moveName:"大聲咆哮", moveType:"惡",
    hp:155, attack:65, defense:110, spAtk:60, spDef:130, speed:65 },

  { cardId:"1-1-014", diskCode:"1-1-014", name:"冰伊布", series:"星塵第一彈", stars:5,
    type1:"冰", type2:"", moveName:"冰凍光線", moveType:"冰",
    hp:155, attack:75, defense:75, spAtk:75, spDef:110, speed:65 },

  { cardId:"1-1-015", diskCode:"1-1-015", name:"大比鳥", series:"星塵第一彈", stars:5,
    type1:"一般", type2:"飛行", moveName:"神速", moveType:"一般",
    hp:170, attack:130, defense:95, spAtk:75, spDef:100, speed:120 },

  { cardId:"1-1-016", diskCode:"1-1-016", name:"耿鬼", series:"星塵第一彈", stars:5,
    type1:"幽靈", type2:"毒", moveName:"暗影球", moveType:"幽靈",
    hp:165, attack:80, defense:80, spAtk:170, spDef:95, speed:135 },

  { cardId:"1-1-017", diskCode:"1-1-017", name:"風速狗", series:"星塵第一彈", stars:5,
    type1:"火", type2:"", moveName:"噴射火焰", moveType:"火",
    hp:155, attack:100, defense:70, spAtk:80, spDef:80, speed:115 },

  { cardId:"1-1-018", diskCode:"1-1-018", name:"超甲狂犀", series:"星塵第一彈", stars:5,
    type1:"地面", type2:"岩石", moveName:"岩石炮", moveType:"岩石",
    hp:220, attack:170, defense:160, spAtk:65, spDef:65, speed:50 },

  { cardId:"1-1-019", diskCode:"1-1-019", name:"皮卡丘", series:"星塵第一彈", stars:5,
    type1:"電", type2:"", moveName:"十萬伏特", moveType:"電",
    hp:120, attack:100, defense:60, spAtk:100, spDef:70, speed:140 },

  { cardId:"1-1-020", diskCode:"1-1-020", name:"沙漠蜻蜓", series:"星塵第一彈", stars:5,
    type1:"地面", type2:"龍", moveName:"地震", moveType:"地面",
    hp:155, attack:100, defense:80, spAtk:80, spDef:80, speed:100 },

  { cardId:"1-1-021", diskCode:"1-1-021", name:"轟擂金剛猩", series:"星塵第一彈", stars:5,
    type1:"格鬥", type2:"", moveName:"轟擂猛打", moveType:"格鬥",
    hp:175, attack:125, defense:100, spAtk:70, spDef:80, speed:45 },

  { cardId:"1-1-022", diskCode:"1-1-022", name:"閃焰王牌", series:"星塵第一彈", stars:5,
    type1:"火", type2:"超能力", moveName:"閃焰衝擊", moveType:"火",
    hp:155, attack:115, defense:65, spAtk:115, spDef:75, speed:100 },

  { cardId:"1-1-023", diskCode:"1-1-023", name:"千面避役", series:"星塵第一彈", stars:5,
    type1:"一般", type2:"", moveName:"連環踢", moveType:"一般",
    hp:155, attack:95, defense:100, spAtk:55, spDef:100, speed:125 },

  { cardId:"1-1-024", diskCode:"1-1-024", name:"堵攔熊", series:"星塵第一彈", stars:5,
    type1:"一般", type2:"", moveName:"橫掃千軍", moveType:"一般",
    hp:180, attack:130, defense:80, spAtk:60, spDef:60, speed:55 },

  { cardId:"1-1-025", diskCode:"1-1-025", name:"凱路迪歐", series:"星塵第一彈", stars:5,
    type1:"水", type2:"格鬥", moveName:"聖劍", moveType:"格鬥",
    hp:181, attack:129, defense:131, spAtk:129, spDef:131, speed:108 },

  // --- ★4 精選 ---
  { cardId:"1-1-026", diskCode:"1-1-026", name:"啪咚猴", series:"星塵第一彈", stars:4,
    type1:"格鬥", type2:"", moveName:"翻轉踢", moveType:"格鬥",
    hp:150, attack:120, defense:65, spAtk:75, spDef:55, speed:70 },

  { cardId:"1-1-027", diskCode:"1-1-027", name:"伊布", series:"星塵第一彈", stars:4,
    type1:"一般", type2:"", moveName:"快速攻擊", moveType:"一般",
    hp:130, attack:65, defense:65, spAtk:45, spDef:65, speed:55 },

  { cardId:"1-1-028", diskCode:"1-1-028", name:"狃拉", series:"星塵第一彈", stars:4,
    type1:"格鬥", type2:"惡", moveName:"十字斬", moveType:"惡",
    hp:145, attack:105, defense:60, spAtk:60, spDef:65, speed:90 },

  { cardId:"1-1-029", diskCode:"1-1-029", name:"泥偶巨人", series:"星塵第一彈", stars:4,
    type1:"岩石", type2:"地面", moveName:"岩石投擲", moveType:"岩石",
    hp:150, attack:100, defense:130, spAtk:45, spDef:65, speed:35 },

  { cardId:"1-1-030", diskCode:"1-1-030", name:"古月鳥", series:"星塵第一彈", stars:4,
    type1:"岩石", type2:"飛行", moveName:"岩石刃", moveType:"岩石",
    hp:145, attack:105, defense:65, spAtk:55, spDef:65, speed:60 },

  { cardId:"1-1-031", diskCode:"1-1-031", name:"呆火鱷", series:"星塵第一彈", stars:4,
    type1:"火", type2:"", moveName:"火焰旋渦", moveType:"火",
    hp:145, attack:100, defense:64, spAtk:83, spDef:65, speed:100 },

  { cardId:"1-1-032", diskCode:"1-1-032", name:"潤水鴨", series:"星塵第一彈", stars:4,
    type1:"水", type2:"", moveName:"滾水炸彈", moveType:"水",
    hp:140, attack:83, defense:78, spAtk:95, spDef:78, speed:109 },

  { cardId:"1-1-033", diskCode:"1-1-033", name:"新葉喵", series:"星塵第一彈", stars:4,
    type1:"草", type2:"", moveName:"飛葉刀", moveType:"草",
    hp:130, attack:95, defense:65, spAtk:80, spDef:65, speed:104 },

  { cardId:"1-1-034", diskCode:"1-1-034", name:"強顎雞母蟲", series:"星塵第一彈", stars:4,
    type1:"蟲", type2:"電", moveName:"放電", moveType:"電",
    hp:125, attack:90, defense:100, spAtk:55, spDef:80, speed:36 },

  { cardId:"1-1-035", diskCode:"1-1-035", name:"幼棉棉", series:"星塵第一彈", stars:4,
    type1:"草", type2:"妖精", moveName:"嬉鬧", moveType:"妖精",
    hp:125, attack:60, defense:45, spAtk:75, spDef:45, speed:66 },

  { cardId:"1-1-036", diskCode:"1-1-036", name:"淚眼蜥", series:"星塵第一彈", stars:4,
    type1:"水", type2:"", moveName:"氣旋水流", moveType:"水",
    hp:130, attack:60, defense:55, spAtk:60, spDef:55, speed:65 },

  // --- ★3 普通 ---
  { cardId:"1-1-037", diskCode:"1-1-037", name:"妙蛙種子", series:"星塵第一彈", stars:3,
    type1:"草", type2:"毒", moveName:"藤鞭", moveType:"草",
    hp:110, attack:49, defense:49, spAtk:65, spDef:65, speed:45 },

  { cardId:"1-1-038", diskCode:"1-1-038", name:"妙蛙草", series:"星塵第一彈", stars:3,
    type1:"草", type2:"毒", moveName:"藤鞭", moveType:"草",
    hp:125, attack:62, defense:63, spAtk:80, spDef:80, speed:60 },

  { cardId:"1-1-039", diskCode:"1-1-039", name:"小火龍", series:"星塵第一彈", stars:3,
    type1:"火", type2:"", moveName:"火焰旋渦", moveType:"火",
    hp:105, attack:52, defense:43, spAtk:60, spDef:50, speed:65 },

  { cardId:"1-1-040", diskCode:"1-1-040", name:"火恐龍", series:"星塵第一彈", stars:3,
    type1:"火", type2:"飛行", moveName:"火焰旋渦", moveType:"火",
    hp:120, attack:64, defense:58, spAtk:80, spDef:65, speed:80 },

  { cardId:"1-1-041", diskCode:"1-1-041", name:"傑尼龜", series:"星塵第一彈", stars:3,
    type1:"水", type2:"", moveName:"水槍", moveType:"水",
    hp:109, attack:48, defense:65, spAtk:50, spDef:64, speed:43 },

  { cardId:"1-1-042", diskCode:"1-1-042", name:"卡咪龜", series:"星塵第一彈", stars:3,
    type1:"水", type2:"", moveName:"水槍", moveType:"水",
    hp:125, attack:63, defense:80, spAtk:65, spDef:80, speed:58 },

  { cardId:"1-1-043", diskCode:"1-1-043", name:"呆呆獸", series:"星塵第一彈", stars:3,
    type1:"水", type2:"超能力", moveName:"滅亡之歌", moveType:"一般",
    hp:130, attack:75, defense:80, spAtk:70, spDef:45, speed:15 },

  { cardId:"1-1-044", diskCode:"1-1-044", name:"圓法師", series:"星塵第一彈", stars:3,
    type1:"超能力", type2:"", moveName:"念力", moveType:"超能力",
    hp:105, attack:35, defense:35, spAtk:120, spDef:90, speed:105 },

  { cardId:"1-1-045", diskCode:"1-1-045", name:"咚咚鼠", series:"星塵第一彈", stars:3,
    type1:"一般", type2:"", moveName:"連環掌", moveType:"格鬥",
    hp:115, attack:80, defense:82, spAtk:45, spDef:45, speed:75 },

  // --- ★2 普通 ---
  { cardId:"1-1-046", diskCode:"1-1-046", name:"伽勒爾蛇紋熊", series:"星塵第一彈", stars:2,
    type1:"冰", type2:"", moveName:"冰凍光線", moveType:"冰",
    hp:100, attack:70, defense:80, spAtk:45, spDef:60, speed:40 },

  { cardId:"1-1-047", diskCode:"1-1-047", name:"小鋸鱷", series:"星塵第一彈", stars:2,
    type1:"水", type2:"", moveName:"水槍", moveType:"水",
    hp:109, attack:59, defense:35, spAtk:35, spDef:35, speed:42 },

  { cardId:"1-1-048", diskCode:"1-1-048", name:"辣椒火焰馬", series:"星塵第一彈", stars:2,
    type1:"火", type2:"", moveName:"炭火", moveType:"火",
    hp:110, attack:83, defense:50, spAtk:83, spDef:50, speed:93 },

  { cardId:"1-1-049", diskCode:"1-1-049", name:"波波", series:"星塵第一彈", stars:2,
    type1:"一般", type2:"飛行", moveName:"振翅", moveType:"飛行",
    hp:90, attack:45, defense:40, spAtk:35, spDef:35, speed:56 },

  { cardId:"1-1-050", diskCode:"1-1-050", name:"可達鴨", series:"星塵第一彈", stars:2,
    type1:"水", type2:"", moveName:"水槍", moveType:"水",
    hp:110, attack:52, defense:48, spAtk:65, spDef:50, speed:55 },

  // --- ★1 普通 ---
  { cardId:"1-1-051", diskCode:"1-1-051", name:"小拳石", series:"星塵第一彈", stars:1,
    type1:"岩石", type2:"地面", moveName:"岩石投擲", moveType:"岩石",
    hp:100, attack:80, defense:100, spAtk:30, spDef:45, speed:20 },

  { cardId:"1-1-052", diskCode:"1-1-052", name:"皮皮", series:"星塵第一彈", stars:1,
    type1:"妖精", type2:"", moveName:"嬉鬧", moveType:"妖精",
    hp:110, attack:45, defense:20, spAtk:45, spDef:25, speed:35 },

  { cardId:"1-1-053", diskCode:"1-1-053", name:"蚊香蝌蚪", series:"星塵第一彈", stars:1,
    type1:"水", type2:"", moveName:"水槍", moveType:"水",
    hp:110, attack:50, defense:35, spAtk:35, spDef:35, speed:70 },

  { cardId:"1-1-054", diskCode:"1-1-054", name:"走路草", series:"星塵第一彈", stars:1,
    type1:"草", type2:"", moveName:"葉刃", moveType:"草",
    hp:100, attack:75, defense:35, spAtk:70, spDef:30, speed:90 },

  { cardId:"1-1-055", diskCode:"1-1-055", name:"喵喵", series:"星塵第一彈", stars:1,
    type1:"一般", type2:"", moveName:"抓取", moveType:"一般",
    hp:90, attack:45, defense:35, spAtk:40, spDef:40, speed:90 },

  { cardId:"1-1-056", diskCode:"1-1-056", name:"六尾", series:"星塵第一彈", stars:1,
    type1:"火", type2:"", moveName:"炭火", moveType:"火",
    hp:106, attack:41, defense:40, spAtk:50, spDef:45, speed:65 },

  { cardId:"1-1-057", diskCode:"1-1-057", name:"轟炸蛙", series:"星塵第一彈", stars:1,
    type1:"水", type2:"格鬥", moveName:"泡沫光線", moveType:"水",
    hp:115, attack:53, defense:45, spAtk:53, spDef:45, speed:74 },

  { cardId:"1-1-058", diskCode:"1-1-058", name:"飛天螳螂", series:"星塵第一彈", stars:1,
    type1:"蟲", type2:"飛行", moveName:"鐮刀飛斬", moveType:"蟲",
    hp:105, attack:55, defense:50, spAtk:45, spDef:50, speed:85 },

  { cardId:"1-1-059", diskCode:"1-1-059", name:"脫殼忍者", series:"星塵第一彈", stars:1,
    type1:"水", type2:"地面", moveName:"水砲", moveType:"水",
    hp:100, attack:65, defense:65, spAtk:60, spDef:55, speed:53 },

  { cardId:"1-1-060", diskCode:"1-1-060", name:"豪力", series:"星塵第一彈", stars:1,
    type1:"格鬥", type2:"", moveName:"動態拳", moveType:"格鬥",
    hp:120, attack:80, defense:50, spAtk:35, spDef:35, speed:35 },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 【星塵第二彈】1-2-001 ~ 1-2-073
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // --- ★6 超級明星 ---
  { cardId:"1-2-001", diskCode:"1-2-001", name:"蓋歐卡", series:"星塵第二彈", stars:6,
    type1:"水", type2:"", moveName:"根源波動", moveType:"水",
    hp:205, attack:100, defense:90, spAtk:150, spDef:140, speed:90 },

  { cardId:"1-2-002", diskCode:"1-2-002", name:"固拉多", series:"星塵第二彈", stars:6,
    type1:"地面", type2:"", moveName:"斷崖之劍", moveType:"地面",
    hp:205, attack:150, defense:140, spAtk:100, spDef:90, speed:90 },

  { cardId:"1-2-003", diskCode:"1-2-003", name:"故勒頓", series:"星塵第二彈", stars:6,
    type1:"格鬥", type2:"龍", moveName:"全能碰撞", moveType:"格鬥",
    hp:205, attack:165, defense:115, spAtk:105, spDef:115, speed:165 },

  { cardId:"1-2-004", diskCode:"1-2-004", name:"皮卡丘★", series:"星塵第二彈", stars:6,
    type1:"電", type2:"", moveName:"電流無限", moveType:"電",
    hp:125, attack:105, defense:65, spAtk:105, spDef:75, speed:145 },

  { cardId:"1-2-005", diskCode:"1-2-005", name:"卡比獸", series:"星塵第二彈", stars:6,
    type1:"一般", type2:"", moveName:"身體攻擊", moveType:"一般",
    hp:255, attack:110, defense:65, spAtk:65, spDef:110, speed:30 },

  { cardId:"1-2-006", diskCode:"1-2-006", name:"杖尾鱗甲龍", series:"星塵第二彈", stars:6,
    type1:"龍", type2:"飛行", moveName:"龍爪", moveType:"龍",
    hp:195, attack:135, defense:95, spAtk:60, spDef:80, speed:100 },

  { cardId:"1-2-007", diskCode:"1-2-007", name:"超級沙奈朵", series:"星塵第二彈", stars:6,
    type1:"超能力", type2:"妖精", moveName:"精神強念", moveType:"超能力",
    hp:168, attack:65, defense:95, spAtk:175, spDef:145, speed:80 },

  { cardId:"1-2-008", diskCode:"1-2-008", name:"萊希拉姆", series:"星塵第二彈", stars:6,
    type1:"龍", type2:"火", moveName:"交錯火焰", moveType:"火",
    hp:205, attack:120, defense:100, spAtk:150, spDef:120, speed:90 },

  { cardId:"1-2-009", diskCode:"1-2-009", name:"捷克羅姆", series:"星塵第二彈", stars:6,
    type1:"龍", type2:"電", moveName:"交錯閃電", moveType:"電",
    hp:205, attack:150, defense:120, spAtk:120, spDef:100, speed:90 },

  { cardId:"1-2-010", diskCode:"1-2-010", name:"酋雷姆", series:"星塵第二彈", stars:6,
    type1:"龍", type2:"冰", moveName:"暴風雪", moveType:"冰",
    hp:215, attack:130, defense:90, spAtk:130, spDef:90, speed:95 },

  // --- ★5 明星 ---
  { cardId:"1-2-011", diskCode:"1-2-011", name:"雷伊布", series:"星塵第二彈", stars:5,
    type1:"電", type2:"", moveName:"放電", moveType:"電",
    hp:145, attack:65, defense:60, spAtk:110, spDef:95, speed:110 },

  { cardId:"1-2-012", diskCode:"1-2-012", name:"太陽伊布", series:"星塵第二彈", stars:5,
    type1:"超能力", type2:"", moveName:"精神強念", moveType:"超能力",
    hp:130, attack:65, defense:60, spAtk:130, spDef:95, speed:110 },

  { cardId:"1-2-013", diskCode:"1-2-013", name:"葉伊布", series:"星塵第二彈", stars:5,
    type1:"草", type2:"", moveName:"葉刃", moveType:"草",
    hp:145, attack:110, defense:130, spAtk:60, spDef:65, speed:95 },

  { cardId:"1-2-014", diskCode:"1-2-014", name:"仙子伊布", series:"星塵第二彈", stars:5,
    type1:"妖精", type2:"", moveName:"月亮力量", moveType:"妖精",
    hp:150, attack:65, defense:65, spAtk:95, spDef:130, speed:60 },

  { cardId:"1-2-015", diskCode:"1-2-015", name:"路卡利歐", series:"星塵第二彈", stars:5,
    type1:"格鬥", type2:"鋼", moveName:"波導彈", moveType:"格鬥",
    hp:135, attack:115, defense:70, spAtk:115, spDef:70, speed:90 },

  { cardId:"1-2-016", diskCode:"1-2-016", name:"土台龜", series:"星塵第二彈", stars:5,
    type1:"草", type2:"水", moveName:"葉刃衝擊", moveType:"草",
    hp:155, attack:95, defense:125, spAtk:55, spDef:105, speed:52 },

  { cardId:"1-2-017", diskCode:"1-2-017", name:"烈焰猴", series:"星塵第二彈", stars:5,
    type1:"火", type2:"格鬥", moveName:"火焰輪", moveType:"火",
    hp:155, attack:104, defense:71, spAtk:104, spDef:71, speed:108 },

  { cardId:"1-2-018", diskCode:"1-2-018", name:"帝王拿波", series:"星塵第二彈", stars:5,
    type1:"水", type2:"惡", moveName:"冰刃", moveType:"水",
    hp:155, attack:92, defense:65, spAtk:87, spDef:65, speed:91 },

  { cardId:"1-2-019", diskCode:"1-2-019", name:"阿羅拉九尾", series:"星塵第二彈", stars:5,
    type1:"冰", type2:"妖精", moveName:"冰凍光線", moveType:"冰",
    hp:145, attack:67, defense:75, spAtk:81, spDef:100, speed:100 },

  { cardId:"1-2-020", diskCode:"1-2-020", name:"班基拉斯★", series:"星塵第二彈", stars:5,
    type1:"岩石", type2:"惡", moveName:"岩石炮", moveType:"岩石",
    hp:205, attack:134, defense:110, spAtk:95, spDef:100, speed:61 },

  { cardId:"1-2-021", diskCode:"1-2-021", name:"巨金怪★", series:"星塵第二彈", stars:5,
    type1:"鋼", type2:"超能力", moveName:"閃光炮", moveType:"鋼",
    hp:185, attack:130, defense:130, spAtk:95, spDef:90, speed:70 },

  { cardId:"1-2-022", diskCode:"1-2-022", name:"蘋裹龍", series:"星塵第二彈", stars:5,
    type1:"草", type2:"龍", moveName:"果實轟炸", moveType:"草",
    hp:165, attack:110, defense:80, spAtk:95, spDef:80, speed:70 },

  { cardId:"1-2-023", diskCode:"1-2-023", name:"豐蜜龍", series:"星塵第二彈", stars:5,
    type1:"一般", type2:"龍", moveName:"龍爪", moveType:"龍",
    hp:160, attack:100, defense:70, spAtk:70, spDef:70, speed:60 },

  { cardId:"1-2-024", diskCode:"1-2-024", name:"霜奶仙", series:"星塵第二彈", stars:5,
    type1:"冰", type2:"妖精", moveName:"冷凍拳", moveType:"冰",
    hp:165, attack:80, defense:90, spAtk:110, spDef:90, speed:65 },

  { cardId:"1-2-025", diskCode:"1-2-025", name:"暴噬龜", series:"星塵第二彈", stars:5,
    type1:"水", type2:"", moveName:"水炮", moveType:"水",
    hp:165, attack:83, defense:100, spAtk:85, spDef:105, speed:78 },

  // --- ★4 精選 ---
  { cardId:"1-2-026", diskCode:"1-2-026", name:"魔幻假面喵", series:"星塵第二彈", stars:4,
    type1:"草", type2:"惡", moveName:"千變萬花", moveType:"草",
    hp:134, attack:124, defense:74, spAtk:90, spDef:74, speed:123 },

  { cardId:"1-2-027", diskCode:"1-2-027", name:"骨紋巨聲鱷", series:"星塵第二彈", stars:4,
    type1:"火", type2:"幽靈", moveName:"閃焰歌聲", moveType:"火",
    hp:153, attack:79, defense:104, spAtk:114, spDef:79, speed:68 },

  { cardId:"1-2-028", diskCode:"1-2-028", name:"狂歡浪舞鴨", series:"星塵第二彈", stars:4,
    type1:"水", type2:"格鬥", moveName:"下盤踢", moveType:"格鬥",
    hp:139, attack:120, defense:81, spAtk:86, spDef:77, speed:86 },

  { cardId:"1-2-029", diskCode:"1-2-029", name:"炭小侍", series:"星塵第二彈", stars:4,
    type1:"火", type2:"", moveName:"炭火衝", moveType:"火",
    hp:145, attack:115, defense:70, spAtk:55, spDef:70, speed:80 },

  { cardId:"1-2-030", diskCode:"1-2-030", name:"涼脊龍", series:"星塵第二彈", stars:4,
    type1:"龍", type2:"冰", moveName:"冰刃", moveType:"冰",
    hp:145, attack:90, defense:65, spAtk:80, spDef:65, speed:90 },

  { cardId:"1-2-031", diskCode:"1-2-031", name:"布撥", series:"星塵第二彈", stars:4,
    type1:"草", type2:"飛行", moveName:"飛翔草刃", moveType:"草",
    hp:135, attack:80, defense:70, spAtk:105, spDef:70, speed:90 },

  { cardId:"1-2-032", diskCode:"1-2-032", name:"小福蛋", series:"星塵第二彈", stars:4,
    type1:"妖精", type2:"", moveName:"月亮力量", moveType:"妖精",
    hp:135, attack:45, defense:20, spAtk:45, spDef:25, speed:60 },

  { cardId:"1-2-033", diskCode:"1-2-033", name:"沙奈朵", series:"星塵第二彈", stars:4,
    type1:"超能力", type2:"妖精", moveName:"念力", moveType:"超能力",
    hp:145, attack:45, defense:65, spAtk:100, spDef:120, speed:80 },

  { cardId:"1-2-034", diskCode:"1-2-034", name:"百鱗魚", series:"星塵第二彈", stars:4,
    type1:"水", type2:"", moveName:"水之波動", moveType:"水",
    hp:140, attack:60, defense:65, spAtk:60, spDef:80, speed:80 },

  { cardId:"1-2-035", diskCode:"1-2-035", name:"菊草葉", series:"星塵第二彈", stars:4,
    type1:"草", type2:"", moveName:"葉刃", moveType:"草",
    hp:120, attack:49, defense:65, spAtk:49, spDef:65, speed:45 },

  { cardId:"1-2-036", diskCode:"1-2-036", name:"火球鼠", series:"星塵第二彈", stars:4,
    type1:"火", type2:"", moveName:"炭火", moveType:"火",
    hp:115, attack:52, defense:43, spAtk:60, spDef:50, speed:65 },

  { cardId:"1-2-037", diskCode:"1-2-037", name:"小鋸鱷★", series:"星塵第二彈", stars:4,
    type1:"水", type2:"", moveName:"水槍", moveType:"水",
    hp:109, attack:59, defense:35, spAtk:35, spDef:35, speed:42 },

  // --- ★3 普通 ---
  { cardId:"1-2-038", diskCode:"1-2-038", name:"鯉魚王", series:"星塵第二彈", stars:3,
    type1:"水", type2:"", moveName:"拍打", moveType:"一般",
    hp:120, attack:10, defense:55, spAtk:15, spDef:20, speed:80 },

  { cardId:"1-2-039", diskCode:"1-2-039", name:"卡蒂狗", series:"星塵第二彈", stars:3,
    type1:"一般", type2:"", moveName:"抓取", moveType:"一般",
    hp:110, attack:45, defense:35, spAtk:35, spDef:35, speed:96 },

  { cardId:"1-2-040", diskCode:"1-2-040", name:"小磁怪", series:"星塵第二彈", stars:3,
    type1:"電", type2:"鋼", moveName:"放電", moveType:"電",
    hp:105, attack:35, defense:70, spAtk:95, spDef:55, speed:45 },

  { cardId:"1-2-041", diskCode:"1-2-041", name:"可達鴨★", series:"星塵第二彈", stars:3,
    type1:"水", type2:"", moveName:"水槍", moveType:"水",
    hp:110, attack:52, defense:48, spAtk:65, spDef:50, speed:55 },

  { cardId:"1-2-042", diskCode:"1-2-042", name:"瓦斯彈", series:"星塵第二彈", stars:3,
    type1:"幽靈", type2:"毒", moveName:"影子球", moveType:"幽靈",
    hp:100, attack:35, defense:37, spAtk:35, spDef:75, speed:70 },

  { cardId:"1-2-043", diskCode:"1-2-043", name:"草芽兒", series:"星塵第二彈", stars:3,
    type1:"草", type2:"", moveName:"藤鞭", moveType:"草",
    hp:115, attack:45, defense:35, spAtk:45, spDef:55, speed:70 },

  // --- ★2 ---
  { cardId:"1-2-044", diskCode:"1-2-044", name:"角球貘", series:"星塵第二彈", stars:2,
    type1:"一般", type2:"", moveName:"身體攻擊", moveType:"一般",
    hp:110, attack:70, defense:65, spAtk:45, spDef:55, speed:60 },

  { cardId:"1-2-045", diskCode:"1-2-045", name:"搖籃百合", series:"星塵第二彈", stars:2,
    type1:"草", type2:"", moveName:"飛葉刀", moveType:"草",
    hp:105, attack:60, defense:45, spAtk:75, spDef:50, speed:50 },

  { cardId:"1-2-046", diskCode:"1-2-046", name:"拉普拉斯", series:"星塵第二彈", stars:2,
    type1:"水", type2:"冰", moveName:"冰凍光線", moveType:"冰",
    hp:175, attack:85, defense:80, spAtk:85, spDef:95, speed:60 },

  // --- ★1 ---
  { cardId:"1-2-047", diskCode:"1-2-047", name:"豆豆鴿", series:"星塵第二彈", stars:1,
    type1:"一般", type2:"飛行", moveName:"振翅", moveType:"飛行",
    hp:90, attack:36, defense:25, spAtk:25, spDef:35, speed:35 },

  { cardId:"1-2-048", diskCode:"1-2-048", name:"哇唧哇唧", series:"星塵第二彈", stars:1,
    type1:"水", type2:"", moveName:"泡沫", moveType:"水",
    hp:100, attack:44, defense:23, spAtk:22, spDef:23, speed:40 },

  { cardId:"1-2-049", diskCode:"1-2-049", name:"橡實小俠", series:"星塵第二彈", stars:1,
    type1:"草", type2:"", moveName:"葉刃", moveType:"草",
    hp:100, attack:55, defense:40, spAtk:35, spDef:40, speed:71 },

  { cardId:"1-2-050", diskCode:"1-2-050", name:"頭盔蟲", series:"星塵第二彈", stars:1,
    type1:"蟲", type2:"岩石", moveName:"岩石投擲", moveType:"岩石",
    hp:105, attack:55, defense:85, spAtk:35, spDef:35, speed:20 },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. Helper 工具函式
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// 根據「中文名稱」模糊比對（for OCR 辨識使用）
export function findPokemonByName(name) {
  if (!name) return null;
  const cleanName = name.trim();
  // 完全比對
  let found = PRESET_POKEMON_DB.find(p => p.name === cleanName);
  if (found) return found;
  // 部分比對（OCR 辨識可能只抓到名字的一部分）
  found = PRESET_POKEMON_DB.find(p =>
    cleanName.includes(p.name) || p.name.includes(cleanName)
  );
  return found || null;
}

// 根據「卡號 diskCode」查找
export function findPokemonByCode(code) {
  if (!code) return null;
  return PRESET_POKEMON_DB.find(p => p.diskCode === code.trim()) || null;
}

// 5. 屬性相剋倍率計算
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

// 6. 智慧推薦演算法
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
    const statSum = (Number(card.hp) || 0) + (Number(card.attack) || 0) + (Number(card.defense) || 0);
    const starWeight = (Number(card.stars) || 1) * 35;
    let score = 0;
    if (offenseMult > 1) {
      score += (offenseMult - 1) * 200;
    } else if (offenseMult < 1) {
      score += (offenseMult - 1) * 150;
    }
    score += (1 - worstDefenseMult) * 80;
    score += statSum * 0.3 + starWeight;

    return { card, score: Math.round(score), offenseMult, defenseMult: worstDefenseMult };
  });

  return scored.sort((a, b) => b.score - a.score);
}
