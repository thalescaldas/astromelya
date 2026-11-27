import { AdditiveBlending, DoubleSide, ShaderMaterial, Vector3 } from "three";
import { LAB_UNBOUND } from "./config";

const M = LAB_UNBOUND.membrane;

/**
 * Membrana translúcida preliminar — "seda finíssima / fumaça solidificada".
 *
 * Mistura aditiva sem escrita de profundidade: cada camada soma luz, então a
 * ordem de desenho é irrelevante (sem artefatos de ordenação) e as regiões onde
 * várias camadas se sobrepõem ficam naturalmente mais densas.
 *  - Fresnel: bordas e superfícies rasantes brilham (as "arestas tensionadas").
 *  - Microfibras: listras finas no espaço do objeto, em espiral em torno do eixo
 *    do vórtice (ângulo + log do raio), acompanhando o arrasto gravitacional.
 *    Multiplicadores inteiros → contínuo na emenda do atan.
 *  - Luz lateral suave e atenuação por profundidade: camadas posteriores mais escuras.
 *  - Costuras (_GLOW, calculado no build): proximidade da borda da membrana — as
 *    arestas tensionadas brilham e o centro de cada teia fica translúcido.
 */
export function createMembraneMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    uniforms: {
      uKey: { value: new Vector3(-0.6, 0.55, 0.45).normalize() },
      uCenterDist: { value: 6 },
      uTint: { value: new Vector3(...M.tint) },
    },
    vertexShader: /* glsl */ `
      attribute float _region;
      attribute float _glow;
      attribute float _layer;
      varying float vGlow;
      varying float vLayer;
      varying vec3 vNormal;
      varying vec3 vView;
      varying vec3 vObj;
      varying float vRegion;
      void main() {
        vObj = position;
        vRegion = _region;
        vGlow = _glow;
        vLayer = _layer;
        vNormal = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vView = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uKey;
      uniform float uCenterDist;
      uniform vec3 uTint;
      varying vec3 vNormal;
      varying vec3 vView;
      varying vec3 vObj;
      varying float vRegion;
      varying float vGlow;
      varying float vLayer;
      void main() {
        vec3 n = normalize(vNormal);
        vec3 v = normalize(vView);
        float ndv = abs(dot(n, v));
        float fres = pow(1.0 - ndv, ${M.fresnelPower.toFixed(2)});
        // microfibras ao longo do fluxo torcido da entidade
        float rr = length(vObj.xy) + 0.04;
        float th = atan(vObj.y, vObj.x) + 1.35 * log(rr);
        float flow = th + 0.12 * sin(vObj.z * 6.0 + th * 2.0);
        float f1 = pow(0.5 + 0.5 * sin(flow * ${M.fiberScale[0].toFixed(1)}), 16.0);
        float f2 = pow(0.5 + 0.5 * sin(flow * ${M.fiberScale[1].toFixed(1)} + vObj.y * 3.0), 28.0) * 0.6;
        float fib = (f1 + f2) * (0.35 + fres);
        float side = abs(dot(n, uKey));
        float rim = step(0.5, vRegion) * step(vRegion, 1.5) * 0.35 * fres;
        // seda tensionada: as bordas e costuras da membrana concentram luz; o centro de cada teia é tênue
        float seam = pow(vGlow, 1.6);
        float density = ${M.base.toFixed(3)} + ${M.fresnel.toFixed(2)} * fres * (0.45 + 0.55 * seam) + ${M.fibers.toFixed(2)} * fib * (0.5 + seam)
                      + ${M.side.toFixed(2)} * side * (0.4 + 0.6 * fres) + rim + ${M.seam.toFixed(2)} * seam;
        // profundidade: camadas mais distantes que o centro ficam mais tênues
        float depth = clamp(length(vView) / uCenterDist, 0.6, 1.4);
        density *= mix(1.0, 1.0 - ${M.depthFade.toFixed(2)}, smoothstep(0.85, 1.25, depth));
        density *= mix(1.0, ${M.backLayer.toFixed(2)}, vLayer);   // camada posterior: véu mais tênue
        gl_FragColor = vec4(uTint * density * ${M.exposure.toFixed(2)}, 1.0);
      }
    `,
  });
}
