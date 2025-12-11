
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

// Initialize security and monitoring systems
EnhancedSecurityService.applySecurity().catch(console.error);
NativeErrorMonitor.init();

// Add no-blur class for Android environments
if (isAndroidEnvironment()) {
  document.body.classList.add('no-blur');
  NativeErrorMonitor.addBreadcrumb('system', 'Android environment detected, no-blur class added');
}

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <Toaster />
  </>
);
