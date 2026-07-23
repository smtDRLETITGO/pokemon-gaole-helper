import React from 'react';

// 屬性專屬色（標準遊戲配色）
export const TYPE_COLORS = {
  '一般':   '#A8A878',
  '火':     '#F08030',
  '水':     '#6890F0',
  '草':     '#78C850',
  '電':     '#F8D030',
  '冰':     '#98D8D8',
  '格鬥':   '#C03028',
  '毒':     '#A040A0',
  '地面':   '#E0C068',
  '飛行':   '#A890F0',
  '超能力': '#F85888',
  '蟲':     '#A8B820',
  '岩石':   '#B8A038',
  '幽靈':   '#705898',
  '龍':     '#7038F8',
  '惡':     '#705848',
  '鋼':     '#B8B8D0',
  '妖精':   '#EE99AC',
};

// 中文→檔名（MEZASTAR 系列 SVG 採中文命名）
const TYPE_TO_FILE = {
  '一般':   '一般',
  '火':     '火',
  '水':     '水',
  '草':     '草',
  '電':     '電',
  '冰':     '冰',
  '格鬥':   '格鬥',
  '毒':     '毒',
  '地面':   '地面',
  '飛行':   '飛行',
  '超能力': '超能力',
  '蟲':     '蟲',
  '岩石':   '岩石',
  '幽靈':   '幽靈',
  '龍':     '龍',
  '惡':     '惡',
  '鋼':     '鋼',
  '妖精':   '妖精',
};

export function getTypeColor(type) {
  return TYPE_COLORS[type] || '#A8A878';
}

export function getTypeFile(type) {
  return TYPE_TO_FILE[type] || '一般';
}

/**
 * TypeIcon — 官方 Pokémon 屬性符號
 * 使用 public/types/{zh}.svg（MEZASTAR 系列官方風格）
 * @param {string} type - 屬性名（中文，如「火」「水」）
 * @param {number} size - 圖示尺寸 px（預設 40）
 * @param {boolean} selected - 是否選中狀態
 */
export default function TypeIcon({ type, size = 40, selected = false }) {
  const color = TYPE_COLORS[type] || '#A8A878';
  const file = TYPE_TO_FILE[type] || '一般';
  const version = '20260723-swap';
  const src = `${import.meta.env.BASE_URL}types/${file}.svg?v=${version}`;

  // icon 內部佔 76% 大小，留些 padding
  const iconPx = Math.round(size * 0.72);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        border: selected ? '3px solid #ff9f0a' : '2px solid rgba(255,255,255,0.12)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'all 0.12s ease',
        boxShadow: selected ? '0 0 12px ' + color + 'aa, 0 0 0 2px #ff9f0a' : '0 1px 3px rgba(0,0,0,0.3)',
        opacity: selected ? 1 : 0.5,
      }}
    >
      <img
        src={src}
        alt={type}
        width={iconPx}
        height={iconPx}
        style={{ display: 'block', pointerEvents: 'none' }}
      />
    </div>
  );
}
