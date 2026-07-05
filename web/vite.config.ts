import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Dev: talk to a locally-running sim_sidecar.lex play host at :8900.
// Build: emits to ../examples-dist, which sim_sidecar.lex serves as a static
// fallback (see lex-robot#87) at the same origin as the API — no CORS needed.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/skill': 'http://localhost:8900',
      '/events': { target: 'http://localhost:8900', ws: false },
      '/api': 'http://localhost:8900',
    },
  },
  build: {
    outDir: '../examples-dist',
    emptyOutDir: true,
  },
})
