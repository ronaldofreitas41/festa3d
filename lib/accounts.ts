import "server-only";
import type { User } from "@supabase/supabase-js";
import { authAdmin } from "./db";
import type { Role } from "./auth-claims";

export type Account = {
  id: string;
  email: string;
  role: Role;
  blocked: boolean;
  createdAt: string;
  lastSignIn: string | null;
};

function toAccount(u: User): Account | null {
  const role = (u.app_metadata as { role?: string }).role;
  if (role !== "admin" && role !== "user") return null; // contas fora do sistema
  return {
    id: u.id,
    email: u.email ?? "",
    role,
    blocked: !!u.banned_until && Date.parse(u.banned_until) > Date.now(),
    createdAt: u.created_at,
    lastSignIn: u.last_sign_in_at ?? null,
  };
}

/** Contas com acesso ao sistema (só chamar depois de requireAdmin). */
export async function listAccounts() {
  const { data, error } = await authAdmin().listUsers({ perPage: 1000 });
  if (error) throw new Error(error.message);
  return data.users
    .map(toAccount)
    .filter((a): a is Account => !!a)
    .sort((a, b) => a.email.localeCompare(b.email));
}

export async function getAccount(id: string) {
  const { data, error } = await authAdmin().getUserById(id);
  return error || !data.user ? null : toAccount(data.user);
}

export const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" }) : null;
