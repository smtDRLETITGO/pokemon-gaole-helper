/**
 * bossPresets.js — 銀河系列熱門 6 星首領關卡預設包
 * ⚠️ 關鍵設定：配合機台螢幕顯示的「效果絕佳/有利招式」，
 * 點擊首領按鈕時，自動帶入的是「剋制該首領與陪襯寶可夢的【有利招式屬性】」！
 */

export const GALAXY_2_BOSS_PRESETS = [
  {
    id: 'zarude',
    name: '薩戮德',
    series: '銀河第二彈',
    stars: 6,
    bossRawTypes: ['草', '惡'],
    bossMoveType: '草',
    // 剋制薩戮德的有利招式 (蟲4x, 火/冰/格2x)
    advantageousTypes: ['蟲', '火', '冰', '格鬥'],
    companionAdvantageousTypes: [['火', '草'], ['蟲', '火']],
    avatarBg: '#15803d',
    weaknessText: '🎯 有利招式：蟲(4x) 火/冰/格(2x)',
  },
  {
    id: 'zacian',
    name: '蒼響',
    series: '銀河第二彈',
    stars: 6,
    bossRawTypes: ['妖精', '鋼'],
    bossMoveType: '鋼',
    // 剋制蒼響的有利招式 (火/地面 2x)
    advantageousTypes: ['火', '地面'],
    companionAdvantageousTypes: [['火', '地面'], ['超能力', '格鬥']],
    avatarBg: '#0284c7',
    weaknessText: '🎯 有利招式：火/地面(2x)',
  },
  {
    id: 'zamazenta',
    name: '藏瑪然特',
    series: '銀河第二彈',
    stars: 6,
    bossRawTypes: ['格鬥', '鋼'],
    bossMoveType: '鋼',
    // 剋制藏瑪然特的有利招式 (火/地面/格鬥 2x)
    advantageousTypes: ['火', '地面', '格鬥'],
    companionAdvantageousTypes: [['火', '格鬥'], ['超能力', '格鬥']],
    avatarBg: '#b91c1c',
    weaknessText: '🎯 有利招式：火/地面/格鬥(2x)',
  },
  {
    id: 'duraludon',
    name: '鋁鋼龍',
    series: '銀河第二彈',
    stars: 6,
    bossRawTypes: ['鋼', '龍'],
    bossMoveType: '鋼',
    // 剋制鋁鋼龍的有利招式 (格鬥/地面 2x)
    advantageousTypes: ['格鬥', '地面'],
    companionAdvantageousTypes: [['格鬥', '地面'], ['火', '地面']],
    avatarBg: '#475569',
    weaknessText: '🎯 有利招式：格鬥/地面(2x)',
  },
  {
    id: 'charizard',
    name: '噴火龍',
    series: '銀河第二彈',
    stars: 6,
    bossRawTypes: ['火', '飛行'],
    bossMoveType: '火',
    // 剋制噴火龍的有利招式 (岩石4x, 水/電2x)
    advantageousTypes: ['岩石', '水', '電'],
    companionAdvantageousTypes: [['水', '地面'], ['格鬥', '岩石']],
    avatarBg: '#ea580c',
    weaknessText: '🎯 有利招式：岩石(4x) 水/電(2x)',
  },
  {
    id: 'lucario',
    name: '路卡利歐',
    series: '銀河第二彈',
    stars: 6,
    bossRawTypes: ['格鬥', '鋼'],
    bossMoveType: '格鬥',
    // 剋制路卡利歐的有利招式 (火/格鬥/地面 2x)
    advantageousTypes: ['火', '格鬥', '地面'],
    companionAdvantageousTypes: [['超能力', '飛行'], ['火', '格鬥']],
    avatarBg: '#2563eb',
    weaknessText: '🎯 有利招式：火/格鬥/地面(2x)',
  },
  {
    id: 'rayquaza',
    name: '烈空坐',
    series: '銀河第二彈',
    stars: 6,
    bossRawTypes: ['龍', '飛行'],
    bossMoveType: '飛行',
    // 剋制烈空坐的有利招式 (冰4x, 岩石/龍/妖精2x)
    advantageousTypes: ['冰', '岩石', '妖精'],
    companionAdvantageousTypes: [['冰', '妖精'], ['惡', '冰']],
    avatarBg: '#047857',
    weaknessText: '🎯 有利招式：冰(4x) 岩/龍/妖(2x)',
  },
  {
    id: 'naganadel',
    name: '四顎針龍',
    series: '銀河第二彈',
    stars: 6,
    bossRawTypes: ['毒', '龍'],
    bossMoveType: '毒',
    // 剋制四顎針龍的有利招式 (冰/地面/龍/超能力 2x)
    advantageousTypes: ['冰', '地面', '龍', '超能力'],
    companionAdvantageousTypes: [['地面', '超能力'], ['冰', '地面']],
    avatarBg: '#7e22ce',
    weaknessText: '🎯 有利招式：冰/地面/龍/超(2x)',
  },
  {
    id: 'latias',
    name: '拉帝亞斯',
    series: '銀河第二彈',
    stars: 6,
    bossRawTypes: ['龍', '超能力'],
    bossMoveType: '超能力',
    // 剋制拉帝亞斯的有利招式 (蟲/幽靈/惡/冰/妖精 2x)
    advantageousTypes: ['蟲', '幽靈', '惡', '冰', '妖精'],
    companionAdvantageousTypes: [['惡', '幽靈'], ['蟲', '妖精']],
    avatarBg: '#db2777',
    weaknessText: '🎯 有利招式：蟲/幽/惡/冰/妖(2x)',
  },
  {
    id: 'latios',
    name: '拉帝歐斯',
    series: '銀河第二彈',
    stars: 6,
    bossRawTypes: ['龍', '超能力'],
    bossMoveType: '超能力',
    // 剋制拉帝歐斯的有利招式 (蟲/幽靈/惡/冰/妖精 2x)
    advantageousTypes: ['蟲', '幽靈', '惡', '冰', '妖精'],
    companionAdvantageousTypes: [['惡', '幽靈'], ['蟲', '妖精']],
    avatarBg: '#4f46e5',
    weaknessText: '🎯 有利招式：蟲/幽/惡/冰/妖(2x)',
  },
];
