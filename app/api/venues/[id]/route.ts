import { mutateDb, removeUpload } from "@/lib/db";

export async function DELETE(_req: Request, ctx: RouteContext<"/api/venues/[id]">) {
  const { id } = await ctx.params;
  const removed = await mutateDb((d) => {
    const i = d.venues.findIndex((v) => v.id === id);
    if (i < 0) return null;
    const [v] = d.venues.splice(i, 1);
    d.events.forEach((e) => {
      if (e.venueId === id) Object.assign(e, { venueId: null, backdrop: "none" });
    });
    return v;
  });
  if (removed) await removeUpload(removed.photo);
  return Response.json({ ok: true });
}
