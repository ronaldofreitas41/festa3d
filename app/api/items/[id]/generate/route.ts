import { apiUser } from "@/lib/auth";
import { startGeneration } from "@/lib/ai";
import { getItem, updateItem } from "@/lib/db";

/** A geração de 3D roda depois da resposta (after) e pode levar alguns minutos (= TRELLIS_MAX_SECONDS). */
export const maxDuration = 300;

/** Tenta gerar o 3D de novo (ex.: depois de configurar a chave da IA). */
export async function POST(_req: Request, ctx: RouteContext<"/api/items/[id]/generate">) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const { id } = await ctx.params;
  const reset = await updateItem(id, { status: "pending", error: null, progress: 0, taskId: null }, user.id);
  if (!reset) return Response.json({ error: "Item não encontrado" }, { status: 404 });
  await startGeneration(id, user.id);
  const item = await getItem(id, user.id);
  return item ? Response.json(item) : Response.json({ error: "Item não encontrado" }, { status: 404 });
}
