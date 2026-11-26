import type { Metadata } from "next";
import { StubPage } from "@/components/page/StubPage";
import { routes } from "@/config/site";

export const metadata: Metadata = {
  title: "Projects",
  alternates: { canonical: routes.projects },
};

/**
 * Rota provisória. A galeria (src/components/gallery) será alimentada por
 * src/projects quando houver projetos reais aprovados.
 */
export default function ProjectsPage() {
  return <StubPage title="Projects" route={routes.projects} />;
}
