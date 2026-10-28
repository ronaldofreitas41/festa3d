import Link from "next/link";
import { notFound } from "next/navigation";
import UserActions from "@/components/UserActions";
import { requireAdmin } from "@/lib/auth";
import { fmtDate, getAccount } from "@/lib/accounts";
import { listEvents, listItems, listVenues } from "@/lib/db";

export const metadata = { title: "Dados do usuário — Festa 3D" };

const STATUS = { ready: "3D pronto", processing: "Gerando 3D", pending: "Na fila", failed: "Falhou" } as const;
const file = (name: string | null) => (name ? `/api/files/${name}` : "");

export default async function UserDetailPage(props: PageProps<"/usuarios/[id]">) {
  const me = await requireAdmin();
  const { id } = await props.params;
  const account = await getAccount(id);
  if (!account) notFound();
  const [items, venues, events] = await Promise.all([listItems(id), listVenues(id), listEvents(id)]);
  const venueName = new Map(venues.map((v) => [v.id, v.name]));
  const pieces = items.reduce((n, i) => n + i.quantity, 0);

  return (
    <main className="container">
      <p className="small">
        <Link href="/usuarios">Voltar para usuários</Link>
      </p>
      <div className="page-head">
        <div>
          <h1 className="user-title">{account.email}</h1>
          <div className="row user-tags">
            <span className="badge role">{account.role === "admin" ? "Administrador" : "Usuário"}</span>
            {account.blocked && <span className="badge err">Bloqueado</span>}
          </div>
          <p className="small">
            Cadastrado em {fmtDate(account.createdAt)}. Último acesso: {fmtDate(account.lastSignIn) ?? "nunca entrou"}.
          </p>
        </div>
        {account.id !== me.id && <UserActions id={account.id} email={account.email} blocked={account.blocked} back />}
      </div>

      <section className="user-section">
        <h2>
          Acervo <span className="muted small">{items.length} {items.length === 1 ? "item" : "itens"}, {pieces} peças</span>
        </h2>
        {items.length === 0 ? (
          <p className="muted">Nenhuma peça cadastrada.</p>
        ) : (
          <div className="mini-grid">
            {items.map((i) => (
              <figure key={i.id} className="mini">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={file(i.cutout ?? i.photo)} alt="" loading="lazy" />
                <figcaption>
                  <strong>{i.name}</strong>
                  <span className="small muted">
                    {i.quantity} un., {STATUS[i.status]}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>

      <section className="user-section">
        <h2>
          Locais <span className="muted small">{venues.length}</span>
        </h2>
        {venues.length === 0 ? (
          <p className="muted">Nenhum local cadastrado.</p>
        ) : (
          <div className="mini-grid wide">
            {venues.map((v) => (
              <figure key={v.id} className="mini">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={file(v.photo)} alt="" loading="lazy" />
                <figcaption>
                  <strong>{v.name}</strong>
                  <span className="small muted">Desde {fmtDate(new Date(v.createdAt).toISOString())}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>

      <section className="user-section">
        <h2>
          Festas <span className="muted small">{events.length}</span>
        </h2>
        {events.length === 0 ? (
          <p className="muted">Nenhuma festa montada.</p>
        ) : (
          <div className="card">
            <ul className="user-list">
              {events.map((e) => (
                <li key={e.id}>
                  <div>
                    <strong>{e.name}</strong>
                    <div className="small muted">
                      {e.venueId ? venueName.get(e.venueId) ?? "Local removido" : "Sem local"}, {e.width} × {e.depth} m,{" "}
                      {e.placed.length} {e.placed.length === 1 ? "peça posicionada" : "peças posicionadas"}
                    </div>
                  </div>
                  <span className="small muted">Alterada em {fmtDate(new Date(e.updatedAt).toISOString())}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}
