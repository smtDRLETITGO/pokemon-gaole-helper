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

// 每個屬性的 SVG 符號 path（24×24 viewBox，白色填色）
const TYPE_SYMBOLS = {
  '一般':   <circle cx="12" cy="12" r="5" />,
  '火':     <path d="M12 2C9 8 4 11 4 15c0 4.4 3.6 8 8 8s8-3.6 8-8c0-4-5-7-8-13z" />,
  '水':     <path d="M12 22C7 14 5 10 5 7c0-3 3-5 7-5s7 2 7 5c0 3-2 7-7 15z" />,
  '草':     <path d="M12 22V4M5 10l7-6 7 6" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />,
  '電':     <path d="M8 2h8l-4 9h5L8 22l3-10H6z" />,
  '冰':     <path d="M12 2v20M6 6l12 12M18 6L6 18" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" />,
  '格鬥':   <><path d="M6 16c2-3 4-5 6-5s4 2 6 5c0 3-2.7 5-6 5s-6-2-6-5z" /><path d="M12 11V2" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" /></>,
  '毒':     <><path d="M12 20c-3 0-5-2-5-5V8a5 5 0 0110 0v7c0 3-2 5-5 5z" /><circle cx="9" cy="9" r="1.2" /><circle cx="15" cy="9" r="1.2" /><circle cx="12" cy="13" r="1" /></>,
  '地面':   <><path d="M2 16h20l-5-8H7z" /><path d="M5 20h14" stroke="white" strokeWidth="1.5" fill="none" /></>,
  '飛行':   <><path d="M2 16c4-2 8-4 10-8 2 4 6 6 10 8" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" /><path d="M4 18c3-1 6-2 8-4 2 2 5 3 8 4" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" /></>,
  '超能力': <><path d="M12 2a5 5 0 010 10 5 5 0 000-10z" /><path d="M7 12a5 5 0 0110 0M7 12v2a5 5 0 0010-2v-2" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" /></>,
  '蟲':     <><path d="M6 8c0-2 2-4 6-4s6 2 6 4v2H6V8z" /><ellipse cx="8" cy="10" rx="2" ry="1.5" /><ellipse cx="16" cy="10" rx="2" ry="1.5" /><path d="M6 10v5c0 2 2.7 4 6 4s6-2 6-4v-5" stroke="white" strokeWidth="1.5" fill="none" /></>,
  '岩石':   <path d="M4 18L8 6h10l4 12z" />,
  '幽靈':   <><path d="M8 22V12a4 4 0 018 0v10" fill="none" stroke="white" strokeWidth="2" /><circle cx="9" cy="9" r="1.5" fill="white" /><circle cx="15" cy="9" r="1.5" fill="white" /><path d="M12 12l3-3" stroke="white" strokeWidth="1.5" fill="none" /></>,
  '龍':     <><path d="M4 12c0-4 2-7 4-8l2 3 2-3 2 3 2-3c2 1 4 4 4 8a8 8 0 01-16 0z" /><path d="M8 12h8M6 15h12" stroke="white" strokeWidth="1.3" fill="none" strokeLinecap="round" /></>,
  '惡':     <><path d="M12 2C7 2 5 5 5 9v3a7 7 0 007 7" fill="none" stroke="white" strokeWidth="2" /><path d="M16 19c3 0 5-2 5-5v-5c0-3-2-5-5-5" fill="none" stroke="white" strokeWidth="1.8" /></>,
  '鋼':     <><rect x="5" y="5" width="14" height="14" rx="2" fill="none" stroke="white" strokeWidth="2" /><rect x="8" y="8" width="8" height="8" rx="1" fill="white" /></>,
  '妖精':   <path d="M12 2l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-1.5z" />,
};

export function getTypeColor(type) {
  return TYPE_COLORS[type] || '#A8A878';
}

/**
 * TypeIcon — 接近機台風格的屬性符號圖示
 * @param {string} type - 屬性名（中文，如「火」「水」）
 * @param {number} size - 圖示尺寸 px（預設 32）
 * @param {boolean} selected - 是否選中狀態
 */
export default function TypeIcon({ type, size = 32, selected = false }) {
  const color = TYPE_COLORS[type] || '#A8A878';
  const symbol = TYPE_SYMBOLS[type];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{
        borderRadius: '6px',
        background: selected ? color : 'rgba(255,255,255,0.08)',
        border: selected ? `2px solid ${color}` : '2px solid transparent',
        display: 'inline-block',
        flexShrink: 0,
        transition: 'all 0.15s ease',
        filter: selected ? 'drop-shadow(0 0 4px ' + color + '88)' : 'none',
      }}
    >
      {symbol ? (
        <g fill={selected ? 'white' : 'rgba(255,255,255,0.5)'} transform="translate(0,0)">
          {symbol}
        </g>
      ) : (
        <text x="12" y="15" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
          {type.charAt(0)}
        </text>
      )}
    </svg>
  );
}
