import HomeSteps from "@/components/HomeSteps";

export default function Home() {
  return (
    <main className="container">
      <section className="hero">
        <h1>Monte a decoração da festa em 3D, antes do dia do evento.</h1>
        <p>
          Fotografe os itens do seu estoque, a IA transforma cada foto em um objeto 3D, e você monta o salão inteiro
          arrastando os itens pelo chão — como no The Sims. No final, passeie pela festa pronta.
        </p>
      </section>
      <HomeSteps />
    </main>
  );
}
