import { startGeneration } from "@/lib/ai";
import { getItem, updateItem } from "@/lib/db";

/** Tenta gerar o 3D de novo (ex.: depois de configurar a chave da IA). */
export async function POST(_req: Request, ctx: RouteContext<"/api/items/[id]/generate">) {
  const { id } = await ctx.params;
  await updateItem(id, { status: "pending", error: null, progress: 0, taskId: null });
  await startGeneration(id);
  const item = await getItem(id);
  return item ? Response.json(item) : Response.json({ error: "Item não encontrado" }, { status: 404 });
}
