import Link from "next/link";
import { ABOUT_CHAPTERS, ABOUT_COPY } from "@/config/about";
import { routes } from "@/config/site";
import { HtzSignature } from "./HtzSignature";
import styles from "./About.module.css";

/**
 * About — etapa A: layout estático, manifesto e estrutura responsiva.
 *
 * A escultura orgânica (etapas C–E) ocupará `[data-sculpture-stage]`, uma camada
 * fixa atrás dos capítulos — uma única entidade contínua durante toda a rolagem.
 * Cada capítulo expõe `data-state` para orientar a metamorfose futura.
 */
export function AboutPage() {
  return (
    <>
      {/* Espaço reservado discreto para a escultura (sem modelo provisório). */}
      <div className={styles.sculpture} aria-hidden="true" data-sculpture-stage />
      <div className={styles.headerFade} aria-hidden="true" />

      <article className={styles.manifest}>
        {ABOUT_CHAPTERS.map((chapter, index) => {
          const Heading = index === 0 ? "h1" : "h2";
          const headingId = `about-${chapter.id}`;
          return (
            <section
              key={chapter.id}
              className={`${styles.chapter} ${styles[`chapter${index + 1}`]}`}
              aria-labelledby={headingId}
              data-state={chapter.id}
            >
              <div className={styles.copy}>
                <p className={styles.number}>
                  <span>{chapter.number}</span>
                  <span aria-hidden="true">/</span>
                  <span className={styles.label}>{chapter.label}</span>
                </p>
                <Heading id={headingId} className={styles.title}>
                  {chapter.title.map((line, i) => (
                    <span key={line} className={styles.line}>
                      {line}
                      {/* espaço entre linhas para leitores de tela e seleção de texto */}
                      {i < chapter.title.length - 1 ? " " : null}
                    </span>
                  ))}
                </Heading>
                {chapter.body.map((paragraph) => (
                  <p key={paragraph} className={styles.body}>
                    {paragraph}
                  </p>
                ))}

                {chapter.id === "metamorphosis" && (
                  <div className={styles.signature}>
                    <p className={styles.signatureLabel}>{ABOUT_COPY.signatureLabel}</p>
                    <HtzSignature className={styles.signatureMark} label={ABOUT_COPY.signatureAlt} />
                  </div>
                )}

                {chapter.id === "unknown" && (
                  <Link href={routes.projects} className={styles.explore}>
                    {ABOUT_COPY.explore}
                    <span className={styles.arrow} aria-hidden="true">
                      ↗
                    </span>
                  </Link>
                )}
              </div>

              {chapter.id === "origin" && (
                <p className={styles.scrollHint}>
                  <span className={styles.hintLine} aria-hidden="true" />
                  {ABOUT_COPY.scrollHint}
                </p>
              )}
            </section>
          );
        })}
      </article>
    </>
  );
}
