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

// 接近遊戲實際造型的屬性符號（白色，24×24 viewBox）
const TYPE_SYMBOLS = {
  '一般':   <circle cx="12" cy="12" r="6" fill="white" />,

  '火': <g fill="white">
    <path d="M12 1.5c0 0-5 5-5 9.5a5 5 0 0 0 10 0c0-1.5-.5-3-1.5-4 .5 1 0 2.5-1 2.5s-1.5-1-1-2.5C14 5 13 3 12 1.5z" />
    <path d="M12 8c0 0-2.5 2-2.5 4.5a2.5 2.5 0 0 0 5 0c0-.7-.3-1.5-.7-2 .3.5 0 1.3-.5 1.3s-.8-.5-.5-1.3C13 9.5 12.5 8.5 12 8z" opacity="0.4" />
  </g>,

  '水': <g fill="white">
    <path d="M12 2c0 0-7 8-7 13a7 7 0 0 0 14 0c0-5-7-13-7-13zm0 17a4 4 0 0 1-4-4c0-1.5 1-3.5 4-7 3 3.5 4 5.5 4 7a4 4 0 0 1-4 4z" />
    <ellipse cx="10" cy="14" rx="1.2" ry="1.8" fill="#6890F0" opacity="0.5" />
  </g>,

  '草': <g fill="white">
    <path d="M3 21C3 12 8 5 21 3c-1 9-5 15-13 18-1.5.5-3 .5-5 0z" />
    <path d="M3 21c4-1 8-3 12-7" stroke="#78C850" strokeWidth="1.5" fill="none" opacity="0.6" />
  </g>,

  '電': <g fill="white">
    <path d="M13 1L4 13h6l-2 10 11-13h-7l1-9z" />
  </g>,

  '冰': <g stroke="white" strokeWidth="2" strokeLinecap="round" fill="none">
    <path d="M12 2v20" />
    <path d="M4 7l16 10" />
    <path d="M4 17l16-10" />
    <path d="M12 2l-3 3M12 2l3 3" />
    <path d="M12 22l-3-3M12 22l3-3" />
  </g>,

  '格鬥': <g fill="white">
    <path d="M9 3a3 3 0 0 0-3 3v4l-3 2a2 2 0 0 0-.5 2.8l3 4.5a2 2 0 0 0 1.7.9h7.6a2 2 0 0 0 1.7-.9l3-4.5a2 2 0 0 0-.5-2.8l-3-2V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
    <rect x="6" y="11" width="3" height="2" fill="#C03028" opacity="0.5" />
  </g>,

  '毒': <g fill="white">
    <path d="M9 1a2 2 0 0 0-2 2v1H5a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-2V3a2 2 0 0 0-2-2 2 2 0 0 0-2 2v1h-2V3a2 2 0 0 0-2-2zM5 11h14a3 3 0 0 1 3 3v4a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5v-4a3 3 0 0 1 3-3zm5 3a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm4 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" />
  </g>,

  '地面': <g fill="white">
    <path d="M2 18l4-8h12l4 8z" />
    <rect x="6" y="14" width="2" height="4" fill="#E0C068" opacity="0.4" />
    <rect x="11" y="14" width="2" height="4" fill="#E0C068" opacity="0.4" />
    <rect x="16" y="14" width="2" height="4" fill="#E0C068" opacity="0.4" />
  </g>,

  '飛行': <g fill="white">
    <path d="M2 16c5-2 8-4 10-7 2 3 5 5 10 7-2 0-5 1-7 1 0 2-1 4-3 5-2-1-3-3-3-5-2 0-5-1-7-1z" />
  </g>,

  '超能力': <g fill="white">
    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 3a7 7 0 0 1 6.5 4.5C16 9 14 9 12 9s-4 0-6.5.5A7 7 0 0 1 12 5zm-7 7c.5-1 1.5-1.5 2.5-2C7 11.5 7 12.5 7 12.5s0 1 .5 2.5C6 13.5 5.5 12.5 5 12zm14 0c-.5 1-1.5 1.5-2.5 2 .5-1.5.5-2.5.5-2.5s0-1-.5-2.5c2 1.5 2.5 2.5 3 3z" />
  </g>,

  '蟲': <g fill="white">
    <ellipse cx="12" cy="13" rx="4" ry="6" />
    <path d="M8 9l-4-3M8 13l-4 0M8 17l-4 3M16 9l4-3M16 13l4 0M16 17l4 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
  </g>,

  '岩石': <g fill="white">
    <path d="M5 7l3-4h8l3 4 2 8-3 6H6l-3-6z" />
    <path d="M8 7l1 6M12 5l1 8M16 7l-1 6" stroke="#B8A038" strokeWidth="1" opacity="0.4" />
  </g>,

  '幽靈': <g fill="white">
    <path d="M5 22V12a7 7 0 0 1 14 0v10l-2-2-2 2-2-2-2 2-2-2-2 2z" />
    <circle cx="10" cy="11" r="1.5" fill="#705898" />
    <circle cx="14" cy="11" r="1.5" fill="#705898" />
    <path d="M10 14h4l-2 2z" fill="#705898" />
  </g>,

  '龍': <g fill="white">
    <path d="M2 16c1-5 4-9 8-11l1 2 2-2 1 2 2-2 1 2c4 2 7 6 8 11-2-2-5-3-8-3 1 3 1 5 0 7-2-1-3-2-4-4-1 2-2 3-4 4-1-2-1-4 0-7-3 0-6 1-7 1z" />
  </g>,

  '惡': <g fill="white">
    <path d="M2 12C2 6 6 2 12 2c0 4-2 6-3 7 1-1 3-1 5 0 4 1 7 5 7 9-1-3-3-4-6-4 1 2 0 5-2 6-1-1-1-2-1-4-1 2-3 2-5 2 1-2 2-4 1-7-2 1-4 1-6 1z" />
  </g>,

  '鋼': <g fill="white">
    <path d="M12 2l3 2 3 1 2 3 1 3-1 3-2 3-3 1-3 2-3-2-3-1-2-3-1-3 1-3 2-3 3-1z" />
    <circle cx="12" cy="12" r="3" fill="#B8B8D0" />
  </g>,

  '妖精': <g fill="white">
    <path d="M12 1l3 6 6 1-4.5 4 1 6L12 15l-5.5 3 1-6L3 8l6-1z" />
    <circle cx="9" cy="9" r="0.8" fill="#EE99AC" opacity="0.5" />
    <circle cx="15" cy="11" r="0.8" fill="#EE99AC" opacity="0.5" />
  </g>,
};

export function getTypeColor(type) {
  return TYPE_COLORS[type] || '#A8A878';
}

/**
 * TypeIcon — 接近機台風格的屬性符號圖示
 * @param {string} type - 屬性名（中文，如「火」「水」）
 * @param {number} size - 圖示尺寸 px（預設 36）
 * @param {boolean} selected - 是否選中狀態
 */
export default function TypeIcon({ type, size = 36, selected = false }) {
  const color = TYPE_COLORS[type] || '#A8A878';
  const symbol = TYPE_SYMBOLS[type];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{
        borderRadius: '50%',
        background: color,
        border: selected ? '3px solid #ff9f0a' : '2px solid rgba(255,255,255,0.15)',
        display: 'inline-block',
        flexShrink: 0,
        transition: 'all 0.12s ease',
        boxShadow: selected ? '0 0 12px ' + color + 'aa, 0 0 0 2px #ff9f0a' : '0 1px 3px rgba(0,0,0,0.3)',
        opacity: selected ? 1 : 0.55,
      }}
    >
      {symbol}
    </svg>
  );
}
