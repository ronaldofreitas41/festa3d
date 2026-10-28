import { mutateDb, readDb } from "@/lib/db";
import type { PartyEvent } from "@/lib/types";

export async function GET(_req: Request, ctx: RouteContext<"/api/events/[id]">) {
  const { id } = await ctx.params;
  const ev = (await readDb()).events.find((e) => e.id === id);
  return ev ? Response.json(ev) : Response.json({ error: "Festa não encontrada" }, { status: 404 });
}

export async function PUT(req: Request, ctx: RouteContext<"/api/events/[id]">) {
  const { id } = await ctx.params;
  const body = (await req.json()) as Partial<PartyEvent>;
  const ev = await mutateDb((d) => {
    const e = d.events.find((x) => x.id === id);
    if (!e) return null;
    if (body.name?.trim()) e.name = body.name.trim();
    if ("venueId" in body) e.venueId = body.venueId ?? null;
    if (body.backdrop) e.backdrop = body.backdrop;
    if (body.width) e.width = Math.min(60, Math.max(2, body.width));
    if (body.depth) e.depth = Math.min(60, Math.max(2, body.depth));
    if (body.floorColor) e.floorColor = body.floorColor;
    if (Array.isArray(body.placed)) {
      // nunca passa da quantidade em estoque
      const used: Record<string, number> = {};
      e.placed = body.placed.filter((p) => {
        const it = d.items.find((i) => i.id === p.itemId);
        if (!it) return false;
        used[p.itemId] = (used[p.itemId] ?? 0) + 1;
        return used[p.itemId] <= it.quantity;
      });
    }
    e.updatedAt = Date.now();
    return { ...e };
  });
  return ev ? Response.json(ev) : Response.json({ error: "Festa não encontrada" }, { status: 404 });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/events/[id]">) {
  const { id } = await ctx.params;
  await mutateDb((d) => void (d.events = d.events.filter((e) => e.id !== id)));
  return Response.json({ ok: true });
}
