"use client";

import { useState, type ReactNode } from "react";
import styles from "./Immersion.module.css";

/**
 * Mídia monocromática que revela as cores: hover/foco (CSS) e toque (alternância).
 */
export function ColorReveal({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  const [on, setOn] = useState(false);
  return (
    <div
      className={`${styles.reveal} ${className ?? ""}`}
      data-colored={on || undefined}
      onPointerUp={(e) => {
        if (e.pointerType === "touch") setOn((v) => !v);
      }}
      tabIndex={label ? 0 : undefined}
      aria-label={label}
    >
      {children}
    </div>
  );
}
