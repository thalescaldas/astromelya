"use client";

import { MediaView } from "@/components/exhibition/MediaView";
import type { Project } from "@/projects";
import { ColorReveal } from "./ColorReveal";
import styles from "./Immersion.module.css";
import { useReducedMotion } from "./useReducedMotion";

/** Arrival: obra em tela cheia com identificação. */
export function Hero({ project }: { project: Project }) {
  const reducedMotion = useReducedMotion();
  return (
    <section className={styles.hero} aria-labelledby="work-title">
      <ColorReveal className={styles.heroMedia} label={`${project.title} — reveal colors`} hero>
        <MediaView media={project.media} className={styles.fill} reducedMotion={reducedMotion} />
      </ColorReveal>
      <div className={styles.heroInfo}>
        <p className={styles.label}>
          {project.category.join(" · ")} <span aria-hidden="true">/</span> {project.year}
        </p>
        <h1 id="work-title" className={styles.title}>
          {project.title}
        </h1>
      </div>
    </section>
  );
}
