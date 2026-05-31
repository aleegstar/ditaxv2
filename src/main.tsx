
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { Toaster } from "@/components/ui/toaster";
// Import security enhancements
import '@/utils/securityHeaders';
import { EnhancedSecurityService } from '@/services/EnhancedSecurityService';
// Import native error monitoring
import { NativeErrorMonitor } from '@/utils/nativeErrorMonitor';
import { isAndroidEnvironment } from '@/utils/platform';
import { isDespiaNative, isDespiaIOS, isDespiaAndroid } from '@/lib/despia';
import { initDespiaKeyboardHandling } from '@/lib/despiaKeyboard';
import { OfflineQueueService } from '@/services/OfflineQueueService';
import { initOfflineServiceWorker } from '@/lib/offlineServiceWorker';

// Initialize security and monitoring systems
EnhancedSecurityService.applySecurity().catch(console.error);
NativeErrorMonitor.init();

// Add no-blur class for Android environments
if (isAndroidEnvironment()) {
  document.body.classList.add('no-blur');
  NativeErrorMonitor.addBreadcrumb('system', 'Android environment detected, no-blur class added');
}

// Tag <html> with Despia native classes so CSS can enforce safe-area minimums.
// Despia WebViews don't reliably emit env(safe-area-inset-top), so we apply a
// platform-aware floor to prevent the status bar from overlapping content.
if (isDespiaNative()) {
  const root = document.documentElement;
  root.classList.add('despia-native');
  if (isDespiaIOS()) root.classList.add('despia-ios');
  if (isDespiaAndroid()) root.classList.add('despia-android');
  NativeErrorMonitor.addBreadcrumb('system', 'Despia native env detected, safe-area floor enabled');
}

// Disable native keyboard auto-scroll in Despia so keyboard-aware views can
// position fixed footers with visualViewport-driven JS logic.
initDespiaKeyboardHandling();

// Bring the offline write-queue online: hydrates any pending jobs from
// IndexedDB and wires online/visibility/auth triggers for auto-drain.
OfflineQueueService.start();

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <Toaster />
  </>
);
