import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      'localhost',
      '142.91.101.89',
      'aakashmanandhar.tech',
      'www.aakashmanandhar.tech',
    ],
  },
})