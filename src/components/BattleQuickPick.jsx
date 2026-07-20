import React, { useState, useMemo } from 'react';
import TypeIcon, { getTypeColor } from './TypeIcon';

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
  const [lineup, setLineup] = useState([]); // max 3

  const toggleType = (type) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };
  const clearTypes = () => setSelectedTypes([]);

  // ── 篩選：只取 moveType ∈ selectedTypes ──
  const filteredCards = useMemo(() => {
    if (selectedTypes.length === 0) return [];
    return collection
      .filter(c => c.moveType && selectedTypes.includes(c.moveType));
  }, [collection, selectedTypes]);

  // ── 依 moveType 分組 ──
  const groups = useMemo(() => {
    const map = {};
    filteredCards.forEach(c => {
      if (!map[c.moveType]) map[c.moveType] = [];
      map[c.moveType].push(c);
    });
    // 每組內依星等→HP 排序
    Object.values(map).forEach(arr =>
      arr.sort((a, b) => {
        if ((b.stars || 0) !== (a.stars || 0)) return (b.stars || 0) - (a.stars || 0);
        return (b.hp || 0) - (a.hp || 0);
      })
    );
    // 依張數降冪排列組順序
    return Object.entries(map).sort(([, a], [, b]) => b.length - a.length);
  }, [filteredCards]);

  // ── 加入/移除派出 ──
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

  // ── 覆蓋率計算：派出卡的 moveType 涵蓋了哪些 selectedTypes ──
  const coverage = useMemo(() => {
    const covered = new Set(lineup.map(c => c.moveType).filter(Boolean));
    return selectedTypes.map(t => ({ type: t, covered: covered.has(t) }));
  }, [lineup, selectedTypes]);
  const coveredCount = coverage.filter(c => c.covered).length;
  const totalCoverage = selectedTypes.length;

  // ── 渲染 ── //

  return (
    <div className="glass-panel mb-4" style={{ paddingBottom: '16px' }}>

      {/* ════════ 1. 屬性 chips ════════ */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#ff9f0a', margin: 0 }}>
            🎯 機台有利屬性
          </h2>
          {selectedTypes.length > 0 && (
            <button onClick={clearTypes} style={{
              background: 'rgba(255,69,58,0.15)', border: '1px solid rgba(255,69,58,0.3)',
              borderRadius: '8px', padding: '3px 10px', color: '#ff453a',
              fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', marginLeft: 'auto',
            }}>✕ 清空</button>
          )}
        </div>

        {TYPE_ORDER_ROW.map((row, ri) => (
          <div key={ri} style={{ display: 'flex', gap: '5px', marginBottom: '5px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {row.map(type => {
              const isSelected = selectedTypes.includes(type);
              return (
                <button key={type} onClick={() => toggleType(type)} style={{
                  display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 8px',
                  background: isSelected ? '#1a1a2e' : 'rgba(255,255,255,0.04)',
                  border: isSelected ? `2px solid #ff9f0a` : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px', cursor: 'pointer', transition: 'all 0.12s ease',
                  color: isSelected ? '#ff9f0a' : 'rgba(255,255,255,0.6)',
                  fontWeight: isSelected ? '700' : '400', fontSize: '12px',
                }}>
                  <TypeIcon type={type} size={24} selected={isSelected} />
                  <span>{type}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <hr style={{ borderColor: 'rgba(255,255,255,0.08)', margin: '12px 0' }} />

      {/* ════════ 2. 依招式屬性分組卡片清單 ════════ */}
      {selectedTypes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-muted)', fontSize: '13px' }}>
          ⬆ 請點選機台顯示的有利屬性
        </div>
      ) : groups.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-muted)', fontSize: '13px' }}>
          😅 您沒有 <b>{selectedTypes.join('、')}</b> 屬性的招式卡
        </div>
      ) : (
        <div style={{ maxHeight: '340px', overflowY: 'auto', paddingRight: '4px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
            📊 依攻擊屬性分組 — 總計 <b style={{ color: '#ff9f0a' }}>{filteredCards.length}</b> 張
          </div>

          {groups.map(([moveType, cards]) => (
            <div key={moveType} style={{ marginBottom: '12px' }}>
              {/* 組標題 */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px',
                padding: '4px 8px', borderRadius: '6px',
                background: getTypeColor(moveType) + '22',
                borderLeft: `3px solid ${getTypeColor(moveType)}`,
              }}>
                <TypeIcon type={moveType} size={20} selected={true} />
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>
                  {moveType}攻擊
                </span>
                <span style={{ fontSize: '11px', color: getTypeColor(moveType), fontWeight: 'bold' }}>
                  {cards.length}張
                </span>
              </div>

              {/* 該組卡片 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', paddingLeft: '8px' }}>
                {cards.map(card => {
                  const inLineup = isInLineup(card.cardId);
                  const partyFull = lineup.length >= 3;
                  return (
                    <div key={card.cardId} style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '6px 8px',
                      background: inLineup ? 'rgba(52,199,89,0.08)' : 'rgba(255,255,255,0.03)',
                      border: inLineup ? '1px solid rgba(52,199,89,0.3)' : '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '8px', opacity: inLineup ? 0.65 : 1,
                    }}>
                      {/* 名字 + 星等 */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '12px', fontWeight: '800', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {card.name}
                          </span>
                          <span style={{ fontSize: '9px', color: card.stars >= 6 ? '#a21caf' : card.stars >= 5 ? '#f59e0b' : '#9ca3af', fontWeight: 'bold', flexShrink: 0 }}>
                            {card.stars}★
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', fontSize: '10px', color: 'var(--text-muted)' }}>
                          {/* 本身屬性 */}
                          <span className={`type-badge type-${card.type1}`} style={{ fontSize: '7px', padding: '0 3px', borderRadius: '2px' }}>
                            {card.type1}
                          </span>
                          {card.type2 && (
                            <span className={`type-badge type-${card.type2}`} style={{ fontSize: '7px', padding: '0 3px', borderRadius: '2px' }}>
                              {card.type2}
                            </span>
                          )}
                          {/* 招式名 */}
                          <span style={{ color: '#aaa', marginLeft: '2px' }}>{card.moveName}</span>
                          <span style={{ fontSize: '8px', opacity: 0.6 }}>{card.moveCategory || '物理'}</span>
                        </div>
                      </div>

                      {/* HP */}
                      <span style={{ fontSize: '11px', color: '#34c759', fontWeight: 'bold', flexShrink: 0 }}>
                        HP {card.hp || '?'}
                      </span>

                      {/* 加派按鈕 */}
                      <button onClick={() => addToLineup(card)} disabled={inLineup || partyFull} style={{
                        flexShrink: 0,
                        background: inLineup ? 'rgba(52,199,89,0.2)' : partyFull ? 'rgba(255,255,255,0.05)' : 'rgba(255,159,10,0.2)',
                        border: '1px solid ' + (inLineup ? '#34c759' : partyFull ? 'rgba(255,255,255,0.1)' : 'rgba(255,159,10,0.4)'),
                        borderRadius: '6px', padding: '2px 10px',
                        color: inLineup ? '#34c759' : partyFull ? '#666' : '#ff9f0a',
                        fontSize: '11px', fontWeight: 'bold',
                        cursor: inLineup || partyFull ? 'default' : 'pointer',
                      }}>
                        {inLineup ? '✓ 已派' : partyFull ? '已滿' : '＋加派'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <hr style={{ borderColor: 'rgba(255,255,255,0.08)', margin: '14px 0 10px' }} />

      {/* ════════ 3. 派出組合 + 覆蓋率 ════════ */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#ff453a', margin: 0 }}>
            ⚔️ 派出組合
          </h3>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {lineup.length}/3
          </span>
          {lineup.length > 0 && (
            <button onClick={clearLineup} style={{
              marginLeft: 'auto', background: 'rgba(255,69,58,0.12)', border: '1px solid rgba(255,69,58,0.25)',
              borderRadius: '6px', padding: '2px 10px', color: '#ff453a',
              fontSize: '11px', fontWeight: 'bold', cursor: 'pointer',
            }}>重設</button>
          )}
        </div>

        {/* 3 槽派出 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          {[0, 1, 2].map(idx => {
            const card = lineup[idx];
            return (
              <div key={idx} onClick={() => card && removeFromLineup(card.cardId)} style={{
                flex: 1, minHeight: '52px',
                background: card ? 'rgba(255,69,58,0.08)' : 'rgba(255,255,255,0.03)',
                border: card ? '2px solid rgba(255,69,58,0.4)' : '1px dashed rgba(255,255,255,0.1)',
                borderRadius: '10px', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                cursor: card ? 'pointer' : 'default', transition: 'all 0.12s',
              }}>
                {card ? (
                  <>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#fff' }}>{card.name}</span>
                    <div style={{ display: 'flex', gap: '2px', marginTop: '2px' }}>
                      <span className={`type-badge type-${card.type1}`} style={{ fontSize: '7px', padding: '0 3px', borderRadius: '2px' }}>{card.type1}</span>
                      {card.type2 && <span className={`type-badge type-${card.type2}`} style={{ fontSize: '7px', padding: '0 3px', borderRadius: '2px' }}>{card.type2}</span>}
                    </div>
                    <div style={{ fontSize: '8px', color: getTypeColor(card.moveType), marginTop: '1px', fontWeight: 'bold' }}>
                      {card.moveType}攻擊
                    </div>
                  </>
                ) : (
                  <span style={{ fontSize: '20px', color: 'rgba(255,255,255,0.15)' }}>＋</span>
                )}
              </div>
            );
          })}
        </div>

        {/* 覆蓋率指示器 */}
        {selectedTypes.length > 0 && (
          <div style={{
            padding: '8px 10px', borderRadius: '8px',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>🎯 覆蓋率</span>
              {totalCoverage > 0 && (
                <span style={{
                  fontSize: '11px', fontWeight: 'bold', padding: '1px 8px', borderRadius: '10px',
                  background: coveredCount === totalCoverage ? 'rgba(52,199,89,0.2)' : 'rgba(255,69,58,0.15)',
                  color: coveredCount === totalCoverage ? '#34c759' : '#ff453a',
                }}>
                  {coveredCount}/{totalCoverage}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {coverage.map(({ type, covered }) => (
                <span key={type} style={{
                  display: 'flex', alignItems: 'center', gap: '3px',
                  padding: '2px 6px', borderRadius: '5px', fontSize: '11px',
                  background: covered ? 'rgba(52,199,89,0.12)' : 'rgba(255,69,58,0.08)',
                  border: covered ? '1px solid rgba(52,199,89,0.3)' : '1px solid rgba(255,69,58,0.15)',
                  color: covered ? '#34c759' : '#ff453a',
                  fontWeight: covered ? '700' : '400',
                }}>
                  <TypeIcon type={type} size={16} selected={covered} />
                  <span>{type}</span>
                  <span>{covered ? '✅' : '❌'}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
