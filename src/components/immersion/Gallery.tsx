"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ProjectModule } from "@/projects";
import { ColorReveal } from "./ColorReveal";
import styles from "./Immersion.module.css";

type Images = Extract<ProjectModule, { type: "gallery" }>["images"];

/** Image Explorer: miniaturas → visualizador em tela cheia com zoom e navegação. */
export function Gallery({ images }: { images: Images }) {
  const [open, setOpen] = useState<number | null>(null);
  const [zoom, setZoom] = useState(false);
  const opener = useRef<HTMLButtonElement | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(null);
    setZoom(false);
    opener.current?.focus();
  }, []);
  const step = useCallback((d: number) => {
    setZoom(false);
    setOpen((i) => (i === null ? i : (i + d + images.length) % images.length));
  }, [images.length]);

  useEffect(() => {
    if (open === null) return;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close, step]);

  const img = open === null ? null : images[open];
  return (
    <>
      <ul className={styles.gallery}>
        {images.map((image, i) => (
          <li key={image.src + i}>
            <ColorReveal>
              <button
                type="button"
                className={styles.thumb}
                onClick={(e) => {
                  opener.current = e.currentTarget;
                  setOpen(i);
                }}
                aria-label={`Enlarge: ${image.alt}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.src} alt="" width={image.width} height={image.height} loading="lazy" decoding="async" />
              </button>
            </ColorReveal>
          </li>
        ))}
      </ul>
      {img && (
        <div className={styles.viewer} role="dialog" aria-modal="true" aria-label={img.alt}>
          <button type="button" ref={closeBtn} className={styles.viewerClose} onClick={close}>
            Close
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img.src}
            alt={img.alt}
            className={`${styles.viewerImage} ${zoom ? styles.zoomed : ""}`}
            onClick={() => setZoom((z) => !z)}
          />
          {images.length > 1 && (
            <div className={styles.viewerNav}>
              <button type="button" onClick={() => step(-1)} aria-label="Previous image">←</button>
              <span>
                {String(open! + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}
              </span>
              <button type="button" onClick={() => step(1)} aria-label="Next image">→</button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
