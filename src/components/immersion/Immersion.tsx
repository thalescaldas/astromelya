import Link from "next/link";
import { HtzSignature } from "@/components/about/HtzSignature";
import { routes } from "@/config/site";
import type { Project } from "@/projects";
import { ColorReveal } from "./ColorReveal";
import { Hero } from "./Hero";
import styles from "./Immersion.module.css";
import { Modules } from "./Modules";

/**
 * The Immersion — Arrival → Discovery → Concept → Exploration → Authorship → Continuation.
 * Seções opcionais só aparecem quando o registro tem conteúdo.
 */
export function Immersion({ project, next }: { project: Project; next: Project | null }) {
  const hasConcept = Boolean(project.concept || project.description?.length);
  return (
    <article className={styles.page}>
      <Hero project={project} />

      {hasConcept && (
        <section className={styles.section} aria-label="Concept">
          <h2 className={styles.sectionLabel}>Concept</h2>
          {project.concept && <p className={styles.concept}>{project.concept}</p>}
          {project.description?.map((p) => (
            <p key={p} className={styles.body}>
              {p}
            </p>
          ))}
        </section>
      )}

      {project.modules?.length ? <Modules modules={project.modules} /> : null}

      {project.externalLink && (
        <section className={styles.section}>
          <a className={styles.link} href={project.externalLink} target="_blank" rel="noopener noreferrer">
            Visit the work <span aria-hidden="true">↗</span>
          </a>
        </section>
      )}

      <section className={styles.section} aria-label="Credits">
        <h2 className={styles.sectionLabel}>Credits</h2>
        {project.credits?.length ? (
          <dl className={styles.credits}>
            {project.credits.map((c) => (
              <div key={c.role + c.name}>
                <dt>{c.role}</dt>
                <dd>{c.name}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        <div className={styles.signature}>
          <p className={styles.sectionLabel}>Created by</p>
          <HtzSignature className={styles.signatureMark} label="HTZ" />
        </div>
      </section>

      <nav className={styles.continuation} aria-label="Continue">
        {next ? (
          <Link href={`${routes.projects}/${next.slug}`} className={styles.next}>
            <span className={styles.sectionLabel}>Next work</span>
            <ColorReveal className={styles.nextMedia}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={next.cover.src} alt="" width={next.cover.width} height={next.cover.height} loading="lazy" decoding="async" />
            </ColorReveal>
            <span className={styles.nextTitle}>{next.title}</span>
          </Link>
        ) : null}
        <Link href={routes.projects} className={styles.link}>
          <span aria-hidden="true">←</span> Back to the exhibition
        </Link>
      </nav>
    </article>
  );
}
