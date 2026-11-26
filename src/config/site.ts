/**
 * Dados institucionais da Astromelya.
 * Usados em metadados, rótulos acessíveis e futuras integrações.
 */
export const site = {
  name: "Astromelya",
  url: "https://astromelya.com",
  description: "Astromelya — an independent creative universe.",
  locale: "en_US",
  lang: "en",
  themeColor: "#000000",
} as const;

export const routes = {
  home: "/",
  projects: "/projects",
  about: "/about",
  contact: "/contact",
} as const;
