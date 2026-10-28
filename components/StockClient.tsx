"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import Modal from "./Modal";
import Tip from "./Tip";
import { api, fileUrl, patch, useAiStatus, useItems } from "@/lib/client";
import { loadImage, removeBackground } from "@/lib/cutout";
import type { StockItem } from "@/lib/types";

const ItemPreview = dynamic(() => import("./three/ItemPreview"), { ssr: false });

const STATUS_LABEL = { pending: "Na fila", processing: "Gerando 3D…", ready: "Pronto", failed: "Falhou" } as const;

export default function StockClient() {
  const { data: items, reload, error } = useItems();
  const ai = useAiStatus();
  const [preview, setPreview] = useState<StockItem | null>(null);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Estoque</h1>
          <p>Cadastre cada item que você tem para decorar festas. Uma foto + a quantidade é tudo que precisamos.</p>
        </div>
      </div>

      {ai === false && (
        <Tip kind="warn" title="Modo “Recorte 3D” ativo">
          <p>
            Sem a chave da IA, cada foto vira um recorte em pé (sem fundo) no cenário. Para gerar modelos 3D completos
            com a IA, peça a quem instalou o site para configurar a chave <code>MESHY_API_KEY</code> — veja em <a href="/ajuda#ia">Ajuda → IA de 3D</a>.
          </p>
        </Tip>
      )}
      {ai === true && (
        <Tip kind="ok" title="IA de 3D conectada">
          <p>Cada foto enviada vira um modelo 3D completo. A geração leva de 1 a 5 minutos; você pode continuar usando o site.</p>
        </Tip>
      )}

      <div style={{ height: 16 }} />
      <AddItem onAdded={reload} aiOn={ai === true} />

      <div style={{ height: 24 }} />
      <h2>Seus itens {items ? `(${items.length})` : ""}</h2>
      {error && <Tip kind="err"><p>{error}</p></Tip>}
      {items && items.length === 0 && (
        <div className="empty">
          <p><strong>Nenhum item ainda.</strong></p>
          <p>Use o formulário acima para cadastrar o primeiro. Dica: comece por uma cadeira ou mesa.</p>
        </div>
      )}
      <div className="grid">
        {items?.map((it) => (
          <ItemCard key={it.id} item={it} onChange={reload} onPreview={() => setPreview(it)} />
        ))}
      </div>

      {preview && (
        <Modal title={preview.name} onClose={() => setPreview(null)} wide>
          <div className="preview3d">
            <ItemPreview item={preview} />
          </div>
          <p className="small muted" style={{ marginTop: 10 }}>
            Arraste para girar. {preview.glb ? "Modelo 3D gerado pela IA." : "Modo Recorte 3D (foto sem fundo)."}
          </p>
        </Modal>
      )}
    </>
  );
}

/* ---------- formulário de novo item ---------- */

function AddItem({ onAdded, aiOn }: { onAdded: () => void; aiOn: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [qty, setQty] = useState(1);
  const [heightCm, setHeightCm] = useState(80);
  const [removeBg, setRemoveBg] = useState(true);
  const [tol, setTol] = useState(18);
  const [cutBlob, setCutBlob] = useState<Blob | null>(null);
  const [cutUrl, setCutUrl] = useState<string | null>(null);
  const [origUrl, setOrigUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!file) {
      setOrigUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setOrigUrl(url);
    loadImage(file).then((i) => (imgRef.current = i)).catch(() => setErr("Não consegui abrir essa imagem. Use JPG, PNG ou WEBP."));
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // refaz o recorte quando muda a foto ou a sensibilidade
  useEffect(() => {
    if (!file || !removeBg) {
      setCutBlob(null);
      setCutUrl(null);
      return;
    }
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const img = imgRef.current ?? (await loadImage(file));
        imgRef.current = img;
        const blob = await removeBackground(img, tol);
        if (!alive) return;
        setCutBlob(blob);
        setCutUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return URL.createObjectURL(blob);
        });
      } catch {
        if (alive) setErr("Não consegui remover o fundo. Tente outra foto ou desmarque a opção.");
      }
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [file, removeBg, tol]);

  const pick = (f: File | undefined | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return setErr("Esse arquivo não é uma imagem.");
    setErr(null);
    setFile(f);
    if (!name) setName(f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return setErr("Escolha a foto do item.");
    if (!name.trim()) return setErr("Dê um nome ao item.");
    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.set("name", name.trim());
      fd.set("quantity", String(qty));
      fd.set("height", String(heightCm / 100));
      fd.set("photo", file);
      if (removeBg && cutBlob) fd.set("cutout", new File([cutBlob], "cutout.png", { type: "image/png" }));
      await api("/api/items", { method: "POST", body: fd });
      setFile(null);
      setName("");
      setQty(1);
      setCutBlob(null);
      onAdded();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card" onSubmit={submit}>
      <div className="card-body stack">
        <h2 style={{ margin: 0 }}>Adicionar um item</h2>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", alignItems: "start" }}>
          <div className="stack">
            <div
              className={`dropzone ${over ? "over" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setOver(true); }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files[0]); }}
            >
              <input type="file" accept="image/*" onChange={(e) => pick(e.target.files?.[0])} aria-label="Escolher foto do item" />
              {origUrl ? (
                <div className="row" style={{ justifyContent: "center", alignItems: "stretch" }}>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <p className="small muted">Foto original</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={origUrl} alt="Foto original" style={{ maxWidth: "100%", maxHeight: 180, borderRadius: 8 }} />
                  </div>
                  {removeBg && cutUrl && (
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <p className="small muted">Sem fundo</p>
                      <div className="thumb" style={{ borderRadius: 8, aspectRatio: "auto" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={cutUrl} alt="Foto sem fundo" style={{ maxWidth: "100%", maxHeight: 180, objectFit: "contain" }} />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <p style={{ fontSize: "2rem", margin: 0 }}>📷</p>
                  <p><strong>Clique aqui para escolher a foto</strong><br />ou arraste o arquivo para cá</p>
                </>
              )}
            </div>
            <Tip title="Para o 3D ficar bom">
              <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
                <li>Fotografe o item <strong>inteiro</strong>, de frente ou levemente de lado.</li>
                <li>Use <strong>fundo liso</strong> (parede ou lençol claro) e boa luz.</li>
                <li>Um item por foto, sem pessoas ou outros objetos.</li>
              </ul>
            </Tip>
          </div>

          <div className="stack">
            <label className="field">
              Nome do item
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Cadeira Tiffany branca" />
            </label>
            <div className="row">
              <label className="field" style={{ flex: 1 }}>
                Quantidade em estoque
                <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, +e.target.value || 1))} />
                <span className="hint">Quantas unidades você tem.</span>
              </label>
              <label className="field" style={{ flex: 1 }}>
                Altura real (cm)
                <input type="number" min={5} max={500} value={heightCm} onChange={(e) => setHeightCm(Math.max(5, +e.target.value || 5))} />
                <span className="hint">Para o tamanho ficar certo no salão.</span>
              </label>
            </div>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 600 }}>
              <input type="checkbox" checked={removeBg} onChange={(e) => setRemoveBg(e.target.checked)} />
              Remover o fundo da foto automaticamente
            </label>
            {removeBg && file && (
              <label className="field">
                Sensibilidade do recorte: {tol}
                <input type="range" min={4} max={60} value={tol} onChange={(e) => setTol(+e.target.value)} />
                <span className="hint">Se sobrou fundo, aumente. Se o item foi cortado, diminua.</span>
              </label>
            )}
            {err && <Tip kind="err"><p>{err}</p></Tip>}
            <button className="btn primary" disabled={busy || !file}>
              {busy ? "Enviando…" : aiOn ? "Enviar e gerar 3D com IA" : "Adicionar ao estoque"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

/* ---------- card de item ---------- */

function ItemCard({ item, onChange, onPreview }: { item: StockItem; onChange: () => void; onPreview: () => void }) {
  const [busy, setBusy] = useState(false);
  const setQty = async (q: number) => {
    if (q < 1) return;
    await patch(`/api/items/${item.id}`, { quantity: q });
    onChange();
  };
  const remove = async () => {
    if (!confirm(`Remover “${item.name}” do estoque? Ele também sai das festas em que foi usado.`)) return;
    await api(`/api/items/${item.id}`, { method: "DELETE" });
    onChange();
  };
  const retry = async () => {
    setBusy(true);
    try {
      await api(`/api/items/${item.id}/generate`, { method: "POST" });
      onChange();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <div className="thumb">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={fileUrl(item.cutout ?? item.photo)} alt={item.name} />
      </div>
      <div className="card-body stack">
        <div className="row between">
          <strong>{item.name}</strong>
          <span className={`badge ${item.status}`}>{STATUS_LABEL[item.status]}</span>
        </div>
        {item.status === "processing" && (
          <div>
            <div className="progress"><div style={{ width: `${Math.max(item.progress, 5)}%` }} /></div>
            <p className="small muted" style={{ marginTop: 4 }}>A IA está criando o 3D ({item.progress}%). Pode continuar usando o site.</p>
          </div>
        )}
        {item.status === "failed" && (
          <p className="small" style={{ color: "var(--err)" }}>{item.error || "Não foi possível gerar o 3D."}</p>
        )}
        <div className="row between">
          <span className="small muted">Em estoque</span>
          <div className="qty">
            <button onClick={() => setQty(item.quantity - 1)} aria-label="Diminuir quantidade">−</button>
            <span>{item.quantity}</span>
            <button onClick={() => setQty(item.quantity + 1)} aria-label="Aumentar quantidade">+</button>
          </div>
        </div>
        <div className="row">
          <button className="btn sm" onClick={onPreview} disabled={item.status !== "ready"}>🧊 Ver em 3D</button>
          {item.status === "failed" && <button className="btn sm" onClick={retry} disabled={busy}>↻ Tentar de novo</button>}
          <button className="btn sm danger" onClick={remove}>Remover</button>
        </div>
      </div>
    </div>
  );
}
