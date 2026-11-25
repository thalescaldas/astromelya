import Image from "next/image";
import type { CSSProperties } from "react";
import type { FlowerAsset } from "@/config/evolution";
import { FlowerBloom } from "./FlowerBloom";
import styles from "./Flower.module.css";

interface FlowerProps {
  flower: FlowerAsset;
  /** Florescimento (vídeo de crescimento) na entrada da Home. */
  bloom?: boolean;
}

/**
 * Flor protagonista da Home.
 * A imagem oficial é exibida sem distorção (proporção original) e centralizada
 * pelo ponto focal definido no sistema evolutivo. Este contêiner será o ponto
 * de ancoragem das partículas, do parallax e do easter egg nas próximas fases.
 */
export function Flower({ flower, bloom = false }: FlowerProps) {
  const style = {
    "--flower-ratio": flower.width / flower.height,
    "--focal-x": flower.focal.x,
    "--focal-y": flower.focal.y,
  } as CSSProperties;

  return (
    <figure className={styles.flower} style={style}>
      <Image
        src={flower.src}
        alt={flower.alt}
        width={flower.width}
        height={flower.height}
        preload
        fetchPriority="high"
        // Arquivo oficial servido sem recompressão: é exatamente a fotografia em
        // que o vídeo de crescimento termina (78 KB; recomprimir só suavizaria).
        unoptimized
        className={styles.image}
        data-bloom-image
      />
      {bloom && flower.growth && (
        <FlowerBloom src={flower.growth.src} ratio={flower.width / flower.height} />
      )}
    </figure>
  );
}
