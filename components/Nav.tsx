"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/estoque", label: "1. Estoque" },
  { href: "/locais", label: "2. Locais" },
  { href: "/festas", label: "3. Festas" },
  { href: "/ajuda", label: "Ajuda" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Menu principal">
      <Link href="/" className="logo">
        🎉 Festa 3D
      </Link>
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className={`link ${path.startsWith(l.href) ? "active" : ""}`}>
          {l.label}
        </Link>
      ))}
      <span className="spacer" />
    </nav>
  );
}
