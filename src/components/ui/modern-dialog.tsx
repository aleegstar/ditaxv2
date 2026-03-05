// Backward-compatible re-export from unified AppDialog
// All new code should import from '@/components/ui/app-dialog' directly

export {
  AppDialog as Dialog,
  AppDialogPortal as DialogPortal,
  AppDialogOverlay as DialogOverlay,
  AppDialogClose as DialogClose,
  AppDialogTrigger as DialogTrigger,
  AppDialogContent as DialogContent,
  AppDialogHeader as DialogHeader,
  AppDialogFooter as DialogFooter,
  AppDialogTitle as DialogTitle,
  AppDialogDescription as DialogDescription,
} from "@/components/ui/app-dialog";
