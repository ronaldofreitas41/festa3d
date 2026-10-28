import { deleteVenue, removeUploads } from "@/lib/db";

export async function DELETE(_req: Request, ctx: RouteContext<"/api/venues/[id]">) {
  const { id } = await ctx.params;
  const removed = await deleteVenue(id);
  if (removed) await removeUploads([removed.photo]);
  return Response.json({ ok: true });
}
