import React, { useState } from 'react';
import { POKEMON_TYPES, findPokemonByName, TYPE_MATCHUPS, updateLocalDbOverride } from '../data/pokemonDb';


export default function CardAlbum({ collection, onUpdateCardLocation, onDeleteCard, onAddManualCard }) {
  const [filterStars, setFilterStars] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCard, setSelectedCard] = useState(null);
  
  // Storage locator edit state
  const [editLocation, setEditLocation] = useState('');
  
  // Manual card add states
  const [isAdding, setIsAdding] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualCode, setManualCode] = useState(''); // 卡匣編號 (如 2-2-031 TC)
  const [manualStars, setManualStars] = useState(5);
  const [manualType1, setManualType1] = useState('一般');
  const [manualType2, setManualType2] = useState('');
  const [manualMoveName, setManualMoveName] = useState('');
  const [manualMoveType, setManualMoveType] = useState('一般');
  const [manualMoveCategory, setManualMoveCategory] = useState('物理'); // 招式類型 (物理/特殊)
  const [manualHp, setManualHp] = useState(150);
  const [manualAttack, setManualAttack] = useState(100);
  const [manualDefense, setManualDefense] = useState(80);
  const [manualSpAtk, setManualSpAtk] = useState(80);
  const [manualSpDef, setManualSpDef] = useState(80);
  const [manualSpeed, setManualSpeed] = useState(80);
  const [manualStorage, setManualStorage] = useState('');

  // Handle opening detailed card info modal
  const handleOpenDetails = (card) => {
    setSelectedCard(card);
    setEditLocation(card.storageLocation || '');
  };

  const handleSaveLocation = () => {
    if (selectedCard) {
      onUpdateCardLocation(selectedCard.cardId, editLocation);
      setSelectedCard({ ...selectedCard, storageLocation: editLocation });
      alert('收納位置已更新！');
    }
  };

  const handleDelete = () => {
    if (selectedCard && window.confirm(`確認要刪除「${selectedCard.name}」嗎？`)) {
      onDeleteCard(selectedCard.cardId);
      setSelectedCard(null);
    }
  };

  // Get type advantages for detail view
  const getTypeAnalysis = (card) => {
    const offenseStrengths = [];
    const defenseResists = [];
    const defenseWeaknesses = [];

    // 1. Offense: Types this card's move type deals 2x damage to
    const moveType = card.moveType;
    POKEMON_TYPES.forEach(t => {
      const matchups = TYPE_MATCHUPS[moveType];
      if (matchups && matchups[t] === 2) {
        offenseStrengths.push(t);
      }
    });

    // 2. Defense: Types this card resists (deals 0.5x or 0x damage to this card)
    const cardTypes = [card.type1, card.type2].filter(Boolean);
    POKEMON_TYPES.forEach(attackerType => {
      // Calculate max damage multiplier this card takes from attackerType
      let maxMult = 1.0;
      cardTypes.forEach(defType => {
        const matchups = TYPE_MATCHUPS[attackerType];
        if (matchups && matchups[defType] !== undefined) {
          maxMult *= matchups[defType];
        }
      });

      if (maxMult < 1.0) {
        defenseResists.push(attackerType);
      } else if (maxMult > 1.0) {
        defenseWeaknesses.push(attackerType);
      }
    });

    return { offenseStrengths, defenseResists, defenseWeaknesses };
  };

  // Pre-fill stats from preset DB if name matches
  const handleNameBlur = () => {
    const preset = findPokemonByName(manualName);
    if (preset) {
      setManualCode(preset.cardId || '');
      setManualStars(preset.stars);
      setManualType1(preset.type1);
      setManualType2(preset.type2 || '');
      setManualMoveName(preset.moveName);
      setManualMoveType(preset.moveType);
      setManualMoveCategory(preset.moveCategory || '物理');
      setManualHp(preset.hp);
      setManualAttack(preset.attack);
      setManualDefense(preset.defense);
      setManualSpAtk(preset.spAtk || preset.attack);
      setManualSpDef(preset.spDef || preset.defense);
      setManualSpeed(preset.speed || 80);
    }
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!manualName.trim() || !manualMoveName.trim()) {
      alert('請填入寶可夢名稱與招式名稱！');
      return;
    }

    const customId = manualCode.trim() || `${manualName.trim()}-${Date.now()}`;

    const newCard = {
      cardId: customId,
      name: manualName.trim(),
      stars: Number(manualStars),
      type1: manualType1,
      type2: manualType2,
      moveName: manualMoveName.trim(),
      moveType: manualMoveType,
      moveCategory: manualMoveCategory,
      hp: Number(manualHp),
      attack: Number(manualAttack),
      defense: Number(manualDefense),
      spAtk: Number(manualSpAtk),
      spDef: Number(manualSpDef),
      speed: Number(manualSpeed),
      count: 1,
      storageLocation: manualStorage.trim()
    };

    onAddManualCard(newCard);
    
    // Save to local dynamic database overrides
    if (newCard.cardId) {
      updateLocalDbOverride(newCard);
    }

    setIsAdding(false);
    
    // Clear forms
    setManualName('');
    setManualCode('');
    setManualMoveName('');
    setManualStorage('');
    alert(`成功登錄「${newCard.name}」！`);
  };


  // Filter logic
  const filteredCards = collection.filter(card => {
    const matchesSearch = card.name.includes(searchTerm) || card.moveType.includes(searchTerm);
    if (filterStars === 'all') return matchesSearch;
    if (filterStars === 'special') return card.category === 'special' && matchesSearch;
    if (filterStars === '5') return card.stars === 5 && matchesSearch;
    if (filterStars === '4') return card.stars === 4 && matchesSearch;
    if (filterStars === 'low') return card.stars <= 3 && card.category !== 'special' && matchesSearch;
    return matchesSearch;
  });

  return (
    <div>
      <div className="glass-panel mb-4">
        <div className="flex justify-between align-center mb-4">
          <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#ff9f0a' }}>
            🎒 我的卡匣背包 ({collection.length} 張)
          </h2>
          <button 
            className="btn-primary"
            onClick={() => setIsAdding(true)}
            style={{ width: 'auto', padding: '6px 14px', fontSize: '12px' }}
          >
            ＋ 手動新增
          </button>
        </div>

        {/* Filters */}
        <div className="mb-4">
          <input
            type="text"
            className="input-field"
            placeholder="🔍 快速搜尋背包卡片 (如：狂歡浪舞鴨、格鬥)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ marginBottom: '10px' }}
          />

          <div style={{ display: 'flex', gap: '6px' }}>
            {['all', 'special', '5', '4', 'low'].map((filter) => {
              const label = filter === 'all' ? '全部' : filter === 'special' ? 'SPECIAL' : filter === '5' ? '5★ 傳說' : filter === '4' ? '4★ 主力' : '1-3★ 基礎';
              return (
                <button
                  key={filter}
                  onClick={() => setFilterStars(filter)}
                  style={{
                    flex: 1,
                    background: filterStars === filter ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: filterStars === filter ? '#fff' : 'var(--text-muted)',
                    padding: '6px 0',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid of Cards */}
        {filteredCards.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredCards.map((card) => {
              const isSpecial = card.category === 'special';
              const isSuperStar = card.stars === 6;
              const isGold = card.stars === 5;
              const isPurple = card.stars === 4;
              const isBlue = card.stars === 3;
              const isGreen = card.stars === 2;

              let diskGradeClass = 'disk-grade-1';
              if (isSpecial) diskGradeClass = 'disk-grade-special';
              else if (isSuperStar) diskGradeClass = 'disk-grade-6';
              else if (isGold) diskGradeClass = 'disk-grade-5';
              else if (isPurple) diskGradeClass = 'disk-grade-4';
              else if (isBlue) diskGradeClass = 'disk-grade-3';
              else if (isGreen) diskGradeClass = 'disk-grade-2';

              return (
                <div 
                  key={card.cardId}
                  className={`gaole-disk ${diskGradeClass}`}
                  onClick={() => handleOpenDetails(card)}
                >
                  {card.storageLocation && <span className="disk-storage-badge">📍 {card.storageLocation}</span>}
                  
                  {/* Left QR Side */}
                  <div className="disk-qr-section">
                    <div className="disk-qr-mock"></div>
                    <div className="disk-star-container">
                      {card.category === 'special' ? (
                        <span className="disk-star-special">SPECIAL</span>
                      ) : (
                        Array.from({ length: card.stars }).map((_, i) => (
                          <span key={i} className="disk-star">★</span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Right Main Stats Side */}
                  <div className="disk-main-section">
                    <div className="disk-header">
                      <div className="disk-id">No. {card.cardId}</div>
                    </div>

                    <div>
                      <div className="disk-name">{card.name}</div>
                      <div className="disk-type-row">
                        <span className={`type-badge type-${card.type1}`} style={{ fontSize: '8px', padding: '1px 4px' }}>{card.type1}</span>
                        {card.type2 && <span className={`type-badge type-${card.type2}`} style={{ fontSize: '8px', padding: '1px 4px' }}>{card.type2}</span>}
                      </div>
                    </div>

                    <div className="disk-move-box">
                      <span>{card.moveName}</span>
                      <span className={`disk-move-type type-${card.moveType}`}>{card.moveType}</span>
                    </div>

                    <div className="disk-stats-grid">
                      <div className="disk-stat-item"><span>HP</span><span className="disk-stat-val">{card.hp}</span></div>
                      <div className="disk-stat-item"><span>攻擊</span><span className="disk-stat-val">{card.attack}</span></div>
                      <div className="disk-stat-item"><span>防禦</span><span className="disk-stat-val">{card.defense}</span></div>
                    </div>

                    {card.count > 1 && <span className="disk-count-badge">x{card.count}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '28px', marginBottom: '8px' }}>🎒</p>
            <p style={{ fontSize: '13px', fontWeight: 'bold' }}>背包裡沒有符合條件的卡匣</p>
          </div>
        )}
      </div>

      {/* Card Details & Matchup Modal */}
      {selectedCard && (() => {
        const analysis = getTypeAnalysis(selectedCard);
        return (
          <div className="modal-overlay" onClick={() => setSelectedCard(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ borderTop: '6px solid #ff9f0a' }}>
              <div className="modal-header">
                <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#fff' }}>
                  🔍 卡匣詳細屬性分析
                </h3>
                <button className="close-btn" onClick={() => setSelectedCard(null)}>✕</button>
              </div>

              {/* General details */}
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                  卡匣編號：{selectedCard.cardId}
                </div>
                <h4 style={{ fontSize: '24px', fontWeight: '900', color: '#ff9f0a', margin: '4px 0' }}>
                  {selectedCard.name} {selectedCard.category === 'special' ? '(SPECIAL)' : `(${selectedCard.stars}★)`}
                </h4>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span className={`type-badge type-${selectedCard.type1}`}>{selectedCard.type1}</span>
                  {selectedCard.type2 && <span className={`type-badge type-${selectedCard.type2}`}>{selectedCard.type2}</span>}
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  招式：<b>{selectedCard.moveName}</b>（
                  <span className={`type-badge type-${selectedCard.moveType}`} style={{ padding: '0px 3px', fontSize: '9px' }}>{selectedCard.moveType}</span>系 
                  <span style={{ marginLeft: '4px', padding: '1px 4px', fontSize: '10px', background: selectedCard.moveCategory === '特殊' ? '#30b0c7' : '#ff9f0a', color: '#000', borderRadius: '3px', fontWeight: 'bold' }}>
                    {selectedCard.moveCategory || '物理'}
                  </span>）
                </p>
              </div>

              {/* MEZASTAR 6-Stat Grid */}
              <div className="glass-panel mb-4" style={{ padding: '12px', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center', fontSize: '11px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.04)', padding: '6px', borderRadius: '8px' }}>
                    <span style={{ color: '#34c759', fontWeight: 'bold' }}>HP</span>
                    <div style={{ fontSize: '16px', fontWeight: '900', color: '#fff', marginTop: '2px' }}>{selectedCard.hp}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', padding: '6px', borderRadius: '8px' }}>
                    <span style={{ color: '#ff9f0a', fontWeight: 'bold' }}>攻擊</span>
                    <div style={{ fontSize: '16px', fontWeight: '900', color: '#fff', marginTop: '2px' }}>{selectedCard.attack}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', padding: '6px', borderRadius: '8px' }}>
                    <span style={{ color: '#ff453a', fontWeight: 'bold' }}>防禦</span>
                    <div style={{ fontSize: '16px', fontWeight: '900', color: '#fff', marginTop: '2px' }}>{selectedCard.defense}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', padding: '6px', borderRadius: '8px' }}>
                    <span style={{ color: '#30b0c7', fontWeight: 'bold' }}>特攻</span>
                    <div style={{ fontSize: '16px', fontWeight: '900', color: '#fff', marginTop: '2px' }}>{selectedCard.spAtk || 0}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', padding: '6px', borderRadius: '8px' }}>
                    <span style={{ color: '#af52de', fontWeight: 'bold' }}>特防</span>
                    <div style={{ fontSize: '16px', fontWeight: '900', color: '#fff', marginTop: '2px' }}>{selectedCard.spDef || 0}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', padding: '6px', borderRadius: '8px' }}>
                    <span style={{ color: '#ffcc00', fontWeight: 'bold' }}>速度</span>
                    <div style={{ fontSize: '16px', fontWeight: '900', color: '#fff', marginTop: '2px' }}>{selectedCard.speed || 0}</div>
                  </div>
                </div>
              </div>

              {/* Persist Storage Tag Input (Reserved / 保留方案) */}
              <div className="glass-panel mb-4" style={{ background: 'rgba(255,255,255,0.02)', padding: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#ff453a', marginBottom: '6px' }}>
                  📍 設定實體卡匣收納位置 (例如：A盒第二排、紅色卡盒):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input-field"
                    placeholder="例如：紅盒第3格"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    style={{ margin: 0 }}
                  />
                  <button className="btn-primary" onClick={handleSaveLocation} style={{ width: 'auto', padding: '0 16px', background: '#34c759' }}>
                    儲存
                  </button>
                </div>
              </div>

              {/* Matchups Analysis (Requirement 3: "show which types this card is good at fighting against") */}
              <div className="mb-4" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <div style={{ color: '#34c759', fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' }}>🔥 攻擊剋制屬性 (造成雙倍傷害)：</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {analysis.offenseStrengths.length > 0 ? (
                      analysis.offenseStrengths.map(t => <span key={t} className={`type-badge type-${t}`} style={{ fontSize: '10px', padding: '2px 6px' }}>{t}</span>)
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>無（僅造成一般倍率傷害）</span>
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ color: '#30b0c7', fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' }}>🛡️ 防禦優勢屬性 (減免 0.5x 傷害)：</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {analysis.defenseResists.length > 0 ? (
                      analysis.defenseResists.map(t => <span key={t} className={`type-badge type-${t}`} style={{ fontSize: '10px', padding: '2px 6px' }}>{t}</span>)
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>無（此卡屬性無任何傷害減免）</span>
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ color: '#ff453a', fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' }}>⚠️ 防禦弱點屬性 (承受雙倍傷害)：</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {analysis.defenseWeaknesses.length > 0 ? (
                      analysis.defenseWeaknesses.map(t => <span key={t} className={`type-badge type-${t}`} style={{ fontSize: '10px', padding: '2px 6px' }}>{t}</span>)
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>無完美弱點</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button 
                  onClick={handleDelete}
                  style={{
                    flex: 1,
                    background: 'rgba(255, 69, 58, 0.1)',
                    border: '1px solid #ff453a',
                    color: '#ff453a',
                    borderRadius: '8px',
                    padding: '10px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  🗑️ 刪除卡匣
                </button>
                <button 
                  onClick={() => setSelectedCard(null)}
                  style={{
                    flex: 1,
                    background: '#4b5563',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '8px',
                    padding: '10px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  關閉
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Manual Card Add Modal */}
      {isAdding && (
        <div className="modal-overlay" onClick={() => setIsAdding(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ borderTop: '6px solid #34c759', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#fff' }}>
                ＋ 手動新增卡匣
              </h3>
              <button className="close-btn" onClick={() => setIsAdding(false)}>✕</button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div className="grid-2">
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    寶可夢名稱：
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="例如：狂歡浪舞鴨、蓋歐卡"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    onBlur={handleNameBlur}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    卡匣編號 (印在卡片左上角，如 2-2-031 TC)：
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="例如：2-2-031 TC"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid-2">
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>星等：</label>
                  <select className="input-field" value={manualStars} onChange={(e) => setManualStars(Number(e.target.value))}>
                    {[6, 5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n}★ {n === 6 ? '超級明星' : n === 5 ? '明星' : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>收納位置：</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="例如：A盒-5"
                    value={manualStorage}
                    onChange={(e) => setManualStorage(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>主屬性：</label>
                  <select className="input-field" value={manualType1} onChange={(e) => setManualType1(e.target.value)}>
                    {POKEMON_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>副屬性 (無則選空白)：</label>
                  <select className="input-field" value={manualType2} onChange={(e) => setManualType2(e.target.value)}>
                    <option value="">(無)</option>
                    {POKEMON_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid-2">
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>招式名稱：</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="例如：下盤踢"
                    value={manualMoveName}
                    onChange={(e) => setManualMoveName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>招式屬性：</label>
                  <select className="input-field" value={manualMoveType} onChange={(e) => setManualMoveType(e.target.value)}>
                    {POKEMON_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid-2" style={{ marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>招式類型 (物理/特殊)：</label>
                  <select className="input-field" value={manualMoveCategory} onChange={(e) => setManualMoveCategory(e.target.value)}>
                    <option value="物理">物理 (如下盤踢、巨獸斬)</option>
                    <option value="特殊">特殊 (如魔法閃耀、精神強念)</option>
                  </select>
                </div>
                <div />
              </div>

              {/* MEZASTAR 6-Stat Input Section */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px', marginBottom: '16px' }}>
                <span style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#ff9f0a', marginBottom: '8px' }}>
                  📊 官方卡匣背面真實數值：
                </span>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }} className="mb-4">
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>HP：</label>
                    <input type="number" className="input-field" value={manualHp} onChange={(e) => setManualHp(Number(e.target.value))} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>攻擊 (物理)：</label>
                    <input type="number" className="input-field" value={manualAttack} onChange={(e) => setManualAttack(Number(e.target.value))} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>防禦 (物理)：</label>
                    <input type="number" className="input-field" value={manualDefense} onChange={(e) => setManualDefense(Number(e.target.value))} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>特攻 (特殊)：</label>
                    <input type="number" className="input-field" value={manualSpAtk} onChange={(e) => setManualSpAtk(Number(e.target.value))} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>特防 (特殊)：</label>
                    <input type="number" className="input-field" value={manualSpDef} onChange={(e) => setManualSpDef(Number(e.target.value))} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>速度：</label>
                    <input type="number" className="input-field" value={manualSpeed} onChange={(e) => setManualSpeed(Number(e.target.value))} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn-primary" onClick={() => setIsAdding(false)} style={{ background: '#4b5563' }}>
                  取消
                </button>
                <button type="submit" className="btn-primary" style={{ background: 'linear-gradient(to right, #34c759, #30b0c7)' }}>
                  確定登錄
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

