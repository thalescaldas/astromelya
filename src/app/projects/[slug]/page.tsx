import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StubPage } from "@/components/page/StubPage";
import { routes } from "@/config/site";
import { projects } from "@/projects";

/**
 * Páginas individuais de projetos (/projects/[slug]).
 * Geradas a partir do registro em src/projects — hoje vazio, então nenhuma
 * página é publicada e qualquer slug resulta em 404.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);
  return project
    ? { title: project.title, alternates: { canonical: `${routes.projects}/${project.slug}` } }
    : {};
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);
  if (!project) notFound();
  return <StubPage title={project.title} route={routes.projects} />;
}
