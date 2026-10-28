import "server-only";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import type { PartyEvent, StockItem, Venue } from "./types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY no .env.local");

/** Cliente do servidor (chave secreta): só é usado dentro das rotas /api. */
export const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const BUCKET = "uploads";

/** Lança o erro do Supabase ou devolve os dados. */
function must<T>({ data, error }: { data: T; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data;
}

// ---- conversão linha do banco (snake_case) <-> tipos do app (camelCase) ----

type ItemRow = {
  id: string;
  name: string;
  quantity: number;
  photo: string;
  cutout: string | null;
  height: number;
  glb: string | null;
  status: StockItem["status"];
  provider: StockItem["provider"];
  task_id: string | null;
  progress: number;
  error: string | null;
  created_at: string;
};
type VenueRow = { id: string; name: string; photo: string; created_at: string };
type EventRow = {
  id: string;
  name: string;
  venue_id: string | null;
  backdrop: PartyEvent["backdrop"];
  width: number;
  depth: number;
  floor_color: string;
  placed: PartyEvent["placed"];
  updated_at: string;
};

const toItem = (r: ItemRow): StockItem => ({
  id: r.id,
  name: r.name,
  quantity: r.quantity,
  photo: r.photo,
  cutout: r.cutout,
  height: r.height,
  glb: r.glb,
  status: r.status,
  provider: r.provider,
  taskId: r.task_id,
  progress: r.progress,
  error: r.error,
  createdAt: Date.parse(r.created_at),
});
const toVenue = (r: VenueRow): Venue => ({ id: r.id, name: r.name, photo: r.photo, createdAt: Date.parse(r.created_at) });
const toEvent = (r: EventRow): PartyEvent => ({
  id: r.id,
  name: r.name,
  venueId: r.venue_id,
  backdrop: r.backdrop,
  width: r.width,
  depth: r.depth,
  floorColor: r.floor_color,
  placed: r.placed ?? [],
  updatedAt: Date.parse(r.updated_at),
});

const ITEM_COLS: Record<string, keyof ItemRow> = { taskId: "task_id", createdAt: "created_at" };
const VENUE_COLS: Record<string, keyof VenueRow> = { createdAt: "created_at" };
const EVENT_COLS: Record<string, keyof EventRow> = { venueId: "venue_id", floorColor: "floor_color", updatedAt: "updated_at" };

function toRow(obj: Record<string, unknown>, cols: Record<string, string>) {
  const row: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    const col = cols[k] ?? k;
    row[col] = col.endsWith("_at") && typeof v === "number" ? new Date(v).toISOString() : v;
  }
  return row;
}

// ---- itens do estoque ----

export async function listItems() {
  const rows = must(await supabase.from("items").select("*").order("created_at", { ascending: false }));
  return (rows as ItemRow[]).map(toItem);
}

export async function getItem(id: string) {
  const row = must(await supabase.from("items").select("*").eq("id", id).maybeSingle());
  return row ? toItem(row as ItemRow) : null;
}

export async function insertItem(item: StockItem) {
  must(await supabase.from("items").insert(toRow({ ...item }, ITEM_COLS)));
}

export async function updateItem(id: string, patch: Partial<StockItem>) {
  const row = must(await supabase.from("items").update(toRow(patch, ITEM_COLS)).eq("id", id).select("*").maybeSingle());
  return row ? toItem(row as ItemRow) : null;
}

export async function deleteItem(id: string) {
  const row = must(await supabase.from("items").delete().eq("id", id).select("*").maybeSingle());
  return row ? toItem(row as ItemRow) : null;
}

// ---- locais ----

export async function listVenues() {
  const rows = must(await supabase.from("venues").select("*").order("created_at", { ascending: false }));
  return (rows as VenueRow[]).map(toVenue);
}

export async function insertVenue(venue: Venue) {
  must(await supabase.from("venues").insert(toRow({ ...venue }, VENUE_COLS)));
}

/** Apaga o local; as festas que o usavam ficam sem fundo. */
export async function deleteVenue(id: string) {
  must(await supabase.from("events").update({ venue_id: null, backdrop: "none" }).eq("venue_id", id));
  const row = must(await supabase.from("venues").delete().eq("id", id).select("*").maybeSingle());
  return row ? toVenue(row as VenueRow) : null;
}

// ---- festas ----

export async function listEvents() {
  const rows = must(await supabase.from("events").select("*").order("updated_at", { ascending: false }));
  return (rows as EventRow[]).map(toEvent);
}

export async function getEvent(id: string) {
  const row = must(await supabase.from("events").select("*").eq("id", id).maybeSingle());
  return row ? toEvent(row as EventRow) : null;
}

export async function insertEvent(ev: PartyEvent) {
  must(await supabase.from("events").insert(toRow({ ...ev }, EVENT_COLS)));
}

export async function updateEvent(id: string, patch: Partial<PartyEvent>) {
  const row = must(await supabase.from("events").update(toRow(patch, EVENT_COLS)).eq("id", id).select("*").maybeSingle());
  return row ? toEvent(row as EventRow) : null;
}

export async function deleteEvent(id: string) {
  must(await supabase.from("events").delete().eq("id", id));
}

/** Tira um item apagado de todas as festas onde ele estava posicionado. */
export async function removeItemFromEvents(itemId: string) {
  const events = await listEvents();
  await Promise.all(
    events
      .filter((e) => e.placed.some((p) => p.itemId === itemId))
      .map((e) => updateEvent(e.id, { placed: e.placed.filter((p) => p.itemId !== itemId) })),
  );
}

export const newId = () => randomUUID().slice(0, 8);

// ---- arquivos (Supabase Storage) ----

const EXT_OK = new Set(["png", "jpg", "jpeg", "webp", "glb"]);
const NAME_RE = /^[\w-]+\.(png|jpe?g|webp|glb)$/i;

export const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  glb: "model/gltf-binary",
};

export async function saveUpload(data: Buffer, ext: string): Promise<string> {
  ext = ext.toLowerCase().replace(".", "");
  if (!EXT_OK.has(ext)) throw new Error("Formato de arquivo não suportado (use JPG, PNG ou WEBP)");
  const name = `${randomUUID()}.${ext}`;
  must(await supabase.storage.from(BUCKET).upload(name, data, { contentType: MIME[ext] }));
  return name;
}

export async function readUpload(name: string): Promise<Buffer | null> {
  if (!NAME_RE.test(name)) return null;
  const { data, error } = await supabase.storage.from(BUCKET).download(name);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

export async function removeUploads(names: (string | null)[]) {
  const valid = names.filter((n): n is string => !!n && NAME_RE.test(n));
  if (valid.length) await supabase.storage.from(BUCKET).remove(valid);
}
