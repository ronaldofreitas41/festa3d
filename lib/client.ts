"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PartyEvent, StockItem, Venue } from "./types";

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error || "Algo deu errado. Tente novamente.");
  return json as T;
}

export const fileUrl = (name: string | null | undefined) => (name ? `/api/files/${name}` : "");

export const put = <T,>(url: string, body: unknown) =>
  api<T>(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
export const post = <T,>(url: string, body: unknown) =>
  api<T>(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
export const patch = <T,>(url: string, body: unknown) =>
  api<T>(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

/** Carrega uma lista da API; se houver item sendo gerado, atualiza sozinho a cada 4s. */
function useList<T>(url: string, poll?: (rows: T[]) => boolean) {
  const [data, setData] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef(poll);
  pollRef.current = poll;

  const reload = useCallback(async () => {
    try {
      const rows = await api<T[]>(url);
      setData(rows);
      setError(null);
      return rows;
    } catch (e) {
      setError((e as Error).message);
      return null;
    }
  }, [url]);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      const rows = await reload();
      if (alive && rows && pollRef.current?.(rows)) timer = setTimeout(tick, 4000);
    };
    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [reload]);

  return { data, setData, error, reload };
}

export const useItems = () =>
  useList<StockItem>("/api/items", (rows) => rows.some((i) => i.status === "processing" || i.status === "pending"));
export const useVenues = () => useList<Venue>("/api/venues");
export const useEvents = () => useList<PartyEvent>("/api/events");

export function useAiStatus() {
  const [ai, setAi] = useState<boolean | null>(null);
  useEffect(() => {
    api<{ ai: boolean }>("/api/status").then((s) => setAi(s.ai)).catch(() => setAi(false));
  }, []);
  return ai;
}
