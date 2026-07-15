import React, { useState, useEffect, useRef } from 'react';
import { createWorker } from 'tesseract.js';
import { findPokemonByName } from '../data/pokemonDb';

export default function ScreenOcr({ onOcrMatchOpponent }) {
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [ocrStatus, setOcrStatus] = useState('idle'); // idle, loading, recognizing, success, error
  const [ocrResultText, setOcrResultText] = useState('');
  const [matchedPokemon, setMatchedPokemon] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // environment (back camera) or user (front)
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async () => {
    stopCamera();
    try {
      const constraints = {
        video: { 
          facingMode: facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasCameraPermission(true);
    } catch (err) {
      console.error("Camera access error:", err);
      setHasCameraPermission(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const toggleCameraFacing = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const handleCaptureAndOcr = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setOcrStatus('recognizing');
    setOcrResultText('');
    setMatchedPokemon(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Real video dimensions
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    canvas.width = videoWidth;
    canvas.height = videoHeight;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, videoWidth, videoHeight);

    // We can crop the middle area (the bounding box) to improve OCR speed & accuracy
    // Real bounding box is roughly 80% width and 100px height in the middle
    const cropX = Math.round(videoWidth * 0.1);
    const cropY = Math.round((videoHeight - 120) / 2);
    const cropW = Math.round(videoWidth * 0.8);
    const cropH = 120;

    // Create a temporary canvas for the cropped text area
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = cropW;
    cropCanvas.height = cropH;
    const cropCtx = cropCanvas.getContext('2d');
    cropCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    // Convert cropCanvas image to grayscale/high-contrast to help OCR
    const imgData = cropCtx.getImageData(0, 0, cropW, cropH);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const brightness = 0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
      // simple thresholding
      const val = brightness > 125 ? 255 : 0;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    }
    cropCtx.putImageData(imgData, 0, 0);

    try {
      // Initialize Tesseract Worker
      // Note: In browser, we use the CDN hosted worker & languages (chi_tra for Traditional Chinese)
      const worker = await createWorker('chi_tra');
      
      const { data: { text } } = await worker.recognize(cropCanvas);
      await worker.terminate();

      const cleanText = text.replace(/[\s\p{P}]/gu, ''); // strip spaces and punctuation
      setOcrResultText(cleanText);

      // Search name in our DB
      const matched = findPokemonByName(cleanText);
      if (matched) {
        setMatchedPokemon(matched);
        setOcrStatus('success');
        // Callback to add to parent selected opponents list
        onOcrMatchOpponent(matched);
      } else {
        setOcrStatus('error');
      }
    } catch (err) {
      console.error("OCR Error:", err);
      setOcrStatus('error');
    }
  };

  return (
    <div className="glass-panel mb-4">
      <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#ff9f0a', marginBottom: '12px' }}>
        📷 掃描螢幕辨識對手 (保留方案)
      </h2>
      
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
        請將綠色對準框對齊機台螢幕上的<b>「對手寶可夢中文名字」</b>，然後點擊辨識按鈕。
      </p>

      {hasCameraPermission === false && (
        <div style={{ color: '#ff453a', fontSize: '13px', padding: '16px', borderRadius: '10px', background: 'rgba(255,69,58,0.1)', textAlign: 'center', border: '1px solid rgba(255,69,58,0.2)' }} className="mb-4">
          ⚠️ 無法取得相機存取權限。請確認瀏覽器相機設定，或手動點選上方的「一鍵快選」。
        </div>
      )}

      {hasCameraPermission && (
        <div className="mb-4">
          <div className="scanner-viewport">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {/* Target Area Overlay */}
            <div className="scanner-overlay-box">
              <div className="scanner-line"></div>
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
                padding: '4px 8px',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              🔄 切換鏡頭
            </button>
          </div>
          
          <button 
            className="btn-primary" 
            onClick={handleCaptureAndOcr}
            disabled={ocrStatus === 'recognizing'}
            style={{ 
              marginTop: '12px',
              background: ocrStatus === 'recognizing' ? '#4b5563' : 'linear-gradient(to right, #ff453a, #ff9f0a)'
            }}
          >
            {ocrStatus === 'recognizing' ? '⏳ 正在讀取並辨識中...' : '🔍 辨識機台螢幕名稱'}
          </button>
        </div>
      )}

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
          gap: '4px'
        }}>
          <div>辨識文字: <b style={{ color: '#fff' }}>"{ocrResultText || '未偵測到'}"</b></div>
          {ocrStatus === 'recognizing' && <div style={{ color: '#30b0c7' }}>狀態: Tesseract 文字辨識引擎載入中...</div>}
          {ocrStatus === 'success' && matchedPokemon && (
            <div style={{ color: '#34c759', fontWeight: 'bold' }}>
              🟢 成功配對：{matchedPokemon.stars}★ {matchedPokemon.name}！已帶入推薦計算。
            </div>
          )}
          {ocrStatus === 'error' && (
            <div style={{ color: '#ff453a' }}>
              ❌ 未能配對到資料庫寶可夢。請嘗試重新對焦，或手動由上方「一鍵快選」點選。
            </div>
          )}
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
