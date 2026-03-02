// Shim to use Sonner for toasts and avoid React hook conflicts
import { toast as sonnerToast } from "sonner";
import type { ReactNode } from "react";

type ToastOptions = {
  title?: ReactNode;
  description?: ReactNode;
  variant?: "default" | "destructive";
  action?: ReactNode;
  duration?: number;
};

export function toast(opts: ToastOptions) {
  const { title, description, variant = "default", duration } = opts || {};

  const titleText =
    typeof title === "string" ? title : title ? String(title) : undefined;
  const descriptionText =
    typeof description === "string"
      ? description
      : description
      ? String(description)
      : undefined;

  let id: string | number;
  if (variant === "destructive") {
    id = sonnerToast.error(titleText ?? descriptionText ?? "Error", {
      description: titleText && descriptionText ? descriptionText : undefined,
      duration,
    });
  } else {
    id = sonnerToast(titleText ?? descriptionText ?? "", {
      description: titleText && descriptionText ? descriptionText : undefined,
      duration,
    });
  }

  return {
    id,
    dismiss: () => sonnerToast.dismiss(id as any),
    update: (_: any) => {},
  };
}

export function useToast() {
  return {
    toasts: [],
    toast,
    dismiss: (toastId?: string) => sonnerToast.dismiss(toastId as any),
  };
}

