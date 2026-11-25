"use client";

import { useEffect } from "react";
import { runBloom } from "@/animations/bloom";

interface FlowerBloomProps {
  src: string;
  ratio: number;
}

/**
 * Ativa o florescimento quando o script de boot marcou `<html data-bloom="play">`.
 * Não renderiza nada: o vídeo é inserido sobre a imagem oficial e removido ao fim.
 */
export function FlowerBloom({ src, ratio }: FlowerBloomProps) {
  useEffect(() => {
    if (document.documentElement.getAttribute("data-bloom") !== "play") return;
    const image = document.querySelector<HTMLImageElement>("[data-bloom-image]");
    if (!image) return;
    const controller = runBloom({ image, src, ratio, hold: 0.5 });
    return () => controller.dispose();
  }, [src, ratio]);

  return null;
}
