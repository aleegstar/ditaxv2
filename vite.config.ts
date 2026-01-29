import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { viteStaticCopy } from 'vite-plugin-static-copy';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
    // Copy tesseract-wasm files to public/ocr for local OCR on mobile
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/tesseract-wasm/dist/tesseract-core.wasm',
          dest: 'ocr'
        },
        {
          src: 'node_modules/tesseract-wasm/dist/tesseract-core-fallback.wasm',
          dest: 'ocr'
        },
        {
          src: 'node_modules/tesseract-wasm/dist/tesseract-worker.js',
          dest: 'ocr'
        }
      ]
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-ui-core': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip'
          ],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'vendor-charts': ['recharts'],
          'vendor-animation': ['framer-motion', 'motion'],
        }
      }
    },
    chunkSizeWarningLimit: 500,
  },
}));
