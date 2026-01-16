import { Toaster as SonnerToaster } from "sonner";
import { Check, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { Toast, ToastProvider, ToastViewport } from "@/components/ui/toast";

export function Toaster() {
  return (
    <>
      <SonnerToaster 
        position="bottom-center" 
        toastOptions={{
          unstyled: true,
          classNames: {
            toast: "group flex items-center gap-3 w-full max-w-md pl-4 pr-12 py-3.5 rounded-2xl bg-zinc-800/95 backdrop-blur-sm shadow-xl font-['Plus_Jakarta_Sans',sans-serif] relative",
            title: "text-sm font-medium text-white leading-tight",
            description: "text-sm text-zinc-400 leading-tight mt-0.5",
            closeButton: "!absolute !right-3 !top-1/2 !-translate-y-1/2 !left-auto !bg-transparent !border-none !text-zinc-500 hover:!text-white !opacity-100 !w-6 !h-6 !p-0 flex items-center justify-center",
          },
        }}
        icons={{
          success: (
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-green-500 shrink-0">
              <Check className="h-3 w-3 text-white" strokeWidth={3} />
            </div>
          ),
          error: (
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500 shrink-0">
              <AlertCircle className="h-3 w-3 text-white" strokeWidth={3} />
            </div>
          ),
          info: (
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 shrink-0">
              <Info className="h-3 w-3 text-white" strokeWidth={3} />
            </div>
          ),
          warning: (
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-yellow-500 shrink-0">
              <AlertTriangle className="h-3 w-3 text-white" strokeWidth={3} />
            </div>
          ),
        }}
        closeButton
      />
      <ToastProvider>
        <ToastViewport />
      </ToastProvider>
    </>
  );
}
