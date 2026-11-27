import type { Metadata } from "next";
import { Exhibition } from "@/components/exhibition/Exhibition";
import { SiteHeader } from "@/components/header/SiteHeader";
import { routes } from "@/config/site";
import { getPublishedProjects } from "@/projects";

export const metadata: Metadata = {
  title: "Projects",
  alternates: { canonical: routes.projects },
};

/** Projects — The Exhibition: uma obra por vez, curadoria manual (src/projects). */
export default function ProjectsPage() {
  return (
    <>
      <SiteHeader current={routes.projects} />
      <main>
        <Exhibition projects={getPublishedProjects()} />
      </main>
    </>
  );
}
