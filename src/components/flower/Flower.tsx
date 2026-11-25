import Image from "next/image";
import type { CSSProperties } from "react";
import type { FlowerAsset } from "@/config/evolution";
import styles from "./Flower.module.css";

interface FlowerProps {
  flower: FlowerAsset;
}

/**
 * Flor protagonista da Home.
 * A imagem oficial é exibida sem distorção (proporção original) e centralizada
 * pelo ponto focal definido no sistema evolutivo. Este contêiner será o ponto
 * de ancoragem das partículas, do parallax e do easter egg nas próximas fases.
 */
export function Flower({ flower }: FlowerProps) {
  const style = {
    "--flower-ratio": flower.width / flower.height,
    "--focal-x": flower.focal.x,
    "--focal-y": flower.focal.y,
  } as CSSProperties;

  return (
    <figure className={styles.flower} style={style} data-intro-hide="flower">
      <Image
        src={flower.src}
        alt={flower.alt}
        width={flower.width}
        height={flower.height}
        preload
        fetchPriority="high"
        quality={90}
        sizes="(max-aspect-ratio: 1/1) 175vw, 100vw"
        className={styles.image}
      />
    </figure>
  );
}
