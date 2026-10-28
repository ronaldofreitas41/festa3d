import Link from "next/link";
import UserActions from "@/components/UserActions";
import { requireAdmin } from "@/lib/auth";
import { fmtDate, listAccounts } from "@/lib/accounts";
import { usageByOwner } from "@/lib/db";

export const metadata = { title: "Usuários — Festa 3D" };

export default async function UsersPage() {
  const me = await requireAdmin();
  const [accounts, usage] = await Promise.all([listAccounts(), usageByOwner()]);
  const blocked = accounts.filter((a) => a.blocked).length;

  return (
    <main className="container">
      <div className="page-head">
        <div>
          <h1>Usuários</h1>
          <p>
            Cada pessoa vê só o próprio acervo, locais e festas. Aqui você acompanha o que cada uma cadastrou e controla quem
            pode entrar.
          </p>
        </div>
        <Link href="/registro" className="btn primary">
          Cadastrar usuário
        </Link>
      </div>

      <p className="muted">
        {accounts.length} {accounts.length === 1 ? "conta" : "contas"}
        {blocked > 0 && `, ${blocked} ${blocked === 1 ? "bloqueada" : "bloqueadas"}`}
      </p>

      <div className="card">
        <ul className="user-table" aria-label="Contas com acesso ao sistema">
          <li className="user-row head" aria-hidden>
            <span>Conta</span>
            <span>Acervo</span>
            <span>Locais</span>
            <span>Festas</span>
            <span>Último acesso</span>
            <span>Ações</span>
            <span />
          </li>
          {accounts.map((a) => {
            const u = usage.get(a.id) ?? { items: 0, pieces: 0, venues: 0, events: 0 };
            const isMe = a.id === me.id;
            return (
              <li key={a.id} className={`user-row ${a.blocked ? "is-blocked" : ""}`}>
                <div className="user-main">
                  <Link href={`/usuarios/${a.id}`} className="user-email">
                    {a.email}
                  </Link>
                  <div className="row user-tags">
                    <span className="badge role">{a.role === "admin" ? "Administrador" : "Usuário"}</span>
                    {a.blocked && <span className="badge err">Bloqueado</span>}
                    {isMe && <span className="small muted">Você</span>}
                  </div>
                </div>
                <span data-label="Acervo">
                  {u.items} {u.items === 1 ? "item" : "itens"}
                  <span className="small muted"> ({u.pieces} peças)</span>
                </span>
                <span data-label="Locais">{u.venues}</span>
                <span data-label="Festas">{u.events}</span>
                <span data-label="Último acesso" className="small">
                  {fmtDate(a.lastSignIn) ?? <span className="muted">nunca entrou</span>}
                </span>
                <span className="user-cta">
                  {isMe ? (
                    <Link href={`/usuarios/${a.id}`} className="btn sm">
                      Ver dados
                    </Link>
                  ) : (
                    <UserActions id={a.id} email={a.email} blocked={a.blocked} />
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
