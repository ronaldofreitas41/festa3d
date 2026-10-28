"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin, supabaseAuth, type Role } from "./auth";
import { authAdmin, deleteUserAndData } from "./db";

export type FormState = { error?: string; ok?: string } | undefined;

/** Só aceita voltar para um caminho interno (evita redirecionar para outro site). */
const safeNext = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/login") ? s : "/";
};

export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Informe o e-mail e a senha." };

  const supabase = await supabaseAuth();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error?.code === "user_banned") return { error: "Esta conta está bloqueada. Fale com o administrador." };
  if (error) return { error: "E-mail ou senha incorretos." };
  const role = (data.user.app_metadata as { role?: string }).role;
  if (role !== "admin" && role !== "user") {
    // conta existe no Supabase mas não foi liberada por um admin
    await supabase.auth.signOut();
    return { error: "Esta conta não tem acesso ao sistema. Peça ao administrador para cadastrá-la." };
  }
  redirect(safeNext(form.get("next")));
}

export async function logout() {
  const supabase = await supabaseAuth();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createUser(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const role: Role = form.get("role") === "admin" ? "admin" : "user";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Informe um e-mail válido." };
  if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." };

  const { error } = await authAdmin().createUser({ email, password, email_confirm: true, app_metadata: { role } });
  if (error) {
    return { error: /already|registered|exists/i.test(error.message) ? "Já existe uma conta com este e-mail." : `Não foi possível cadastrar: ${error.message}` };
  }
  revalidatePath("/usuarios");
  return { ok: `Conta de ${email} criada. Passe o e-mail e a senha para a pessoa entrar.` };
}

export type ActionResult = { error?: string };

/** Id do usuário-alvo vindo do formulário; o admin nunca age sobre a própria conta. */
async function targetId(form: FormData) {
  const me = await requireAdmin();
  const id = String(form.get("id") ?? "");
  return id && id !== me.id ? id : null;
}

/** Bloqueia (ou desbloqueia) o acesso: a pessoa não entra mais, mas os dados ficam guardados. */
export async function setBlocked(form: FormData): Promise<ActionResult> {
  const id = await targetId(form);
  if (!id) return { error: "Você não pode bloquear a sua própria conta." };
  const block = form.get("block") === "1";
  // ~100 anos; "none" tira o bloqueio
  const { error } = await authAdmin().updateUserById(id, { ban_duration: block ? "876000h" : "none" });
  if (error) return { error: `Não foi possível ${block ? "bloquear" : "desbloquear"}: ${error.message}` };
  revalidatePath("/usuarios");
  return {};
}

/** Exclui a conta e tudo o que ela cadastrou (acervo, locais, festas e arquivos). */
export async function deleteUser(form: FormData): Promise<ActionResult> {
  const id = await targetId(form);
  if (!id) return { error: "Você não pode excluir a sua própria conta." };
  try {
    await deleteUserAndData(id);
  } catch (e) {
    return { error: `Não foi possível excluir: ${(e as Error).message}` };
  }
  revalidatePath("/usuarios");
  if (form.get("back") === "1") redirect("/usuarios");
  return {};
}
