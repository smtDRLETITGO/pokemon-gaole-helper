// 官方 8 隻支援寶可夢券資料（與 mezastar.easylife.tw 完全一致）
// QR 圖已從 easylife 切割並存放於 public/support_qr/

export const SUPPORT_POKEMON = [
  {
    id: 'negi',
    name: '蔥遊兵',
    enName: 'Sirfetch\u2019d',
    type: '格鬥',
    move: '流星突擊',
    power: 150,
    qrPath: `support_qr/negi.png`,
    color: '#dc2626',        // 紅
  },
  {
    id: 'mimikyu',
    name: '謎擬Q',
    enName: 'Mimikyu',
    type: '幽靈',
    move: '暗影爪',
    power: 70,
    qrPath: `support_qr/mimikyu.png`,
    color: '#7c3aed',        // 紫
  },
  {
    id: 'lapras',
    name: '拉普拉斯',
    enName: 'Lapras',
    type: '冰',
    move: '冷凍光束',
    power: 90,
    qrPath: `support_qr/lapras.png`,
    color: '#06b6d4',        // 青
  },
  {
    id: 'garchomp',
    name: '超級烈咬陸鯊',
    enName: 'Mega Garchomp',
    type: '地面',
    move: '地震',
    power: 100,
    qrPath: `support_qr/garchomp.png`,
    color: '#ea580c',        // 橘
  },
  {
    id: 'flygon',
    name: '沙漠蜻蜓',
    enName: 'Flygon',
    type: '地面',
    move: '地震',
    power: 100,
    qrPath: `support_qr/flygon.png`,
    color: '#ea580c',        // 橘
  },
  {
    id: 'duraludon',
    name: '鋁鋼龍',
    enName: 'Duraludon',
    type: '鋼',
    move: '加農光炮',
    power: 80,
    qrPath: `support_qr/duraludon.png`,
    color: '#16a34a',        // 綠
  },
  {
    id: 'drednaw',
    name: '暴噬龜',
    enName: 'Drednaw',
    type: '岩石',
    move: '雙刃頭錘',
    power: 150,
    qrPath: `support_qr/drednaw.png`,
    color: '#ca8a04',        // 黃
  },
  {
    id: 'corviknight',
    name: '鋼鎧鴉',
    enName: 'Corviknight',
    type: '飛行',
    move: '勇鳥猛攻',
    power: 120,
    qrPath: `support_qr/corviknight.png`,
    color: '#2563eb',        // 藍
  },
];
