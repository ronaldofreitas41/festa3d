import { after } from "next/server";
import { Client, handle_file } from "@gradio/client";
import { getItem, readUpload, saveUpload, updateItem } from "./db";
import type { StockItem } from "./types";

/**
 * Qual IA transforma a foto em 3D:
 * - "meshy": paga, quando MESHY_API_KEY está configurada;
 * - "trellis": gratuita (Microsoft TRELLIS hospedado no Hugging Face), padrão sem chave da Meshy;
 * - "cutout": sem IA, só a foto recortada (AI_PROVIDER=cutout desliga a IA).
 */
export function aiProvider(): StockItem["provider"] {
  if (process.env.AI_PROVIDER === "cutout") return "cutout";
  if (process.env.MESHY_API_KEY) return "meshy";
  return "trellis";
}
export const aiConfigured = () => aiProvider() !== "cutout";

/** Envia a foto para a IA escolhida. */
export async function startGeneration(itemId: string) {
  const item = await getItem(itemId);
  if (!item) return;
  const provider = aiProvider();
  if (provider === "cutout") {
    // Sem IA: modo recorte 3D, pronto na hora.
    await updateItem(itemId, { status: "ready", provider: "cutout", progress: 100, error: null });
    return;
  }
  if (provider === "trellis") return startTrellis(item);
  return startMeshy(item);
}

/** Consulta o andamento da IA e atualiza o item (chamado quando a lista é lida). */
export async function refreshItem(item: StockItem): Promise<StockItem> {
  if (item.status !== "processing") return item;
  if (item.provider === "trellis") return refreshTrellis(item);
  if (item.provider === "meshy" && item.taskId && process.env.MESHY_API_KEY) return refreshMeshy(item);
  return item;
}

const fail = (id: string, provider: StockItem["provider"], error: string) =>
  updateItem(id, { status: "failed", provider, error });

// ---------------------------------------------------------------- TRELLIS (gratuito)

const SPACE = "trellis-community/TRELLIS";
/** Tempo máximo de uma geração; é também o maxDuration das rotas que a disparam. */
export const TRELLIS_MAX_SECONDS = 300;

/**
 * O Hugging Face não tem id de tarefa para consultar depois, então o início da geração fica
 * gravado no próprio item (task_id = "trellis:<ms>"). Assim qualquer instância do servidor
 * (na Vercel cada requisição pode cair numa diferente) sabe há quanto tempo ela começou.
 */
const startedAt = (item: StockItem) => Number(item.taskId?.match(/^trellis:(\d+)$/)?.[1] ?? 0);

function friendlyTrellisError(msg: string) {
  if (/quota/i.test(msg)) {
    const wait = msg.match(/Try again in ([\d:]+)/)?.[1];
    return (
      "A cota gratuita diária da IA acabou" +
      (wait ? ` (libera em ${wait} h)` : "") +
      ". Configure um HF_TOKEN gratuito para ter mais cota, ou tente mais tarde."
    );
  }
  return `A IA não conseguiu gerar o 3D: ${msg.slice(0, 200)}`;
}

async function startTrellis(item: StockItem) {
  const running = item.status === "processing" && Date.now() - startedAt(item) < TRELLIS_MAX_SECONDS * 1000;
  if (running) return;
  await updateItem(item.id, { status: "processing", provider: "trellis", taskId: `trellis:${Date.now()}`, progress: 5, error: null });
  // roda depois da resposta (leva de 30 s a alguns minutos); o after() mantém a função viva na Vercel
  after(() =>
    runTrellis(item).catch((e) => fail(item.id, "trellis", friendlyTrellisError((e as Error).message ?? String(e)))),
  );
}

async function runTrellis(item: StockItem) {
  const buf = await readUpload(item.cutout ?? item.photo);
  if (!buf) throw new Error("Foto não encontrada");
  const token = process.env.HF_TOKEN as `hf_${string}` | undefined;
  const client = await Client.connect(SPACE, token ? { token } : {});
  await client.predict("/start_session", {});
  const pre = await client.predict("/preprocess_image", { image: handle_file(new Blob([new Uint8Array(buf)])) });
  await updateItem(item.id, { progress: 15 });

  const job = client.submit("/generate_and_extract_glb", {
    image: (pre.data as unknown[])[0],
    multiimages: [],
    seed: 0,
    ss_guidance_strength: 7.5,
    ss_sampling_steps: 12,
    slat_guidance_strength: 3,
    slat_sampling_steps: 12,
    multiimage_algo: "stochastic",
    mesh_simplify: 0.95,
    texture_size: 1024,
  });
  for await (const msg of job) {
    if (msg.type === "status" && msg.stage === "error") {
      throw new Error(typeof msg.message === "string" ? msg.message : "erro desconhecido");
    }
    if (msg.type === "data") {
      const glbFile = (msg.data as { url?: string }[])[1];
      if (!glbFile?.url) throw new Error("a IA não devolveu o arquivo 3D");
      const res = await fetch(glbFile.url, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
      if (!res.ok) throw new Error(`falha ao baixar o modelo (${res.status})`);
      const glb = await saveUpload(Buffer.from(await res.arrayBuffer()), "glb");
      await updateItem(item.id, { status: "ready", glb, progress: 100, error: null });
      return;
    }
  }
  throw new Error("a conexão com a IA terminou sem resultado");
}

async function refreshTrellis(item: StockItem): Promise<StockItem> {
  const elapsed = Date.now() - startedAt(item);
  // passou do tempo máximo (servidor reiniciou ou a função foi encerrada): libera para tentar de novo
  if (elapsed > (TRELLIS_MAX_SECONDS + 30) * 1000) {
    return (await fail(item.id, "trellis", "A geração foi interrompida. Clique em “Tentar de novo”.")) ?? item;
  }
  // a fila não informa o andamento: estima pelo tempo (uma geração típica leva ~35 s)
  const progress = Math.round(15 + 80 * (1 - Math.exp(-elapsed / 25000)));
  return progress > item.progress ? ((await updateItem(item.id, { progress })) ?? item) : item;
}

// ---------------------------------------------------------------- Meshy (pago)

const MESHY = "https://api.meshy.ai/openapi/v1/image-to-3d";

const meshyHeaders = () => ({
  Authorization: `Bearer ${process.env.MESHY_API_KEY}`,
  "Content-Type": "application/json",
});

async function startMeshy(item: StockItem) {
  try {
    const buf = await readUpload(item.photo);
    if (!buf) throw new Error("Foto não encontrada");
    const ext = item.photo.split(".").pop()!.toLowerCase();
    const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    const res = await fetch(MESHY, {
      method: "POST",
      headers: meshyHeaders(),
      body: JSON.stringify({
        image_url: `data:${mime};base64,${buf.toString("base64")}`,
        enable_pbr: true,
        should_remesh: true,
        should_texture: true,
      }),
    });
    if (!res.ok) throw new Error(`A IA respondeu ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const { result } = (await res.json()) as { result: string };
    await updateItem(item.id, { status: "processing", provider: "meshy", taskId: result, progress: 0, error: null });
  } catch (e) {
    await fail(item.id, "meshy", (e as Error).message);
  }
}

async function refreshMeshy(item: StockItem): Promise<StockItem> {
  try {
    const res = await fetch(`${MESHY}/${item.taskId}`, { headers: meshyHeaders(), cache: "no-store" });
    if (!res.ok) throw new Error(`A IA respondeu ${res.status}`);
    const t = (await res.json()) as {
      status: string;
      progress: number;
      model_urls?: { glb?: string };
      task_error?: { message?: string };
    };
    if (t.status === "SUCCEEDED" && t.model_urls?.glb) {
      const glbRes = await fetch(t.model_urls.glb);
      const glb = await saveUpload(Buffer.from(await glbRes.arrayBuffer()), "glb");
      return (await updateItem(item.id, { status: "ready", glb, progress: 100, error: null })) ?? item;
    }
    if (t.status === "FAILED" || t.status === "CANCELED") {
      return (await fail(item.id, "meshy", t.task_error?.message || "A IA não conseguiu gerar o modelo.")) ?? item;
    }
    return (await updateItem(item.id, { progress: t.progress ?? item.progress })) ?? item;
  } catch {
    return item;
  }
}
