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

/** Modo "Recorte 3D": a foto sem fundo em pé, com leve espessura. */
function CutoutModel({ item }: { item: StockItem }) {
  const tex = useTexture(fileUrl(item.cutout ?? item.photo));
  useEffect(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
  }, [tex]);
  const img = tex.image as { width: number; height: number };
  const h = item.height;
  const w = h * (img.width / img.height);
  return (
    <group position={[0, h / 2, 0]}>
      <mesh castShadow receiveShadow>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={tex} alphaTest={0.45} side={THREE.DoubleSide} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0, -0.02]} castShadow>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={tex} alphaTest={0.45} side={THREE.DoubleSide} roughness={0.9} color="#bbbbbb" />
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
