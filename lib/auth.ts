import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { userFromClaims, type Role, type SessionUser } from "./auth-claims";

export type { Role, SessionUser };

function env() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (no .env.local ou nas variáveis de ambiente da hospedagem)");
  }
  return { url, key };
}

/** Cliente do Supabase com a sessão (cookies) de quem fez a requisição. Usa a chave pública. */
export async function supabaseAuth() {
  const store = await cookies();
  const { url, key } = env();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Server Components não gravam cookies; o proxy.ts já renova a sessão a cada requisição.
        }
      },
    },
  });
}

/**
 * Usuário logado, ou null. Confere a conta no Supabase a cada requisição (e não só a assinatura
 * do token), para que bloquear, excluir ou trocar o papel de alguém valha na hora.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await supabaseAuth();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const u = data.user;
  if (u.banned_until && Date.parse(u.banned_until) > Date.now()) return null;
  return userFromClaims({ sub: u.id, email: u.email, app_metadata: u.app_metadata } as Parameters<typeof userFromClaims>[0]);
});

/** Para páginas: manda para o login quem não entrou. */
export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** Para páginas só do admin. */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  return user;
}

/** Para rotas /api: devolve o usuário logado, ou a resposta de erro para retornar direto. */
export async function apiUser(role: Role = "user"): Promise<SessionUser | Response> {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Entre na sua conta para continuar." }, { status: 401 });
  if (role === "admin" && user.role !== "admin") return Response.json({ error: "Só o administrador pode fazer isso." }, { status: 403 });
  return user;
}
