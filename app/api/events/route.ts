import { apiUser } from "@/lib/auth";
import { getVenue, insertEvent, listEvents, newId } from "@/lib/db";
import type { PartyEvent } from "@/lib/types";

export async function GET() {
  const user = await apiUser();
  if (user instanceof Response) return user;
  try {
    return Response.json(await listEvents(user.id));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const body = (await req.json()) as { name?: string; venueId?: string | null };
  const name = body.name?.trim();
  if (!name) return Response.json({ error: "Informe o nome da festa" }, { status: 400 });
  if (body.venueId && !(await getVenue(body.venueId, user.id))) return Response.json({ error: "Local não encontrado" }, { status: 400 });
  const ev: PartyEvent = {
    id: newId(),
    name,
    venueId: body.venueId || null,
    backdrop: body.venueId ? "wall" : "none",
    width: 10,
    depth: 8,
    floorColor: "#e9e2d6",
    placed: [],
    updatedAt: Date.now(),
  };
  try {
    await insertEvent(ev, user.id);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
  return Response.json(ev, { status: 201 });
}
