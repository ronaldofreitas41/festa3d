"use client";

import Link from "next/link";
import ShaderBackground from "./ShaderBackground";
import { fileUrl, useItems } from "@/lib/client";

const TILES = 11;
/** Peças decorativas usadas enquanto o estoque ainda não tem fotos. */
const PLACEHOLDERS = ["orb", "ring", "pearl", "column", "orb", "drape", "pearl", "ring", "column", "orb", "drape"];

/** Arco de miniaturas sobre o título: fotos reais do estoque quando existirem. */
function Arc() {
  const { data: items } = useItems();
  const photos = (items ?? []).filter((i) => i.cutout || i.photo).map((i) => ({ src: fileUrl(i.cutout ?? i.photo), name: i.name }));

  return (
    <div className="arc" aria-hidden>
      {Array.from({ length: TILES }, (_, i) => {
        // de 200° a 340°: meia-lua aberta para baixo, envolvendo o título
        const deg = 200 + (140 * i) / (TILES - 1);
        const photo = photos.length ? photos[i % photos.length] : null;
        return (
          <div key={i} className="tile" style={{ "--a": `${deg}deg`, "--i": i } as React.CSSProperties}>
            {photo ? <img src={photo.src} alt="" /> : <span className={`ph ${PLACEHOLDERS[i]}`} />}
          </div>
        );
      })}
    </div>
  );
}

export default function HomeHero() {
  return (
    <section className="hero">
      <ShaderBackground />
      <div className="hero-inner">
        <Arc />
        <div className="hero-copy">
          <h1>
            Planeje. <em>Monte.</em> Celebre.
          </h1>
          <p>
            Fotografe o seu acervo de decoração, transforme cada peça em 3D e monte o evento inteiro no espaço do
            cliente antes do grande dia.
          </p>
          <div className="hero-actions">
            <Link href="/estoque" className="btn glass">Começar pelo acervo</Link>
            <Link href="/ajuda" className="btn text-light">Ver como funciona</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
