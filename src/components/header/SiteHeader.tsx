import Image from "next/image";
import Link from "next/link";
import { routes, site } from "@/config/site";
import styles from "./SiteHeader.module.css";

type Route = (typeof routes)[keyof typeof routes];

interface SiteHeaderProps {
  /** Rota atual, para marcar o item ativo com `aria-current`. */
  current?: Route;
}

const NAV: { href: Route; label: string }[] = [
  { href: routes.projects, label: "Projects" },
  { href: routes.about, label: "About" },
  { href: routes.contact, label: "Contact" },
];

export function SiteHeader({ current }: SiteHeaderProps) {
  return (
    <header className={styles.header}>
      <Link
        href={routes.home}
        className={styles.brand}
        aria-label={`${site.name} — home`}
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

      <nav aria-label="Primary">
        <ul className={styles.nav}>
          {NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={styles.navLink}
                aria-current={current === item.href ? "page" : undefined}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
