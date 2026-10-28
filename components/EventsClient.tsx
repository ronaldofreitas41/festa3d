"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Tip from "./Tip";
import { api, fileUrl, post, useEvents, useItems, useVenues } from "@/lib/client";
import type { PartyEvent } from "@/lib/types";

export default function EventsClient() {
  const router = useRouter();
  const { data: events, reload, error } = useEvents();
  const { data: venues } = useVenues();
  const { data: items } = useItems();
  const [name, setName] = useState("");
  const [venueId, setVenueId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setErr("Dê um nome para a festa.");
    setBusy(true);
    setErr(null);
    try {
      const ev = await post<PartyEvent>("/api/events", { name, venueId: venueId || null });
      router.push(`/festas/${ev.id}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  const remove = async (id: string, nm: string) => {
    if (!confirm(`Apagar a festa “${nm}”? Os itens voltam para o estoque.`)) return;
    await api(`/api/events/${id}`, { method: "DELETE" });
    reload();
  };

  const venueOf = (id: string | null) => venues?.find((v) => v.id === id);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Festas</h1>
          <p>Cada festa é uma montagem 3D separada. Crie uma, escolha o local e comece a decorar.</p>
        </div>
      </div>

      {items && items.length === 0 && (
        <>
          <Tip kind="warn" title="Seu estoque está vazio">
            <p>Você pode criar a festa agora, mas só vai conseguir decorar depois de <Link href="/estoque">cadastrar itens no estoque</Link>.</p>
          </Tip>
          <div style={{ height: 12 }} />
        </>
      )}

      <form className="card" onSubmit={create}>
        <div className="card-body stack">
          <h2 style={{ margin: 0 }}>Nova festa</h2>
          <div className="row" style={{ alignItems: "flex-end" }}>
            <label className="field" style={{ flex: "1 1 220px" }}>
              Nome da festa
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Aniversário da Maria — 5 anos" />
            </label>
            <label className="field" style={{ flex: "1 1 220px" }}>
              Local
              <select value={venueId} onChange={(e) => setVenueId(e.target.value)}>
                <option value="">Sem local (só o piso)</option>
                {venues?.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
              <span className="hint">Cadastre locais na aba “Locais”. Dá para trocar depois.</span>
            </label>
            <button className="btn primary" disabled={busy}>{busy ? "Criando…" : "Criar e montar"}</button>
          </div>
          {err && <Tip kind="err"><p>{err}</p></Tip>}
        </div>
      </form>

      <div style={{ height: 24 }} />
      <h2>Suas festas {events ? `(${events.length})` : ""}</h2>
      {error && <Tip kind="err"><p>{error}</p></Tip>}
      {events && events.length === 0 && (
        <div className="empty"><p><strong>Nenhuma festa criada ainda.</strong></p><p>Use o formulário acima para começar.</p></div>
      )}
      <div className="grid">
        {events?.map((ev) => {
          const v = venueOf(ev.venueId);
          return (
            <div className="card" key={ev.id}>
              <div className="thumb">
                {v ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={fileUrl(v.photo)} alt={v.name} style={{ objectFit: "cover" }} />
                ) : (
                  <span className="muted small">Sem local definido</span>
                )}
              </div>
              <div className="card-body stack">
                <div>
                  <strong>{ev.name}</strong>
                  <p className="small muted" style={{ margin: 0 }}>
                    {v?.name ?? "Sem local"} · {ev.placed.length} item(ns) · {ev.width}×{ev.depth} m
                  </p>
                </div>
                <div className="row">
                  <Link className="btn sm primary" href={`/festas/${ev.id}`}>Abrir e montar</Link>
                  <button className="btn sm danger" onClick={() => remove(ev.id, ev.name)}>Apagar</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
