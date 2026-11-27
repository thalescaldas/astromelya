/**
 * Cursor circular branco e minimalista: anel que segue o ponteiro com inércia
 * e reage a elementos interativos e ao clique. Apenas em ponteiros finos.
 * O ciclo de animação só roda enquanto o anel se move.
 */
export function startCursor(ring: HTMLElement, dot: HTMLElement, reducedMotion: boolean): () => void {
  let x = -100, y = -100, rx = -100, ry = -100, raf = 0;
  let scale = 1, targetScale = 1;
  const root = document.documentElement;
  root.setAttribute("data-cursor", "");

  const apply = () => {
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%) scale(${scale})`;
    dot.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
  };
  const tick = () => {
    const k = reducedMotion ? 1 : 0.2;
    rx += (x - rx) * k;
    ry += (y - ry) * k;
    scale += (targetScale - scale) * (reducedMotion ? 1 : 0.18);
    apply();
    raf = Math.abs(x - rx) + Math.abs(y - ry) + Math.abs(targetScale - scale) > 0.1 ? requestAnimationFrame(tick) : 0;
  };
  const kick = () => {
    if (!raf) raf = requestAnimationFrame(tick);
  };
  const interactive = (el: Element | null) => !!el?.closest("a, button, [role=button], [tabindex], video, label, summary");
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    x = e.clientX;
    y = e.clientY;
    if (rx < -50) { rx = x; ry = y; }
    ring.style.opacity = dot.style.opacity = "1";
    targetScale = interactive(e.target as Element) ? 1.7 : 1;
    kick();
  };
  const onDown = () => { targetScale *= 0.75; kick(); };
  const onUp = (e: PointerEvent) => { targetScale = interactive(e.target as Element) ? 1.7 : 1; kick(); };
  const onLeave = () => { ring.style.opacity = dot.style.opacity = "0"; };

  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerdown", onDown);
  window.addEventListener("pointerup", onUp);
  document.addEventListener("pointerleave", onLeave);
  return () => {
    cancelAnimationFrame(raf);
    root.removeAttribute("data-cursor");
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerdown", onDown);
    window.removeEventListener("pointerup", onUp);
    document.removeEventListener("pointerleave", onLeave);
  };
}
