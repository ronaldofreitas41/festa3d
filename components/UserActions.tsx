"use client";

import { useTransition } from "react";
import { deleteUser, setBlocked, type ActionResult } from "@/lib/auth-actions";

/** Botões de bloquear/desbloquear e excluir uma conta (tela de usuários). */
export default function UserActions({ id, email, blocked, back = false }: { id: string; email: string; blocked: boolean; back?: boolean }) {
  const [pending, start] = useTransition();

  const run = (fn: (f: FormData) => Promise<ActionResult>, fields: Record<string, string>) => {
    const fd = new FormData();
    fd.set("id", id);
    for (const [k, v] of Object.entries(fields)) fd.set(k, v);
    start(async () => {
      const res = await fn(fd);
      if (res?.error) alert(res.error);
    });
  };

  const toggle = () => {
    const msg = blocked
      ? `Desbloquear ${email}? A pessoa volta a conseguir entrar.`
      : `Bloquear ${email}? A pessoa não consegue mais entrar, mas o acervo, os locais e as festas dela ficam guardados.`;
    if (confirm(msg)) run(setBlocked, { block: blocked ? "0" : "1" });
  };

  const remove = () => {
    const msg = `Excluir ${email}?\n\nA conta e tudo o que ela cadastrou (acervo, locais, festas e fotos) serão apagados. Não dá para desfazer.`;
    if (confirm(msg)) run(deleteUser, back ? { back: "1" } : {});
  };

  return (
    <div className="row user-actions">
      <button type="button" className="btn sm" onClick={toggle} disabled={pending}>
        {blocked ? "Desbloquear" : "Bloquear"}
      </button>
      <button type="button" className="btn sm danger" onClick={remove} disabled={pending}>
        Excluir
      </button>
    </div>
  );
}
