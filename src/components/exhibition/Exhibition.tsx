"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { routes } from "@/config/site";
import type { Project } from "@/projects";
import styles from "./Exhibition.module.css";

const ModelView = dynamic(() => import("./ModelView").then((m) => m.ModelView), { ssr: false });

/** Dissolução no preto: metade saindo, metade entrando (total 1200 ms). */
const TRANSITION_MS = 1200;
const WHEEL_THRESHOLD = 40;
const SWIPE_THRESHOLD = 50;

const pad = (n: number) => String(n).padStart(2, "0");

function Media({ project, active, colored, reducedMotion }: { project: Project; active: boolean; colored: boolean; reducedMotion: boolean }) {
  const m = project.media;
  const cls = `${styles.media} ${colored ? styles.colored : ""}`;
  if (!active) return null; // carregamento sob demanda: só a obra atual
  if (m.type === "image") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={cls} src={m.src} alt={m.alt} width={m.width} height={m.height} decoding="async" />;
  }
  if (m.type === "video") {
    return (
      <video
        className={cls}
        src={m.src}
        poster={m.poster}
        aria-label={m.alt}
        muted
        playsInline
        loop
        autoPlay={!reducedMotion}
        preload="metadata"
      />
    );
  }
  return (
    <div className={cls}>
      <ModelView src={m.src} label={m.alt} reducedMotion={reducedMotion} />
    </div>
  );
}

export function Exhibition({ projects }: { projects: Project[] }) {
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(0); // obra efetivamente exibida (troca no meio da dissolução)
  const [veil, setVeil] = useState(false);
  const [colored, setColored] = useState(false);
  const [indexOpen, setIndexOpen] = useState(false);
  const [preview, setPreview] = useState<number | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const busy = useRef(false);
  const wheelAcc = useRef(0);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const n = projects.length;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReducedMotion(mq.matches);
  }, []);

  const go = useCallback(
    (target: number) => {
      if (busy.current || n < 2) return;
      const next = ((target % n) + n) % n;
      if (next === index) return;
      busy.current = true;
      setIndex(next);
      setColored(false);
      const half = reducedMotion ? 0 : TRANSITION_MS / 2;
      setVeil(true);
      window.setTimeout(() => {
        setShown(next);
        setVeil(false);
        window.setTimeout(() => (busy.current = false), half);
      }, half);
    },
    [index, n, reducedMotion],
  );

  // teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (indexOpen) {
        if (e.key === "Escape") setIndexOpen(false);
        return;
      }
      if (["ArrowDown", "ArrowRight", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        go(index + 1);
      } else if (["ArrowUp", "ArrowLeft", "PageUp"].includes(e.key)) {
        e.preventDefault();
        go(index - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, indexOpen]);

  const onWheel = (e: React.WheelEvent) => {
    if (indexOpen || busy.current) return;
    wheelAcc.current += e.deltaY + e.deltaX;
    if (Math.abs(wheelAcc.current) > WHEEL_THRESHOLD) {
      go(index + (wheelAcc.current > 0 ? 1 : -1));
      wheelAcc.current = 0;
    }
  };
  const onTouchStart = (e: React.TouchEvent) => {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = touch.current;
    touch.current = null;
    if (!s || indexOpen) return;
    const dx = e.changedTouches[0].clientX - s.x;
    const dy = e.changedTouches[0].clientY - s.y;
    const d = Math.abs(dx) > Math.abs(dy) ? dx : dy;
    if (Math.abs(d) > SWIPE_THRESHOLD) go(index + (d < 0 ? 1 : -1));
    else if ((e.target as Element).closest("[data-media]")) setColored((c) => !c); // toque na mídia alterna cores
  };

  if (n === 0) {
    return (
      <section className={styles.empty} aria-labelledby="exhibition-empty">
        <p className={styles.label}>The Exhibition</p>
        <h1 id="exhibition-empty" className={styles.emptyTitle}>
          The first works are taking form.
        </h1>
      </section>
    );
  }

  const p = projects[shown];
  return (
    <div className={styles.stage} onWheel={onWheel} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <figure
        className={styles.frame}
        data-media
        onMouseEnter={() => setColored(true)}
        onMouseLeave={() => setColored(false)}
        onFocus={() => setColored(true)}
        onBlur={() => setColored(false)}
        tabIndex={0}
        aria-label={`${p.title} — reveal colors`}
      >
        <Media project={p} active colored={colored} reducedMotion={reducedMotion} />
      </figure>

      <section className={styles.info} aria-live="polite" aria-labelledby="exhibition-title">
        <p className={styles.label}>
          {p.category.join(" · ")} <span aria-hidden="true">/</span> {p.year}
        </p>
        <h1 id="exhibition-title" className={styles.title}>
          {p.title}
        </h1>
        <Link href={`${routes.projects}/${p.slug}`} className={styles.explore}>
          Explore <span aria-hidden="true">↗</span>
        </Link>
      </section>

      <nav className={styles.controls} aria-label="Exhibition">
        <button type="button" className={styles.arrow} onClick={() => go(index - 1)} aria-label="Previous work" disabled={n < 2}>
          ←
        </button>
        <p className={styles.counter} aria-label={`Work ${shown + 1} of ${n}`}>
          {pad(shown + 1)} <span aria-hidden="true">/</span> {pad(n)}
        </p>
        <button type="button" className={styles.arrow} onClick={() => go(index + 1)} aria-label="Next work" disabled={n < 2}>
          →
        </button>
        <button type="button" className={styles.indexToggle} onClick={() => setIndexOpen(true)} aria-haspopup="dialog">
          Index
        </button>
      </nav>

      <div className={`${styles.veil} ${veil ? styles.veilOn : ""}`} style={{ transitionDuration: `${reducedMotion ? 0 : TRANSITION_MS / 2}ms` }} aria-hidden="true" />

      {indexOpen && (
        <div className={styles.index} role="dialog" aria-modal="true" aria-label="Index of works">
          <button type="button" className={styles.close} onClick={() => setIndexOpen(false)} autoFocus>
            Close
          </button>
          <ol className={styles.list}>
            {projects.map((item, i) => (
              <li key={item.slug}>
                <button
                  type="button"
                  className={styles.item}
                  onMouseEnter={() => setPreview(i)}
                  onFocus={() => setPreview(i)}
                  onMouseLeave={() => setPreview(null)}
                  onClick={() => {
                    setIndexOpen(false);
                    setPreview(null);
                    go(i);
                  }}
                  aria-current={i === shown ? "true" : undefined}
                >
                  <span className={styles.itemNumber}>{pad(i + 1)}</span>
                  <span className={styles.itemTitle}>{item.title}</span>
                  <span className={styles.itemMeta}>
                    {item.category[0]} — {item.year}
                  </span>
                </button>
              </li>
            ))}
          </ol>
          {preview !== null && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.preview} src={projects[preview].cover.src} alt="" aria-hidden="true" />
          )}
        </div>
      )}
    </div>
  );
}
