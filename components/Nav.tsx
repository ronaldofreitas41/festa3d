"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/estoque", label: "Estoque" },
  { href: "/locais", label: "Locais" },
  { href: "/festas", label: "Festas" },
  { href: "/ajuda", label: "Ajuda" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <header className="nav-wrap">
      <nav className="nav" aria-label="Menu principal">
        <Link href="/" className="logo">
          Festa <em>3D</em>
        </Link>
        <div className="nav-links">
          {LINKS.map((l) => {
            const on = path.startsWith(l.href);
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
      </nav>
    </header>
  );
}
