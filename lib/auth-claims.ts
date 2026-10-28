import type { JwtPayload } from "@supabase/supabase-js";

export type Role = "admin" | "user";
export type SessionUser = { id: string; email: string; role: Role };

/**
 * Só entra quem foi cadastrado por um admin: o papel fica no app_metadata, que o
 * próprio usuário não consegue alterar. Contas sem papel (ex.: cadastro aberto
 * pelo Supabase) são tratadas como não logadas.
 */
export function userFromClaims(claims: JwtPayload | null | undefined): SessionUser | null {
  const role = (claims?.app_metadata as { role?: string } | undefined)?.role;
  if (!claims?.sub || (role !== "admin" && role !== "user")) return null;
  return { id: claims.sub, email: String(claims.email ?? ""), role };
}
