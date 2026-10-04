import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

export default function ConfirmDialog({
  open,
  title,
  danger,
  gold,
  children,
  confirmLabel = "Confirm",
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  danger?: boolean;
  /** Use for money-moving confirmations (e.g. confirming a sale) — gold means money/winning. */
  gold?: boolean;
  children: ReactNode;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
        >
          <motion.div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-panel p-6"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
            <div className="mt-4 space-y-2 text-sm text-slate-muted">{children}</div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={onCancel}
                disabled={busy}
                className="min-h-[44px] rounded-lg px-4 py-2 text-sm font-medium text-slate-muted hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={busy}
                className={`min-h-[44px] rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
                  danger
                    ? "bg-coral/90 text-white hover:bg-coral"
                    : gold
                      ? "btn-gold"
                      : "btn-violet"
                }`}
              >
                {busy ? "Working…" : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
