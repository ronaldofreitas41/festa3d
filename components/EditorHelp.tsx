export default function EditorHelp() {
  return (
    <ol className="help-list">
      <li><strong>Escolha o local</strong> na aba “Local e salão” e informe o tamanho da área em metros.</li>
      <li><strong>Clique em um item</strong> na aba “Itens” e depois <strong>clique no chão</strong> para colocá-lo. Dá para colocar vários seguidos.</li>
      <li><strong>Arraste</strong> um item para movê-lo. Com ele selecionado, use <span className="kbd">Q</span> / <span className="kbd">E</span> para girar e <span className="kbd">Delete</span> para remover.</li>
      <li>O painel no canto direito deixa você <strong>girar, redimensionar, duplicar</strong> e remover o item.</li>
      <li><strong>Mouse:</strong> botão esquerdo no vazio gira a câmera, botão direito move, rodinha dá zoom. “Vista de cima” mostra como uma planta.</li>
      <li>Use <span className="kbd">Ctrl</span>+<span className="kbd">Z</span> para desfazer qualquer passo.</li>
      <li>Terminou? Clique em <strong>👁️ Visualizar</strong> para ver a festa pronta (e baixar uma imagem) ou <strong>🚶 Caminhar</strong> para andar dentro dela.</li>
      <li>Tudo é <strong>salvo automaticamente</strong>. O estoque é respeitado: você não consegue usar mais itens do que tem.</li>
    </ol>
  );
}
