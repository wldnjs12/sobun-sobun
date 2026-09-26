import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 백엔드(Spring Boot, 8080)로 /api 요청을 프록시해 CORS 설정 없이 개발할 수 있게 한다.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
      '/ws-sobun': {
        target: 'ws://localhost:8080',
        ws: true,
      },
    },
  },
})
