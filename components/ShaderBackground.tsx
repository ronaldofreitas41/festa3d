"use client";

import { useEffect, useRef } from "react";

/**
 * Fundo animado do topo: faixas de seda em tons de champanhe e marfim sobre grafite,
 * desenhadas por um shader WebGL. Sem WebGL, fica o gradiente do CSS por trás.
 */
const FRAG = `
precision highp float;
uniform vec2 r;
uniform float t;
void main() {
  vec2 uv = gl_FragCoord.xy / r.y;
  vec2 p = uv * 1.3;
  for (int i = 1; i < 6; i++) {
    float fi = float(i);
    p.x += 0.42 / fi * sin(fi * 1.9 * p.y + t * 0.18 + 0.4 * fi);
    p.y += 0.32 / fi * cos(fi * 1.5 * p.x + t * 0.14);
  }
  float v = sin(p.x * 2.6 + p.y * 1.7);
  float soft = pow(1.0 - abs(v), 3.0);
  float edge = pow(1.0 - abs(v), 18.0);
  vec3 base = vec3(0.055, 0.052, 0.058);
  vec3 champagne = vec3(0.78, 0.66, 0.48);
  vec3 stone = vec3(0.52, 0.49, 0.47);
  vec3 tint = mix(stone, champagne, 0.5 + 0.5 * sin(p.y * 1.3 + t * 0.07));
  vec3 col = base + tint * soft * 0.42 + vec3(0.98, 0.95, 0.9) * edge * 0.35;
  vec2 q = gl_FragCoord.xy / r - 0.5;
  col *= 1.0 - dot(q, q) * 1.1;
  gl_FragColor = vec4(col, 1.0);
}`;

const VERT = `attribute vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }`;

export default function ShaderBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
    if (!gl) return;
    const shader = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const a = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    const uR = gl.getUniformLocation(prog, "r");
    const uT = gl.getUniformLocation(prog, "t");

    // meia resolução: o efeito é desfocado por natureza e fica bem mais leve
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2) * 0.5;
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const start = performance.now();
    const draw = (now: number) => {
      gl.uniform2f(uR, canvas.width, canvas.height);
      gl.uniform1f(uT, still ? 12 : (now - start) / 1000 + 12);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!still) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    canvas.classList.add("on");
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="shader" aria-hidden />;
}
