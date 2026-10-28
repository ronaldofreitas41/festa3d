/**
 * Remove o fundo de uma foto no próprio navegador.
 * Pega a cor das bordas como "cor do fundo" e apaga tudo que é parecido e
 * está conectado às bordas (flood fill). Funciona melhor com fundo liso.
 */
export async function loadImage(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    // a imagem já está decodificada; libera o blob
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export async function removeBackground(img: HTMLImageElement, tolerance: number, maxSize = 1024): Promise<Blob> {
  const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;

  // cor média das bordas
  let r = 0, g = 0, b = 0, n = 0;
  const sample = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    r += px[i]; g += px[i + 1]; b += px[i + 2]; n++;
  };
  for (let x = 0; x < w; x += 2) { sample(x, 0); sample(x, h - 1); }
  for (let y = 0; y < h; y += 2) { sample(0, y); sample(w - 1, y); }
  r /= n; g /= n; b /= n;

  const maxDist = tolerance * 4.4; // 0..100 -> 0..440 (distância RGB máxima ~441)
  const isBg = (p: number) => {
    const dr = px[p] - r, dg = px[p + 1] - g, db = px[p + 2] - b;
    return Math.sqrt(dr * dr + dg * dg + db * db) <= maxDist;
  };

  const visited = new Uint8Array(w * h);
  const stack: number[] = [];
  const push = (x: number, y: number) => {
    const k = y * w + x;
    if (visited[k]) return;
    if (isBg(k * 4)) { visited[k] = 1; stack.push(k); }
  };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (stack.length) {
    const k = stack.pop()!;
    const x = k % w, y = (k - x) / w;
    if (x > 0) push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }

  // apaga o fundo, suaviza a borda (1px) e descobre a caixa do objeto
  let minX = w, minY = h, maxX = 0, maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = y * w + x;
      if (visited[k]) {
        px[k * 4 + 3] = 0;
        continue;
      }
      const edge =
        (x > 0 && visited[k - 1]) || (x < w - 1 && visited[k + 1]) || (y > 0 && visited[k - w]) || (y < h - 1 && visited[k + w]);
      if (edge) px[k * 4 + 3] = 140;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  ctx.putImageData(data, 0, 0);

  if (maxX <= minX || maxY <= minY) {
    // nada sobrou: devolve a foto original sem recorte
    ctx.drawImage(img, 0, 0, w, h);
    return toBlob(canvas);
  }
  const pad = 2;
  const cx = Math.max(0, minX - pad), cy = Math.max(0, minY - pad);
  const cw = Math.min(w - cx, maxX - minX + 1 + pad * 2), ch = Math.min(h - cy, maxY - minY + 1 + pad * 2);
  const out = document.createElement("canvas");
  out.width = cw;
  out.height = ch;
  out.getContext("2d")!.drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);
  return toBlob(out);
}

function toBlob(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Falha ao processar a imagem"))), "image/png"));
}
