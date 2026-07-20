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

// 中文→英文（用於對應官方 SVG 檔名）
const TYPE_TO_EN = {
  '一般':   'normal',
  '火':     'fire',
  '水':     'water',
  '草':     'grass',
  '電':     'electric',
  '冰':     'ice',
  '格鬥':   'fighting',
  '毒':     'poison',
  '地面':   'ground',
  '飛行':   'flying',
  '超能力': 'psychic',
  '蟲':     'bug',
  '岩石':   'rock',
  '幽靈':   'ghost',
  '龍':     'dragon',
  '惡':     'dark',
  '鋼':     'steel',
  '妖精':   'fairy',
};

export function getTypeColor(type) {
  return TYPE_COLORS[type] || '#A8A878';
}

export function getTypeEn(type) {
  return TYPE_TO_EN[type] || 'normal';
}

/**
 * TypeIcon — 官方 Pokémon 屬性符號
 * 使用 public/types/{en}.svg（duiker101/pokemon-type-svg-icons 開源）
 * @param {string} type - 屬性名（中文，如「火」「水」）
 * @param {number} size - 圖示尺寸 px（預設 40）
 * @param {boolean} selected - 是否選中狀態
 */
export default function TypeIcon({ type, size = 40, selected = false }) {
  const color = TYPE_COLORS[type] || '#A8A878';
  const en = TYPE_TO_EN[type] || 'normal';
  const src = `${import.meta.env.BASE_URL}types/${en}.svg`;

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
