import type { Metadata } from "next";
import { UnboundLab } from "@/lab/unbound/UnboundLab";

/** Rota experimental isolada: escultura orgânica do About (The Unbound). */
export const metadata: Metadata = {
  title: "The Unbound — lab",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false, noimageindex: true } },
  alternates: { canonical: null },
};

export default function UnboundLabPage() {
  return (
    <main aria-label="The Unbound lab">
      <UnboundLab />
    </main>
  );
}
