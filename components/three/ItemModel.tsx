"use client";

import { Component, Suspense, useEffect, useMemo, type ReactNode } from "react";
import { useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { fileUrl } from "@/lib/client";
import type { StockItem } from "@/lib/types";

/** Modelo 3D gerado pela IA (.glb), ajustado para a altura real do item e apoiado no chão. */
function GlbModel({ item }: { item: StockItem }) {
  const { scene } = useGLTF(fileUrl(item.glb));
  const { clone, scale, offset } = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        // O TRELLIS não grava a metalicidade e o padrão do glTF é 1 (metal puro), que sem
        // reflexo de ambiente renderiza preto. Peças de festa são foscas: zera o metal.
        const mats = ([] as THREE.Material[]).concat((o as THREE.Mesh).material);
        for (const m of mats) {
          const std = m as THREE.MeshStandardMaterial;
          if (std.isMeshStandardMaterial && !std.metalnessMap) std.metalness = 0;
        }
      }
    });
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = item.height / (size.y || 1);
    return { clone, scale, offset: new THREE.Vector3(-center.x * scale, -box.min.y * scale, -center.z * scale) };
  }, [scene, item.height]);
  return (
    <group position={offset} scale={scale}>
      <primitive object={clone} />
    </group>
  );
}

type ImageLike = CanvasImageSource & { width: number; height: number };

/**
 * Transforma a silhueta da foto sem fundo num volume arredondado ("inflado"):
 * quanto mais longe da borda, mais grosso o objeto. Um disco vira esfera e uma
 * faixa fina vira um cilindro fino.
 */
function inflate(image: ImageLike, height: number) {
  const RES = 160;
  const k = RES / Math.max(image.width, image.height);
  const gw = Math.max(2, Math.round(image.width * k));
  const gh = Math.max(2, Math.round(image.height * k));
  const canvas = document.createElement("canvas");
  canvas.width = gw;
  canvas.height = gh;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(image, 0, 0, gw, gh);
  const px = ctx.getImageData(0, 0, gw, gh).data;

  const n = gw * gh;
  const inside = new Uint8Array(n);
  for (let i = 0; i < n; i++) inside[i] = px[i * 4 + 3] > 100 ? 1 : 0;

  // distância até a borda (chamfer 3-4, duas passadas)
  const dist = new Float32Array(n);
  for (let i = 0; i < n; i++) dist[i] = inside[i] ? 1e6 : 0;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= gw || y >= gh ? 0 : dist[y * gw + x]);
  for (let y = 0; y < gh; y++)
    for (let x = 0; x < gw; x++) {
      const i = y * gw + x;
      if (inside[i]) dist[i] = Math.min(dist[i], at(x - 1, y) + 3, at(x, y - 1) + 3, at(x - 1, y - 1) + 4, at(x + 1, y - 1) + 4);
    }
  for (let y = gh - 1; y >= 0; y--)
    for (let x = gw - 1; x >= 0; x--) {
      const i = y * gw + x;
      if (inside[i]) dist[i] = Math.min(dist[i], at(x + 1, y) + 3, at(x, y + 1) + 3, at(x + 1, y + 1) + 4, at(x - 1, y + 1) + 4);
    }
  let maxD = 1;
  for (let i = 0; i < n; i++) maxD = Math.max(maxD, (dist[i] /= 3));

  // perfil circular a partir da distância
  let z = new Float32Array(n);
  for (let i = 0; i < n; i++) if (inside[i]) z[i] = Math.sqrt(dist[i] * (2 * maxD - dist[i])) * 0.75;
  // suaviza as "quinas" que surgem no eixo central do objeto
  for (let pass = 0; pass < 4; pass++) {
    const out = new Float32Array(n);
    for (let y = 0; y < gh; y++)
      for (let x = 0; x < gw; x++) {
        const i = y * gw + x;
        if (!inside[i]) continue;
        let sum = 0, c = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx, yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= gw || yy >= gh) continue;
            sum += z[yy * gw + xx];
            c++;
          }
        out[i] = sum / c;
      }
    z = out;
  }

  const cell = height / (gh - 1);
  const width = cell * (gw - 1);
  const pos = new Float32Array(n * 3);
  const uv = new Float32Array(n * 2);
  for (let y = 0; y < gh; y++)
    for (let x = 0; x < gw; x++) {
      const i = y * gw + x;
      pos.set([x * cell - width / 2, height - y * cell, z[i] * cell], i * 3);
      uv.set([x / (gw - 1), 1 - y / (gh - 1)], i * 2);
    }
  // inclui toda célula que toca o objeto; o alphaTest recorta a borda exata
  const index: number[] = [];
  for (let y = 0; y < gh - 1; y++)
    for (let x = 0; x < gw - 1; x++) {
      const a = y * gw + x, b = a + 1, c = a + gw, d = c + 1;
      if (inside[a] || inside[b] || inside[c] || inside[d]) index.push(a, c, b, b, c, d);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

/** Modo "Recorte 3D": a foto sem fundo vira um volume arredondado em pé. */
function CutoutModel({ item }: { item: StockItem }) {
  const tex = useTexture(fileUrl(item.cutout ?? item.photo), (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    t.needsUpdate = true;
  });
  const geo = useMemo(() => inflate(tex.image as ImageLike, item.height), [tex, item.height]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <group>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial map={tex} alphaTest={0.45} roughness={0.55} />
      </mesh>
      {/* verso: a mesma superfície espelhada na profundidade, um pouco mais escura */}
      <mesh geometry={geo} scale={[1, 1, -1]} castShadow receiveShadow>
        <meshStandardMaterial map={tex} alphaTest={0.45} roughness={0.6} color="#d4d4d4" />
      </mesh>
    </group>
  );
}

function PlaceholderBox({ item }: { item: StockItem }) {
  return (
    <mesh position={[0, item.height / 2, 0]} castShadow>
      <boxGeometry args={[item.height * 0.5, item.height, item.height * 0.5]} />
      <meshStandardMaterial color="#c9b8ee" />
    </mesh>
  );
}

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function ItemModel({ item }: { item: StockItem }) {
  const box = <PlaceholderBox item={item} />;
  const cut = (
    <Boundary fallback={box}>
      <Suspense fallback={box}>
        <CutoutModel item={item} />
      </Suspense>
    </Boundary>
  );
  if (item.glb) {
    return (
      <Boundary fallback={cut}>
        <Suspense fallback={box}>
          <GlbModel item={item} />
        </Suspense>
      </Boundary>
    );
  }
  return cut;
}
