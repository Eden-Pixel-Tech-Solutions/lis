import react from '@vitejs/plugin-react'

/** @type {import('vite').UserConfig} */
export default {
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://172.16.11.160:7005',
        changeOrigin: true,
        secure: false,
      }
    }
  }
}
