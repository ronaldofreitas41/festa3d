"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type * as THREE from "three";
import Modal from "./Modal";
import Tip from "./Tip";
import EditorHelp from "./EditorHelp";
import { api, fileUrl, put, useItems, useVenues } from "@/lib/client";
import type { BackdropMode, PartyEvent, PlacedItem } from "@/lib/types";
import type { CamCmd, Mode } from "./three/Scene";

const Scene = dynamic(() => import("./three/Scene"), {
  ssr: false,
  loading: () => <div className="loading-overlay">Carregando o 3D…</div>,
});

const BACKDROPS: { value: BackdropMode; label: string; help: string }[] = [
  { value: "none", label: "Sem foto", help: "Só o piso colorido." },
  { value: "wall", label: "Foto como parede de fundo", help: "Boa para foto do salão tirada de frente." },
  { value: "floor", label: "Foto como piso", help: "Use se a foto for tirada de cima (planta/croqui)." },
  { value: "panorama", label: "Foto 360° ao redor", help: "Use com foto panorâmica 360° do local." },
];

const HELP_KEY = "festa3d_editor_help_seen";

export default function EditorClient({ id }: { id: string }) {
  const { data: items } = useItems();
  const { data: venues } = useVenues();
  const [event, setEvent] = useState<PartyEvent | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<PlacedItem[]>([]);
  const [past, setPast] = useState<PlacedItem[][]>([]);
  const [future, setFuture] = useState<PlacedItem[][]>([]);
  const [mode, setMode] = useState<Mode>("build");
  const [tab, setTab] = useState<"items" | "scenery">("items");
  const [selected, setSelected] = useState<string | null>(null);
  const [armed, setArmed] = useState<string | null>(null);
  const [snap, setSnap] = useState(0.25);
  const [autoRotate, setAutoRotate] = useState(true);
  const [camCmd, setCamCmd] = useState<CamCmd>({ type: "iso", n: 0 });
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [showHelp, setShowHelp] = useState(false);
  const glRef = useRef<THREE.WebGLRenderer | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    api<PartyEvent>(`/api/events/${id}`)
      .then((e) => {
        setEvent(e);
        setPlaced(e.placed);
        loaded.current = true;
      })
      .catch((e) => setLoadError((e as Error).message));
    try {
      if (!localStorage.getItem(HELP_KEY)) setShowHelp(true);
    } catch {}
  }, [id]);

  const itemMap = useMemo(() => Object.fromEntries((items ?? []).map((i) => [i.id, i])), [items]);
  const venue = useMemo(() => venues?.find((v) => v.id === event?.venueId) ?? null, [venues, event?.venueId]);

  const used = useMemo(() => {
    const u: Record<string, number> = {};
    placed.forEach((p) => (u[p.itemId] = (u[p.itemId] ?? 0) + 1));
    return u;
  }, [placed]);

  /* ----- salvar automaticamente ----- */
  useEffect(() => {
    if (!loaded.current || !event) return;
    setSaveState("saving");
    const t = setTimeout(() => {
      put(`/api/events/${id}`, {
        name: event.name,
        venueId: event.venueId,
        backdrop: event.backdrop,
        width: event.width,
        depth: event.depth,
        floorColor: event.floorColor,
        placed,
      })
        .then(() => setSaveState("saved"))
        .catch(() => setSaveState("error"));
    }, 700);
    return () => clearTimeout(t);
  }, [event, placed, id]);

  const patchEvent = (p: Partial<PartyEvent>) => setEvent((e) => (e ? { ...e, ...p } : e));

  /* ----- histórico (desfazer/refazer) ----- */
  const snapshot = useCallback(() => {
    setPast((p) => [...p.slice(-49), placed]);
    setFuture([]);
  }, [placed]);

  const undo = useCallback(() => {
    if (!past.length) return;
    setFuture([...future, placed]);
    setPlaced(past[past.length - 1]);
    setPast(past.slice(0, -1));
    setSelected(null);
  }, [past, future, placed]);

  const redo = useCallback(() => {
    if (!future.length) return;
    setPast([...past, placed]);
    setPlaced(future[future.length - 1]);
    setFuture(future.slice(0, -1));
    setSelected(null);
  }, [past, future, placed]);

  /* ----- ações ----- */
  const available = (itemId: string) => (itemMap[itemId]?.quantity ?? 0) - (used[itemId] ?? 0);

  const addAt = useCallback(
    (itemId: string, x: number, z: number) => {
      if (available(itemId) <= 0) return;
      snapshot();
      const uid = crypto.randomUUID().slice(0, 8);
      setPlaced((p) => [...p, { uid, itemId, x, z, rotation: 0, scale: 1 }]);
      setSelected(uid);
      if (available(itemId) - 1 <= 0) setArmed(null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [snapshot, itemMap, used],
  );

  const move = useCallback((uid: string, x: number, z: number) => {
    setPlaced((p) => p.map((i) => (i.uid === uid ? { ...i, x, z } : i)));
  }, []);

  const selectedItem = placed.find((p) => p.uid === selected) ?? null;

  const change = (patch: Partial<PlacedItem>) => {
    if (!selectedItem) return;
    snapshot();
    setPlaced((p) => p.map((i) => (i.uid === selectedItem.uid ? { ...i, ...patch } : i)));
  };
  const remove = useCallback(() => {
    if (!selected) return;
    snapshot();
    setPlaced((p) => p.filter((i) => i.uid !== selected));
    setSelected(null);
  }, [selected, snapshot]);
  const duplicate = () => {
    if (!selectedItem || available(selectedItem.itemId) <= 0) return;
    snapshot();
    const uid = crypto.randomUUID().slice(0, 8);
    setPlaced((p) => [...p, { ...selectedItem, uid, x: selectedItem.x + 0.5, z: selectedItem.z + 0.5 }]);
    setSelected(uid);
  };

  /* ----- atalhos de teclado ----- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); return; }
      if (mode !== "build") return;
      if (e.key === "Escape") { setArmed(null); setSelected(null); }
      if ((e.key === "Delete" || e.key === "Backspace") && selected) { e.preventDefault(); remove(); }
      if (selectedItem && (e.key.toLowerCase() === "q" || e.key.toLowerCase() === "e")) {
        const d = (e.key.toLowerCase() === "e" ? 1 : -1) * (Math.PI / 12);
        snapshot();
        setPlaced((p) => p.map((i) => (i.uid === selectedItem.uid ? { ...i, rotation: i.rotation + d } : i)));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, selected, selectedItem, remove, undo, redo, snapshot]);

  const closeHelp = () => {
    setShowHelp(false);
    try { localStorage.setItem(HELP_KEY, "1"); } catch {}
  };

  const screenshot = () => {
    const gl = glRef.current;
    if (!gl) return;
    const a = document.createElement("a");
    a.href = gl.domElement.toDataURL("image/png");
    a.download = `${event?.name ?? "festa"}.png`;
    a.click();
  };

  if (loadError) {
    return (
      <div className="container">
        <Tip kind="err" title="Não consegui abrir essa festa">
          <p>{loadError}</p>
          <p><Link href="/festas">← Voltar para as festas</Link></p>
        </Tip>
      </div>
    );
  }
  if (!event) return <div className="container muted">Abrindo a festa…</div>;

  const hint =
    mode === "walk"
      ? "Caminhe pela festa: teclas W A S D (ou setas) para andar, segure Shift para correr, arraste o mouse para olhar."
      : mode === "view"
        ? "Arraste para girar ao redor da festa, use a rodinha do mouse para aproximar. Clique em “Baixar imagem” para salvar uma foto."
        : armed
          ? `Clique no chão para colocar “${itemMap[armed]?.name}”. Continue clicando para colocar mais. Esc para parar.`
          : selectedItem
            ? "Arraste o item para mover. Q / E giram, Delete remove. Mais opções no painel à direita."
            : "Passo 1: clique em um item da lista à esquerda. Passo 2: clique no chão para colocá-lo.";

  return (
    <div className="editor">
      {/* ---------- barra superior ---------- */}
      <div className="toolbar">
        <input
          className="title"
          value={event.name}
          onChange={(e) => patchEvent({ name: e.target.value })}
          aria-label="Nome da festa"
          title="Clique para renomear a festa"
        />
        <div className="seg" role="group" aria-label="Modo">
          {([
            ["build", "Montar"],
            ["view", "Visualizar"],
            ["walk", "Caminhar"],
          ] as const).map(([m, label]) => (
            <button key={m} className={mode === m ? "on" : ""} onClick={() => { setMode(m); setArmed(null); setSelected(null); }}>
              {label}
            </button>
          ))}
        </div>
        <span className="sep" />
        {mode === "build" && (
          <>
            <button className="btn sm" onClick={undo} disabled={!past.length} title="Desfazer (Ctrl+Z)">↶ Desfazer</button>
            <button className="btn sm" onClick={redo} disabled={!future.length} title="Refazer (Ctrl+Y)">↷ Refazer</button>
            <label className="row small" title="Faz os itens “encaixarem” numa grade, para alinhar fácil">
              Grade:
              <select value={snap} onChange={(e) => setSnap(+e.target.value)} style={{ width: "auto" }}>
                <option value={0}>Livre</option>
                <option value={0.1}>10 cm</option>
                <option value={0.25}>25 cm</option>
                <option value={0.5}>50 cm</option>
                <option value={1}>1 m</option>
              </select>
            </label>
          </>
        )}
        {mode !== "walk" && (
          <>
            <button className="btn sm" onClick={() => setCamCmd((c) => ({ type: "top", n: c.n + 1 }))} title="Olhar o salão de cima, como na planta">⬇ Vista de cima</button>
            <button className="btn sm" onClick={() => setCamCmd((c) => ({ type: "iso", n: c.n + 1 }))}>◢ Vista padrão</button>
          </>
        )}
        {mode === "view" && (
          <>
            <button className={`btn sm ${autoRotate ? "active" : ""}`} onClick={() => setAutoRotate((a) => !a)}>⟳ Girar sozinho</button>
            <button className="btn sm" onClick={screenshot}>Baixar imagem</button>
          </>
        )}
        <span style={{ flex: 1 }} />
        <span className="small muted" aria-live="polite">
          {saveState === "saving" ? "Salvando…" : saveState === "error" ? "Erro ao salvar" : "Salvo automaticamente"}
        </span>
        <button className="btn sm" onClick={() => setShowHelp(true)}>Como usar</button>
      </div>

      {/* ---------- painel lateral ---------- */}
      <aside className="side">
        <div className="tabs">
          <button className={tab === "items" ? "on" : ""} onClick={() => setTab("items")}>Itens</button>
          <button className={tab === "scenery" ? "on" : ""} onClick={() => setTab("scenery")}>Local e salão</button>
        </div>

        {tab === "items" ? (
          <div className="side-body">
            {items === null ? (
              <p className="muted">Carregando estoque…</p>
            ) : items.length === 0 ? (
              <Tip kind="warn" title="Seu estoque está vazio">
                <p>Cadastre seus itens primeiro para poder usá-los aqui.</p>
                <Link className="btn sm primary" href="/estoque">Ir para o Estoque</Link>
              </Tip>
            ) : (
              <>
                <p className="small muted" style={{ margin: 0 }}>
                  Clique em um item e depois clique no chão para colocar. O número mostra quantos ainda estão <strong>disponíveis</strong>.
                </p>
                {items.map((it) => {
                  const left = it.quantity - (used[it.id] ?? 0);
                  return (
                    <button
                      key={it.id}
                      className={`pitem ${armed === it.id ? "armed" : ""}`}
                      disabled={left <= 0 || mode !== "build"}
                      onClick={() => { setArmed(armed === it.id ? null : it.id); setSelected(null); }}
                      title={left <= 0 ? "Todas as unidades já foram usadas" : "Clique e depois clique no chão"}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={fileUrl(it.cutout ?? it.photo)} alt="" />
                      <span>
                        <span className="nm">{it.name}</span>
                        <br />
                        <span className={`small ${left <= 0 ? "" : "muted"}`}>
                          {left <= 0 ? "Esgotado nesta festa" : `${left} de ${it.quantity} disponíveis`}
                        </span>
                      </span>
                    </button>
                  );
                })}
                {mode !== "build" && <p className="small muted">Volte para “Montar” para adicionar itens.</p>}
              </>
            )}
          </div>
        ) : (
          <div className="side-body">
            <label className="field">
              Local da festa
              <select value={event.venueId ?? ""} onChange={(e) => patchEvent({ venueId: e.target.value || null, backdrop: e.target.value ? (event.backdrop === "none" ? "wall" : event.backdrop) : "none" })}>
                <option value="">— nenhum —</option>
                {venues?.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
              <span className="hint">Cadastre fotos dos locais na aba “Locais”.</span>
            </label>

            {event.venueId && (
              <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className="small" style={{ fontWeight: 700, marginBottom: 4 }}>Como usar a foto do local</legend>
                {BACKDROPS.filter((b) => b.value !== "none").map((b) => (
                  <label key={b.value} style={{ display: "flex", gap: 8, marginBottom: 8, cursor: "pointer" }}>
                    <input type="radio" name="bd" checked={event.backdrop === b.value} onChange={() => patchEvent({ backdrop: b.value })} />
                    <span>
                      <strong className="small">{b.label}</strong>
                      <br />
                      <span className="small muted">{b.help}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
            )}

            <div className="row">
              <label className="field" style={{ flex: 1 }}>
                Largura (m)
                <input type="number" min={2} max={60} step={0.5} value={event.width} onChange={(e) => patchEvent({ width: Math.min(60, Math.max(2, +e.target.value || 2)) })} />
              </label>
              <label className="field" style={{ flex: 1 }}>
                Fundo (m)
                <input type="number" min={2} max={60} step={0.5} value={event.depth} onChange={(e) => patchEvent({ depth: Math.min(60, Math.max(2, +e.target.value || 2)) })} />
              </label>
            </div>
            <p className="small muted" style={{ margin: 0 }}>Informe o tamanho real da área da festa em metros. A grade do chão usa essas medidas.</p>

            <label className="field">
              Cor do piso
              <input type="color" value={event.floorColor} onChange={(e) => patchEvent({ floorColor: e.target.value })} />
            </label>
          </div>
        )}
      </aside>

      {/* ---------- palco 3D ---------- */}
      <div className="stage">
        <Scene
          event={event}
          placed={placed}
          items={itemMap}
          venue={venue}
          mode={mode}
          selected={selected}
          armed={armed}
          snap={snap}
          autoRotate={autoRotate}
          camCmd={camCmd}
          glRef={glRef}
          onSelect={setSelected}
          onPlace={addAt}
          onDragStart={snapshot}
          onMove={move}
        />
        <div className="hintbar" role="status">{hint}</div>

        {mode === "build" && selectedItem && itemMap[selectedItem.itemId] && (
          <div className="inspector">
            <strong>{itemMap[selectedItem.itemId].name}</strong>
            <label className="field small">
              Girar ({Math.round(((selectedItem.rotation * 180) / Math.PI) % 360)}°)
              <input type="range" min={-180} max={180} step={5} value={Math.round(((((selectedItem.rotation * 180) / Math.PI + 180) % 360) + 360) % 360) - 180} onChange={(e) => change({ rotation: (+e.target.value * Math.PI) / 180 })} />
            </label>
            <label className="field small">
              Tamanho ({Math.round(selectedItem.scale * 100)}%)
              <input type="range" min={0.3} max={3} step={0.05} value={selectedItem.scale} onChange={(e) => change({ scale: +e.target.value })} />
            </label>
            <div className="row">
              <button className="btn sm" onClick={() => change({ rotation: selectedItem.rotation - Math.PI / 12 })} title="Q">⟲ 15°</button>
              <button className="btn sm" onClick={() => change({ rotation: selectedItem.rotation + Math.PI / 12 })} title="E">⟳ 15°</button>
            </div>
            <div className="row">
              <button className="btn sm" onClick={duplicate} disabled={available(selectedItem.itemId) <= 0} title={available(selectedItem.itemId) <= 0 ? "Sem unidades disponíveis" : "Duplicar"}>⧉ Duplicar</button>
              <button className="btn sm danger" onClick={remove}>Remover</button>
            </div>
          </div>
        )}
      </div>

      {showHelp && (
        <Modal title="Como montar sua festa" onClose={closeHelp}>
          <EditorHelp />
          <div className="row" style={{ justifyContent: "flex-end", marginTop: 12 }}>
            <button className="btn primary" onClick={closeHelp}>Entendi, vamos montar!</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

