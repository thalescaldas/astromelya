import type { Metadata } from "next";
import { StubPage } from "@/components/page/StubPage";
import { routes } from "@/config/site";

export const metadata: Metadata = {
  title: "About",
  alternates: { canonical: routes.about },
};

/** Estrutura inicial — conteúdo a ser definido após aprovação da direção artística. */
export default function AboutPage() {
  return <StubPage title="About" route={routes.about} />;
}
