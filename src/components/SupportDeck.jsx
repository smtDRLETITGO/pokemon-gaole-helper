import React, { useState, useEffect } from 'react';
import { SUPPORT_POKEMON } from '../data/support_pokemon';

/**
 * SupportDeck — 8 隻官方支援寶可夢券
 * 撲克牌發牌感 + 橢圓形卡片 + 點選展開 QR
 */
export default function SupportDeck() {
  const [selectedId, setSelectedId] = useState(null);
  const [dealt, setDealt] = useState(false);

  // 進場延遲：模擬撲克牌一張張發出來
  useEffect(() => {
    const t = setTimeout(() => setDealt(true), 80);
    return () => clearTimeout(t);
  }, []);

  const selected = selectedId
    ? SUPPORT_POKEMON.find(p => p.id === selectedId)
    : null;

  // ─── 撲克牌橢圓形（MEZASTAR 卡牌造型） ───
  // 用 SVG 描繪：兩端窄、中間寬，下方是彩色條
  const CardShape = ({ pokemon, index, isSelected }) => {
    // 8 張扇形展開：每張旋轉角度 = (index - 3.5) * 4 度
    const fanAngle = (index - (SUPPORT_POKEMON.length - 1) / 2) * 4.5;
    // 8 張間距：稍微靠左排
    const baseOffset = index * 64 - (SUPPORT_POKEMON.length - 1) * 32;

    return (
      <div
        onClick={() => setSelectedId(isSelected ? null : pokemon.id)}
        style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          width: 96,
          height: 140,
          marginLeft: -48 + baseOffset,
          transformOrigin: 'bottom center',
          transform: dealt
            ? `translateY(0) rotate(${isSelected ? 0 : fanAngle}deg) scale(${isSelected ? 1.15 : 1})`
            : `translateY(-200px) rotate(0deg) scale(0.6)`,
          transition: `transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 60}ms, opacity 0.4s ease ${index * 60}ms`,
          cursor: 'pointer',
          opacity: dealt ? (selectedId && !isSelected ? 0.35 : 1) : 0,
          zIndex: isSelected ? 50 : 10 - Math.abs(index - 3.5),
          filter: isSelected ? 'drop-shadow(0 12px 20px rgba(0,0,0,0.4))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
        }}
      >
        {/* 卡片本體（橢圓形 + 彩色條） */}
        <svg
          viewBox="0 0 96 140"
          width="96"
          height="140"
          style={{ display: 'block' }}
        >
          {/* 白色橢圓卡身（兩端窄中間寬） */}
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
          {/* 彩色底部條（橢圓下方，附名稱資訊） */}
          <clipPath id={`clip-${pokemon.id}`}>
            <path d="M 2 90 L 94 90 L 94 138 C 94 138 78 138 48 138 C 18 138 2 138 2 138 Z" />
          </clipPath>
          <rect
            x="0" y="90" width="96" height="50"
            fill={pokemon.color}
            clipPath={`url(#clip-${pokemon.id})`}
          />
          {/* 名字（彩色條上） */}
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
          {/* 屬性 + 招式 */}
          <text
            x="48" y="120"
            textAnchor="middle"
            fontSize="7"
            fontWeight="500"
            fill="rgba(255,255,255,0.95)"
          >
            {pokemon.type}・{pokemon.move}
          </text>
          {/* 點數 */}
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
      </div>
    );
  };

  // ─── 選中卡片展開：顯示完整 QR + 詳情 ───
  if (selected) {
    return (
      <div className="glass-panel mb-4" style={{ padding: '20px 16px', textAlign: 'center' }}>
        {/* 8 張 fan 在頂部（已淡出） */}
        <div style={{ position: 'relative', height: 100, marginBottom: '16px' }}>
          {SUPPORT_POKEMON.map((p, i) => (
            <CardShape key={p.id} pokemon={p} index={i} isSelected={p.id === selectedId} />
          ))}
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
              src={selected.qrPath}
              alt={`${selected.name} QR`}
              style={{ display: 'block', width: 220, height: 220, imageRendering: 'pixelated' }}
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

  // ─── 預設 8 隻 fan 展開 ───
  return (
    <div className="glass-panel mb-4" style={{ padding: '20px 16px 30px', textAlign: 'center', overflow: 'hidden' }}>
      <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#ff9f0a', margin: '0 0 6px' }}>
        🎟 支援寶可夢券
      </h2>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 12px' }}>
        官方 8 隻 — 點任一張看 QR Code
      </p>

      {/* 撲克牌扇形發牌 */}
      <div style={{ position: 'relative', height: 160, marginTop: '8px' }}>
        {SUPPORT_POKEMON.map((p, i) => (
          <CardShape key={p.id} pokemon={p} index={i} isSelected={false} />
        ))}
      </div>

      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '14px' }}>
        資料來源：mezastar 官方券（與 easylife.tw 同步）
      </div>
    </div>
  );
}
