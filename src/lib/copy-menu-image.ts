export function copyMenuImage(originalUrl: string): Promise<void> {
  const clipboard = globalThis.navigator?.clipboard;
  if (!clipboard?.write || typeof globalThis.ClipboardItem === "undefined") {
    return Promise.reject(new Error("clipboard-unavailable"));
  }
  const png = loadPng(originalUrl);
  try {
    const item = new globalThis.ClipboardItem({ "image/png": png });
    return Promise.resolve(clipboard.write([item]));
  } catch (error) {
    void png.catch(() => undefined);
    return Promise.reject(error instanceof Error ? error : new Error("clipboard-unavailable"));
  }
}

async function loadPng(originalUrl: string): Promise<Blob> {
  const target = new URL("/api/menu-image", window.location.origin);
  target.searchParams.set("url", originalUrl);
  const response = await fetch(target, { cache: "no-store" });
  if (!response.ok) throw new Error(`menu-image-${response.status}`);
  return toPngBlob(await response.blob());
}

async function toPngBlob(blob: Blob): Promise<Blob> {
  if (blob.type === "image/png") return blob;
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas-unavailable");
    context.drawImage(bitmap, 0, 0);
    const png = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/png");
    });
    if (!png) throw new Error("png-unavailable");
    return png.type === "image/png" ? png : new Blob([await png.arrayBuffer()], { type: "image/png" });
  } finally {
    bitmap.close();
  }
}
