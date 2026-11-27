/**
 * Registro central de obras da Astromelya (The Exhibition).
 *
 * - `status`: somente "published" aparece no site público.
 * - `order`: ordenação manual (crescente).
 * - Registros de teste (`DEV_PROJECTS`) existem apenas em desenvolvimento
 *   (`next dev`); nunca entram no build de produção.
 */
export type ProjectStatus = "draft" | "published";
export type ProjectCategory = "Digital Experiences" | "Visual Art" | "Design" | "Sound" | "Experiments";

export type ProjectMedia =
  | { type: "image"; src: string; width: number; height: number; alt: string }
  | { type: "video"; src: string; poster?: string; alt: string }
  | { type: "model"; src: string; alt: string };

export interface Project {
  slug: string;
  title: string;
  category: ProjectCategory[];
  year: number;
  order: number;
  status: ProjectStatus;
  /** Imagem usada no índice e como pôster. */
  cover: { src: string; width: number; height: number; alt: string };
  /** Mídia principal na exposição (carregada sob demanda). */
  media: ProjectMedia;
  description?: string;
  externalLink?: string;
}

/** Obras reais. Vazio até a curadoria confirmar as primeiras obras. */
export const PROJECTS: readonly Project[] = [];

/** Registros de teste — somente em desenvolvimento (recursos já existentes no repositório). */
const DEV_PROJECTS: readonly Project[] = [
  {
    slug: "dev-still",
    title: "Test Record — Still",
    category: ["Visual Art"],
    year: 2026,
    order: 1,
    status: "published",
    cover: { src: "/flowers/genesis.webp", width: 1672, height: 941, alt: "Test image" },
    media: { type: "image", src: "/flowers/genesis.webp", width: 1672, height: 941, alt: "Test image" },
  },
  {
    slug: "dev-motion",
    title: "Test Record — Motion",
    category: ["Digital Experiences", "Experiments"],
    year: 2026,
    order: 2,
    status: "published",
    cover: { src: "/flowers/metamorphosis.webp", width: 1672, height: 941, alt: "Test video poster" },
    media: { type: "video", src: "/flowers/genesis-growth.mp4", poster: "/flowers/genesis.webp", alt: "Test video" },
  },
  {
    slug: "dev-object",
    title: "Test Record — Object",
    category: ["Design"],
    year: 2025,
    order: 3,
    status: "published",
    cover: { src: "/flowers/genesis.webp", width: 1672, height: 941, alt: "Test model preview" },
    media: { type: "model", src: "/lab/genesis/genesis.glb", alt: "Test 3D model" },
  },
  {
    slug: "dev-draft",
    title: "Test Record — Draft (hidden)",
    category: ["Sound"],
    year: 2026,
    order: 4,
    status: "draft",
    cover: { src: "/flowers/genesis.webp", width: 1672, height: 941, alt: "Draft" },
    media: { type: "image", src: "/flowers/genesis.webp", width: 1672, height: 941, alt: "Draft" },
  },
];

/** Obras publicadas, em ordem manual. */
export function getPublishedProjects(): Project[] {
  const source = process.env.NODE_ENV === "development" ? [...PROJECTS, ...DEV_PROJECTS] : PROJECTS;
  return source.filter((p) => p.status === "published").sort((a, b) => a.order - b.order);
}
