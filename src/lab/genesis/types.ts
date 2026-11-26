/**
 * Contrato de um "estágio" do laboratório: quem desenha a Genesis.
 *
 * Hoje existe apenas o estágio de referência (fotografia). O futuro estágio 3D
 * implementará a mesma interface, carregado sob demanda (import dinâmico), de
 * modo que Three.js e o modelo glTF nunca entrem no pacote da Home.
 */
export interface LabStage {
  /** Ajusta a área de renderização (px CSS e devicePixelRatio já limitado). */
  resize(width: number, height: number, pixelRatio: number): void;
  /** Libera listeners, GPU e memória. */
  dispose(): void;
}

export type LabStageKind = "reference";

export interface LabStageContext {
  /** Contêiner em tela cheia onde o estágio desenha. */
  container: HTMLElement;
}
