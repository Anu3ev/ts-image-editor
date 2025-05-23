import { defineConfig } from 'vite'
import babel from 'vite-plugin-babel'
import { analyzer } from 'vite-bundle-analyzer'

export default defineConfig({
  build: {
    sourcemap: false,
    target: 'es2015',

    lib: {
      entry: 'src/main.js',
      name: 'ImageEditor',
      formats: ['es'],
      fileName: (format) => `image-editor.${format}.js`
    },

    outDir: 'dist',
    emptyOutDir: true,

    rollupOptions: {
      // внешние зависимости – не бандлить их
      external: [
        'fabric',
        'jspdf',
        'jsondiffpatch'
      ],

      output: {
        // все файлы – в корень dist, без assets/…
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name][extname]'
      }
    }
  },
  plugins: [
    babel(),
    analyzer({
      filename: 'stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true
    })
  ]
})
