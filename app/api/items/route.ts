import { startGeneration, refreshItem } from "@/lib/ai";
import { getItem, insertItem, listItems, newId, saveUpload } from "@/lib/db";
import type { StockItem } from "@/lib/types";

/** A geração de 3D roda depois da resposta (after) e pode levar alguns minutos (= TRELLIS_MAX_SECONDS). */
export const maxDuration = 300;

export async function GET() {
  try {
    return Response.json(await Promise.all((await listItems()).map(refreshItem)));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

async function fileToUpload(f: FormDataEntryValue | null) {
  if (!(f instanceof File) || f.size === 0) return null;
  if (f.size > 15 * 1024 * 1024) throw new Error("Foto muito grande (máx. 15 MB)");
  const ext = (f.name.split(".").pop() || "png").toLowerCase();
  return saveUpload(Buffer.from(await f.arrayBuffer()), ext === "jpeg" ? "jpg" : ext);
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const name = String(form.get("name") ?? "").trim();
    const quantity = Math.max(1, parseInt(String(form.get("quantity") ?? "1"), 10) || 1);
    const height = Math.min(5, Math.max(0.05, parseFloat(String(form.get("height") ?? "0.5")) || 0.5));
    if (!name) return Response.json({ error: "Informe o nome do item" }, { status: 400 });
    const photo = await fileToUpload(form.get("photo"));
    if (!photo) return Response.json({ error: "Envie uma foto do item" }, { status: 400 });
    const cutout = await fileToUpload(form.get("cutout"));

    const item: StockItem = {
      id: newId(),
      name,
      quantity,
      height,
      photo,
      cutout,
      glb: null,
      status: "pending",
      provider: "cutout",
      taskId: null,
      progress: 0,
      error: null,
      createdAt: Date.now(),
    };
    await insertItem(item);
    await startGeneration(item.id);
    return Response.json(await getItem(item.id), { status: 201 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
