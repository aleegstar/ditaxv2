import { Toaster as SonnerToaster } from "sonner";
import { Check, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import { Toast, ToastProvider, ToastViewport } from "@/components/ui/toast";

export function Toaster() {
  return (
    <>
      <SonnerToaster 
        position="bottom-center" 
        visibleToasts={3}
        gap={12}
        toastOptions={{
          unstyled: true,
          classNames: {
            toast: "group flex items-center gap-3 w-full max-w-md pl-4 pr-14 py-3.5 rounded-2xl bg-zinc-800/95 backdrop-blur-sm shadow-xl font-['Plus_Jakarta_Sans',sans-serif] relative",
            title: "text-sm font-medium text-white leading-tight",
            description: "text-sm text-zinc-400 leading-tight mt-0.5",
            closeButton: "!absolute !right-4 !top-1/2 !-translate-y-1/2 !left-auto !bg-transparent !border-none !text-zinc-400 hover:!text-white !opacity-100 !w-8 !h-8 !p-0 flex items-center justify-center [&>svg]:!w-5 [&>svg]:!h-5",
          },
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
    </>
  );
}
