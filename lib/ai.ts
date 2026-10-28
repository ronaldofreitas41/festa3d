import { mutateDb, readDb, readUpload, saveUpload } from "./db";
import type { StockItem } from "./types";

const MESHY = "https://api.meshy.ai/openapi/v1/image-to-3d";

export const aiConfigured = () => !!process.env.MESHY_API_KEY;

const headers = () => ({
  Authorization: `Bearer ${process.env.MESHY_API_KEY}`,
  "Content-Type": "application/json",
});

/** Envia a foto para a IA (Meshy) e guarda o id da tarefa. */
export async function startGeneration(itemId: string) {
  const db = await readDb();
  const item = db.items.find((i) => i.id === itemId);
  if (!item) return;

  if (!aiConfigured()) {
    // Sem chave: modo recorte 3D, pronto na hora.
    await mutateDb((d) => {
      const it = d.items.find((i) => i.id === itemId);
      if (it) Object.assign(it, { status: "ready", provider: "cutout", progress: 100, error: null });
    });
    return;
  }

  try {
    const buf = await readUpload(item.photo);
    if (!buf) throw new Error("Foto não encontrada");
    const ext = item.photo.split(".").pop()!.toLowerCase();
    const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    const res = await fetch(MESHY, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        image_url: `data:${mime};base64,${buf.toString("base64")}`,
        enable_pbr: true,
        should_remesh: true,
        should_texture: true,
      }),
    });
    if (!res.ok) throw new Error(`A IA respondeu ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const { result } = (await res.json()) as { result: string };
    await mutateDb((d) => {
      const it = d.items.find((i) => i.id === itemId);
      if (it) Object.assign(it, { status: "processing", provider: "meshy", taskId: result, progress: 0, error: null });
    });
  } catch (e) {
    await mutateDb((d) => {
      const it = d.items.find((i) => i.id === itemId);
      if (it) Object.assign(it, { status: "failed", provider: "meshy", error: (e as Error).message });
    });
  }
}

/** Consulta a IA e atualiza o item (chamado quando a lista é lida). */
export async function refreshItem(item: StockItem): Promise<StockItem> {
  if (item.status !== "processing" || !item.taskId || !aiConfigured()) return item;
  try {
    const res = await fetch(`${MESHY}/${item.taskId}`, { headers: headers(), cache: "no-store" });
    if (!res.ok) throw new Error(`A IA respondeu ${res.status}`);
    const t = (await res.json()) as {
      status: string;
      progress: number;
      model_urls?: { glb?: string };
      task_error?: { message?: string };
    };
    if (t.status === "SUCCEEDED" && t.model_urls?.glb) {
      const glbRes = await fetch(t.model_urls.glb);
      const glb = await saveUpload(Buffer.from(await glbRes.arrayBuffer()), "glb");
      return mutateDb((d) => {
        const it = d.items.find((i) => i.id === item.id)!;
        Object.assign(it, { status: "ready", glb, progress: 100, error: null });
        return { ...it };
      });
    }
    if (t.status === "FAILED" || t.status === "CANCELED") {
      return mutateDb((d) => {
        const it = d.items.find((i) => i.id === item.id)!;
        Object.assign(it, { status: "failed", error: t.task_error?.message || "A IA não conseguiu gerar o modelo." });
        return { ...it };
      });
    }
    return mutateDb((d) => {
      const it = d.items.find((i) => i.id === item.id)!;
      it.progress = t.progress ?? it.progress;
      return { ...it };
    });
  } catch {
    return item;
  }
}
