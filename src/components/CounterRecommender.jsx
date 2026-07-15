import React from 'react';
import { getRecommendations } from '../data/pokemonDb';

export default function CounterRecommender({ collection, selectedOpponents }) {
  if (selectedOpponents.length === 0) {
    return (
      <div className="glass-panel mb-4 text-center" style={{ padding: '30px', color: 'var(--text-muted)' }}>
        <p style={{ fontSize: '24px', marginBottom: '8px' }}>🔍</p>
        <p style={{ fontSize: '14px', fontWeight: 'bold' }}>請點擊上方對手頭像進行即時推薦</p>
        <p style={{ fontSize: '11px', marginTop: '4px' }}>App 會自動比對您的個人卡匣，挑選出最適合對戰的組合</p>
      </div>
    );
  }

  if (collection.length === 0) {
    return (
      <div className="glass-panel mb-4 text-center" style={{ padding: '30px', color: 'var(--text-muted)' }}>
        <p style={{ fontSize: '24px', marginBottom: '8px' }}>🎒</p>
        <p style={{ fontSize: '14px', fontWeight: 'bold' }}>您的收藏庫目前是空的</p>
        <p style={{ fontSize: '11px', marginTop: '4px' }}>請先到「卡匣登錄 (📦)」頁面，勾選或搜尋新增您的卡牌！</p>
      </div>
    );
  }

  // 動態計算多個對手（最多3個）的綜合分數與屬性倍率
  const calculateCombinedRecommendations = () => {
    // 取得每個選取對手的個別推薦數據
    const recsList = selectedOpponents.map(opp => getRecommendations(collection, opp));
    
    const merged = collection.map(card => {
      // 找出此張卡在每個對手推薦列表中的匹配項目
      const matches = recsList.map(recs => 
        recs.find(r => r.card.cardId === card.cardId) || 
        { score: 0, offenseMult: 1.0, defenseMult: 1.0 }
      );
      
      // 綜合分數：所有對手的推薦分數平均值
      const totalScore = matches.reduce((sum, m) => sum + m.score, 0);
      const avgScore = Math.round(totalScore / selectedOpponents.length);
      
      // 快取所有對手的攻防倍率以供後續渲染
      const offenseMults = matches.map(m => m.offenseMult);
      const defenseMults = matches.map(m => m.defenseMult);
      
      return {
        card,
        score: avgScore,
        offenseMults,
        defenseMults
      };
    });
    
    // 分數從高到低排序，取前 4 名
    return merged.sort((a, b) => b.score - a.score).slice(0, 4);
  };

  const recommendations = calculateCombinedRecommendations();

  const renderStars = (num) => {
    return '★'.repeat(num);
  };

  return (
    <div className="glass-panel mb-4">
      <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#ff9f0a', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        💡 最佳對戰推薦上場卡匣
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {recommendations.map((rec, index) => {
          const card = rec.card;
          const isSuperStar = card.stars === 6;
          const isGold = card.stars === 5;
          const isPurple = card.stars === 4;
          
          return (
            <div 
              key={card.cardId || index}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '14px',
                padding: '12px',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: index === 0 ? '0 4px 15px rgba(245, 158, 11, 0.15)' : 'none',
                borderLeft: index === 0 ? '4px solid #f59e0b' : '4px solid rgba(255, 255, 255, 0.15)'
              }}
            >
              {/* 推薦排名 */}
              <div style={{
                position: 'absolute',
                top: '-8px',
                left: '12px',
                background: index === 0 ? '#f59e0b' : '#4b5563',
                color: index === 0 ? '#111' : '#fff',
                fontSize: '9px',
                fontWeight: 'bold',
                padding: '2px 8px',
                borderRadius: '10px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}>
                {index === 0 ? '🥇 首選對策' : `推薦 #${index + 1}`}
              </div>

              {/* 收納位置標記 */}
              {card.storageLocation && (
                <div style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '12px',
                  background: '#ff453a',
                  color: '#fff',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }}>
                  📍 {card.storageLocation}
                </div>
              )}

              {/* 左側：迷你卡匣 */}
              <div style={{
                width: '65px',
                height: '65px',
                borderRadius: '12px',
                background: isSuperStar
                  ? 'linear-gradient(135deg, #1e1b4b, #581c87, #701a75, #4c1d95)'
                  : isGold 
                    ? 'linear-gradient(135deg, #f59e0b, #b45309)' 
                    : isPurple 
                      ? 'linear-gradient(135deg, #9333ea, #6b21a8)' 
                      : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
                flexShrink: 0
              }}>
                <span style={{ fontSize: '13px', fontWeight: '900', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{card.name}</span>
                <span style={{ fontSize: '7px', opacity: 0.9, letterSpacing: '1px', marginTop: '2px' }}>
                  {renderStars(card.stars)}
                </span>
                <span className={`type-badge type-${card.type1}`} style={{ fontSize: '7px', padding: '1px 3px', marginTop: '4px', borderRadius: '3px' }}>
                  {card.type1}
                </span>
              </div>

              {/* 右側：傷害/相剋詳情 */}
              <div className="flex-1" style={{ fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#fff' }}>{card.name}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>HP {card.hp} / 攻 {card.attack}</span>
                </div>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {/* 攻擊倍率標章 */}
                  {selectedOpponents.map((opp, idx) => {
                    const mult = rec.offenseMults[idx] || 1.0;
                    let color = '#9ca3af';
                    let text = '等倍';
                    
                    if (mult >= 2.0) { color = '#34c759'; text = `剋制 ${mult}x`; }
                    else if (mult > 1.0) { color = '#30b0c7'; text = `有利 ${mult}x`; }
                    else if (mult < 1.0) { color = '#ff453a'; text = `不利 ${mult}x`; }
                    
                    return (
                      <span 
                        key={idx} 
                        style={{ 
                          fontSize: '10px', 
                          padding: '2px 6px', 
                          borderRadius: '6px', 
                          background: 'rgba(255,255,255,0.05)', 
                          border: '1px solid rgba(255,255,255,0.08)',
                          color: '#f3f4f6'
                        }}
                      >
                        對 <b>{opp.name}</b>: <span style={{ color, fontWeight: 'bold' }}>{text}</span>
                      </span>
                    );
                  })}
                  
                  {/* 防禦抗性標章 */}
                  {selectedOpponents.map((opp, idx) => {
                    const defMult = rec.defenseMults[idx] || 1.0;
                    if (defMult <= 0.5) {
                      return (
                        <span 
                          key={`def-${idx}`} 
                          style={{ 
                            fontSize: '10px', 
                            padding: '2px 6px', 
                            borderRadius: '6px', 
                            background: 'rgba(52, 199, 89, 0.1)', 
                            border: '1px solid rgba(52, 199, 89, 0.3)',
                            color: '#34c759',
                            fontWeight: 'bold'
                          }}
                        >
                          🛡️ 抗性佳 ({opp.name})
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>

                {/* 招式詳情 */}
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  使用招式：<b style={{ color: '#fff' }}>{card.moveName}</b>（
                  <span className={`type-badge type-${card.moveType}`} style={{ padding: '0px 3px', fontSize: '9px', borderRadius: '3px' }}>
                    {card.moveType}
                  </span>系）
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

