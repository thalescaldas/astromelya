"use client";

import { useEffect, useRef } from "react";
import type { Mesh } from "three";

/** Visualizador 3D mínimo (carregado sob demanda): GLB, luz neutra, giro lento. */
export function ModelView({ src, label, reducedMotion }: { src: string; label: string; reducedMotion: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let disposed = false;
    let cleanup = () => {};
    void (async () => {
      const THREE = await import("three");
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      if (disposed) return;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      el.appendChild(renderer.domElement);
      Object.assign(renderer.domElement.style, { width: "100%", height: "100%", display: "block" });
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 100);
      scene.add(new THREE.AmbientLight(0xffffff, 0.35));
      const key = new THREE.DirectionalLight(0xffffff, 2.4);
      key.position.set(-3, 3, 4);
      scene.add(key);
      const pivot = new THREE.Group();
      scene.add(pivot);
      let raf = 0;
      const render = () => renderer.render(scene, camera);
      const resize = () => {
        const w = el.clientWidth || 1, h = el.clientHeight || 1;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        render();
      };
      new GLTFLoader().load(src, (gltf) => {
        if (disposed) return;
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const size = box.getSize(new THREE.Vector3()).length();
        gltf.scene.position.sub(box.getCenter(new THREE.Vector3()));
        pivot.add(gltf.scene);
        camera.position.set(0, 0, size * 1.6);
        camera.lookAt(0, 0, 0);
        resize();
        if (!reducedMotion) {
          const tick = () => {
            pivot.rotation.y += 0.0025;
            render();
            raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
        }
      });
      window.addEventListener("resize", resize);
      resize();
      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        scene.traverse((o) => {
          const m = o as Mesh;
          if (m.isMesh) m.geometry.dispose();
        });
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.domElement.remove();
      };
    })();
    return () => {
      disposed = true;
      cleanup();
    };
  }, [src, reducedMotion]);
  return <div ref={ref} role="img" aria-label={label} style={{ width: "100%", height: "100%" }} />;
}
