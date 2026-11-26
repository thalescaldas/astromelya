import type { LabStage, LabStageContext } from "../types";

/**
 * Estágio de referência: a fotografia oficial já está no HTML (centralizada via
 * CSS). Não há renderização própria — serve de base visual para calibrar câmera,
 * escala e iluminação da futura cena tridimensional.
 */
export function createReferenceStage(context: LabStageContext): LabStage {
  void context;
  return {
    resize() {
      // a referência é responsiva via CSS
    },
    dispose() {
      // nada a liberar
    },
  };
}
