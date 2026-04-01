"use client";

import { motion, useReducedMotion } from "framer-motion";
import { motionTokens } from "./motion/tokens";

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: motionTokens.durations.fast }}
      className="animate-pulse rounded-lg border border-white/10 bg-white/5 px-3 py-4 text-sm text-white/70"
    >
      {label}
    </motion.div>
  );
}

