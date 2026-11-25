import type { AnimationConfig } from "@/config/evolution";

export const BLOOM_STORAGE_KEY = "astromelya:bloom-seen";

/**
 * Script síncrono injetado no <head>. Decide, antes da primeira pintura, se o
 * florescimento de Genesis será exibido — evitando que a flor completa apareça
 * e depois seja substituída pelo vídeo. Marca `<html data-bloom="play">`.
 *
 * - Somente na Home, uma vez por sessão (`?intro` força a reprodução).
 * - Nunca com `prefers-reduced-motion: reduce`.
 */
export function createBloomBootScript(bloom: AnimationConfig["bloom"]): string {
  if (!bloom.enabled) return "";
  return `(function(){try{
var d=document.documentElement;
if(location.pathname!=="/")return;
if(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches)return;
var force=new URLSearchParams(location.search).has("intro");
if(!force&&${bloom.oncePerSession ? "true" : "false"}&&sessionStorage.getItem(${JSON.stringify(BLOOM_STORAGE_KEY)}))return;
d.setAttribute("data-bloom","play");
}catch(e){}})();`;
}
