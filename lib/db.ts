import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { Db } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const DB_FILE = path.join(DATA_DIR, "db.json");

let queue: Promise<unknown> = Promise.resolve();

async function ensure() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

export async function readDb(): Promise<Db> {
  await ensure();
  try {
    return JSON.parse(await fs.readFile(DB_FILE, "utf8"));
  } catch {
    return { items: [], venues: [], events: [] };
  }
}

/** Serializa as escritas para evitar corrida entre requisições. */
export function mutateDb<T>(fn: (db: Db) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const db = await readDb();
    const result = await fn(db);
    const tmp = DB_FILE + ".tmp";
    await fs.writeFile(tmp, JSON.stringify(db, null, 2));
    await fs.rename(tmp, DB_FILE);
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}

export const newId = () => randomUUID().slice(0, 8);

const EXT_OK = new Set(["png", "jpg", "jpeg", "webp", "glb"]);
const NAME_RE = /^[\w-]+\.(png|jpe?g|webp|glb)$/i;

export async function saveUpload(data: Buffer, ext: string): Promise<string> {
  await ensure();
  ext = ext.toLowerCase().replace(".", "");
  if (!EXT_OK.has(ext)) throw new Error("Formato de arquivo não suportado (use JPG, PNG ou WEBP)");
  const name = `${randomUUID()}.${ext}`;
  await fs.writeFile(path.join(UPLOAD_DIR, name), data);
  return name;
}

export async function readUpload(name: string): Promise<Buffer | null> {
  if (!NAME_RE.test(name)) return null;
  try {
    return await fs.readFile(path.join(UPLOAD_DIR, name));
  } catch {
    return null;
  }
}

export async function removeUpload(name: string | null) {
  if (!name || !NAME_RE.test(name)) return;
  await fs.rm(path.join(UPLOAD_DIR, name), { force: true });
}

export const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  glb: "model/gltf-binary",
};
