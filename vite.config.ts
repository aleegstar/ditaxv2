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
}));
