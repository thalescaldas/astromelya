"use client";

import { MediaView } from "@/components/exhibition/MediaView";
import type { ProjectModule } from "@/projects";
import { ColorReveal } from "./ColorReveal";
import { Gallery } from "./Gallery";
import styles from "./Immersion.module.css";
import { LazyMount } from "./LazyMount";
import { useReducedMotion } from "./useReducedMotion";

/** Exploration: renderiza somente os módulos presentes no registro. */
export function Modules({ modules }: { modules: ProjectModule[] }) {
  const reducedMotion = useReducedMotion();
  return (
    <>
      {modules.map((m, i) => {
        const heading = m.title ? <h2 className={styles.sectionLabel}>{m.title}</h2> : null;
        let body = null;
        if (m.type === "gallery" && m.images.length) body = <Gallery images={m.images} />;
        else if (m.type === "video")
          body = (
            <ColorReveal className={styles.frame}>
              <MediaView media={{ type: "video", src: m.src, poster: m.poster, alt: m.alt }} className={styles.fill} reducedMotion={reducedMotion} controls />
            </ColorReveal>
          );
        else if (m.type === "model")
          body = (
            <LazyMount className={styles.frame}>
              <ColorReveal className={styles.fill} label={`${m.alt} — reveal colors`}>
                <MediaView media={{ type: "model", src: m.src, alt: m.alt }} className={styles.fill} reducedMotion={reducedMotion} />
              </ColorReveal>
            </LazyMount>
          );
        else if (m.type === "audio")
          body = (
            <figure className={styles.audio}>
              <figcaption className={styles.audioTitle}>{m.title}</figcaption>
              <audio controls preload="none" src={m.src} />
            </figure>
          );
        else if (m.type === "external")
          body = (
            <a className={styles.link} href={m.href} target="_blank" rel="noopener noreferrer">
              {m.label} <span aria-hidden="true">↗</span>
            </a>
          );
        if (!body) return null;
        return (
          <section key={i} className={styles.section}>
            {m.type !== "audio" && heading}
            {body}
          </section>
        );
      })}
    </>
  );
}
