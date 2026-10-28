"use client";

import { useActionState } from "react";
import Tip from "./Tip";
import { login } from "@/lib/auth-actions";

export default function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="stack">
      <input type="hidden" name="next" value={next} />
      <label className="field">
        E-mail
        <input type="email" name="email" autoComplete="email" required autoFocus />
      </label>
      <label className="field">
        Senha
        <input type="password" name="password" autoComplete="current-password" required />
      </label>
      {state?.error && <Tip kind="err"><p>{state.error}</p></Tip>}
      <button className="btn primary" disabled={pending}>{pending ? "Entrando…" : "Entrar"}</button>
    </form>
  );
}
