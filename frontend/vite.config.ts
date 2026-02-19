import { defineConfig } from 'vite'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [],
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        catalog: resolve(__dirname, 'catalog.html'),
        cart: resolve(__dirname, 'cart.html'),
        contacts: resolve(__dirname, 'contacts.html'),
        delivery: resolve(__dirname, 'delivery.html'),
        discounts: resolve(__dirname, 'discounts.html'),
        faq: resolve(__dirname, 'faq.html'),
        payment: resolve(__dirname, 'payment.html'),
        product: resolve(__dirname, 'product.html'),
        videos: resolve(__dirname, 'videos.html'),
        wholesale: resolve(__dirname, 'wholesale.html'),
        cabinet: resolve(__dirname, 'cabinet/index.html')
      }
    }
  },
  server: {
    port: 3001
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
      '@js': resolve(__dirname, './js'),
      '@css': resolve(__dirname, './css'),
      '@api': resolve(__dirname, './js/api')
    }
  }
})