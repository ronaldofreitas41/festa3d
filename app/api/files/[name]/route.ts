import { apiUser } from "@/lib/auth";
import { MIME, ownsFile, readUpload } from "@/lib/db";

export async function GET(_req: Request, ctx: RouteContext<"/api/files/[name]">) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const { name } = await ctx.params;
  // cada um vê só os próprios arquivos; o admin vê todos (tela de usuários)
  if (user.role !== "admin" && !(await ownsFile(name, user.id))) return new Response("Not found", { status: 404 });
  const buf = await readUpload(name);
  if (!buf) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": MIME[name.split(".").pop()!.toLowerCase()] ?? "application/octet-stream",
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
