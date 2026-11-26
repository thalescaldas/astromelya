import type { Metadata } from "next";
import { GenesisLab } from "@/lab/genesis/GenesisLab";

/**
 * Rota experimental isolada para o desenvolvimento da Genesis 3D.
 * Não indexada e sem links públicos; não carrega o campo de partículas nem
 * o florescimento da Home.
 */
export const metadata: Metadata = {
  title: "Genesis — laboratório",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
  alternates: { canonical: null },
};

export default function GenesisLabPage() {
  return (
    <main aria-label="Laboratório Genesis">
      <GenesisLab />
    </main>
  );
}
