"use client";

import { useActionState, useEffect, useRef } from "react";
import Tip from "./Tip";
import { createUser } from "@/lib/auth-actions";

export default function RegisterForm() {
  const [state, action, pending] = useActionState(createUser, undefined);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);

  return (
    <form ref={form} action={action} className="stack">
      <div className="row" style={{ alignItems: "flex-end" }}>
        <label className="field" style={{ flex: "2 1 240px" }}>
          E-mail
          <input type="email" name="email" autoComplete="off" required />
        </label>
        <label className="field" style={{ flex: "1 1 180px" }}>
          Senha inicial
          <input type="password" name="password" autoComplete="new-password" minLength={8} required />
        </label>
        <label className="field" style={{ flex: "1 1 160px" }}>
          Acesso
          <select name="role" defaultValue="user">
            <option value="user">Usuário</option>
            <option value="admin">Administrador</option>
          </select>
        </label>
        <button className="btn primary" disabled={pending}>{pending ? "Cadastrando…" : "Cadastrar"}</button>
      </div>
      {state?.error && <Tip kind="err"><p>{state.error}</p></Tip>}
      {state?.ok && <Tip kind="ok"><p>{state.ok}</p></Tip>}
    </form>
  );
}
