"use client";

import Link from "next/link";
import { useEvents, useItems, useVenues } from "@/lib/client";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export default function HomeSteps() {
  const { data: items } = useItems();
  const { data: venues } = useVenues();
  const { data: events } = useEvents();
  const n = (d: unknown[] | null) => d?.length ?? 0;

  const steps = [
    {
      done: n(items) > 0,
      title: "Cadastre o acervo",
      text: "Uma foto de cada peça — cadeiras, mesas, painéis, arranjos — e a quantidade disponível. O 3D é criado a partir da foto.",
      href: "/estoque",
      status: n(items) ? plural(n(items), "peça cadastrada", "peças cadastradas") : null,
      cta: n(items) ? "Ver acervo" : "Cadastrar a primeira peça",
    },
    {
      done: n(venues) > 0,
      title: "Envie fotos do espaço",
      text: "O salão, o jardim ou a igreja. A foto vira o cenário onde a decoração será montada.",
      href: "/locais",
      status: n(venues) ? plural(n(venues), "local cadastrado", "locais cadastrados") : null,
      cta: n(venues) ? "Ver locais" : "Cadastrar um local",
    },
    {
      done: n(events) > 0,
      title: "Monte o evento",
      text: "Escolha o espaço, posicione as peças, gire e ajuste. Tudo é salvo enquanto você monta.",
      href: "/festas",
      status: n(events) ? plural(n(events), "evento criado", "eventos criados") : null,
      cta: n(events) ? "Ver eventos" : "Criar o primeiro evento",
    },
  ];

  return (
    <section className="steps-section" aria-labelledby="steps-title">
      <h2 id="steps-title" className="section-title">
        Do acervo ao salão <em>em três passos</em>
      </h2>
      <ol className="steps">
        {steps.map((s, i) => (
          <li key={s.title} className={`step ${s.done ? "done" : ""}`}>
            <span className="step-num" aria-hidden>{s.done ? "✓" : i + 1}</span>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
            {s.status && <p className="step-status">{s.status}</p>}
            <Link href={s.href} className={`btn ${s.done ? "" : "primary"}`}>
              {s.cta}
            </Link>
          </li>
        ))}
      </ol>
      <p className="muted">
        Primeira vez aqui? O <Link href="/ajuda">guia de uso</Link> explica cada tela com calma.
      </p>
    </section>
  );
}
