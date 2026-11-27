"use client";

import dynamic from "next/dynamic";
import type { ProjectMedia } from "@/projects";

/** Visualizador 3D carregado sob demanda (Three.js fora do pacote inicial). */
export const ModelView = dynamic(() => import("./ModelView").then((m) => m.ModelView), { ssr: false });

interface MediaViewProps {
  media: ProjectMedia;
  className?: string;
  reducedMotion: boolean;
  /** Vídeo com controles (módulos) em vez de reprodução ambiente (exposição/hero). */
  controls?: boolean;
}

/** Renderiza imagem, vídeo ou modelo 3D de uma obra (compartilhado: Exhibition e Immersion). */
export function MediaView({ media, className, reducedMotion, controls = false }: MediaViewProps) {
  if (media.type === "image") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={className} src={media.src} alt={media.alt} width={media.width} height={media.height} decoding="async" />;
  }
  if (media.type === "video") {
    return (
      <video
        className={className}
        src={media.src}
        poster={media.poster}
        aria-label={media.alt}
        muted={!controls}
        playsInline
        loop={!controls}
        controls={controls}
        autoPlay={!controls && !reducedMotion}
        preload={controls ? "none" : "metadata"}
      />
    );
  }
  return (
    <div className={className}>
      <ModelView src={media.src} label={media.alt} reducedMotion={reducedMotion} />
    </div>
  );
}
