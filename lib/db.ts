import "server-only";
import { randomUUID } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { PartyEvent, StockItem, Venue } from "./types";

let client: SupabaseClient | null = null;

/**
 * Cliente do servidor (chave secreta): só é usado dentro das rotas /api.
 * Criado no primeiro uso, e não ao carregar o arquivo, para o `next build` funcionar
 * mesmo onde as variáveis ainda não existem (o build carrega as rotas para analisá-las).
 */
function supabaseClient() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY (no .env.local ou nas variáveis de ambiente da hospedagem)");
  }
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

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

// ---- dono dos dados ----

/**
 * Toda função de leitura/escrita recebe o dono (id do usuário logado) e só enxerga as linhas
 * dele. SYSTEM ignora o filtro: só para tarefas internas que já partem de um item verificado
 * (a geração de 3D em segundo plano), nunca com um id vindo direto do navegador.
 */
export const SYSTEM = Symbol("system");
export type Owner = string | typeof SYSTEM;

function scope<Q>(q: Q, owner: Owner): Q {
  // (o tipo do query builder do Supabase é fundo demais para um genérico com restrição)
  return owner === SYSTEM ? q : (q as unknown as { eq(column: string, value: string): Q }).eq("owner_id", owner);
}

// ---- itens do estoque ----

export async function listItems(owner: Owner) {
  const rows = must(await scope(supabaseClient().from("items").select("*"), owner).order("created_at", { ascending: false }));
  return (rows as ItemRow[]).map(toItem);
}

export async function getItem(id: string, owner: Owner) {
  const row = must(await scope(supabaseClient().from("items").select("*").eq("id", id), owner).maybeSingle());
  return row ? toItem(row as ItemRow) : null;
}

export async function insertItem(item: StockItem, owner: string) {
  must(await supabaseClient().from("items").insert({ ...toRow({ ...item }, ITEM_COLS), owner_id: owner }));
}

export async function updateItem(id: string, patch: Partial<StockItem>, owner: Owner) {
  const row = must(await scope(supabaseClient().from("items").update(toRow(patch, ITEM_COLS)).eq("id", id), owner).select("*").maybeSingle());
  return row ? toItem(row as ItemRow) : null;
}

export async function deleteItem(id: string, owner: Owner) {
  const row = must(await scope(supabaseClient().from("items").delete().eq("id", id), owner).select("*").maybeSingle());
  return row ? toItem(row as ItemRow) : null;
}

// ---- locais ----

export async function listVenues(owner: Owner) {
  const rows = must(await scope(supabaseClient().from("venues").select("*"), owner).order("created_at", { ascending: false }));
  return (rows as VenueRow[]).map(toVenue);
}

export async function getVenue(id: string, owner: Owner) {
  const row = must(await scope(supabaseClient().from("venues").select("*").eq("id", id), owner).maybeSingle());
  return row ? toVenue(row as VenueRow) : null;
}

export async function insertVenue(venue: Venue, owner: string) {
  must(await supabaseClient().from("venues").insert({ ...toRow({ ...venue }, VENUE_COLS), owner_id: owner }));
}

/** Apaga o local; as festas que o usavam ficam sem fundo. */
export async function deleteVenue(id: string, owner: Owner) {
  const row = must(await scope(supabaseClient().from("venues").delete().eq("id", id), owner).select("*").maybeSingle());
  if (!row) return null;
  must(await supabaseClient().from("events").update({ venue_id: null, backdrop: "none" }).eq("venue_id", id));
  return toVenue(row as VenueRow);
}

// ---- festas ----

export async function listEvents(owner: Owner) {
  const rows = must(await scope(supabaseClient().from("events").select("*"), owner).order("updated_at", { ascending: false }));
  return (rows as EventRow[]).map(toEvent);
}

export async function getEvent(id: string, owner: Owner) {
  const row = must(await scope(supabaseClient().from("events").select("*").eq("id", id), owner).maybeSingle());
  return row ? toEvent(row as EventRow) : null;
}

export async function insertEvent(ev: PartyEvent, owner: string) {
  must(await supabaseClient().from("events").insert({ ...toRow({ ...ev }, EVENT_COLS), owner_id: owner }));
}

export async function updateEvent(id: string, patch: Partial<PartyEvent>, owner: Owner) {
  const row = must(await scope(supabaseClient().from("events").update(toRow(patch, EVENT_COLS)).eq("id", id), owner).select("*").maybeSingle());
  return row ? toEvent(row as EventRow) : null;
}

export async function deleteEvent(id: string, owner: Owner) {
  must(await scope(supabaseClient().from("events").delete().eq("id", id), owner));
}

/** Tira um item apagado de todas as festas onde ele estava posicionado. */
export async function removeItemFromEvents(itemId: string, owner: Owner) {
  const events = await listEvents(owner);
  await Promise.all(
    events
      .filter((e) => e.placed.some((p) => p.itemId === itemId))
      .map((e) => updateEvent(e.id, { placed: e.placed.filter((p) => p.itemId !== itemId) }, owner)),
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
  must(await supabaseClient().storage.from(BUCKET).upload(name, data, { contentType: MIME[ext] }));
  return name;
}

export async function readUpload(name: string): Promise<Buffer | null> {
  if (!NAME_RE.test(name)) return null;
  const { data, error } = await supabaseClient().storage.from(BUCKET).download(name);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

export async function removeUploads(names: (string | null)[]) {
  const valid = names.filter((n): n is string => !!n && NAME_RE.test(n));
  if (valid.length) await supabaseClient().storage.from(BUCKET).remove(valid);
}

// ---- usuários (Supabase Auth, chave secreta) ----

/** API de administração de contas; só chamar depois de confirmar que quem pediu é admin. */
export const authAdmin = () => supabaseClient().auth.admin;

/** O arquivo é de uma peça ou de um local desse usuário? */
export async function ownsFile(name: string, owner: string) {
  if (!NAME_RE.test(name)) return false; // o nome entra no filtro abaixo; só letras, números, - e _
  const [items, venues] = await Promise.all([
    supabaseClient().from("items").select("id", { count: "exact", head: true }).eq("owner_id", owner).or(`photo.eq.${name},cutout.eq.${name},glb.eq.${name}`),
    supabaseClient().from("venues").select("id", { count: "exact", head: true }).eq("owner_id", owner).eq("photo", name),
  ]);
  return (items.count ?? 0) + (venues.count ?? 0) > 0;
}

export type UsageCounts = { items: number; pieces: number; venues: number; events: number };

/** Quantas peças, locais e festas cada usuário tem (tela de administração). */
export async function usageByOwner() {
  const [items, venues, events] = await Promise.all([
    supabaseClient().from("items").select("owner_id, quantity"),
    supabaseClient().from("venues").select("owner_id"),
    supabaseClient().from("events").select("owner_id"),
  ]);
  const map = new Map<string, UsageCounts>();
  const get = (id: string) => map.get(id) ?? map.set(id, { items: 0, pieces: 0, venues: 0, events: 0 }).get(id)!;
  for (const r of must(items) as { owner_id: string; quantity: number }[]) {
    get(r.owner_id).items++;
    get(r.owner_id).pieces += r.quantity;
  }
  for (const r of must(venues) as { owner_id: string }[]) get(r.owner_id).venues++;
  for (const r of must(events) as { owner_id: string }[]) get(r.owner_id).events++;
  return map;
}

/** Exclui a conta e tudo o que ela cadastrou (as linhas saem em cascata; os arquivos, aqui). */
export async function deleteUserAndData(userId: string) {
  const [items, venues] = await Promise.all([listItems(userId), listVenues(userId)]);
  const { error } = await authAdmin().deleteUser(userId);
  if (error) throw new Error(error.message);
  await removeUploads([...items.flatMap((i) => [i.photo, i.cutout, i.glb]), ...venues.map((v) => v.photo)]);
}
