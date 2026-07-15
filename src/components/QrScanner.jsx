import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { PRESET_POKEMON_DB } from '../data/pokemonDb';

export default function QrScanner({ onAddCard }) {
  const [scanResult, setScanResult] = useState('');
  const [showPrefillModal, setShowPrefillModal] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [customStorage, setCustomStorage] = useState('');
  
  const scannerRef = useRef(null);

  useEffect(() => {
    // Initialize html5-qrcode scanner
    const scanner = new Html5QrcodeScanner('qr-reader-container', {
      fps: 10,
      qrbox: { width: 200, height: 200 },
      rememberLastUsedCamera: true,
      supportedScanTypes: [0] // 0 means camera, restricts scanner to camera
    });

    scanner.render(
      (decodedText) => {
        // Success callback
        setScanResult(decodedText);
        scanner.clear(); // Stop scanning on success
        
        // Try to auto-match the QR code data
        // For example, if QR is a URL containing a preset ID, or matches a specific pattern
        const matched = autoMatchQrData(decodedText);
        if (matched) {
          // If found, add immediately with default values
          onAddCard({
            ...matched,
            cardId: `${matched.name}-${Date.now()}`, // unique instance ID
            storageLocation: ''
          });
          alert(`🎉 掃碼成功！已自動登錄「${matched.name}」！`);
          // Restart scanner
          scanner.render(onScanSuccess, onScanError);
        } else {
          // Open manual prefill modal to link this QR data to a card
          setSelectedPresetId(PRESET_POKEMON_DB[0].cardId);
          setShowPrefillModal(true);
        }
      },
      (error) => {
        // Error callback (polled frequently, we can ignore it to prevent logs spamming)
      }
    );

    scannerRef.current = scanner;

    // Cleanup
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Scanner cleanup error", err));
      }
    };
  }, []);

  const onScanSuccess = (decodedText) => {
    setScanResult(decodedText);
    if (scannerRef.current) {
      scannerRef.current.clear().catch(err => console.error(err));
    }
    const matched = autoMatchQrData(decodedText);
    if (matched) {
      onAddCard({
        ...matched,
        cardId: `${matched.name}-${Date.now()}`,
        storageLocation: ''
      });
      alert(`🎉 掃碼成功！已自動登錄「${matched.name}」！`);
      restartScanner();
    } else {
      setSelectedPresetId(PRESET_POKEMON_DB[0].cardId);
      setShowPrefillModal(true);
    }
  };

  const onScanError = (err) => {
    // Ignore frequent scanning polling errors
  };

  const restartScanner = () => {
    setScanResult('');
    if (scannerRef.current) {
      scannerRef.current.render(onScanSuccess, onScanError);
    }
  };

  // Simple auto matcher for demonstration
  // In a real scenario, QR code may have ID parameters: e.g. "https://pokemon.co.jp/...&id=2-2-031"
  const autoMatchQrData = (data) => {
    if (!data) return null;
    
    // Check if the QR text contains name or code of any preset card
    for (const preset of PRESET_POKEMON_DB) {
      // If QR encodes something like "2-2-031" or "quaquaval", match it
      if (data.includes(preset.cardId) || data.toLowerCase().includes(preset.name.toLowerCase())) {
        return preset;
      }
    }
    return null;
  };

  const handleLinkSubmit = (e) => {
    e.preventDefault();
    const preset = PRESET_POKEMON_DB.find(p => p.cardId === selectedPresetId);
    if (!preset) return;

    onAddCard({
      ...preset,
      cardId: `${preset.name}-${Date.now()}`, // Unique ID
      storageLocation: customStorage.trim()
    });

    setShowPrefillModal(false);
    setCustomStorage('');
    alert(`🎉 連結成功！已登錄「${preset.name}」！`);
    restartScanner();
  };

  return (
    <div className="glass-panel mb-4">
      <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#ff9f0a', marginBottom: '12px' }}>
        📷 卡匣 QR Code 掃描登錄
      </h2>

      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
        請將手機鏡頭對準卡匣背面的 QR Code（如您上傳的鴨子卡匣左側）。掃描後即可將卡片加入您的個人背包。
      </p>

      {/* Reader Container */}
      <div 
        id="qr-reader-container" 
        style={{ 
          width: '100%', 
          maxWidth: '350px', 
          margin: '0 auto', 
          borderRadius: '16px',
          overflow: 'hidden',
          background: 'rgba(0,0,0,0.2)',
          border: '1px solid rgba(255,255,255,0.08)'
        }}
      ></div>

      {scanResult && (
        <div style={{ marginTop: '14px', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: '#34c759' }}>已偵測到代碼: <code>{scanResult.slice(0, 30)}...</code></p>
          <button 
            className="btn-primary" 
            onClick={restartScanner}
            style={{ width: 'auto', padding: '6px 14px', marginTop: '8px', fontSize: '12px', background: '#4b5563' }}
          >
            重新掃描
          </button>
        </div>
      )}

      {/* Prefill Link Modal */}
      {showPrefillModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ borderTop: '6px solid #ff9f0a' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#fff' }}>
                🔗 連結卡匣資料
              </h3>
            </div>
            
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
              偵測到未註冊的代碼。請選擇此卡匣對應的寶可夢：
            </p>

            <form onSubmit={handleLinkSubmit}>
              <div className="mb-4">
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-main)', marginBottom: '6px' }}>
                  選擇寶可夢：
                </label>
                <select 
                  className="input-field" 
                  value={selectedPresetId} 
                  onChange={(e) => setSelectedPresetId(e.target.value)}
                >
                  {PRESET_POKEMON_DB.map(p => (
                    <option key={p.cardId} value={p.cardId}>
                      {p.stars}★ {p.name} ({p.type1} / 招式：{p.moveName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-main)', marginBottom: '6px' }}>
                  收納位置 (保留方案 - 可不填)：
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="例如：藍色卡盒第2張"
                  value={customStorage}
                  onChange={(e) => setCustomStorage(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  type="button" 
                  className="btn-primary" 
                  onClick={() => { setShowPrefillModal(false); restartScanner(); }}
                  style={{ background: '#4b5563' }}
                >
                  取消
                </button>
                <button type="submit" className="btn-primary">
                  確認登錄
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
