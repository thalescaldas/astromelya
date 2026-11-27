"use client";

import { useEffect, useRef } from "react";
import { runSignal } from "./signal";
import styles from "./Contact.module.css";

/** Camada decorativa das ondas. Sem JavaScript, a página permanece legível. */
export function SignalCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const controller = runSignal(canvas, window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    return () => controller.dispose();
  }, []);
  return <canvas ref={ref} className={styles.canvas} aria-hidden="true" />;
}
