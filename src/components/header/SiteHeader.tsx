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
        className={styles.symbol}
        aria-label={`${site.name} — início`}
        aria-current={current === routes.home ? "page" : undefined}
      >
        <Image
          src="/brand/simbolo.svg"
          alt=""
          width={289}
          height={236}
          unoptimized
          preload
          className={styles.symbolImage}
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
