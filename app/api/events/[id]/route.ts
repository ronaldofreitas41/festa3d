import { deleteEvent, getEvent, listItems, updateEvent } from "@/lib/db";
import type { PartyEvent } from "@/lib/types";

export async function GET(_req: Request, ctx: RouteContext<"/api/events/[id]">) {
  const { id } = await ctx.params;
  const ev = await getEvent(id);
  return ev ? Response.json(ev) : Response.json({ error: "Festa não encontrada" }, { status: 404 });
}

export async function PUT(req: Request, ctx: RouteContext<"/api/events/[id]">) {
  const { id } = await ctx.params;
  const body = (await req.json()) as Partial<PartyEvent>;
  const patch: Partial<PartyEvent> = { updatedAt: Date.now() };
  if (body.name?.trim()) patch.name = body.name.trim();
  if ("venueId" in body) patch.venueId = body.venueId ?? null;
  if (body.backdrop) patch.backdrop = body.backdrop;
  if (body.width) patch.width = Math.min(60, Math.max(2, body.width));
  if (body.depth) patch.depth = Math.min(60, Math.max(2, body.depth));
  if (body.floorColor) patch.floorColor = body.floorColor;
  if (Array.isArray(body.placed)) {
    // nunca passa da quantidade em estoque
    const stock = new Map((await listItems()).map((i) => [i.id, i.quantity]));
    const used: Record<string, number> = {};
    patch.placed = body.placed.filter((p) => {
      if (!stock.has(p.itemId)) return false;
      used[p.itemId] = (used[p.itemId] ?? 0) + 1;
      return used[p.itemId] <= stock.get(p.itemId)!;
    });
  }
  const ev = await updateEvent(id, patch);
  return ev ? Response.json(ev) : Response.json({ error: "Festa não encontrada" }, { status: 404 });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/events/[id]">) {
  const { id } = await ctx.params;
  await deleteEvent(id);
  return Response.json({ ok: true });
}
