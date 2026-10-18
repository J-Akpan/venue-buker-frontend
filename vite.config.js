import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// In dev, /api is proxied to the backend so the browser sees one origin (no CORS setup needed).
// The backend's default CORS_ORIGINS and Stripe return URLs already point at http://localhost:3000.
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '')
    return {
        plugins: [react()],
        server: {
            port: 3000,
            proxy: { '/api': { target: env.VITE_PROXY_TARGET || 'http://localhost:4000', changeOrigin: true } },
        },
    }
})
