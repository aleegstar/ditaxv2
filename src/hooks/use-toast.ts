
import { toast as sonnerToast } from "sonner";

type ToastProps = {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "default" | "destructive";
};

// Define a toast function that properly handles the properties
export const toast = (
  titleOrOptions: string | ToastProps,
  options?: Omit<ToastProps, "title">
) => {
  // If first argument is a string, treat it as the title
  if (typeof titleOrOptions === "string") {
    sonnerToast.success(titleOrOptions, options);
  } 
  // If it's an object with a title, extract and pass the rest as options
  else if (titleOrOptions && typeof titleOrOptions === "object") {
    const { title, variant, ...restOptions } = titleOrOptions;
    
    // Use different toast types based on variant
    if (variant === "destructive") {
      sonnerToast.error(title || "", restOptions);
    } else {
      sonnerToast.success(title || "", restOptions);
    }
  }
};

// Create the useToast hook that returns the toast function
export const useToast = () => {
  return { toast };
};

// Also export the original sonnerToast for components that need direct access
export { sonnerToast };
