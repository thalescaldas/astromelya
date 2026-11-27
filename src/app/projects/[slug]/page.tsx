import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/header/SiteHeader";
import { Immersion } from "@/components/immersion/Immersion";
import { routes } from "@/config/site";
import { getPublishedProjects } from "@/projects";

/**
 * The Immersion — páginas individuais (/projects/[slug]).
 * Somente obras publicadas; slugs inválidos ou rascunhos resultam em 404.
 */
const projects = getPublishedProjects();

export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);
  return project
    ? {
        title: project.title,
        description: project.concept,
        alternates: { canonical: `${routes.projects}/${project.slug}` },
      }
    : {};
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const i = projects.findIndex((p) => p.slug === slug);
  if (i < 0) notFound();
  const next = projects.length > 1 ? projects[(i + 1) % projects.length] : null;
  return (
    <>
      <SiteHeader current={routes.projects} />
      <main>
        <Immersion project={projects[i]} next={next} />
      </main>
    </>
  );
}
