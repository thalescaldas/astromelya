import type { Metadata } from "next";
import { SiteHeader } from "@/components/header/SiteHeader";
import { routes } from "@/config/site";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Projetos",
  alternates: { canonical: routes.projects },
};

/**
 * Rota provisória. A galeria (src/components/gallery) será alimentada por
 * src/projects quando houver projetos reais aprovados.
 */
export default function ProjectsPage() {
  return (
    <>
      <SiteHeader current={routes.projects} />
      <main className={styles.page}>
        <h1 className={styles.title}>Projetos</h1>
      </main>
    </>
  );
}
