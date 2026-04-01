"use client";

import { motion, useReducedMotion } from "framer-motion";
import { motionTokens } from "./tokens";

export function RevealList({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: {
          transition: reduce
            ? undefined
            : {
                staggerChildren: 0.045,
                delayChildren: 0.02
              }
        }
      }}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={{
        hidden: reduce ? { opacity: 1 } : { opacity: 0, y: motionTokens.distance.cardY },
        show: {
          opacity: 1,
          y: 0,
          transition: {
            duration: motionTokens.durations.base,
            ease: motionTokens.ease.standard
          }
        }
      }}
    >
      {children}
    </motion.div>
  );
}

