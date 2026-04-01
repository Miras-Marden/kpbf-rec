"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { motionTokens } from "./tokens";

export function Modal({
  open,
  title,
  children,
  onClose
}: {
  open: boolean;
  title?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-end sm:place-items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: motionTokens.durations.fast }}
          aria-modal="true"
          role="dialog"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />

          <motion.div
            className="relative w-full max-w-xl rounded-t-2xl sm:rounded-2xl border border-white/10 bg-[#0b1220] p-4 shadow-2xl"
            initial={reduce ? { opacity: 1 } : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 1 } : { opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: motionTokens.durations.base, ease: motionTokens.ease.standard }}
          >
            {title ? <div className="text-sm font-semibold text-white/95">{title}</div> : null}
            <div className={title ? "mt-3" : ""}>{children}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

