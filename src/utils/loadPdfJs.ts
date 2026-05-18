/**
 * Loads pdf.js from CDN exactly once and resolves when window.pdfjsLib
 * is available with the worker configured.
 */
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

const PDFJS_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

let loadPromise: Promise<boolean> | null = null;

export function ensurePdfJsLoaded(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.pdfjsLib) {
    try {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        window.pdfjsLib.GlobalWorkerOptions.workerSrc || PDFJS_WORKER;
    } catch {}
    return Promise.resolve(true);
  }
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${PDFJS_SRC}"]`,
    );
    const script = existing ?? document.createElement('script');
    if (!existing) {
      script.src = PDFJS_SRC;
      script.async = true;
      document.body.appendChild(script);
    }
    const onReady = () => {
      try {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
        }
        resolve(!!window.pdfjsLib);
      } catch {
        resolve(false);
      }
    };
    script.addEventListener('load', onReady, { once: true });
    script.addEventListener(
      'error',
      () => {
        console.error('[loadPdfJs] failed to load pdf.js');
        resolve(false);
      },
      { once: true },
    );
    // If script was already loaded but event fired before listener attached
    if (window.pdfjsLib) onReady();
  });

  return loadPromise;
}
