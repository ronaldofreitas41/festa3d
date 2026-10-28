"use client";

import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import ItemModel from "./ItemModel";
import type { StockItem } from "@/lib/types";

/** Visualizador 3D de um único item (arraste para girar). */
export default function ItemPreview({ item }: { item: StockItem }) {
  const d = Math.max(item.height * 2.2, 0.8);
  return (
    <Canvas shadows camera={{ position: [d, item.height * 0.9, d], fov: 40 }}>
      <ambientLight intensity={1.1} />
      <hemisphereLight args={["#ffffff", "#c9b8ee", 0.9]} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} castShadow />
      <ItemModel item={item} />
      <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={item.height * 4} blur={2.4} far={item.height * 2} />
      <OrbitControls target={[0, item.height / 2, 0]} autoRotate autoRotateSpeed={2} enablePan={false} />
    </Canvas>
  );
}
