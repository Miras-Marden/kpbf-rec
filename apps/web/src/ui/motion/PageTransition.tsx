"use client";

import { motion, useReducedMotion } from "framer-motion";
import { motionTokens } from "./tokens";

export function PageTransition({
  children,
  routeKey
}: {
  children: React.ReactNode;
  routeKey: string;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      key={routeKey}
      initial={reduce ? { opacity: 1 } : { opacity: 0, y: motionTokens.distance.pageY }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? { opacity: 1 } : { opacity: 0, y: -motionTokens.distance.pageY }}
      transition={{
        duration: motionTokens.durations.base,
        ease: motionTokens.ease.standard
      }}
    >
      {children}
    </motion.div>
  );
}

