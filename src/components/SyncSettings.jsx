import React, { useState, useEffect } from 'react';

export default function SyncSettings({ syncUrl, setSyncUrl, onFetchCollection, onSyncCollection, cards }) {
  const [urlInput, setUrlInput] = useState(syncUrl);
  const [status, setStatus] = useState('unconfigured'); // unconfigured, connected, loading, error
  const [errorMessage, setErrorMessage] = useState('');
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    setUrlInput(syncUrl);
    if (syncUrl) {
      setStatus('connected');
    } else {
      setStatus('unconfigured');
    }
  }, [syncUrl]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!urlInput.trim()) {
      setSyncUrl('');
      setStatus('unconfigured');
      localStorage.removeItem('gaole_sync_url');
      return;
    }

    setStatus('loading');
    setErrorMessage('');
    
    try {
      // Test URL with a fetch request, explicitly omitting credentials to prevent Google multi-account login CORS redirect errors
      const response = await fetch(urlInput.trim(), {
        method: 'GET',
        credentials: 'omit'
      });
      if (!response.ok) throw new Error('伺服器回應錯誤');
      
      const data = await response.json();
      if (Array.isArray(data)) {
        setSyncUrl(urlInput.trim());
        localStorage.setItem('gaole_sync_url', urlInput.trim());
        setStatus('connected');
        onFetchCollection(data); // Sync retrieved data into the parent state
      } else {
        throw new Error('伺服器回傳格式不正確（預期應為卡匣陣列）');
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMessage(err.message || '連線失敗，請檢查網址是否正確，並確認是否已將 Apps Script 部署為「網頁應用程式」且允許「任何人」存取。');
    }
  };

  const handleForceSync = async () => {
    if (!syncUrl) return;
    setStatus('loading');
    try {
      await onSyncCollection();
      setStatus('connected');
      alert('同步成功！卡牌資料已備份至您的 Google 試算表。');
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMessage('同步上傳失敗: ' + err.message);
    }
  };

  return (
    <div className="glass-panel mb-4">
      <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '12px', color: '#ff9f0a' }}>
        ⚙️ Google 試算表同步設定
      </h2>
      
      <form onSubmit={handleSave} className="mb-4">
        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
          Google Apps Script 網頁應用程式網址 (Web App URL):
        </label>
        <input
          type="url"
          className="input-field"
          placeholder="https://script.google.com/macros/s/.../exec"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
        />
        
        <div className="grid-2">
          <button type="submit" className="btn-primary" style={{ background: 'linear-gradient(to right, #34c759, #30b0c7)' }}>
            {status === 'loading' ? '連線中...' : '儲存並下載卡片'}
          </button>
          
          <button 
            type="button" 
            className="btn-primary" 
            onClick={handleForceSync}
            disabled={status !== 'connected' || cards.length === 0}
            style={{ 
              background: 'linear-gradient(to right, #5856d6, #af52de)',
              opacity: (status !== 'connected' || cards.length === 0) ? 0.5 : 1,
              cursor: (status !== 'connected' || cards.length === 0) ? 'not-allowed' : 'pointer'
            }}
          >
            上傳備份至雲端
          </button>
        </div>
      </form>

      {/* Connection Status Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <span>同步狀態:</span>
        {status === 'unconfigured' && <span style={{ color: '#ff9f0a', fontWeight: 'bold' }}>⚠️ 未串接 (僅本地儲存)</span>}
        {status === 'connected' && <span style={{ color: '#34c759', fontWeight: 'bold' }}>🟢 連線正常 (雲端同步中)</span>}
        {status === 'loading' && <span style={{ color: '#30b0c7', fontWeight: 'bold' }}>⏳ 連線測試中...</span>}
        {status === 'error' && <span style={{ color: '#ff453a', fontWeight: 'bold' }}>🔴 連線錯誤</span>}
      </div>

      {status === 'error' && (
        <div style={{ color: '#ff453a', fontSize: '12px', marginTop: '8px', padding: '8px', borderRadius: '6px', background: 'rgba(255, 69, 58, 0.1)' }}>
          {errorMessage}
        </div>
      )}

      {/* Toggle Help Guide */}
      <button 
        type="button" 
        onClick={() => setShowGuide(!showGuide)}
        style={{ 
          marginTop: '16px',
          width: '100%',
          background: 'transparent',
          border: '1px dashed var(--text-muted)',
          color: 'var(--text-main)',
          padding: '8px',
          borderRadius: '8px',
          fontSize: '13px',
          cursor: 'pointer'
        }}
      >
        {showGuide ? '🔼 隱藏串接設定步驟' : '📖 點我查看如何建立免費雲端試算表'}
      </button>

      {showGuide && (
        <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', lineHeight: '1.6' }}>
          <p style={{ fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>如何設定您的專屬試算表雲端資料庫：</p>
          <ol style={{ paddingLeft: '18px' }}>
            <li style={{ marginBottom: '6px' }}>
              用您孩子的 Google 帳號登入，在 Google 雲端硬碟建立一個新的「空白 Google 試算表」。
            </li>
            <li style={{ marginBottom: '6px' }}>
              在試算表選單中點選 <b>擴充功能 (Extensions)</b> ➡️ <b>Apps Script</b>。
            </li>
            <li style={{ marginBottom: '6px' }}>
              清除裡面所有的預設程式碼，然後複製本專案的 <code>google_apps_script.js</code> 內容並貼上存檔。
            </li>
            <li style={{ marginBottom: '6px' }}>
              點選右上方 <b>部署 (Deploy)</b> 按鈕 ➡️ 選擇 <b>新增部署 (New Deployment)</b>。
            </li>
            <li style={{ marginBottom: '6px' }}>
              點擊設定齒輪選擇 <b>網頁應用程式 (Web App)</b>：
              <ul style={{ paddingLeft: '14px', listStyleType: 'circle', marginTop: '4px' }}>
                <li>專案說明：填入「寶可夢卡匣同步」</li>
                <li>執行身分：選擇「我 (您的Email)」</li>
                <li>誰有權限存取：選擇 <b>「任何人 (Anyone)」</b></li>
              </ul>
            </li>
            <li style={{ marginBottom: '6px' }}>
              點擊部署，完成 Google 帳號授權，部署成功後會產生一串 <b>網頁應用程式網址 (Web App URL)</b>。
            </li>
            <li>
              複製該網址，並貼回本 App 頂部的輸入框內，按「儲存並下載」即完成串接！
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}
