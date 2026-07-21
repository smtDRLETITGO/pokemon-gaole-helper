import React, { useState, useEffect, useRef } from 'react';
import { SUPPORT_POKEMON } from '../data/support_pokemon';

/**
 * SupportDeck — 8 隻官方支援寶可夢券
 * 撲克牌發牌感 + 橢圓形卡片 + 點選展開 QR + 左右滑動瀏覽
 */
export default function SupportDeck() {
  const [selectedId, setSelectedId] = useState(null);
  const [dealt, setDealt] = useState(false);
  const scrollRef = useRef(null);

  // 進場延遲：模擬撲克牌一張張發出來
  useEffect(() => {
    const t = setTimeout(() => setDealt(true), 80);
    return () => clearTimeout(t);
  }, []);

  const selected = selectedId
    ? SUPPORT_POKEMON.find(p => p.id === selectedId)
    : null;

  // 切換選擇時，水平捲到對應卡片
  const selectCard = (id) => {
    setSelectedId(id);
    if (scrollRef.current) {
      const idx = SUPPORT_POKEMON.findIndex(p => p.id === id);
      const cardWidth = 132; // 含 gap
      const offset = idx * cardWidth - (scrollRef.current.clientWidth - 132) / 2;
      scrollRef.current.scrollTo({ left: Math.max(0, offset), behavior: 'smooth' });
    }
  };

  // ─── 橢圓形 MEZASTAR 卡片（直立式） ───
  const CardShape = ({ pokemon, isSelected }) => (
    <svg
      viewBox="0 0 96 140"
      width="120"
      height="172"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <path
        d="M 48 2
           C 78 2 94 30 94 70
           C 94 110 78 138 48 138
           C 18 138 2 110 2 70
           C 2 30 18 2 48 2 Z"
        fill="white"
        stroke={isSelected ? pokemon.color : 'rgba(0,0,0,0.15)'}
        strokeWidth={isSelected ? 3 : 1.2}
      />
      <clipPath id={`clip-${pokemon.id}`}>
        <path d="M 2 90 L 94 90 L 94 138 C 94 138 78 138 48 138 C 18 138 2 138 2 138 Z" />
      </clipPath>
      <rect
        x="0" y="90" width="96" height="50"
        fill={pokemon.color}
        clipPath={`url(#clip-${pokemon.id})`}
      />
      <text
        x="48" y="106"
        textAnchor="middle"
        fontSize="11"
        fontWeight="800"
        fill="white"
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
      >
        {pokemon.name}
      </text>
      <text
        x="48" y="120"
        textAnchor="middle"
        fontSize="7"
        fontWeight="500"
        fill="rgba(255,255,255,0.95)"
      >
        {pokemon.type}・{pokemon.move}
      </text>
      <text
        x="48" y="132"
        textAnchor="middle"
        fontSize="10"
        fontWeight="900"
        fill="white"
      >
        {pokemon.power}
      </text>
    </svg>
  );

  // ─── 選中卡片展開：顯示完整 QR + 詳情 ───
  if (selected) {
    return (
      <div className="glass-panel mb-4" style={{ padding: '16px', textAlign: 'center' }}>
        {/* 上方：可滑動的卡片橫條（淡化當前選中） */}
        <div
          ref={scrollRef}
          style={{
            display: 'flex',
            gap: 10,
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            padding: '8px 12px 12px',
            margin: '0 -16px 16px',
            scrollbarWidth: 'none',
          }}
        >
          {SUPPORT_POKEMON.map((p) => {
            const isSel = p.id === selectedId;
            return (
              <div
                key={p.id}
                onClick={() => selectCard(p.id)}
                style={{
                  scrollSnapAlign: 'center',
                  flexShrink: 0,
                  cursor: 'pointer',
                  opacity: isSel ? 1 : 0.4,
                  transform: isSel ? 'translateY(-6px) scale(1.05)' : 'scale(0.92)',
                  transition: 'all 0.25s ease',
                  filter: isSel ? `drop-shadow(0 8px 16px ${p.color}66)` : 'none',
                }}
              >
                <CardShape pokemon={p} isSelected={isSel} />
              </div>
            );
          })}
        </div>

        {/* 詳情區：QR + 名字 + 屬性 + 招式 + 點數 */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: `2px solid ${selected.color}`,
          borderRadius: '16px',
          padding: '16px',
          boxShadow: `0 0 30px ${selected.color}33`,
        }}>
          {/* QR Code */}
          <div style={{
            display: 'inline-block',
            padding: '12px',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            marginBottom: '14px',
          }}>
            <img
              src={import.meta.env.BASE_URL + selected.qrPath}
              alt={`${selected.name} QR`}
              style={{ display: 'block', width: 200, height: 200, maxWidth: '100%', objectFit: 'contain' }}
            />
          </div>

          {/* 名稱大字 */}
          <h2 style={{
            fontSize: '28px', fontWeight: '900', margin: '6px 0 4px',
            color: selected.color, textShadow: '0 2px 4px rgba(0,0,0,0.3)',
          }}>
            {selected.name}
          </h2>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px' }}>
            {selected.enName}
          </div>

          {/* 攻擊資訊 */}
          <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
            marginBottom: '12px', flexWrap: 'wrap',
          }}>
            <span className={`type-badge type-${selected.type}`} style={{ fontSize: '14px', padding: '4px 12px' }}>
              {selected.type}
            </span>
            <span style={{ fontSize: '20px', color: 'rgba(255,255,255,0.4)' }}>·</span>
            <span style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>
              {selected.move}
            </span>
            <span style={{ fontSize: '20px', color: 'rgba(255,255,255,0.4)' }}>·</span>
            <span style={{ fontSize: '24px', fontWeight: '900', color: selected.color }}>
              {selected.power}
            </span>
          </div>

          <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            💡 機台戰鬥前，將 QR 對準機台鏡頭即可使用
          </div>
        </div>

        {/* 關閉按鈕 */}
        <button
          onClick={() => setSelectedId(null)}
          style={{
            marginTop: '12px',
            background: 'rgba(255,69,58,0.15)', border: '1px solid rgba(255,69,58,0.3)',
            borderRadius: '10px', padding: '8px 24px', color: '#ff453a',
            fontSize: '13px', fontWeight: 'bold', cursor: 'pointer',
          }}
        >
          ✕ 關閉，回到 8 隻
        </button>
      </div>
    );
  }

  // ─── 預設 8 隻 fan（可滑動瀏覽） ───
  return (
    <div className="glass-panel mb-4" style={{ padding: '20px 0 24px', textAlign: 'center', overflow: 'hidden' }}>
      <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#ff9f0a', margin: '0 0 4px' }}>
        🎟 支援寶可夢券
      </h2>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 6px' }}>
        官方 8 隻 · 左右滑動瀏覽 · 點任一張看 QR
      </p>

      {/* 撲克牌橫向可滑動 */}
      <div
        ref={scrollRef}
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          padding: '16px 24px 20px',
          scrollbarWidth: 'none',
        }}
      >
        {SUPPORT_POKEMON.map((p, i) => (
          <div
            key={p.id}
            onClick={() => selectCard(p.id)}
            style={{
              scrollSnapAlign: 'center',
              flexShrink: 0,
              cursor: 'pointer',
              opacity: dealt ? 1 : 0,
              transform: dealt
                ? 'translateY(0) scale(1)'
                : 'translateY(-80px) scale(0.6)',
              transition: `transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 60}ms, opacity 0.3s ease ${i * 60}ms`,
            }}
          >
            <CardShape pokemon={p} isSelected={false} />
          </div>
        ))}
      </div>

      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
        ← 左右滑動看更多 · 資料來源：mezastar 官方券（與 easylife.tw 同步）
      </div>
    </div>
  );
}
