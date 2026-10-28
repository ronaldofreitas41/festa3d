"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/auth-actions";
import type { SessionUser } from "@/lib/auth-claims";

const LINKS = [
  { href: "/estoque", label: "Estoque" },
  { href: "/locais", label: "Locais" },
  { href: "/festas", label: "Festas" },
  { href: "/ajuda", label: "Ajuda" },
];

export default function Nav({ user }: { user: SessionUser | null }) {
  const path = usePathname();
  if (!user || path === "/login") return null;
  const links = user.role === "admin" ? [...LINKS, { href: "/usuarios", label: "Usuários" }] : LINKS;
  return (
    <header className="nav-wrap">
      <nav className="nav" aria-label="Menu principal">
        <Link href="/" className="logo">
          Festa <em>3D</em>
        </Link>
        <div className="nav-links">
          {links.map((l) => {
            const on = path.startsWith(l.href) || (l.href === "/usuarios" && path.startsWith("/registro"));
            return (
              <Link key={l.href} href={l.href} className={`link ${on ? "active" : ""}`} aria-current={on ? "page" : undefined}>
                {l.label}
              </Link>
            );
          })}
        </div>
        <Link href="/festas" className="btn light sm nav-cta">
          Montar evento
        </Link>
        <form action={logout}>
          <button className="link" title={`Sair da conta ${user.email}`}>
            Sair
          </button>
        </form>
      </nav>
    </header>
  );
}
