import { mutateDb, removeUpload } from "@/lib/db";

export async function PATCH(req: Request, ctx: RouteContext<"/api/items/[id]">) {
  const { id } = await ctx.params;
  const body = (await req.json()) as { name?: string; quantity?: number; height?: number };
  const item = await mutateDb((d) => {
    const it = d.items.find((i) => i.id === id);
    if (!it) return null;
    if (body.name?.trim()) it.name = body.name.trim();
    if (body.quantity) it.quantity = Math.max(1, Math.floor(body.quantity));
    if (body.height) it.height = Math.min(5, Math.max(0.05, body.height));
    return { ...it };
  });
  return item ? Response.json(item) : Response.json({ error: "Item não encontrado" }, { status: 404 });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/items/[id]">) {
  const { id } = await ctx.params;
  const removed = await mutateDb((d) => {
    const i = d.items.findIndex((x) => x.id === id);
    if (i < 0) return null;
    const [it] = d.items.splice(i, 1);
    d.events.forEach((e) => (e.placed = e.placed.filter((p) => p.itemId !== id)));
    return it;
  });
  if (removed) await Promise.all([removed.photo, removed.cutout, removed.glb].map(removeUpload));
  return Response.json({ ok: true });
}
