import { Toaster as SonnerToaster } from "sonner";
import { Check, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { ToastProvider, ToastViewport } from "@/components/ui/toast";

export function Toaster() {
  return (
    <>
      <SonnerToaster 
        position="top-center" 
        visibleToasts={3}
        expand={false}
        gap={6}
        duration={2500}
        toastOptions={{
          unstyled: true,
          classNames: {
            toast: "group flex items-center gap-2.5 w-full max-w-xs pl-3 pr-10 py-2.5 rounded-xl bg-zinc-800/95 backdrop-blur-sm shadow-lg font-['Plus_Jakarta_Sans',sans-serif] relative overflow-hidden",
            title: "text-xs font-medium text-white leading-tight",
            description: "text-xs text-zinc-400 leading-tight mt-0.5",
            closeButton: "!absolute !right-2.5 !top-1/2 !-translate-y-1/2 !left-auto !bg-transparent !border-none !text-zinc-400 hover:!text-white !opacity-100 !w-6 !h-6 !p-0 flex items-center justify-center [&>svg]:!w-3.5 [&>svg]:!h-3.5",
          },
          style: {
            '--toast-progress': '1',
          } as React.CSSProperties,
        }}
        icons={{
          success: (
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-b from-blue-500 to-blue-600 shrink-0 shadow-[0_2px_8px_0_rgba(37,99,235,0.4)]">
              <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
            </div>
          ),
          error: (
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-b from-red-500 to-red-600 shrink-0 shadow-[0_2px_8px_0_rgba(239,68,68,0.4)]">
              <AlertCircle className="h-3.5 w-3.5 text-white" strokeWidth={3} />
            </div>
          ),
          info: (
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-b from-blue-500 to-blue-600 shrink-0 shadow-[0_2px_8px_0_rgba(37,99,235,0.4)]">
              <Info className="h-3.5 w-3.5 text-white" strokeWidth={3} />
            </div>
          ),
          warning: (
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-b from-yellow-500 to-yellow-600 shrink-0 shadow-[0_2px_8px_0_rgba(234,179,8,0.4)]">
              <AlertTriangle className="h-3.5 w-3.5 text-white" strokeWidth={3} />
            </div>
          ),
        }}
        closeButton
      />
      <ToastProvider>
        <ToastViewport />
      </ToastProvider>
      <style>{`
        /* Force center alignment on mobile */
        [data-sonner-toaster] {
          left: 50% !important;
          right: auto !important;
          transform: translateX(-50%) !important;
        }
        [data-sonner-toast] {
          position: relative;
          overflow: hidden;
        }
        [data-sonner-toast]::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          height: 2px;
          width: 100%;
          background: rgba(255,255,255,0.25);
          transform-origin: left;
          animation: toast-progress var(--toast-duration, 2500ms) linear forwards;
        }
        [data-sonner-toast][data-type="success"]::after {
          background: linear-gradient(90deg, #3b82f6, #2563eb);
        }
        [data-sonner-toast][data-type="error"]::after {
          background: linear-gradient(90deg, #ef4444, #dc2626);
        }
        [data-sonner-toast][data-type="warning"]::after {
          background: linear-gradient(90deg, #eab308, #ca8a04);
        }
        [data-sonner-toast][data-type="info"]::after {
          background: linear-gradient(90deg, #3b82f6, #2563eb);
        }
        @keyframes toast-progress {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
      `}</style>
    </>
  );
}
