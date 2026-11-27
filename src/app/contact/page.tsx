import type { Metadata } from "next";
import { SignalCanvas } from "@/components/contact/SignalCanvas";
import styles from "@/components/contact/Contact.module.css";
import { SiteHeader } from "@/components/header/SiteHeader";
import { routes } from "@/config/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Every connection begins with a signal.",
  alternates: { canonical: routes.contact },
};

const EMAIL = "contact@astromelya.com";
const INSTAGRAM = "https://www.instagram.com/astr0melya/";

/** Contact — The Signal. */
export default function ContactPage() {
  return (
    <>
      <SiteHeader current={routes.contact} />
      <main className={styles.stage}>
        <SignalCanvas />
        <section className={styles.content} aria-labelledby="contact-title">
          <p className={styles.label}>Establish connection</p>
          <h1 id="contact-title" className={styles.title}>
            Every connection begins with a signal.
          </h1>
          <p className={styles.subtitle}>Beyond distance. Beyond boundaries.</p>
          <a className={styles.cta} href={`mailto:${EMAIL}`}>
            Send a signal
            <span aria-hidden="true">↗</span>
          </a>
        </section>
        <footer className={styles.footer}>
          <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer">
            Instagram — @astr0melya
          </a>
        </footer>
      </main>
    </>
  );
}
