"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from "lucide-react";

export type ToastType = "error" | "success" | "info" | "warning";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

export interface ConfirmModalOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
  confirmModal: (options: ConfirmModalOptions) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
  confirmModal: async () => false,
});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<{
    options: ConfirmModalOptions;
    resolve: (val: boolean) => void;
  } | null>(null);

  // Trigger Toast Notification Popup
  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Trigger Modal Dialog Confirmation Popup
  const confirmModal = useCallback((options: ConfirmModalOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({ options, resolve });
    });
  }, []);

  const handleConfirmAction = (result: boolean) => {
    if (confirmState) {
      confirmState.resolve(result);
      setConfirmState(null);
    }
  };

  return (
    <ToastContext.Provider value={{ toast, confirmModal }}>
      {children}

      {/* Floating Pop-up Toast Notifications Container */}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0"
      >
        {toasts.map((item) => {
          const bgMap = {
            success: "bg-emerald-950 text-white border-emerald-700/80 shadow-emerald-900/30",
            error: "bg-rose-950 text-white border-rose-700/80 shadow-rose-900/30",
            warning: "bg-amber-950 text-amber-50 border-amber-600/80 shadow-amber-900/30",
            info: "bg-stone-900 text-white border-stone-700/80 shadow-stone-900/30",
          };

          const iconMap = {
            success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
            error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
            warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
            info: <Info className="w-5 h-5 text-amber-400 shrink-0" />,
          };

          return (
            <div
              key={item.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border shadow-xl backdrop-blur-md transition-all duration-300 animate-in slide-in-from-top-3 fade-in ${bgMap[item.type]}`}
              role="alert"
            >
              <div className="mt-0.5">{iconMap[item.type]}</div>
              <div className="flex-1 text-xs sm:text-sm font-semibold leading-snug">
                {item.message}
              </div>
              <button
                onClick={() => removeToast(item.id)}
                className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                title="Tutup"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Modal Confirmation Dialog Pop-up */}
      {confirmState && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-stone-950/65 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-sm w-full p-6 text-stone-900 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  confirmState.options.destructive
                    ? "bg-rose-100 text-rose-600"
                    : "bg-amber-100 text-amber-600"
                }`}
              >
                {confirmState.options.destructive ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Info className="w-5 h-5" />
                )}
              </div>
              <h3 className="font-extrabold text-base sm:text-lg text-stone-900 tracking-tight">
                {confirmState.options.title}
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-stone-600 mb-6 leading-relaxed">
              {confirmState.options.message}
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => handleConfirmAction(false)}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-stone-600 hover:bg-stone-100 border border-stone-200 transition-colors cursor-pointer"
              >
                {confirmState.options.cancelText || "Batal"}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmAction(true)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer text-white ${
                  confirmState.options.destructive
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-amber-500 hover:bg-amber-600 text-stone-950"
                }`}
              >
                {confirmState.options.confirmText || "Konfirmasi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}
