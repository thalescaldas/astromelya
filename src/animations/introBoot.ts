import type { AnimationConfig } from "@/config/evolution";

export const INTRO_STORAGE_KEY = "astromelya:intro-seen";

/**
 * Script síncrono injetado no <head>. Decide, antes da primeira pintura,
 * se a introdução será exibida — evitando que a flor apareça e depois suma.
 * Marca `<html data-intro="play">`, que o CSS usa para ocultar Home e header.
 */
export function createIntroBootScript(intro: AnimationConfig["intro"]): string {
  if (!intro.enabled) return "";
  return `(function(){try{
var d=document.documentElement;
if(location.pathname!=="/")return;
if(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches)return;
var force=new URLSearchParams(location.search).has("intro");
if(!force&&${intro.oncePerSession ? "true" : "false"}&&sessionStorage.getItem(${JSON.stringify(INTRO_STORAGE_KEY)}))return;
d.setAttribute("data-intro","play");
}catch(e){}})();`;
}
