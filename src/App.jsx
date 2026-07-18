import React, { useState, useEffect } from 'react';
import QuickTapPanel from './components/QuickTapPanel';
import CounterRecommender from './components/CounterRecommender';
import CardAlbum from './components/CardAlbum';
import CardRegister from './components/CardRegister';
import ScreenOcr from './components/ScreenOcr';
import SyncSettings from './components/SyncSettings';
import { GENERATIONS, setActiveGeneration } from './data/pokemonDb';

// Default starting collection (starts empty as requested)
const DEFAULT_COLLECTION = [];

export default function App() {
  const [cards, setCards] = useState([]);
  const [selectedOpponents, setSelectedOpponents] = useState([]);
  const [syncUrl, setSyncUrl] = useState('');
  const [activeTab, setActiveTab] = useState('recommender'); // recommender, album, register, ocr, settings
  const [showRegister, setShowRegister] = useState(false);
  const [genId, setGenId] = useState(() =>
    (typeof localStorage !== 'undefined' ? (localStorage.getItem('mezastar_active_gen') || 'galaxy2') : 'galaxy2')
  );

  // 切換代別：同步 pokemonDb 全域狀態 + 清空跨代對手
  const handleGenChange = (id) => {
    setActiveGeneration(id);
    setGenId(id);
    setSelectedOpponents([]);
    setActiveTab('recommender');
  };

  // 1. Initial configuration load (offline-first storage)
  useEffect(() => {
    // Load Sync URL
    const savedUrl = localStorage.getItem('gaole_sync_url') || '';
    setSyncUrl(savedUrl);

    // Load Cards from LocalStorage
    let savedCards = localStorage.getItem('gaole_collection');
    
    // Migration: If the user has our old mock cards, clear them
    if (savedCards && savedCards.includes('quaquaval-4-default')) {
      localStorage.removeItem('gaole_collection');
      savedCards = null;
    }

    if (savedCards) {
      try {
        setCards(JSON.parse(savedCards));
      } catch (e) {
        console.error("Failed to parse saved cards:", e);
        setCards(DEFAULT_COLLECTION);
        localStorage.setItem('gaole_collection', JSON.stringify(DEFAULT_COLLECTION));
      }
    } else {
      setCards(DEFAULT_COLLECTION);
      localStorage.setItem('gaole_collection', JSON.stringify(DEFAULT_COLLECTION));
    }
  }, []);

  // Save cards to LocalStorage whenever it changes
  const saveCardsLocal = (updatedCards) => {
    setCards(updatedCards);
    localStorage.setItem('gaole_collection', JSON.stringify(updatedCards));
  };

  // 2. Google Sheets sync callbacks
  const handleFetchCollection = (serverCards) => {
    if (Array.isArray(serverCards) && serverCards.length > 0) {
      // Convert string values to numbers where appropriate
      const formatted = serverCards.map(c => {
        // SPECIAL 精選卡匣：來自 Sheets 的 category 欄 或 stars="SPECIAL" 哨兵字串
        const isSpecial = c.category === 'special' || c.stars === 'SPECIAL';
        return {
          ...c,
          stars: isSpecial ? 0 : (Number(c.stars) || 1),
          category: isSpecial ? 'special' : (c.category || undefined),
          hp: Number(c.hp) || 0,
          attack: Number(c.attack) || 0,
          defense: Number(c.defense) || 0,
          spAtk: Number(c.spAtk) || 0,
          spDef: Number(c.spDef) || 0,
          speed: Number(c.speed) || 0,
          count: Number(c.count) || 1
        };
      });
      saveCardsLocal(formatted);
    }
  };

  const handleSyncCollection = async () => {
    if (!syncUrl) return;
    try {
      const response = await fetch(syncUrl, {
        method: 'POST',
        credentials: 'omit',
        headers: { 'Content-Type': 'text/plain' }, // Avoid CORS preflight options block
        body: JSON.stringify({
          action: 'sync',
          cards: cards
        })
      });
      if (!response.ok) throw new Error('伺服器回應錯誤');
      const resData = await response.json();
      if (!resData.success) throw new Error(resData.error || '同步失敗');
    } catch (err) {
      console.error("Cloud Sync Error:", err);
      throw err;
    }
  };

  // 3. Card Inventory Actions
  const handleAddCard = (newCard) => {
    // 用 cardId 比對是否已有同張卡（允許重複張數）
    // 每次「加入背包」都建立一筆獨立紀錄（方便計算實際張數）
    const uniqueEntry = {
      ...newCard,
      instanceId: `${newCard.cardId}-${Date.now()}`,
    };
    const updated = [uniqueEntry, ...cards];
    saveCardsLocal(updated);
    
    // Attempt cloud sync if online (runs in background)
    if (syncUrl) {
      fetch(syncUrl, {
        method: 'POST',
        credentials: 'omit',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'sync', cards: updated })
      }).catch(err => console.warn("Background sync failed (saved locally):", err));
    }
  };

  const handleDeleteCard = (cardId) => {
    const updated = cards.filter(c => c.cardId !== cardId);
    saveCardsLocal(updated);

    if (syncUrl) {
      fetch(syncUrl, {
        method: 'POST',
        credentials: 'omit',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'sync', cards: updated })
      }).catch(err => console.warn("Background sync failed (saved locally):", err));
    }
  };

  const handleUpdateCardLocation = (cardId, location) => {
    const updated = cards.map(c => c.cardId === cardId ? { ...c, storageLocation: location } : c);
    saveCardsLocal(updated);

    if (syncUrl) {
      fetch(syncUrl, {
        method: 'POST',
        credentials: 'omit',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'sync', cards: updated })
      }).catch(err => console.warn("Background sync failed (saved locally):", err));
    }
  };

  // 4. Opponent Selection Actions
  const handleToggleOpponent = (opponent) => {
    const exists = selectedOpponents.some(o => o.cardId === opponent.cardId);
    if (exists) {
      setSelectedOpponents(selectedOpponents.filter(o => o.cardId !== opponent.cardId));
    } else {
      if (selectedOpponents.length >= 3) {
        // limit to 3 opponents maximum (remove the oldest selected)
        setSelectedOpponents([selectedOpponents[1], selectedOpponents[2], opponent]);
      } else {
        setSelectedOpponents([...selectedOpponents, opponent]);
      }
    }
  };

  const handleClearOpponents = () => {
    setSelectedOpponents([]);
  };

  // Callback for OCR component matches (supports multiple opponents recognized from screen)
  const handleOcrMatchMultipleOpponents = (matchedList) => {
    if (Array.isArray(matchedList) && matchedList.length > 0) {
      setSelectedOpponents(matchedList.slice(0, 3));
    }
    // Switch back to recommender dashboard to see recommendations
    setActiveTab('recommender');
  };

  return (
    <div>
      {/* Premium Header */}
      <header className="app-header">
        <h1 className="app-title">
          <div style={{ position: 'relative', width: '24px', height: '24px' }}>
            {/* Minimal Pokeball SVG icon */}
            <svg viewBox="0 0 100 100" className="poke-ball-logo">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#fff" strokeWidth="8"/>
              <path d="M 5 50 A 45 45 0 0 1 95 50 Z" fill="#ff3b30" stroke="#fff" strokeWidth="4"/>
              <path d="M 5 50 A 45 45 0 0 0 95 50 Z" fill="#fff" stroke="#fff" strokeWidth="4"/>
              <line x1="5" y1="50" x2="95" y2="50" stroke="#fff" strokeWidth="8" />
              <circle cx="50" cy="50" r="14" fill="#000" stroke="#fff" strokeWidth="6" />
              <circle cx="50" cy="50" r="6" fill="#fff" />
            </svg>
          </div>
          MEZASTAR 對戰助手
        </h1>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {syncUrl ? '🟢 已連線試算表' : '⚠️ 本地離線模式'}
        </div>
      </header>

      {/* 代別選擇器 */}
      <div style={{ maxWidth: '500px', margin: '0 auto', padding: '10px 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <label style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>卡匣代別</label>
        <select
          value={genId}
          onChange={(e) => handleGenChange(e.target.value)}
          style={{
            flex: 1, fontSize: '14px', padding: '7px 10px', borderRadius: '8px',
            border: '1px solid var(--border, #ccc)', background: 'var(--bg-card, #fff)',
            color: 'var(--text, #111)', fontWeight: 600
          }}
        >
          {GENERATIONS.map(g => (
            <option key={g.id} value={g.id}>{g.label}</option>
          ))}
        </select>
      </div>

      {/* Main Content Area */}
      <main style={{ padding: '0 16px 20px 16px', maxWidth: '500px', margin: '0 auto' }}>
        {activeTab === 'recommender' && (
          <>
            <QuickTapPanel 
              selectedOpponents={selectedOpponents}
              onToggleOpponent={handleToggleOpponent}
              onClearOpponents={handleClearOpponents}
            />
            <CounterRecommender 
              collection={cards}
              selectedOpponents={selectedOpponents}
            />
          </>
        )}

        {activeTab === 'album' && (
          <CardAlbum 
            collection={cards}
            onUpdateCardLocation={handleUpdateCardLocation}
            onDeleteCard={handleDeleteCard}
            onAddManualCard={handleAddCard}
          />
        )}

        {/* CardRegister 為全畫面 overlay，不佔用 main 版面 */}

        {activeTab === 'ocr' && !showRegister && (
          <ScreenOcr 
            onOcrMatchOpponents={handleOcrMatchMultipleOpponents}
          />
        )}

        {activeTab === 'settings' && (
          <SyncSettings 
            syncUrl={syncUrl}
            setSyncUrl={setSyncUrl}
            onFetchCollection={handleFetchCollection}
            onSyncCollection={handleSyncCollection}
            cards={cards}
          />
        )}
      </main>

      {/* 三合一登錄 Overlay */}
      {showRegister && (
        <CardRegister
          collection={cards}
          onAddCard={handleAddCard}
          onClose={() => setShowRegister(false)}
        />
      )}

      {/* Floating Bottom Tab Navigation Bar */}
      <nav className="nav-bar">
        <button 
          className={`nav-item ${activeTab === 'recommender' ? 'active' : ''}`}
          onClick={() => setActiveTab('recommender')}
        >
          <span className="nav-icon">⚔️</span>
          <span>對戰推薦</span>
        </button>

        <button 
          className={`nav-item ${activeTab === 'album' ? 'active' : ''}`}
          onClick={() => setActiveTab('album')}
        >
          <span className="nav-icon">🎒</span>
          <span>我的卡匣</span>
        </button>

        <button 
          className={`nav-item ${showRegister ? 'active' : ''}`}
          onClick={() => setShowRegister(true)}
        >
          <span className="nav-icon">📦</span>
          <span>登錄卡匣</span>
        </button>

        <button 
          className={`nav-item ${activeTab === 'ocr' ? 'active' : ''}`}
          onClick={() => setActiveTab('ocr')}
        >
          <span className="nav-icon">🔎</span>
          <span>對手掃描</span>
        </button>

        <button 
          className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <span className="nav-icon">⚙️</span>
          <span>連線設定</span>
        </button>
      </nav>
    </div>
  );
}
