import { mutateDb, newId, readDb, saveUpload } from "@/lib/db";
import type { Venue } from "@/lib/types";

export async function GET() {
  return Response.json((await readDb()).venues.sort((a, b) => b.createdAt - a.createdAt));
}

export async function POST(req: Request) {
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
    await mutateDb((d) => void d.venues.push(venue));
    return Response.json(venue, { status: 201 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
