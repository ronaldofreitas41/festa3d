import { apiUser } from "@/lib/auth";
import { deleteItem, removeItemFromEvents, removeUploads, updateItem } from "@/lib/db";
import type { StockItem } from "@/lib/types";

export async function PATCH(req: Request, ctx: RouteContext<"/api/items/[id]">) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const { id } = await ctx.params;
  const body = (await req.json()) as { name?: string; quantity?: number; height?: number };
  const patch: Partial<StockItem> = {};
  if (body.name?.trim()) patch.name = body.name.trim();
  if (body.quantity) patch.quantity = Math.max(1, Math.floor(body.quantity));
  if (body.height) patch.height = Math.min(5, Math.max(0.05, body.height));
  const item = await updateItem(id, patch, user.id);
  return item ? Response.json(item) : Response.json({ error: "Item não encontrado" }, { status: 404 });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/items/[id]">) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const { id } = await ctx.params;
  const removed = await deleteItem(id, user.id);
  if (removed) {
    await removeItemFromEvents(id, user.id);
    await removeUploads([removed.photo, removed.cutout, removed.glb]);
  }
  return Response.json({ ok: true });
}
