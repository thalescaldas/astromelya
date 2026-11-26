/**
 * Contrato de um "estágio" do laboratório: quem desenha a Genesis.
 * O estágio 3D é carregado sob demanda (import dinâmico), de modo que
 * Three.js e o modelo glTF nunca entram no pacote da Home.
 */
export interface LabStage {
  /** Ajusta a área de renderização (px CSS e devicePixelRatio já limitado). */
  resize(width: number, height: number, pixelRatio: number): void;
  /** Libera listeners, GPU e memória. */
  dispose(): void;
}

export type LabStageKind = "reference" | "three";

export interface LabStageContext {
  /** Contêiner onde o estágio desenha. */
  container: HTMLElement;
}

export interface ThreeStageOptions extends LabStageContext {
  wireframe: boolean;
  /** Inspeção livre (OrbitControls); câmera fixa nos demais modos. */
  inspect: boolean;
  /** Chamado quando o modelo termina de carregar (diagnóstico). */
  onReady?: (info: { meshes: number; vertices: number; triangles: number }) => void;
}
