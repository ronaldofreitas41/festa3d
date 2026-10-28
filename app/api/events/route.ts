import { mutateDb, newId, readDb } from "@/lib/db";
import type { PartyEvent } from "@/lib/types";

export async function GET() {
  return Response.json((await readDb()).events.sort((a, b) => b.updatedAt - a.updatedAt));
}

export async function POST(req: Request) {
  const body = (await req.json()) as { name?: string; venueId?: string | null };
  const name = body.name?.trim();
  if (!name) return Response.json({ error: "Informe o nome da festa" }, { status: 400 });
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
  await mutateDb((d) => void d.events.push(ev));
  return Response.json(ev, { status: 201 });
}
