import React, { useState, useMemo } from 'react';
import TypeIcon from './TypeIcon';

const ALL_TYPES = [
  '火', '水', '草', '電', '冰', '格鬥',
  '毒', '地面', '飛行', '超能力', '蟲', '岩石',
  '幽靈', '龍', '惡', '鋼', '妖精', '一般',
];

const TYPE_ORDER_ROW = [
  ['火','水','草','電','冰','格鬥'],
  ['毒','地面','飛行','超能力','蟲','岩石'],
  ['幽靈','龍','惡','鋼','妖精','一般'],
];

export default function BattleQuickPick({ collection }) {
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [lineup, setLineup] = useState([]);  // max 3

  const toggleType = (type) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const clearTypes = () => setSelectedTypes([]);

  // 篩選：moveType ∈ 已選屬性
  const filteredCards = useMemo(() => {
    if (selectedTypes.length === 0) return [];
    return collection
      .filter(c => c.moveType && selectedTypes.includes(c.moveType))
      .sort((a, b) => {
        if ((b.stars || 0) !== (a.stars || 0)) return (b.stars || 0) - (a.stars || 0);
        return (b.hp || 0) - (a.hp || 0);
      });
  }, [collection, selectedTypes]);

  const addToLineup = (card) => {
    if (lineup.length >= 3) return;
    if (lineup.some(c => c.cardId === card.cardId)) return;
    setLineup(prev => [...prev, card]);
  };

  const removeFromLineup = (cardId) => {
    setLineup(prev => prev.filter(c => c.cardId !== cardId));
  };

  const clearLineup = () => setLineup([]);

  const isInLineup = (cardId) => lineup.some(c => c.cardId === cardId);

  // ─── 渲染 ─── //

  return (
    <div className="glass-panel mb-4" style={{ paddingBottom: '16px' }}>
      {/* 屬性選擇區 */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#ff9f0a', margin: 0 }}>
            🎯 機台有利屬性
          </h2>
          {selectedTypes.length > 0 && (
            <button
              onClick={clearTypes}
              style={{
                background: 'rgba(255,69,58,0.15)', border: '1px solid rgba(255,69,58,0.3)',
                borderRadius: '8px', padding: '3px 10px', color: '#ff453a',
                fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', marginLeft: 'auto',
              }}
            >
              ✕ 清空
            </button>
          )}
        </div>

        {/* 三行屬性 chips */}
        {TYPE_ORDER_ROW.map((row, ri) => (
          <div
            key={ri}
            style={{
              display: 'flex', gap: '5px', marginBottom: '5px',
              justifyContent: 'center', flexWrap: 'wrap',
            }}
          >
            {row.map(type => {
              const isSelected = selectedTypes.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '5px 8px',
                    background: isSelected ? '#1a1a2e' : 'rgba(255,255,255,0.04)',
                    border: isSelected ? `2px solid #ff9f0a` : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                    color: isSelected ? '#ff9f0a' : 'rgba(255,255,255,0.6)',
                    fontWeight: isSelected ? '700' : '400',
                    fontSize: '12px',
                  }}
                >
                  <TypeIcon type={type} size={24} selected={isSelected} />
                  <span>{type}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* 分隔線 */}
      <hr style={{ borderColor: 'rgba(255,255,255,0.08)', margin: '12px 0' }} />

      {/* 命中結果區 */}
      {selectedTypes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-muted)', fontSize: '13px' }}>
          ⬆ 請點選機台顯示的有利屬性，快速篩選您的收藏卡
        </div>
      ) : filteredCards.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-muted)', fontSize: '13px' }}>
          😅 您的收藏中沒有 <b>{selectedTypes.join('、')}</b> 屬性的招式
        </div>
      ) : (
        <>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
            🔍 命中 <b style={{ color: '#ff9f0a' }}>{filteredCards.length}</b> 張（{selectedTypes.join('、')} 系攻擊）
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '8px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px',
          }}>
            {filteredCards.map(card => {
              const inLineup = isInLineup(card.cardId);
              const partyFull = lineup.length >= 3;
              return (
                <div
                  key={card.cardId}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    padding: '8px',
                    display: 'flex', flexDirection: 'column', gap: '4px',
                    opacity: inLineup ? 0.5 : 1,
                    position: 'relative',
                  }}
                >
                  {/* header: 星等 + 名字 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {card.name}
                    </span>
                    <span style={{ fontSize: '9px', color: card.stars >= 6 ? '#a21caf' : card.stars >= 5 ? '#f59e0b' : '#9ca3af', fontWeight: 'bold' }}>
                      {card.stars}★
                    </span>
                  </div>

                  {/* 本身屬性 badge */}
                  <div style={{ display: 'flex', gap: '3px' }}>
                    <span className={`type-badge type-${card.type1}`} style={{ fontSize: '8px', padding: '1px 4px', borderRadius: '3px' }}>
                      {card.type1}
                    </span>
                    {card.type2 && (
                      <span className={`type-badge type-${card.type2}`} style={{ fontSize: '8px', padding: '1px 4px', borderRadius: '3px' }}>
                        {card.type2}
                      </span>
                    )}
                  </div>

                  {/* 招式資訊 */}
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    <span style={{ fontWeight: 'bold', color: '#ccc' }}>{card.moveName}</span>
                    <span className={`type-badge type-${card.moveType}`} style={{ marginLeft: '4px', fontSize: '8px', padding: '0 3px', borderRadius: '2px' }}>
                      {card.moveType}
                    </span>
                    <span style={{ marginLeft: '4px' }}>{card.moveCategory || '物理'}</span>
                  </div>

                  {/* HP + 加派按鈕 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                    <span style={{ fontSize: '10px', color: '#34c759', fontWeight: 'bold' }}>
                      HP {card.hp || '?'}
                    </span>
                    <button
                      onClick={() => addToLineup(card)}
                      disabled={inLineup || partyFull}
                      style={{
                        background: inLineup ? 'rgba(52,199,89,0.2)' : partyFull ? 'rgba(255,255,255,0.05)' : 'rgba(255,159,10,0.2)',
                        border: '1px solid ' + (inLineup ? '#34c759' : partyFull ? 'rgba(255,255,255,0.1)' : 'rgba(255,159,10,0.4)'),
                        borderRadius: '6px',
                        padding: '2px 10px',
                        color: inLineup ? '#34c759' : partyFull ? '#666' : '#ff9f0a',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        cursor: inLineup || partyFull ? 'default' : 'pointer',
                      }}
                    >
                      {inLineup ? '✓ 已派' : partyFull ? '已滿' : '＋加派'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ─── 3 槽派出組合 ─── */}
      <hr style={{ borderColor: 'rgba(255,255,255,0.08)', margin: '14px 0 10px' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#ff453a', margin: 0 }}>
          ⚔️ 派出組合
        </h3>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {lineup.length}/3
        </span>
        {lineup.length > 0 && (
          <button
            onClick={clearLineup}
            style={{
              marginLeft: 'auto',
              background: 'rgba(255,69,58,0.12)', border: '1px solid rgba(255,69,58,0.25)',
              borderRadius: '6px', padding: '2px 10px', color: '#ff453a',
              fontSize: '11px', fontWeight: 'bold', cursor: 'pointer',
            }}
          >
            重設
          </button>
        )}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        {[0, 1, 2].map(idx => {
          const card = lineup[idx];
          return (
            <div
              key={idx}
              onClick={() => card && removeFromLineup(card.cardId)}
              style={{
                flex: 1, minHeight: '52px',
                background: card ? 'rgba(255,69,58,0.08)' : 'rgba(255,255,255,0.03)',
                border: card
                  ? '2px solid rgba(255,69,58,0.4)'
                  : '1px dashed rgba(255,255,255,0.1)',
                borderRadius: '10px',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                cursor: card ? 'pointer' : 'default',
                transition: 'all 0.12s',
              }}
            >
              {card ? (
                <>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#fff' }}>{card.name}</span>
                  <div style={{ display: 'flex', gap: '2px', marginTop: '2px' }}>
                    <span className={`type-badge type-${card.type1}`} style={{ fontSize: '7px', padding: '0 3px', borderRadius: '2px' }}>
                      {card.type1}
                    </span>
                    {card.type2 && (
                      <span className={`type-badge type-${card.type2}`} style={{ fontSize: '7px', padding: '0 3px', borderRadius: '2px' }}>
                        {card.type2}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '8px', color: '#ff453a', marginTop: '1px' }}>✕ 移除</span>
                </>
              ) : (
                <span style={{ fontSize: '20px', color: 'rgba(255,255,255,0.15)' }}>＋</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
