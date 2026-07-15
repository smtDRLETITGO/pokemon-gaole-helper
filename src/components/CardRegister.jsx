import React, { useState, useMemo, useRef, useCallback } from 'react';
import { PRESET_POKEMON_DB } from '../data/pokemonDb';
import Tesseract from 'tesseract.js';

// ── 星等顯示 ──
const STAR_COLORS = { 6: '#FFD700', 5: '#C0A000', 4: '#9370DB', 3: '#4A9EFF', 2: '#50C878', 1: '#808080' };
const STAR_LABELS = { 6: '超級明星', 5: '明星', 4: '精選', 3: '普通', 2: '普通', 1: '普通' };

function StarBadge({ stars }) {
  return (
    <span style={{ color: STAR_COLORS[stars] || '#888', fontWeight: 800, fontSize: '0.8rem', letterSpacing: '-1px' }}>
      {'★'.repeat(stars)}
    </span>
  );
}

// ── 屬性徽章 ──
const TYPE_COLORS = {
  '一般':'#9E9E9E','火':'#FF6B35','水':'#4FC3F7','草':'#66BB6A','電':'#FFD54F',
  '冰':'#80DEEA','格鬥':'#EF5350','毒':'#AB47BC','地面':'#FFAB40','飛行':'#90CAF9',
  '超能力':'#F48FB1','蟲':'#AED581','岩石':'#BCAAA4','幽靈':'#7E57C2','龍':'#5C6BC0',
  '惡':'#5D4037','鋼':'#78909C','妖精':'#F06292',
};
function TypeBadge({ type }) {
  if (!type) return null;
  return (
    <span style={{
      background: TYPE_COLORS[type] || '#555',
      color: '#fff', borderRadius: '20px',
      padding: '1px 8px', fontSize: '0.7rem', fontWeight: 700,
      marginRight: '4px', display: 'inline-block',
      textShadow: '0 1px 2px rgba(0,0,0,0.4)',
    }}>{type}</span>
  );
}

// ── 卡片 miniCard UI ──
function MiniCard({ pokemon, onAdd, ownedCount }) {
  const isOwned = ownedCount > 0;
  return (
    <div style={{
      background: isOwned
        ? 'linear-gradient(135deg,rgba(100,220,120,0.18),rgba(30,40,60,0.85))'
        : 'linear-gradient(135deg,rgba(30,40,60,0.85),rgba(20,30,50,0.9))',
      border: isOwned ? '1.5px solid rgba(100,220,120,0.5)' : '1.5px solid rgba(255,255,255,0.08)',
      borderRadius: '12px',
      padding: '10px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      position: 'relative',
      transition: 'all 0.2s ease',
      cursor: 'pointer',
    }} onClick={() => onAdd(pokemon)}>
      {/* 擁有標記 */}
      {isOwned && (
        <span style={{
          position: 'absolute', top: '6px', right: '6px',
          background: '#4CAF50', color: '#fff',
          borderRadius: '50%', width: '18px', height: '18px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.6rem', fontWeight: 800, zIndex: 1,
        }}>
          {ownedCount > 1 ? ownedCount : '✓'}
        </span>
      )}
      {/* 卡號 */}
      <div style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.6rem', fontFamily:'monospace' }}>
        {pokemon.diskCode}
      </div>
      {/* 名稱 */}
      <div style={{ color:'#fff', fontWeight:700, fontSize:'0.85rem', lineHeight:1.2 }}>
        {pokemon.name}
      </div>
      {/* 星等 */}
      <StarBadge stars={pokemon.stars} />
      {/* 屬性 */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:'2px', marginTop:'2px' }}>
        <TypeBadge type={pokemon.type1} />
        <TypeBadge type={pokemon.type2} />
      </div>
      {/* 加入按鈕 */}
      <button style={{
        marginTop: '4px',
        background: isOwned
          ? 'rgba(76,175,80,0.3)'
          : 'linear-gradient(90deg,#4A90D9,#7B52D9)',
        border: 'none', borderRadius: '8px',
        color: '#fff', fontWeight: 700, fontSize: '0.75rem',
        padding: '4px 0', cursor: 'pointer',
        width: '100%',
      }}>
        {isOwned ? `再加一張（共 ${ownedCount}）` : '＋ 加入背包'}
      </button>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 主組件：三合一卡牌登錄
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function CardRegister({ collection, onAddCard, onClose }) {
  const [activeTab, setActiveTab] = useState('catalog');     // 'catalog' | 'search' | 'ocr'
  const [filterSeries, setFilterSeries] = useState('all');
  const [filterStars, setFilterStars] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [ocrStatus, setOcrStatus] = useState('idle');       // 'idle'|'loading'|'done'|'error'
  const [ocrResult, setOcrResult] = useState(null);
  const [ocrMatches, setOcrMatches] = useState([]);
  const [addedFlash, setAddedFlash] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // 擁有數量 map
  const ownedCountMap = useMemo(() => {
    const map = {};
    collection.forEach(c => {
      map[c.cardId] = (map[c.cardId] || 0) + 1;
    });
    return map;
  }, [collection]);

  // 篩選後的圖鑑清單
  const catalogList = useMemo(() => {
    return PRESET_POKEMON_DB.filter(p => {
      if (filterSeries !== 'all' && p.series !== filterSeries) return false;
      if (filterStars !== 'all' && String(p.stars) !== filterStars) return false;
      return true;
    });
  }, [filterSeries, filterStars]);

  // 搜尋自動完成
  const handleSearchInput = (val) => {
    setSearchQuery(val);
    if (!val.trim()) { setSuggestions([]); return; }
    const q = val.trim().toLowerCase();
    const matches = PRESET_POKEMON_DB.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.diskCode.toLowerCase().includes(q) ||
      p.series.toLowerCase().includes(q)
    ).slice(0, 8);
    setSuggestions(matches);
  };

  // 加入背包
  const handleAdd = (pokemon) => {
    const newEntry = { ...pokemon, storageNote: '', quantity: 1 };
    onAddCard(newEntry);
    setAddedFlash(pokemon.cardId);
    setTimeout(() => setAddedFlash(null), 800);
  };

  // ── OCR 相機 ──
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('相機開啟失敗:', err);
      setOcrStatus('error');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const captureAndOCR = useCallback(async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setOcrStatus('loading');
    try {
      const { data } = await Tesseract.recognize(imageData, 'chi_tra+eng', {
        logger: m => console.log(m),
      });
      const text = data.text || '';
      setOcrResult(text);
      // 模糊比對所有卡匣名稱
      const matches = PRESET_POKEMON_DB.filter(p =>
        text.includes(p.name) ||
        text.replace(/\s/g,'').includes(p.diskCode.replace(/\s/g,''))
      );
      setOcrMatches(matches);
      setOcrStatus('done');
    } catch {
      setOcrStatus('error');
    }
  }, []);

  const switchTab = (tab) => {
    if (tab !== 'ocr') stopCamera();
    setActiveTab(tab);
    if (tab === 'ocr') setTimeout(startCamera, 300);
  };

  const handleClose = () => {
    stopCamera();
    onClose?.();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(10,15,30,0.97)',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Noto Sans TC', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        background: 'linear-gradient(135deg,rgba(74,144,217,0.15),rgba(123,82,217,0.15))',
      }}>
        <div>
          <div style={{ color:'#fff', fontWeight:800, fontSize:'1.05rem' }}>📦 登錄卡匣</div>
          <div style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.7rem' }}>
            背包已有 {collection.length} 張
          </div>
        </div>
        <button onClick={handleClose} style={{
          background: 'rgba(255,255,255,0.1)', border: 'none',
          borderRadius: '50%', width: '32px', height: '32px',
          color: '#fff', fontSize: '1rem', cursor: 'pointer',
        }}>✕</button>
      </div>

      {/* Tab 切換 */}
      <div style={{
        display: 'flex', gap: '4px',
        padding: '8px 12px',
        background: 'rgba(0,0,0,0.3)',
      }}>
        {[
          { id:'catalog', label:'📖 圖鑑清單' },
          { id:'search',  label:'🔍 關鍵字' },
          { id:'ocr',     label:'📷 相機辨識' },
        ].map(tab => (
          <button key={tab.id} onClick={() => switchTab(tab.id)} style={{
            flex: 1,
            background: activeTab === tab.id
              ? 'linear-gradient(90deg,#4A90D9,#7B52D9)'
              : 'rgba(255,255,255,0.06)',
            border: 'none', borderRadius: '8px',
            color: '#fff', fontWeight: activeTab === tab.id ? 700 : 400,
            fontSize: '0.75rem', padding: '8px 4px',
            cursor: 'pointer', transition: 'all 0.2s',
          }}>{tab.label}</button>
        ))}
      </div>

      {/* 內容區 */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* ── 圖鑑清單 ── */}
        {activeTab === 'catalog' && (
          <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
            {/* 篩選列 */}
            <div style={{
              display: 'flex', gap: '8px', padding: '8px 12px',
              background: 'rgba(0,0,0,0.2)',
            }}>
              <select value={filterSeries} onChange={e => setFilterSeries(e.target.value)} style={{
                flex: 1, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)',
                borderRadius:'8px', color:'#fff', padding:'6px 8px', fontSize:'0.75rem',
              }}>
                <option value="all">全部彈數</option>
                <option value="星塵第一彈">⭐ 星塵第一彈</option>
                <option value="星塵第二彈">⭐ 星塵第二彈</option>
              </select>
              <select value={filterStars} onChange={e => setFilterStars(e.target.value)} style={{
                flex: 1, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)',
                borderRadius:'8px', color:'#fff', padding:'6px 8px', fontSize:'0.75rem',
              }}>
                <option value="all">全部星等</option>
                <option value="6">★★★★★★ 超級明星</option>
                <option value="5">★★★★★ 明星</option>
                <option value="4">★★★★ 精選</option>
                <option value="3">★★★ 普通</option>
                <option value="2">★★ 普通</option>
                <option value="1">★ 普通</option>
              </select>
            </div>
            {/* 卡片數量 */}
            <div style={{ padding:'4px 12px', color:'rgba(255,255,255,0.4)', fontSize:'0.7rem' }}>
              顯示 {catalogList.length} 種卡匣
            </div>
            {/* 卡片格 */}
            <div style={{
              flex:1, overflowY:'auto', padding:'8px 12px',
              display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:'8px',
            }}>
              {catalogList.map(pokemon => (
                <div key={pokemon.cardId} style={{
                  transform: addedFlash === pokemon.cardId ? 'scale(0.95)' : 'scale(1)',
                  transition: 'transform 0.2s',
                }}>
                  <MiniCard
                    pokemon={pokemon}
                    onAdd={handleAdd}
                    ownedCount={ownedCountMap[pokemon.cardId] || 0}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 關鍵字搜尋 ── */}
        {activeTab === 'search' && (
          <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
            <div style={{ padding: '12px' }}>
              <div style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '12px',
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 14px',
              }}>
                <span style={{ fontSize:'1.1rem' }}>🔍</span>
                <input
                  value={searchQuery}
                  onChange={e => handleSearchInput(e.target.value)}
                  placeholder="輸入寶可夢名稱（如：超夢、狂歡）或卡號（如：1-2-028）"
                  style={{
                    flex:1, background:'transparent', border:'none',
                    color:'#fff', fontSize:'0.9rem',
                    outline:'none',
                  }}
                  autoFocus
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(''); setSuggestions([]); }}
                    style={{ background:'none',border:'none',color:'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:'1rem' }}>
                    ✕
                  </button>
                )}
              </div>
              <div style={{ color:'rgba(255,255,255,0.35)', fontSize:'0.7rem', marginTop:'6px', padding:'0 4px' }}>
                💡 可搜尋名稱、卡號或彈次名稱
              </div>
            </div>
            {/* 搜尋結果 */}
            <div style={{ flex:1, overflowY:'auto', padding:'0 12px' }}>
              {!searchQuery && (
                <div style={{ textAlign:'center', padding:'40px 20px', color:'rgba(255,255,255,0.3)' }}>
                  <div style={{ fontSize:'3rem', marginBottom:'12px' }}>✏️</div>
                  <div>輸入關鍵字開始搜尋</div>
                </div>
              )}
              {searchQuery && suggestions.length === 0 && (
                <div style={{ textAlign:'center', padding:'40px 20px', color:'rgba(255,255,255,0.3)' }}>
                  <div style={{ fontSize:'3rem', marginBottom:'12px' }}>😔</div>
                  <div>找不到「{searchQuery}」</div>
                  <div style={{ fontSize:'0.75rem', marginTop:'8px' }}>請確認名稱或卡號是否正確</div>
                </div>
              )}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'8px', paddingBottom:'16px' }}>
                {suggestions.map(pokemon => (
                  <div key={pokemon.cardId} style={{
                    transform: addedFlash === pokemon.cardId ? 'scale(0.95)' : 'scale(1)',
                    transition: 'transform 0.2s',
                  }}>
                    <MiniCard
                      pokemon={pokemon}
                      onAdd={handleAdd}
                      ownedCount={ownedCountMap[pokemon.cardId] || 0}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── OCR 相機辨識 ── */}
        {activeTab === 'ocr' && (
          <div style={{ display:'flex', flexDirection:'column', height:'100%', alignItems:'center', padding:'12px' }}>
            <div style={{ color:'rgba(255,255,255,0.6)', fontSize:'0.75rem', marginBottom:'8px', textAlign:'center' }}>
              將相機對準卡匣正面，讓寶可夢名稱出現在畫面中央
            </div>
            {/* 預覽框 */}
            <div style={{
              width:'100%', maxWidth:'400px',
              aspectRatio:'16/9',
              background:'rgba(0,0,0,0.5)',
              borderRadius:'12px', overflow:'hidden',
              border:'2px solid rgba(74,144,217,0.4)',
              position:'relative',
              marginBottom:'12px',
            }}>
              <video ref={videoRef} style={{ width:'100%', height:'100%', objectFit:'cover' }} playsInline muted />
              {/* 掃描框 */}
              <div style={{
                position:'absolute', inset:'15%', border:'2px dashed rgba(74,144,217,0.7)',
                borderRadius:'8px', pointerEvents:'none',
              }}/>
            </div>
            {/* 拍照按鈕 */}
            <button onClick={captureAndOCR} disabled={ocrStatus === 'loading'} style={{
              background: ocrStatus === 'loading'
                ? 'rgba(100,100,100,0.5)'
                : 'linear-gradient(90deg,#4A90D9,#7B52D9)',
              border:'none', borderRadius:'50px',
              color:'#fff', fontWeight:800, fontSize:'1rem',
              padding:'12px 32px', cursor: ocrStatus === 'loading' ? 'not-allowed' : 'pointer',
              marginBottom:'12px',
            }}>
              {ocrStatus === 'loading' ? '⏳ 辨識中...' : '📸 拍照辨識'}
            </button>
            {/* 辨識結果 */}
            {ocrStatus === 'done' && (
              <div style={{
                width:'100%', maxWidth:'400px',
                background:'rgba(255,255,255,0.06)',
                borderRadius:'12px', padding:'12px',
              }}>
                <div style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.7rem', marginBottom:'8px' }}>
                  辨識到的文字：{ocrResult?.substring(0,60)}...
                </div>
                {ocrMatches.length > 0 ? (
                  <>
                    <div style={{ color:'#4FC3F7', fontWeight:700, fontSize:'0.85rem', marginBottom:'8px' }}>
                      ✅ 找到 {ocrMatches.length} 個匹配：
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:'6px' }}>
                      {ocrMatches.map(p => (
                        <MiniCard key={p.cardId} pokemon={p} onAdd={handleAdd} ownedCount={ownedCountMap[p.cardId]||0} />
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ color:'rgba(255,255,255,0.4)', textAlign:'center', padding:'12px' }}>
                    😔 未能比對到卡匣，請改用關鍵字搜尋
                  </div>
                )}
              </div>
            )}
            {ocrStatus === 'error' && (
              <div style={{
                background:'rgba(244,67,54,0.15)', borderRadius:'12px',
                padding:'12px 16px', color:'#ef9a9a', fontSize:'0.8rem', textAlign:'center',
                maxWidth:'400px', width:'100%',
              }}>
                ⚠️ 相機啟動失敗。請確認已授權相機權限，或改用「關鍵字搜尋」。
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
