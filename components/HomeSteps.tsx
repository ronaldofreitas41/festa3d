"use client";

import Link from "next/link";
import { useEvents, useItems, useVenues } from "@/lib/client";

export default function HomeSteps() {
  const { data: items } = useItems();
  const { data: venues } = useVenues();
  const { data: events } = useEvents();
  const n = (d: unknown[] | null) => d?.length ?? 0;

  const steps = [
    {
      done: n(items) > 0,
      title: "Cadastre seu estoque",
      text: "Tire uma foto de cada item (cadeira, mesa, painel, arranjo…), diga quantos você tem e a IA cria o 3D.",
      href: "/estoque",
      cta: n(items) ? `${n(items)} item(ns) cadastrado(s)` : "Cadastrar primeiro item",
    },
    {
      done: n(venues) > 0,
      title: "Envie fotos do local",
      text: "Foto do salão, do quintal ou do espaço onde a festa vai acontecer. Ela vira o cenário da sua montagem.",
      href: "/locais",
      cta: n(venues) ? `${n(venues)} local(is) cadastrado(s)` : "Cadastrar um local",
    },
    {
      done: n(events) > 0,
      title: "Monte a festa",
      text: "Escolha o local, arraste os itens para o chão, gire, ajuste e veja tudo em 3D. Salva sozinho.",
      href: "/festas",
      cta: n(events) ? `${n(events)} festa(s) criada(s)` : "Criar minha primeira festa",
    },
  ];

  return (
    <>
      <div className="steps">
        {steps.map((s) => (
          <div key={s.title} className={`card step ${s.done ? "done" : ""}`}>
            <h3>{s.title}</h3>
            <p className="muted">{s.text}</p>
            <Link href={s.href} className={`btn ${s.done ? "" : "primary"}`}>
              {s.cta} →
            </Link>
          </div>
        ))}
      </div>
      <p className="muted">
        Primeira vez aqui? Leia o <Link href="/ajuda">guia completo</Link> — ele explica cada tela com calma.
      </p>
    </>
  );
}
