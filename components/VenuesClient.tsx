"use client";

import { useState } from "react";
import Tip from "./Tip";
import { api, fileUrl, useVenues } from "@/lib/client";

export default function VenuesClient() {
  const { data: venues, reload, error } = useVenues();
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name.trim()) return setErr("Informe o nome e escolha uma foto.");
    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.set("name", name.trim());
      fd.set("photo", file);
      await api("/api/venues", { method: "POST", body: fd });
      setName("");
      setFile(null);
      (e.target as HTMLFormElement).reset();
      reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string, nm: string) => {
    if (!confirm(`Remover o local “${nm}”?`)) return;
    await api(`/api/venues/${id}`, { method: "DELETE" });
    reload();
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Locais das festas</h1>
          <p>Envie fotos do espaço onde a festa vai acontecer. Na hora de montar, a foto aparece como parede de fundo, piso ou panorama 360°.</p>
        </div>
      </div>

      <form className="card" onSubmit={submit}>
        <div className="card-body stack">
          <h2 style={{ margin: 0 }}>Adicionar um local</h2>
          <div className="row" style={{ alignItems: "flex-end" }}>
            <label className="field" style={{ flex: "1 1 220px" }}>
              Nome do local
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Salão Jardim das Flores" />
            </label>
            <label className="field" style={{ flex: "1 1 220px" }}>
              Foto do local
              <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            <button className="btn primary" disabled={busy}>{busy ? "Enviando…" : "Adicionar local"}</button>
          </div>
          {err && <Tip kind="err"><p>{err}</p></Tip>}
          <Tip title="Que foto enviar?">
            <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
              <li><strong>Foto normal do salão</strong>, tirada de frente para a parede principal → use como “parede de fundo”.</li>
              <li><strong>Foto de cima / planta</strong> do espaço → use como “piso”.</li>
              <li><strong>Foto panorâmica 360°</strong> (modo panorama do celular ou câmera 360) → use como “360° ao redor”.</li>
            </ul>
          </Tip>
        </div>
      </form>

      <div style={{ height: 24 }} />
      <h2>Seus locais {venues ? `(${venues.length})` : ""}</h2>
      {error && <Tip kind="err"><p>{error}</p></Tip>}
      {venues && venues.length === 0 && (
        <div className="empty">
          <p><strong>Nenhum local ainda.</strong></p>
          <p>Cadastre pelo menos um para montar festas dentro dele. (Você também pode montar sem local, só com o piso.)</p>
        </div>
      )}
      <div className="grid">
        {venues?.map((v) => (
          <div className="card" key={v.id}>
            <div className="thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fileUrl(v.photo)} alt={v.name} style={{ objectFit: "cover" }} />
            </div>
            <div className="card-body row between">
              <strong>{v.name}</strong>
              <button className="btn sm danger" onClick={() => remove(v.id, v.name)}>Remover</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
