/**
 * About — conteúdo oficial aprovado (não editar sem aprovação).
 * Cada capítulo corresponde a um estado da futura escultura orgânica.
 */
export type SculptureState = "origin" | "essence" | "beyond-form" | "metamorphosis" | "unknown";

export interface AboutChapter {
  id: SculptureState;
  number: string;
  label: string;
  title: string[];
  body: string[];
}

export const ABOUT_CHAPTERS: readonly AboutChapter[] = [
  {
    id: "origin",
    number: "01",
    label: "Origin",
    title: ["A universe without boundaries."],
    body: ["Astromelya is an independent creative universe."],
  },
  {
    id: "essence",
    number: "02",
    label: "Essence",
    title: ["Everything begins with curiosity."],
    body: ["Where ideas take form, imagination becomes tangible, and the unknown becomes a possibility."],
  },
  {
    id: "beyond-form",
    number: "03",
    label: "Beyond Form",
    title: ["Not defined by a single medium."],
    body: ["Art. Design. Technology. Sound.", "And everything in between."],
  },
  {
    id: "metamorphosis",
    number: "04",
    label: "Metamorphosis",
    title: ["Always evolving.", "Always becoming."],
    body: ["Never confined to a single form."],
  },
  {
    id: "unknown",
    number: "05",
    label: "The Unknown",
    title: ["There is more beyond the visible."],
    body: [],
  },
];

export const ABOUT_COPY = {
  scrollHint: "Scroll to discover",
  signatureLabel: "Created by",
  /** Texto alternativo da assinatura HTZ (etapa B). */
  signatureAlt: "HTZ signature",
  explore: "Explore the universe",
} as const;
