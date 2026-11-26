import { SiteHeader } from "@/components/header/SiteHeader";
import { routes } from "@/config/site";
import styles from "./StubPage.module.css";

type Route = (typeof routes)[keyof typeof routes];

interface StubPageProps {
  title: string;
  route: Route;
}

/**
 * Estrutura inicial de uma página ainda não desenvolvida: fundo preto absoluto,
 * cabeçalho e apenas o título — sem conteúdo inventado.
 */
export function StubPage({ title, route }: StubPageProps) {
  return (
    <>
      <SiteHeader current={route} />
      <main className={styles.page}>
        <h1 className={styles.title}>{title}</h1>
      </main>
    </>
  );
}
