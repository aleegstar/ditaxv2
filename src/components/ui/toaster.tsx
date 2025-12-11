
import { Toaster as SonnerToaster } from "sonner";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";

export function Toaster() {
  return (
    <>
      <SonnerToaster position="bottom-right" />
      <ToastProvider>
        <ToastViewport />
      </ToastProvider>
    </>
  );
}
