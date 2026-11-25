import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";
import { createIntroBootScript } from "@/animations/introBoot";
import { getActivePhase } from "@/config/evolution";
import { site } from "@/config/site";
import "@/styles/globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.name,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: site.url,
    siteName: site.name,
    title: site.name,
    description: site.description,
    locale: site.locale,
  },
  twitter: {
    card: "summary",
    title: site.name,
    description: site.description,
  },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: site.themeColor,
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const introBootScript = createIntroBootScript(getActivePhase().animations.intro);

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang={site.lang}
      className={`${manrope.variable} ${plexMono.variable}`}
      // O script de boot adiciona data-intro antes da hidratação.
      suppressHydrationWarning
    >
      <head>
        {introBootScript && <script dangerouslySetInnerHTML={{ __html: introBootScript }} />}
      </head>
      <body>{children}</body>
    </html>
  );
}
