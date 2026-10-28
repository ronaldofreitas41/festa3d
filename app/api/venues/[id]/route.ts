import { apiUser } from "@/lib/auth";
import { deleteVenue, removeUploads } from "@/lib/db";

export async function DELETE(_req: Request, ctx: RouteContext<"/api/venues/[id]">) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const { id } = await ctx.params;
  const removed = await deleteVenue(id, user.id);
  if (removed) await removeUploads([removed.photo]);
  return Response.json({ ok: true });
}
