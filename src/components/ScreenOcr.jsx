import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PRESET_POKEMON_DB, ACTIVE_PRESET_DB } from '../data/pokemonDb';

function cleanAndParseJson(text) {
  var cleaned = text.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
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

export default function ScreenOcr({ onOcrMatchOpponents }) {
  const [hasCameraPermission, setHasCameraPermission] = useState(true);
  const [streamActive, setStreamActive] = useState(false);
  const [ocrStatus, setOcrStatus] = useState('idle'); // idle, loading, success, error
  const [ocrResultText, setOcrResultText] = useState('');
  const [facingMode, setFacingMode] = useState('environment'); // environment (back camera) or user (front)
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Check if inside LINE / FB / Instagram WebView
  const isWebView = /Line|FBAN|FBAV|Instagram/i.test(navigator.userAgent);

  useEffect(() => {
    // Attempt auto-start, but user-click fallback will be available if blocked
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async () => {
    stopCamera();
    try {
      const constraints = {
        video: { facingMode: { ideal: facingMode } },
        audio: false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.log("Video play pending:", e));
      }
      setHasCameraPermission(true);
      setStreamActive(true);
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
        setHasCameraPermission(true);
        setStreamActive(true);
        setOcrStatus('idle');
      } catch (fallbackErr) {
        console.error("Camera completely failed:", fallbackErr);
        setHasCameraPermission(false);
        setStreamActive(false);
        setOcrStatus('error');
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setStreamActive(false);
  };

  const toggleCameraFacing = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const handleCaptureAndOcr = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const apiKey = localStorage.getItem('openrouter_api_key');
    const syncUrl = localStorage.getItem('gaole_sync_url');
    
    if (!apiKey) {
      alert('⚠️ 未設定 OpenRouter API Key！\n請先前往「連線設定 (⚙️)」填入您的免費 API Key，即可啟用精準的機台對手螢幕辨識。');
      setOcrStatus('idle');
      return;
    }

    setOcrStatus('loading');
    setOcrResultText('正在拍照並分析機台螢幕對手...');

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Real video dimensions
    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;
    canvas.width = videoWidth;
    canvas.height = videoHeight;

    // Draw full frame video to canvas
    ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
    const imageData = canvas.toDataURL('image/jpeg', 0.85);

    try {
      let opponentNames = [];

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
              mode: 'screen'
            })
          });

          if (response.ok) {
            const resData = await response.json();
            if (resData.success) {
              opponentNames = resData.result;
            } else {
              console.warn("GAS proxy screen OCR failed, falling back to direct client call:", resData.error);
            }
          } else {
            console.warn("GAS proxy screen OCR HTTP error, falling back to direct client call");
          }
        } catch (gasErr) {
          console.warn("GAS proxy exception, falling back to direct client call:", gasErr);
        }
      }

      // Fallback: Direct request to OpenRouter from browser
      if (!opponentNames || opponentNames.length === 0) {
        const systemPrompt = "你是一個專業的寶可夢街機 MEZASTAR（星塵/銀河系列）對戰畫面分析專家。\n你的任務是分析使用者拍下的機台遊戲螢幕，找出畫面上此時正在對戰的「對手寶可夢」（通常是三個，有時可能是一個或兩個）。\n\n請仔細觀察圖片中出現在對面陣營的所有寶可夢，並辨識出牠們的繁體中文名稱（例如：蒼響、噴火龍、烈空坐）。\n請「只」回傳一個 JSON 格式的陣列，包含所辨識到的寶可夢名稱，不要包含 any markdown tags, no ```json formatting, no conversational text. 如果沒有辨識到任何寶可夢，請回傳空陣列 []。\n\n格式範例：\n[\n  \"蒼響\",\n  \"噴火龍\",\n  \"烈空坐\"\n]";

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://smtDRLETITGO.github.io/pokemon-gaole-helper/",
            "X-Title": "MEZASTAR Screen Opponents Scanner"
          },
          body: JSON.stringify({
            model: "qwen/qwen2.5-vl-32b-instruct:free",
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: [
                  { type: "text", text: "請分析這張對戰畫面，找出所有正在對決的對手寶可夢" },
                  { type: "image_url", image_url: { url: imageData } }
                ]
              }
            ]
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`OpenRouter 伺服器回報狀態碼 ${response.status}: ${errText}`);
        }
        
        const resData = await response.json();
        let content = resData.choices[0].message.content;
        opponentNames = cleanAndParseJson(content);
      }

      if (!Array.isArray(opponentNames) || opponentNames.length === 0) {
        throw new Error('未在畫面中辨識到明確的對手寶可夢名稱，請對焦後再試一次！');
      }

      setOcrResultText(`辨識成功：${opponentNames.join(', ')}`);

      // Match the list of names to ACTIVE_PRESET_DB
      const matchedCards = [];
      opponentNames.forEach(name => {
        const cleanName = name.trim();
        // Look up by exact name or substring
        const match = ACTIVE_PRESET_DB.find(p => p.name === cleanName || p.name.includes(cleanName) || cleanName.includes(p.name));
        if (match) {
          matchedCards.push(match);
        } else {
          // If no preset match, create a placeholder opponent
          matchedCards.push({
            cardId: `custom-opp-${Date.now()}-${Math.random()}`,
            name: cleanName,
            stars: 5, // default
            type1: '一般',
            type2: '',
            moveName: '未知招式',
            moveType: '一般',
            moveCategory: '物理',
            hp: 150, attack: 100, defense: 100
          });
        }
      });

      setOcrStatus('success');
      alert(`🎉 成功辨識 ${matchedCards.length} 隻對手！\n已為您自動載入最佳對戰隊伍推薦。`);
      onOcrMatchOpponents(matchedCards);

    } catch (err) {
      console.error(err);
      setOcrResultText(`辨識失敗: ${err.message}`);
      setOcrStatus('error');
    }
  };

  return (
    <div className="glass-panel mb-4">
      <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#ff9f0a', marginBottom: '12px' }}>
        📷 AI 掃描螢幕辨識對手
      </h2>

      {isWebView && (
        <div style={{ color: '#ff9f0a', fontSize: '12px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,159,10,0.1)', border: '1px solid rgba(255,159,10,0.2)', marginBottom: '12px', lineHeight: '1.5' }}>
          ⚠️ <b>系統提示：偵測到您目前使用 LINE 或社群軟體內置瀏覽器開啟</b><br />
          由於 LINE/FB 內建瀏覽器限制了相機權限，請點擊右上角 <b>「...」選單</b>，並選擇 <b>「以瀏覽器開啟 (Chrome 或 Safari)」</b>，即可正常使用相機功能！
        </div>
      )}
      
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
        請直接將鏡頭對齊<b>「整張機台遊戲螢幕」</b>並拍照。Gemma 4 視覺大模型會自動找出畫面上所有的對手並為您分析弱點！
      </p>

      {/* Camera Viewport Container */}
      <div className="mb-4" style={{ width: '100%', maxWidth: '400px', margin: '0 auto 12px auto' }}>
        {streamActive ? (
          <div className="scanner-viewport" style={{ aspectRatio: '4/3', overflow: 'hidden', borderRadius: '12px', border: '2px solid rgba(245, 158, 11, 0.4)', position: 'relative' }}>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {/* Target Area Overlay */}
            <div className="scanner-overlay-box" style={{ inset: '10%', border: '2px dashed rgba(245, 158, 11, 0.4)' }}>
              <div className="scanner-line" style={{ background: 'linear-gradient(to bottom, rgba(245,158,11,0), #f59e0b, rgba(245,158,11,0))' }}></div>
            </div>
            
            {/* Mirror Toggle Button */}
            <button 
              onClick={toggleCameraFacing}
              style={{
                position: 'absolute',
                bottom: '10px',
                right: '10px',
                background: 'rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '8px',
                color: '#fff',
                padding: '6px 10px',
                fontSize: '11px',
                cursor: 'pointer',
                zIndex: 10
              }}
            >
              🔄 切換鏡頭
            </button>
          </div>
        ) : (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            aspectRatio: '4/3', 
            background: 'rgba(255,255,255,0.03)', 
            borderRadius: '12px', 
            border: '2px dashed rgba(255,255,255,0.1)',
            padding: '20px'
          }}>
            <button 
              onClick={startCamera} 
              className="btn-primary" 
              style={{ 
                background: 'linear-gradient(to right, #34c759, #30b0c7)', 
                width: 'auto', 
                padding: '12px 28px',
                borderRadius: '50px',
                fontWeight: 'bold',
                boxShadow: '0 4px 15px rgba(52, 199, 89, 0.3)'
              }}
            >
              📷 啟用相機鏡頭
            </button>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '10px', textAlign: 'center' }}>
              若相機未自動開啟，請點擊按鈕手動授權啟用
            </span>
          </div>
        )}
        
        {streamActive && (
          <button 
            className="btn-primary" 
            onClick={handleCaptureAndOcr}
            disabled={ocrStatus === 'loading'}
            style={{ 
              marginTop: '12px',
              background: ocrStatus === 'loading' ? '#4b5563' : 'linear-gradient(to right, #ff453a, #ff9f0a)'
            }}
          >
            {ocrStatus === 'loading' ? '⏳ 正在讀取並分析中...' : '📸 拍照辨識螢幕對手'}
          </button>
        )}
      </div>

      {/* OCR Status Panel */}
      {ocrStatus !== 'idle' && (
        <div style={{ 
          padding: '12px', 
          borderRadius: '10px', 
          background: 'rgba(255,255,255,0.03)', 
          border: '1px solid rgba(255,255,255,0.08)',
          fontSize: '13px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          maxWidth: '400px',
          margin: '0 auto'
        }}>
          <div style={{ color: '#fff', fontWeight: 'bold', wordBreak: 'break-all' }}>📢 {ocrResultText}</div>
          {ocrStatus === 'loading' && <div style={{ color: '#30b0c7', fontSize: '11px' }}>正在將畫面壓縮上傳並等待 Gemma 4 視覺推理完成...</div>}
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
