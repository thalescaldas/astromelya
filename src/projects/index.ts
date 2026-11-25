/**
 * Registro de projetos da Astromelya.
 * Permanece vazio até que projetos reais sejam aprovados para publicação.
 */
export interface Project {
  slug: string;
  title: string;
  year?: number;
  cover?: { src: string; width: number; height: number; alt: string };
}

export const projects: readonly Project[] = [];
