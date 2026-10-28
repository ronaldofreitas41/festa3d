import { apiUser } from "@/lib/auth";
import { insertVenue, listVenues, newId, saveUpload } from "@/lib/db";
import type { Venue } from "@/lib/types";

export async function GET() {
  const user = await apiUser();
  if (user instanceof Response) return user;
  try {
    return Response.json(await listVenues(user.id));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  try {
    const form = await req.formData();
    const name = String(form.get("name") ?? "").trim();
    const f = form.get("photo");
    if (!name) return Response.json({ error: "Informe o nome do local" }, { status: 400 });
    if (!(f instanceof File) || f.size === 0) return Response.json({ error: "Envie uma foto do local" }, { status: 400 });
    if (f.size > 25 * 1024 * 1024) return Response.json({ error: "Foto muito grande (máx. 25 MB)" }, { status: 400 });
    const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
    const photo = await saveUpload(Buffer.from(await f.arrayBuffer()), ext === "jpeg" ? "jpg" : ext);
    const venue: Venue = { id: newId(), name, photo, createdAt: Date.now() };
    await insertVenue(venue, user.id);
    return Response.json(venue, { status: 201 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
