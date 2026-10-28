import { startGeneration } from "@/lib/ai";
import { mutateDb, readDb } from "@/lib/db";

/** Tenta gerar o 3D de novo (ex.: depois de configurar a chave da IA). */
export async function POST(_req: Request, ctx: RouteContext<"/api/items/[id]/generate">) {
  const { id } = await ctx.params;
  await mutateDb((d) => {
    const it = d.items.find((i) => i.id === id);
    if (it) Object.assign(it, { status: "pending", error: null, progress: 0, taskId: null });
  });
  await startGeneration(id);
  const item = (await readDb()).items.find((i) => i.id === id);
  return item ? Response.json(item) : Response.json({ error: "Item não encontrado" }, { status: 404 });
}
