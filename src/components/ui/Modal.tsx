"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeStyles = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: ModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={cn(
          "relative w-full bg-white rounded-2xl shadow-xl flex flex-col max-h-[88vh] overflow-hidden",
          sizeStyles[size]
        )}
      >
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-5 md:px-6 md:py-4 border-b border-gray-100 flex-shrink-0">
          <h3 id="modal-title" className="text-lg font-bold text-gray-900">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="p-5 md:p-6 overflow-y-auto flex-1">{children}</div>

        {/* Footer - Pinned / Sticky at bottom */}
        {footer && (
          <div className="p-4 md:px-6 md:py-3.5 bg-slate-50 border-t border-slate-200/80 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
