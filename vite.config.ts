import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: { home: 'index.html', cards: 'cards/index.html' },
    },
  },
})
