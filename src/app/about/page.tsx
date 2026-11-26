import type { Metadata } from "next";
import { AboutPage } from "@/components/about/AboutPage";
import { SiteHeader } from "@/components/header/SiteHeader";
import { routes } from "@/config/site";

export const metadata: Metadata = {
  title: "About",
  description: "Astromelya is an independent creative universe.",
  alternates: { canonical: routes.about },
};

export default function About() {
  return (
    <>
      <SiteHeader current={routes.about} />
      <main>
        <AboutPage />
      </main>
    </>
  );
}
