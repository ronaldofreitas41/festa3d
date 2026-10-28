import LoginForm from "@/components/LoginForm";

export const metadata = { title: "Entrar — Festa 3D" };

export default async function LoginPage(props: PageProps<"/login">) {
  const { next } = await props.searchParams;
  return (
    <main className="auth-page">
      <div className="auth-card card">
        <div className="card-body stack">
          <p className="logo-dark">
            Festa <em>3D</em>
          </p>
          <div>
            <h1>Entrar</h1>
            <p className="muted">Use o e-mail e a senha que o administrador cadastrou para você.</p>
          </div>
          <LoginForm next={typeof next === "string" ? next : ""} />
        </div>
      </div>
    </main>
  );
}
