import Link from "next/link";
import EditorHelp from "@/components/EditorHelp";
import Tip from "@/components/Tip";

export const metadata = { title: "Ajuda — Festa 3D" };

export default function HelpPage() {
  return (
    <main className="container" style={{ maxWidth: 820 }}>
      <h1>Guia de uso</h1>
      <p className="muted">Siga os 3 passos na ordem. Cada tela também tem dicas na própria página.</p>

      <h2 style={{ marginTop: 28 }}>Passo 1 — Estoque</h2>
      <p>Em <Link href="/estoque">Estoque</Link>, cadastre cada tipo de item que você tem:</p>
      <ol className="help-list">
        <li>Tire uma foto do item <strong>inteiro</strong>, com fundo liso e boa luz.</li>
        <li>Clique na área tracejada e escolha a foto (ou arraste o arquivo).</li>
        <li>Confira o nome, a <strong>quantidade</strong> que você tem e a <strong>altura real</strong> em centímetros.</li>
        <li>Deixe marcado “Remover o fundo” — se sobrar fundo ou o item for cortado, mexa na sensibilidade.</li>
        <li>Clique em adicionar. O 3D é criado e o status muda para <strong>Pronto</strong>. Clique em “Ver em 3D” para girar o item.</li>
      </ol>
      <Tip title="Quantidade">
        <p>A quantidade é um limite: na hora de montar a festa você só consegue colocar quantas unidades tem. Pode corrigir a qualquer momento com os botões − e +.</p>
      </Tip>

      <h2 id="ia" style={{ marginTop: 28 }}>Sobre a IA de 3D</h2>
      <p>A foto de cada peça vira um modelo 3D que você gira por todos os lados. O site usa uma destas opções:</p>
      <ul className="help-list">
        <li><strong>IA gratuita (TRELLIS):</strong> o padrão. Leva de 30 segundos a alguns minutos por peça e tem uma cota diária de uso. Se a cota acabar, a peça mostra o aviso e você usa “Tentar de novo” mais tarde.</li>
        <li><strong>IA paga (Meshy):</strong> sem cota diária, para quem cadastra muitas peças.</li>
        <li><strong>Recorte 3D:</strong> sem IA, a foto sem fundo fica “em pé” no cenário. Serve para planejar o layout, mas vista de lado a peça aparece fina. Também é usado se a IA falhar.</li>
      </ul>
      <Tip kind="warn" title="Para quem instalou o site">
        <p>
          Para mais cota na IA gratuita, crie uma conta em <strong>huggingface.co</strong>, gere um token do tipo “Read” em
          Settings → Access Tokens e coloque no arquivo <code>.env.local</code> como <code>HF_TOKEN=hf_...</code>. Para usar a
          Meshy, coloque <code>MESHY_API_KEY=sua_chave</code>. Reinicie o site depois de mudar o arquivo e use “Tentar de novo”
          nas peças antigas.
        </p>
      </Tip>

      <h2 style={{ marginTop: 28 }}>Passo 2 — Locais</h2>
      <p>Em <Link href="/locais">Locais</Link>, envie fotos do espaço da festa. Você escolhe depois como a foto aparece no 3D:</p>
      <ul className="help-list">
        <li><strong>Parede de fundo</strong> — foto do salão tirada de frente.</li>
        <li><strong>Piso</strong> — foto de cima ou planta do espaço.</li>
        <li><strong>360° ao redor</strong> — foto panorâmica 360°; você fica “dentro” do local.</li>
      </ul>

      <h2 style={{ marginTop: 28 }}>Passo 3 — Festas (montagem)</h2>
      <p>Em <Link href="/festas">Festas</Link>, crie uma festa e abra o editor. Funciona como o modo de construção do The Sims:</p>
      <EditorHelp />

      <h3 style={{ marginTop: 20 }}>Os três modos do editor</h3>
      <ul className="help-list">
        <li><strong>🔨 Montar</strong> — coloca, move, gira e remove itens, com grade para alinhar.</li>
        <li><strong>👁️ Visualizar</strong> — vê a festa pronta de fora, com giro automático. Dá para baixar uma imagem para mostrar ao cliente.</li>
        <li><strong>🚶 Caminhar</strong> — você entra na festa em altura de pessoa (1,60 m) e anda com W A S D, olhando com o mouse.</li>
      </ul>

      <h2 style={{ marginTop: 28 }}>Perguntas frequentes</h2>
      <details className="faq">
        <summary>Meus dados ficam salvos?</summary>
        <p>Sim. Itens, locais e festas ficam salvos no computador onde o site está instalado (pasta <code>data</code>). Festas salvam sozinhas a cada alteração.</p>
      </details>
      <details className="faq">
        <summary>Não consigo colocar mais um item na festa.</summary>
        <p>Você já usou todas as unidades em estoque. Aumente a quantidade em Estoque ou remova uma unidade da festa.</p>
      </details>
      <details className="faq">
        <summary>O recorte da foto ficou ruim.</summary>
        <p>Use a barra “Sensibilidade do recorte”. Se ainda ficar ruim, refaça a foto com fundo liso e de cor diferente do item.</p>
      </details>
      <details className="faq">
        <summary>O item ficou grande ou pequeno demais no salão.</summary>
        <p>Corrija a “altura real” ao cadastrar, ou use o controle de tamanho no painel do item selecionado.</p>
      </details>
      <details className="faq">
        <summary>Como desfazer um erro?</summary>
        <p>Botão “Desfazer” no topo do editor, ou <span className="kbd">Ctrl</span>+<span className="kbd">Z</span>.</p>
      </details>
    </main>
  );
}
