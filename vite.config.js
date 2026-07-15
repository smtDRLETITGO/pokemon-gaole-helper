import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages 部署路徑（Repository 名稱）
  base: process.env.NODE_ENV === 'production' ? '/pokemon-gaole-helper/' : '/',
  plugins: [
    react(),
    basicSsl() // 本機開發用自簽憑證（GitHub Pages 會使用正式 SSL）
  ],
  server: {
    host: true,   // 允許區域網路手機連線（開發時用）
    port: 5173,
    https: true
  }
})

