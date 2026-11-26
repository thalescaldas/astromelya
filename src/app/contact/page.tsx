import type { Metadata } from "next";
import { StubPage } from "@/components/page/StubPage";
import { routes } from "@/config/site";

export const metadata: Metadata = {
  title: "Contact",
  alternates: { canonical: routes.contact },
};

/** Estrutura inicial — conteúdo a ser definido após aprovação da direção artística. */
export default function ContactPage() {
  return <StubPage title="Contact" route={routes.contact} />;
}
