import React, { useState, useMemo, useRef, useCallback } from 'react';
import { PRESET_POKEMON_DB, ACTIVE_PRESET_DB, updateLocalDbOverride } from '../data/pokemonDb';

function cleanAndParseJson(text) {
  let cleaned = text.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let startIdx = -1;
  let endIdx = -1;
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    endIdx = cleaned.lastIndexOf('}');
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    endIdx = cleaned.lastIndexOf(']');
  }
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleaned = cleaned.substring(startIdx, endIdx + 1);
  }
  return JSON.parse(cleaned);
}




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
    return ACTIVE_PRESET_DB.filter(p => {
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
    const matches = ACTIVE_PRESET_DB.filter(p =>
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
      const constraints = {
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.log("Video play pending:", e));
      }
      setOcrStatus('idle');
    } catch (err) {
      console.warn("First camera constraint failed, trying basic fallback...", err);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.log("Video play pending:", e));
        }
        setOcrStatus('idle');
      } catch (fallbackErr) {
        console.error("Camera completely failed:", fallbackErr);
        setOcrStatus('error');
      }
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
    
    const apiKey = localStorage.getItem('openrouter_api_key');
    const syncUrl = localStorage.getItem('gaole_sync_url');
    
    if (!apiKey) {
      alert('⚠️ 未設定 OpenRouter API Key！\n請先前往「連線設定 (⚙️)」填入您的免費 API Key，即可啟用精準的大模型相機掃描。');
      setOcrStatus('idle');
      return;
    }

    // Capture current video frame
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.85);

    setOcrStatus('loading');
    setOcrResult('正在上傳並分析卡片...');

    try {
      let resultObj = null;

      if (syncUrl) {
        try {
          // Send request via Google Apps Script server-side proxy
          const response = await fetch(syncUrl, {
            method: 'POST',
            credentials: 'omit',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
              action: 'ocr',
              imageBase64: imageData,
              openRouterApiKey: apiKey,
              mode: 'tag'
            })
          });

          if (response.ok) {
            const resData = await response.json();
            if (resData.success) {
              resultObj = resData.result;
            } else {
              console.warn("GAS proxy returned error, falling back to direct client call:", resData.error);
            }
          } else {
            console.warn("GAS proxy HTTP error, falling back to direct client call");
          }
        } catch (gasErr) {
          console.warn("GAS proxy exception, falling back to direct client call:", gasErr);
        }
      }

      // Fallback: Direct request to OpenRouter if GAS wasn't used or failed
      if (!resultObj) {
        const systemPrompt = "你是一個專業的寶可夢街機 MEZASTAR（星塵/銀河系列）卡匣辨識專家。\n你的任務是分析使用者上傳的卡匣圖片（可能是卡匣正面，也可能是卡匣背面），並精準提取出所有的欄位資訊。\n\n請仔細辨識圖片中出現的以下實體資訊：\n\n【如果是卡匣背面 (Back of the Tag)】：\n1. 卡匣編號 (卡片左上角，格式通常為：X-X-XXX 後綴字母，例如：2-2-031 TC)\n2. 寶可夢名稱 (位於頂部中央，繁體中文，例如：狂歡浪舞鴨)\n3. 星等 (編號下方的星星數量，例如：4)\n4. 招式名稱 (位於粉紅色招式欄中，例如：下盤踢)\n5. 招式屬性 (招式名稱右側的屬性圖標文字，例如：格鬥)\n6. 招式分類 (如果是拳頭圖標則為「物理」，如果是同心圓/星狀光芒圖標則為「特殊」)\n7. 六維數值 (位於右側的綠、粉、藍、紫、青色長條參數區)：\n   - HP (體力)\n   - 攻擊 (物理攻擊)\n   - 防禦 (物理防禦)\n   - 特攻 (特殊攻擊)\n   - 特防 (特殊防禦)\n   - 速度\n\n【如果是卡匣正面 (Front of the Tag)】：\n1. 卡匣編號 (卡片右下角，格式通常為：X-X-XXX 後綴字母，例如：2-2-031 TC)\n2. 寶可夢名稱 (位於下方中央偏左，繁體中文，例如：狂歡浪舞鴨)\n3. 星等 (名稱上方的星星數量，例如：4)\n4. 寶可能量 (右下角的紅色/橙色大數字，例如：118)\n5. 寶可夢屬性 (名稱下方的屬性圓圈圖標，可能有一個或兩個，例如：水、格鬥)\n\n【回傳格式要求】：\n請「只」回傳一個 JSON 格式的物件，不要包含 any markdown tags, no ```json formatting, no conversational text. 如果某個欄位在圖片中完全無法看清或不存在，請填入 null。\n\nJSON 格式欄位如下：\n{\n  \"cardSide\": \"front\" 或 \"back\",\n  \"cardId\": \"卡匣編號(字串)\",\n  \"name\": \"寶可夢名稱(字串)\",\n  \"stars\": 星等(整數),\n  \"pokeEne\": 寶可能量(整裝，若無則為null),\n  \"type1\": \"主屬性(字串，例如：水，若無則為null)\",\n  \"type2\": \"副屬性(字串，例如：格鬥，若無則為null)\",\n  \"moveName\": \"招式名稱(字串，若無則為null)\",\n  \"moveType\": \"招式屬性(字串，例如：格鬥，若無則為null)\",\n  \"moveCategory\": \"招式分類(物理 或 特殊，若無則為null)\",\n  \"hp\": HP值(整數，若無則為null),\n  \"attack\": 攻擊力(整數),\n  \"defense\": 防禦力(整數),\n  \"spAtk\": 特攻值(整數),\n  \"spDef\": 特防值(整數),\n  \"speed\": 速度值(整數)\n}";

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://smtDRLETITGO.github.io/pokemon-gaole-helper/",
            "X-Title": "MEZASTAR Battle Helper"
          },
          body: JSON.stringify({
            model: "google/gemma-4-31b-it:free",
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: [
                  { type: "text", text: "請分析這張卡片圖片，找出對應資訊" },
                  { type: "image_url", image_url: { url: imageData } }
                ]
              }
            ]
          })
        });

        if (!response.ok) throw new Error('OpenRouter API 呼叫失敗');
        const resData = await response.json();
        let content = resData.choices[0].message.content;
        content = content.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
        resultObj = JSON.parse(content);
      }

      if (!resultObj || (!resultObj.name && !resultObj.cardId)) {
        throw new Error('無法從圖像中解析有效的寶可夢資料');
      }

      setOcrResult(`成功分析！寶可夢：${resultObj.name || '未知'}, 編號：${resultObj.cardId || '未知'}`);

      // Match the recognized card with ACTIVE_PRESET_DB if possible
      const matchedCode = resultObj.cardId || '';
      const matchedName = resultObj.name || '';
      
      let finalCard = null;
      const dbMatch = ACTIVE_PRESET_DB.find(p => 
        (matchedCode && p.cardId.trim() === matchedCode.trim()) || 
        (matchedName && p.name.trim() === matchedName.trim())
      );

      if (dbMatch) {
        // Merge scanned stats into the verified preset card structure (prioritizing scanned values)
        finalCard = {
          ...dbMatch,
          hp: Number(resultObj.hp) || dbMatch.hp,
          attack: Number(resultObj.attack) || dbMatch.attack,
          defense: Number(resultObj.defense) || dbMatch.defense,
          spAtk: Number(resultObj.spAtk) || dbMatch.spAtk,
          spDef: Number(resultObj.spDef) || dbMatch.spDef,
          speed: Number(resultObj.speed) || dbMatch.speed,
          moveName: resultObj.moveName || dbMatch.moveName,
          moveType: resultObj.moveType || dbMatch.moveType,
          moveCategory: resultObj.moveCategory || dbMatch.moveCategory
        };
      } else {
        // Create custom card based on VLM output
        finalCard = {
          cardId: resultObj.cardId || `custom-${Date.now()}`,
          name: resultObj.name || "未命名卡匣",
          stars: Number(resultObj.stars) || 3,
          type1: resultObj.type1 || "一般",
          type2: resultObj.type2 || "",
          moveName: resultObj.moveName || "撞擊",
          moveType: resultObj.moveType || "一般",
          moveCategory: resultObj.moveCategory || "物理",
          hp: Number(resultObj.hp) || 100,
          attack: Number(resultObj.attack) || 60,
          defense: Number(resultObj.defense) || 60,
          spAtk: Number(resultObj.spAtk) || 60,
          spDef: Number(resultObj.spDef) || 60,
          speed: Number(resultObj.speed) || 60
        };
      }

      // Update/insert into the dynamic self-updating database overrides
      if (finalCard.cardId) {
        updateLocalDbOverride(finalCard);
      }

      setOcrMatches([finalCard]);
      setOcrStatus('done');

    } catch (err) {
      console.error(err);
      setOcrResult(`辨識失敗: ${err.message}`);
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
              將相機對準卡匣正面或背面，保持清晰穩定以進行大模型辨識
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
            {(ocrStatus === 'done' || ocrStatus === 'loading') && (
              <div style={{
                width:'100%', maxWidth:'400px',
                background:'rgba(255,255,255,0.06)',
                borderRadius:'12px', padding:'12px',
              }}>
                <div style={{ color:'rgba(255,255,255,0.8)', fontSize:'0.75rem', marginBottom:'8px', fontWeight: 'bold' }}>
                  📢 {ocrResult}
                </div>
                {ocrStatus === 'done' && (
                  ocrMatches.length > 0 ? (
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
                  )
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
