import { Toaster as SonnerToaster } from "sonner";
import { CheckCircle, X, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";

export function Toaster() {
  return (
    <>
      <SonnerToaster 
        position="bottom-center" 
        toastOptions={{
          unstyled: true,
          classNames: {
            toast: "flex items-center gap-3 w-full max-w-md px-4 py-3.5 rounded-xl bg-zinc-800/95 backdrop-blur-sm shadow-lg border border-zinc-700/50",
            title: "text-sm font-medium text-white",
            description: "text-sm text-zinc-300",
            actionButton: "bg-white text-zinc-900 px-3 py-1.5 rounded-lg text-sm font-medium",
            cancelButton: "text-zinc-400 hover:text-white text-sm",
            closeButton: "text-zinc-400 hover:text-white",
            success: "",
            error: "",
            info: "",
            warning: "",
          },
        }}
        icons={{
          success: <CheckCircle className="h-5 w-5 text-green-400 shrink-0" />,
          error: <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />,
          info: <Info className="h-5 w-5 text-blue-400 shrink-0" />,
          warning: <AlertTriangle className="h-5 w-5 text-yellow-400 shrink-0" />,
        }}
        closeButton
      />
      <ToastProvider>
        <ToastViewport />
      </ToastProvider>
    </>
  );
}
