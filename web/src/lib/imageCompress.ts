/**
 * Compressão no navegador antes do upload (sem biblioteca): reduz para no máximo
 * `max` px no maior lado e converte para WebP. Respeita a orientação da câmera
 * (EXIF). Se não conseguir, ou se ficar maior, envia o arquivo original.
 * A vitrine ainda otimiza na entrega (next/image), então aqui o foco é não subir
 * fotos de 8–15 MB direto do celular/câmera.
 */
export async function compressImage(file: File, max = 2000, quality = 0.85): Promise<{ file: File; before: number; after: number }> {
  const before = file.size;
  if (!file.type.startsWith("image/") || file.type === "image/gif" || typeof createImageBitmap === "undefined") return { file, before, after: before };
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { file, before, after: before };
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (!blob || blob.type !== "image/webp" || (blob.size >= before && scale === 1)) return { file, before, after: before };
    const out = new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp", lastModified: Date.now() });
    return { file: out, before, after: out.size };
  } catch {
    return { file, before, after: before };
  }
}

export const formatBytes = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
