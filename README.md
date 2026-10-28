# 🎉 Festa 3D

Site para decoradores de festas: fotografe os itens do seu estoque, converta cada foto em um objeto 3D com IA e monte a festa inteira dentro do local do evento, no estilo do modo de construção do The Sims. Depois, visualize a festa pronta ou caminhe dentro dela.

Feito com **Next.js 16** (App Router) no front-end e no back-end (Route Handlers), **React Three Fiber / three.js** para o 3D e armazenamento em arquivos locais (sem banco de dados).

## Funcionalidades

- **Estoque:** upload de foto, nome, quantidade e altura real de cada item. Remoção de fundo automática no navegador.
- **IA foto → 3D:** integração com a [Meshy](https://www.meshy.ai) (opcional). Sem chave, usa o modo **Recorte 3D** (foto sem fundo em pé no cenário).
- **Locais:** fotos do espaço da festa, usadas como parede de fundo, piso ou panorama 360°.
- **Editor de festas (estilo Sims):** colocar, arrastar, girar, redimensionar, duplicar e remover itens; grade de encaixe; desfazer/refazer; vista de cima; salvamento automático; respeita a quantidade em estoque.
- **Visualização:** giro automático, download de imagem e modo **Caminhar** (WASD + mouse).
- **Ajuda dentro do site:** dicas em cada tela, tutorial do editor e página `/ajuda` com guia e FAQ.

## Requisitos

- [Node.js](https://nodejs.org) 20.9 ou superior (testado com 22)
- npm

## Como executar

```bash
# 1. instalar dependências
npm install

# 2. (opcional) configurar a IA de 3D
cp .env.example .env.local
# edite .env.local e preencha MESHY_API_KEY

# 3. rodar em desenvolvimento
npm run dev
```

Abra <http://localhost:3000>.

Para rodar em modo produção:

```bash
npm run build
npm start
```

## Configurando a IA de 3D (opcional)

1. Crie uma conta em [meshy.ai](https://www.meshy.ai) e gere uma chave de API.
2. Coloque em `.env.local`:
   ```
   MESHY_API_KEY=sua_chave_aqui
   ```
3. Reinicie o servidor.

Itens enviados depois disso são convertidos em modelos `.glb` (leva alguns minutos; o progresso aparece no card do item). Para itens cadastrados antes da chave, use **Tentar de novo**.

> A integração com a Meshy ainda não foi testada com uma chave real. Se a API tiver mudado, ajuste `lib/ai.ts`.

## Como usar

1. **Estoque** (`/estoque`): fotografe o item inteiro, com fundo liso e boa luz; informe nome, quantidade e altura real.
2. **Locais** (`/locais`): envie fotos do espaço da festa.
3. **Festas** (`/festas`): crie uma festa, escolha o local e monte.

Atalhos do editor: `Q`/`E` giram o item, `Delete` remove, `Esc` cancela, `Ctrl+Z` / `Ctrl+Y` desfazem/refazem. No modo Caminhar: `W A S D` (ou setas), `Shift` corre, arraste o mouse para olhar.

## Estrutura

```
app/
  api/            # back-end: items, venues, events, files, status
  estoque/ locais/ festas/ ajuda/   # páginas
components/       # UI e editor (EditorClient) + components/three (cena 3D)
lib/
  db.ts           # armazenamento em JSON + uploads (pasta data/)
  ai.ts           # integração com a IA de foto → 3D
  cutout.ts       # remoção de fundo no navegador
  client.ts       # helpers e hooks de acesso à API
```

## Dados

Tudo é salvo na pasta `data/` (ignorada pelo git): `data/db.json` e `data/uploads/`. Faça backup dessa pasta para não perder seu estoque e suas festas.

## Limitações conhecidas

- Sem login/usuários: pensado para uso local ou por uma única pessoa. Para publicar na internet, adicione autenticação e troque o armazenamento em arquivo por um banco de dados e storage de objetos.
- O modo Recorte 3D é uma aproximação; para 3D completo é preciso a chave da IA.
