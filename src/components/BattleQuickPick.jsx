import React, { useState, useMemo } from 'react';
import TypeIcon, { getTypeColor } from './TypeIcon';

const ALL_TYPES = ['火','水','草','電','冰','格鬥','毒','地面','飛行','超能力','蟲','岩石','幽靈','龍','惡','鋼','妖精','一般'];

const TYPE_ORDER_ROW = [
  ['火','水','草','電','冰','格鬥'],
  ['毒','地面','飛行','超能力','蟲','岩石'],
  ['幽靈','龍','惡','鋼','妖精','一般'],
];

// 建立 3 個對手初始狀態
const makeOpponents = () => [
  { id: 0, types: [], assigned: null },
  { id: 1, types: [], assigned: null },
  { id: 2, types: [], assigned: null },
];

export default function BattleQuickPick({ collection }) {
  const [opponents, setOpponents] = useState(makeOpponents);

  // ── 切換某個對手的屬性 ──
  const toggleType = (oppId, type) => {
    setOpponents(prev => prev.map(opp =>
      opp.id === oppId
        ? { ...opp, types: opp.types.includes(type) ? opp.types.filter(t => t !== type) : [...opp.types, type] }
        : opp
    ));
  };

  const clearTypes = (oppId) => {
    setOpponents(prev => prev.map(opp => opp.id === oppId ? { ...opp, types: [], assigned: null } : opp));
  };

  // ── 派出卡給某個對手 ──
  const assignCard = (oppId, card) => {
    setOpponents(prev => {
      // 如果該卡已派出給其他對手，先取消
      const cleared = prev.map(o =>
        o.assigned?.cardId === card.cardId ? { ...o, assigned: null } : o
      );
      return cleared.map(o => o.id === oppId ? { ...o, assigned: card } : o);
    });
  };

  const unassignCard = (oppId) => {
    setOpponents(prev => prev.map(o => o.id === oppId ? { ...o, assigned: null } : o));
  };

  const resetAll = () => setOpponents(makeOpponents());

  // ── 每個對手的篩選卡 ──
  const filteredCards = useMemo(() => {
    return opponents.map(opp => {
      if (opp.types.length === 0) return { oppId: opp.id, cards: [] };
      const cards = collection
        .filter(c => c.moveType && opp.types.includes(c.moveType))
        .sort((a, b) => ((b.stars || 0) - (a.stars || 0)) || ((b.hp || 0) - (a.hp || 0)));
      return { oppId: opp.id, cards };
    });
  }, [collection, opponents]);

  const lineupCards = opponents.filter(o => o.assigned).map(o => o.assigned);

  // ── 渲染 ── //

  return (
    <div className="glass-panel mb-4" style={{ paddingBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#ff9f0a', margin: 0 }}>
          ⚔️ 機台戰鬥
        </h2>
        {lineupCards.length > 0 && (
          <button onClick={resetAll} style={{
            background: 'rgba(255,69,58,0.12)', border: '1px solid rgba(255,69,58,0.25)',
            borderRadius: '6px', padding: '3px 10px', color: '#ff453a', marginLeft: 'auto',
            fontSize: '11px', fontWeight: 'bold', cursor: 'pointer',
          }}>重設全部</button>
        )}
      </div>

      {/* ═══════ 3 個對手 ─ 垂直排列 ═══════ */}
      {opponents.map((opp, idx) => {
        const oppCards = filteredCards.find(f => f.oppId === opp.id)?.cards || [];
        const isAssigned = opp.assigned !== null;

        return (
          <div key={opp.id} style={{
            marginBottom: '14px', padding: '10px 12px',
            background: isAssigned ? 'rgba(52,199,89,0.04)' : 'rgba(255,255,255,0.02)',
            border: isAssigned ? '1px solid rgba(52,199,89,0.15)' : '1px solid rgba(255,255,255,0.04)',
            borderRadius: '12px',
          }}>
            {/* 對手標題 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <span style={{
                fontSize: '10px', fontWeight: 'bold', padding: '1px 8px', borderRadius: '8px',
                background: idx === 0 ? 'rgba(255,69,58,0.2)' : idx === 1 ? 'rgba(100,210,255,0.2)' : 'rgba(255,200,50,0.2)',
                color: idx === 0 ? '#ff453a' : idx === 1 ? '#64d2ff' : '#ffc832',
              }}>
                對手 {idx + 1}
              </span>
              {isAssigned && (
                <span style={{ fontSize: '10px', color: '#34c759', fontWeight: 'bold' }}>
                  ✓ 已派 {opp.assigned.name}
                </span>
              )}
              {opp.types.length > 0 && (
                <button onClick={() => clearTypes(opp.id)} style={{
                  marginLeft: 'auto', background: 'transparent', border: 'none',
                  color: 'rgba(255,255,255,0.3)', fontSize: '10px', cursor: 'pointer', padding: '2px 4px',
                }}>✕ 清空</button>
              )}
            </div>

            {/* 屬性 chips (icon + 中文名稱) */}
            {!isAssigned && (
              <div style={{ marginBottom: opp.types.length > 0 ? '8px' : '2px' }}>
                {TYPE_ORDER_ROW.map((row, ri) => (
                  <div key={ri} style={{ display: 'flex', gap: '3px', marginBottom: '3px', flexWrap: 'wrap' }}>
                    {row.map(type => {
                      const sel = opp.types.includes(type);
                      return (
                        <button key={type} onClick={() => toggleType(opp.id, type)} style={{
                          display: 'flex', alignItems: 'center', gap: '3px',
                          padding: '2px 5px', border: sel ? `2px solid ${getTypeColor(type)}` : '2px solid rgba(255,255,255,0.06)',
                          borderRadius: '6px', cursor: 'pointer', background: sel ? `${getTypeColor(type)}22` : 'transparent',
                          opacity: sel ? 1 : 0.5,
                          transition: 'all 0.1s',
                        }}>
                          <TypeIcon type={type} size={20} selected={sel} />
                          <span style={{ fontSize: '10px', fontWeight: sel ? 700 : 400, color: sel ? '#fff' : 'rgba(255,255,255,0.7)' }}>{type}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            {/* 已選屬性文字標籤 */}
            {opp.types.length > 0 && !isAssigned && (
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                🎯 尋找招式：{opp.types.join('、')}
              </div>
            )}

            {/* 已派出：顯示該卡資訊 */}
            {isAssigned ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px',
                background: 'rgba(52,199,89,0.1)', borderRadius: '8px',
                border: '1px solid rgba(52,199,89,0.2)',
              }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#fff' }}>{opp.assigned.name}</span>
                  <span style={{ marginLeft: '6px', fontSize: '10px', color: opp.assigned.stars >= 6 ? '#a21caf' : opp.assigned.stars >= 5 ? '#f59e0b' : '#9ca3af' }}>
                    {opp.assigned.stars}★
                  </span>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    <span className={`type-badge type-${opp.assigned.type1}`} style={{ fontSize: '8px', padding: '0 4px' }}>{opp.assigned.type1}</span>
                    {opp.assigned.type2 && <span className={`type-badge type-${opp.assigned.type2}`} style={{ fontSize: '8px', padding: '0 4px', marginLeft: '2px' }}>{opp.assigned.type2}</span>}
                    <span style={{ marginLeft: '6px' }}>{opp.assigned.moveName}</span>
                    <span className={`type-badge type-${opp.assigned.moveType}`} style={{ marginLeft: '4px', fontSize: '8px', padding: '0 4px' }}>{opp.assigned.moveType}</span>
                    <span style={{ marginLeft: '4px', color: '#34c759' }}>HP {opp.assigned.hp || '?'}</span>
                  </div>
                </div>
                <button onClick={() => unassignCard(opp.id)} style={{
                  background: 'rgba(255,69,58,0.1)', border: '1px solid rgba(255,69,58,0.2)',
                  borderRadius: '6px', padding: '3px 8px', color: '#ff453a',
                  fontSize: '10px', fontWeight: 'bold', cursor: 'pointer',
                }}>✕ 換</button>
              </div>
            ) : opp.types.length > 0 && oppCards.length === 0 ? (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '8px' }}>
                😅 沒有 <b>{opp.types.join('、')}</b> 的招式卡
              </div>
            ) : isAssigned ? null : opp.types.length === 0 ? (
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.15)', textAlign: 'center', padding: '12px' }}>
                點選上方屬性選擇卡牌
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '4px' }}>
                {oppCards.slice(0, 3).map((card) => {
                  const alreadyAssigned = lineupCards.some(c => c.cardId === card.cardId);
                  return (
                    <div key={card.cardId} style={{
                      flexShrink: 0, width: 120,
                      padding: '6px', borderRadius: '8px',
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', fontWeight: '800', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 70 }}>
                          {card.name}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '8px', color: card.stars >= 6 ? '#a21caf' : card.stars >= 5 ? '#f59e0b' : '#9ca3af' }}>
                            {card.stars}★
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '2px', marginTop: '2px' }}>
                        <span className={`type-badge type-${card.type1}`} style={{ fontSize: '7px', padding: '0 2px', borderRadius: '2px' }}>{card.type1}</span>
                        {card.type2 && <span className={`type-badge type-${card.type2}`} style={{ fontSize: '7px', padding: '0 2px', borderRadius: '2px' }}>{card.type2}</span>}
                      </div>
                      <div style={{ fontSize: '8px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        <span style={{ color: '#aaa' }}>{card.moveName}</span>
                        <span> HP {card.hp || '?'}</span>
                      </div>
                      <button
                        onClick={() => assignCard(opp.id, card)}
                        disabled={alreadyAssigned}
                        style={{
                          width: '100%', marginTop: '4px',
                          background: alreadyAssigned ? 'rgba(255,255,255,0.05)' : 'rgba(255,159,10,0.15)',
                          border: '1px solid ' + (alreadyAssigned ? 'rgba(255,255,255,0.1)' : 'rgba(255,159,10,0.3)'),
                          borderRadius: '5px', padding: '2px 0',
                          color: alreadyAssigned ? '#666' : '#ff9f0a',
                          fontSize: '10px', fontWeight: 'bold', cursor: 'pointer',
                        }}
                      >
                        {alreadyAssigned ? '已用它卡' : '＋派'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* ═══════ 3 槽派出組合 ═══════ */}
      <hr style={{ borderColor: 'rgba(255,255,255,0.08)', margin: '6px 0 10px' }} />
      <div style={{ marginBottom: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#ff453a', margin: 0 }}>
            ⚔️ 派出組合
          </h3>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{lineupCards.length}/3</span>
          {lineupCards.length > 0 && (
            <button onClick={resetAll} style={{
              marginLeft: 'auto', background: 'rgba(255,69,58,0.12)', border: '1px solid rgba(255,69,58,0.25)',
              borderRadius: '6px', padding: '2px 10px', color: '#ff453a',
              fontSize: '11px', fontWeight: 'bold', cursor: 'pointer',
            }}>重設</button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          {opponents.map(opp => (
            <div key={opp.id} style={{
              flex: 1, minHeight: '60px',
              background: opp.assigned ? 'rgba(255,69,58,0.08)' : 'rgba(255,255,255,0.03)',
              border: opp.assigned ? '2px solid rgba(255,69,58,0.4)' : '1px dashed rgba(255,255,255,0.1)',
              borderRadius: '10px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: opp.assigned ? 'pointer' : 'default',
              padding: '4px',
            }}
              onClick={() => opp.assigned && unassignCard(opp.id)}
            >
              <span style={{ fontSize: '7px', color: 'rgba(255,255,255,0.3)', marginBottom: '2px' }}>
                對{opp.id + 1}
              </span>
              {opp.assigned ? (
                <>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#fff', textAlign: 'center' }}>{opp.assigned.name}</span>
                  <div style={{ display: 'flex', gap: '2px', marginTop: '1px' }}>
                    {opp.types.map(t => (
                      <span key={t} style={{ fontSize: '7px', color: getTypeColor(t), fontWeight: 'bold' }}>{t}</span>
                    ))}
                  </div>
                </>
              ) : (
                <span style={{ fontSize: '18px', color: 'rgba(255,255,255,0.12)' }}>＋</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
