"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type ComponentRef, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Grid, OrbitControls, useTexture } from "@react-three/drei";
import * as THREE from "three";
import ItemModel from "./ItemModel";
import { fileUrl } from "@/lib/client";
import type { PartyEvent, PlacedItem, StockItem, Venue } from "@/lib/types";

export type Mode = "build" | "view" | "walk";
export type CamCmd = { type: "top" | "iso"; n: number };

export interface SceneProps {
  event: PartyEvent;
  placed: PlacedItem[];
  items: Record<string, StockItem>;
  venue: Venue | null;
  mode: Mode;
  selected: string | null;
  armed: string | null;
  snap: number;
  autoRotate: boolean;
  camCmd: CamCmd;
  glRef: MutableRefObject<THREE.WebGLRenderer | null>;
  onSelect: (uid: string | null) => void;
  onPlace: (itemId: string, x: number, z: number) => void;
  onDragStart: () => void;
  onMove: (uid: string, x: number, z: number) => void;
}

/* ---------- cenário (fundo com a foto do local) ---------- */

function Wall({ photo, width, depth }: { photo: string; width: number; depth: number }) {
  const tex = useTexture(fileUrl(photo));
  useEffect(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
  }, [tex]);
  const img = tex.image as { width: number; height: number };
  const h = Math.min(8, width / (img.width / img.height));
  const w = h * (img.width / img.height);
  return (
    <mesh position={[0, h / 2, -depth / 2 - 0.02]}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
}

function Panorama({ photo }: { photo: string }) {
  const tex = useTexture(fileUrl(photo));
  useEffect(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
  }, [tex]);
  return (
    <mesh scale={[-1, 1, 1]} position={[0, 0, 0]}>
      <sphereGeometry args={[80, 64, 32]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} toneMapped={false} />
    </mesh>
  );
}

function PlainFloor({ event }: { event: PartyEvent }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[event.width, event.depth]} />
      <meshStandardMaterial color={event.floorColor} roughness={1} />
    </mesh>
  );
}

function PhotoFloor({ event, photo }: { event: PartyEvent; photo: string }) {
  const tex = useTexture(fileUrl(photo));
  useEffect(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
  }, [tex]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[event.width, event.depth]} />
      <meshStandardMaterial map={tex} roughness={1} />
    </mesh>
  );
}

/* ---------- caminhar pela festa (WASD + arrastar para olhar) ---------- */

function Walk({ w, d }: { w: number; d: number }) {
  const { camera, gl } = useThree();
  const keys = useRef(new Set<string>());
  const yaw = useRef(0);
  const pitch = useRef(0);

  useEffect(() => {
    camera.position.set(0, 1.6, d / 2 - 0.6);
    yaw.current = 0;
    pitch.current = 0;
    const el = gl.domElement;
    let drag = false;
    const down = (e: PointerEvent) => { drag = true; el.setPointerCapture(e.pointerId); };
    const up = () => { drag = false; };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      yaw.current -= e.movementX * 0.004;
      pitch.current = THREE.MathUtils.clamp(pitch.current - e.movementY * 0.004, -1.2, 1.2);
    };
    const kd = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      keys.current.add(e.key.toLowerCase());
    };
    const ku = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointermove", move);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointermove", move);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, [camera, gl, d]);

  useFrame((_, dt) => {
    const k = keys.current;
    const speed = (k.has("shift") ? 4 : 2) * Math.min(dt, 0.1);
    const f = (k.has("w") || k.has("arrowup") ? 1 : 0) - (k.has("s") || k.has("arrowdown") ? 1 : 0);
    const s = (k.has("d") || k.has("arrowright") ? 1 : 0) - (k.has("a") || k.has("arrowleft") ? 1 : 0);
    const sin = Math.sin(yaw.current), cos = Math.cos(yaw.current);
    camera.position.x = THREE.MathUtils.clamp(camera.position.x + (-sin * f + cos * s) * speed, -w / 2 + 0.2, w / 2 - 0.2);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z + (-cos * f - sin * s) * speed, -d / 2 + 0.2, d / 2 - 0.2);
    camera.position.y = 1.6;
    camera.rotation.set(pitch.current, yaw.current, 0, "YXZ");
  });
  return null;
}

/* ---------- itens colocados ---------- */

function PlacedModel({
  p,
  item,
  selected,
  interactive,
  onDown,
}: {
  p: PlacedItem;
  item: StockItem;
  selected: boolean;
  interactive: boolean;
  onDown: (e: ThreeEvent<PointerEvent>) => void;
}) {
  return (
    <group
      position={[p.x, 0, p.z]}
      rotation={[0, p.rotation, 0]}
      scale={p.scale}
      onPointerDown={interactive ? onDown : undefined}
      onPointerOver={interactive ? () => (document.body.style.cursor = "grab") : undefined}
      onPointerOut={interactive ? () => (document.body.style.cursor = "") : undefined}
    >
      <ItemModel item={item} />
      {selected && interactive && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[Math.max(0.35, item.height * 0.35), Math.max(0.35, item.height * 0.35) + 0.06, 48]} />
          <meshBasicMaterial color="#7a3ff2" />
        </mesh>
      )}
    </group>
  );
}

/* ---------- cena ---------- */

function Inner(props: SceneProps) {
  const { event, placed, items, venue, mode, selected, armed, snap, autoRotate, camCmd, onSelect, onPlace, onDragStart, onMove } = props;
  const { camera, gl } = useThree();
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const dragging = useRef<string | null>(null);
  const justDragged = useRef(false);
  const [ghost, setGhost] = useState<[number, number] | null>(null);

  const w = event.width, d = event.depth;
  const interactive = mode === "build";

  props.glRef.current = gl;

  const clampSnap = (x: number, z: number): [number, number] => {
    const q = (v: number) => (snap > 0 ? Math.round(v / snap) * snap : v);
    return [THREE.MathUtils.clamp(q(x), -w / 2, w / 2), THREE.MathUtils.clamp(q(z), -d / 2, d / 2)];
  };

  // posições da câmera
  useEffect(() => {
    if (mode === "walk") return;
    const span = Math.max(w, d);
    if (camCmd.type === "top") camera.position.set(0.001, span * 1.25, 0.001);
    else camera.position.set(0, span * 0.75, span * 0.95);
    controls.current?.target.set(0, 0, 0);
    controls.current?.update();
  }, [camCmd, mode, camera, w, d]);

  useEffect(() => {
    const end = () => {
      if (dragging.current) {
        dragging.current = null;
        justDragged.current = true;
        setTimeout(() => (justDragged.current = false), 0);
        if (controls.current) controls.current.enabled = true;
        document.body.style.cursor = "";
      }
    };
    window.addEventListener("pointerup", end);
    return () => window.removeEventListener("pointerup", end);
  }, []);

  useEffect(() => {
    if (!armed) setGhost(null);
  }, [armed]);

  const ghostItem = armed ? items[armed] : null;

  const textured = venue && event.backdrop;
  const photo = venue?.photo ?? null;

  return (
    <>
      <color attach="background" args={[event.backdrop === "panorama" && photo ? "#000000" : "#efe9f7"]} />
      <ambientLight intensity={1.0} />
      <hemisphereLight args={["#ffffff", "#d8cdb8", 1.0]} />
      <directionalLight
        position={[w * 0.6, Math.max(w, d), d * 0.6]}
        intensity={1.8}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-w}
        shadow-camera-right={w}
        shadow-camera-top={d}
        shadow-camera-bottom={-d}
        shadow-camera-far={Math.max(w, d) * 4}
        shadow-bias={-0.0005}
      />

      <Suspense fallback={null}>
        {textured && event.backdrop === "wall" && photo && <Wall photo={photo} width={w} depth={d} />}
        {textured && event.backdrop === "panorama" && photo && <Panorama photo={photo} />}
        {textured && event.backdrop === "floor" && photo ? <PhotoFloor event={event} photo={photo} /> : <PlainFloor event={event} />}
      </Suspense>

      {interactive && (
        <Grid
          position={[0, 0.005, 0]}
          args={[w, d]}
          cellSize={snap || 0.5}
          cellThickness={0.6}
          cellColor="#a58be0"
          sectionSize={1}
          sectionThickness={1}
          sectionColor="#7a3ff2"
          fadeDistance={80}
          infiniteGrid={false}
        />
      )}

      {/* plano invisível e grande que recebe o mouse para arrastar/colocar */}
      {interactive && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.001, 0]}
          visible={false}
          onPointerMove={(e) => {
            const [x, z] = clampSnap(e.point.x, e.point.z);
            if (dragging.current) onMove(dragging.current, x, z);
            else if (armed) setGhost([x, z]);
          }}
          onClick={(e) => {
            if (justDragged.current) return;
            if (armed) {
              const [x, z] = clampSnap(e.point.x, e.point.z);
              onPlace(armed, x, z);
            } else onSelect(null);
          }}
        >
          <planeGeometry args={[400, 400]} />
        </mesh>
      )}

      <Suspense fallback={null}>
        {placed.map((p) => {
          const item = items[p.itemId];
          if (!item) return null;
          return (
            <PlacedModel
              key={p.uid}
              p={p}
              item={item}
              selected={selected === p.uid}
              interactive={interactive && !armed}
              onDown={(e) => {
                e.stopPropagation();
                onSelect(p.uid);
                onDragStart();
                dragging.current = p.uid;
                if (controls.current) controls.current.enabled = false;
                document.body.style.cursor = "grabbing";
              }}
            />
          );
        })}
        {interactive && ghostItem && ghost && (
          <group position={[ghost[0], 0, ghost[1]]}>
            <ItemModel item={ghostItem} />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
              <ringGeometry args={[0.35, 0.41, 48]} />
              <meshBasicMaterial color="#1f9d63" />
            </mesh>
          </group>
        )}
      </Suspense>

      {mode === "walk" ? (
        <Walk w={w} d={d} />
      ) : (
        <OrbitControls
          ref={controls}
          makeDefault
          maxPolarAngle={mode === "build" ? Math.PI / 2.05 : Math.PI / 2.01}
          minDistance={1.5}
          maxDistance={Math.max(w, d) * 3}
          autoRotate={mode === "view" && autoRotate}
          autoRotateSpeed={1.2}
          dampingFactor={0.12}
        />
      )}
    </>
  );
}

export default function Scene(props: SceneProps) {
  const span = Math.max(props.event.width, props.event.depth);
  const cam = useMemo(() => ({ position: [0, span * 0.75, span * 0.95] as [number, number, number], fov: 50, near: 0.05, far: 400 }), [span]);
  return (
    <Canvas shadows camera={cam} gl={{ preserveDrawingBuffer: true, antialias: true }} dpr={[1, 2]}>
      <Inner {...props} />
    </Canvas>
  );
}
