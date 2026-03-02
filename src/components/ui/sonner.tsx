import { Toaster as Sonner, toast } from "sonner";
import type { ComponentProps } from "react";

type ToasterProps = ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      position="bottom-center"
      expand={true}
      visibleToasts={3}
      gap={8}
      closeButton={false}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[#1a1a1a] group-[.toaster]:text-white group-[.toaster]:border-[#333] group-[.toaster]:shadow-lg group-[.toaster]:text-xs group-[.toaster]:py-2 group-[.toaster]:px-3 group-[.toaster]:cursor-grab group-[.toaster]:active:cursor-grabbing",
          description: "group-[.toast]:text-gray-300 group-[.toast]:text-xs",
          actionButton:
            "group-[.toast]:bg-blue-600 group-[.toast]:text-white group-[.toast]:text-xs",
          cancelButton:
            "group-[.toast]:bg-gray-700 group-[.toast]:text-gray-300 group-[.toast]:text-xs",
          success: "group-[.toast]:bg-[#1a1a1a] group-[.toast]:text-green-400",
          error: "group-[.toast]:bg-[#1a1a1a] group-[.toast]:text-red-400",
          info: "group-[.toast]:bg-[#1a1a1a] group-[.toast]:text-blue-400",
        },
        style: {
          zIndex: 9999,
          background: '#1a1a1a',
          color: '#fff',
          border: '1px solid #333',
          fontSize: '12px',
          padding: '8px 12px',
          minHeight: 'auto',
        },
      }}
      style={{
        zIndex: 9999,
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
