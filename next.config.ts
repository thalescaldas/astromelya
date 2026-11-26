import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Rota antiga em português → rota definitiva em inglês (permanente).
  async redirects() {
    return [
      { source: "/projetos", destination: "/projects", permanent: true },
      { source: "/projetos/:slug*", destination: "/projects/:slug*", permanent: true },
    ];
  },
  // Laboratório: nunca indexar (complementa a meta robots da página).
  async headers() {
    return [
      {
        source: "/lab/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, noimageindex" }],
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75, 90],
  },
};

export default nextConfig;
