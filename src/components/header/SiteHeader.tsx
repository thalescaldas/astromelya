import Image from "next/image";
import Link from "next/link";
import { routes, site } from "@/config/site";
import styles from "./SiteHeader.module.css";

interface SiteHeaderProps {
  /** Rota atual, para marcar o item ativo com `aria-current`. */
  current?: (typeof routes)[keyof typeof routes];
}

export function SiteHeader({ current }: SiteHeaderProps) {
  return (
    <header className={styles.header}>
      <Link
        href={routes.home}
        className={styles.brand}
        aria-label={`${site.name} — início`}
        aria-current={current === routes.home ? "page" : undefined}
      >
        <Image
          src="/brand/wordmark.svg"
          alt=""
          width={491}
          height={41}
          unoptimized
          preload
          className={styles.wordmark}
        />
      </Link>

      <nav aria-label="Principal">
        <Link
          href={routes.projects}
          className={styles.navLink}
          aria-current={current === routes.projects ? "page" : undefined}
        >
          Projetos
        </Link>
      </nav>
    </header>
  );
}
