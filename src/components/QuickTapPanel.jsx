import React, { useState } from 'react';
import { PRESET_POKEMON_DB } from '../data/pokemonDb';

export default function QuickTapPanel({ selectedOpponents, onToggleOpponent, onClearOpponents }) {
  const [searchTerm, setSearchTerm] = useState('');

  // Get all preset 4 and 5 star Pokémon as the default Quick-Tap list
  const presetBosses = PRESET_POKEMON_DB.filter(p => p.stars >= 4);

  // Filter based on search term
  const filteredBosses = presetBosses.filter(boss => 
    boss.name.includes(searchTerm) || 
    boss.moveType.includes(searchTerm) ||
    boss.type1.includes(searchTerm) ||
    (boss.type2 && boss.type2.includes(searchTerm))
  );

  // Helper emoji by type
  const getTypeEmoji = (type) => {
    const emojis = {
      "火": "🔥", "水": "💧", "草": "🍃", "電": "⚡", "冰": "❄️", 
      "格鬥": "🥊", "地面": "⛰️", "飛行": "🦅", "超能力": "🔮", 
      "幽靈": "👻", "龍": "🐲", "惡": "😈", "鋼": "🛡️", "妖精": "✨"
    };
    return emojis[type] || "⚪";
  };

  return (
    <div className="glass-panel mb-4">
      <div className="flex justify-between align-center mb-4">
        <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#ff453a' }}>
          ⚔️ 機台對手「一鍵快選」
        </h2>
        {selectedOpponents.length > 0 && (
          <button 
            onClick={onClearOpponents}
            style={{
              background: 'rgba(255, 69, 58, 0.15)',
              border: '1px solid rgba(255, 69, 58, 0.3)',
              borderRadius: '8px',
              padding: '4px 10px',
              color: '#ff453a',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            重設對手
          </button>
        )}
      </div>

      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
        請點擊機台畫面上出現的對手（最多可選 2 隻，點擊可取消）：
      </p>

      {/* Selected Indicator Panel */}
      {selectedOpponents.length > 0 && (
        <div style={{ 
          display: 'flex', 
          gap: '10px', 
          marginBottom: '16px', 
          padding: '12px', 
          background: 'rgba(255, 255, 255, 0.03)', 
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '10px'
        }}>
          {selectedOpponents.map((opp, idx) => (
            <div 
              key={opp.cardId + '-' + idx}
              onClick={() => onToggleOpponent(opp)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                background: opp.stars === 5 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                border: opp.stars === 5 ? '1px solid #f59e0b' : '1px solid #a855f7',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              <span>{opp.stars === 5 ? '🌟 5★' : '⭐ 4★'} {opp.name}</span>
              <div style={{ display: 'flex', gap: '3px' }}>
                <span className={`type-badge type-${opp.type1}`} style={{ padding: '1px 4px', fontSize: '10px', borderRadius: '4px' }}>{opp.type1}</span>
                {opp.type2 && <span className={`type-badge type-${opp.type2}`} style={{ padding: '1px 4px', fontSize: '10px', borderRadius: '4px' }}>{opp.type2}</span>}
              </div>
              <span style={{ color: '#ff453a', marginLeft: '4px' }}>✕</span>
            </div>
          ))}
        </div>
      )}

      {/* Search Filter */}
      <input
        type="text"
        className="input-field"
        placeholder="🔍 搜尋對手名稱或屬性 (例如：超甲狂犀、草)..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ marginBottom: '14px' }}
      />

      {/* Boss Selector Grid */}
      <div 
        className="boss-grid" 
        style={{ 
          maxHeight: '260px', 
          overflowY: 'auto',
          paddingRight: '4px'
        }}
      >
        {filteredBosses.length > 0 ? (
          filteredBosses.map((boss) => {
            const isSelected = selectedOpponents.some(opp => opp.cardId === boss.cardId);
            return (
              <div 
                key={boss.cardId}
                className={`boss-card ${isSelected ? 'selected' : ''} ${boss.stars === 5 ? 'grade-5' : 'grade-4'}`}
                onClick={() => onToggleOpponent(boss)}
              >
                {boss.stars === 5 && <span className="boss-badge-stars">5★</span>}
                {boss.stars === 4 && <span className="boss-badge-stars" style={{ background: '#a855f7', color: '#fff' }}>4★</span>}
                <div className="boss-avatar-mock">
                  {getTypeEmoji(boss.type1)}
                </div>
                <div className="boss-name">{boss.name}</div>
                <div style={{ display: 'flex', gap: '2px', marginTop: '4px' }}>
                  <span className={`type-badge type-${boss.type1}`} style={{ fontSize: '8px', padding: '1px 3px', borderRadius: '2px' }}>
                    {boss.type1}
                  </span>
                  {boss.type2 && (
                    <span className={`type-badge type-${boss.type2}`} style={{ fontSize: '8px', padding: '1px 3px', borderRadius: '2px' }}>
                      {boss.type2}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>
            沒有找到符合的寶可夢
          </div>
        )}
      </div>
    </div>
  );
}
