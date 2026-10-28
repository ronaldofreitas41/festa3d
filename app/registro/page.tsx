import Link from "next/link";
import RegisterForm from "@/components/RegisterForm";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Cadastrar usuário — Festa 3D" };

export default async function RegisterPage() {
  await requireAdmin();
  return (
    <main className="container">
      <p className="small">
        <Link href="/usuarios">Voltar para usuários</Link>
      </p>
      <div className="page-head">
        <div>
          <h1>Cadastrar usuário</h1>
          <p>
            A pessoa entra com este e-mail e a senha inicial, e começa com o acervo, os locais e as festas vazios. Administradores
            também acessam a tela de usuários.
          </p>
        </div>
      </div>
      <div className="card">
        <div className="card-body">
          <RegisterForm />
        </div>
      </div>
    </main>
  );
}
