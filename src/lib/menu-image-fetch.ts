import { isMenuImageUrl, SOURCE } from "./config";

export const MENU_IMAGE_MAX_BYTES = 12 * 1024 * 1024;
const MAX_REQUESTS = 3;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

type MenuImageBytes = {
  bytes: ArrayBuffer;
  contentType: string;
};

class MenuImageFetchError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "MenuImageFetchError";
    this.status = status;
  }
}

export function menuImageResponse(
  request: Request,
  fetchImpl: typeof fetch = fetch,
  options: { maxBytes?: number } = {},
): Promise<Response> {
  const maxBytes = options.maxBytes ?? MENU_IMAGE_MAX_BYTES;
  const target = new URL(request.url).searchParams.get("url") ?? "";
  if (!isMenuImageUrl(target)) return Promise.resolve(errorResponse(400, "허용되지 않은 이미지 주소입니다."));
  return loadMenuImage(target, fetchImpl, maxBytes).then(
    (image) => new Response(image.bytes, {
      status: 200,
      headers: {
        "Content-Type": image.contentType,
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
        "Content-Length": String(image.bytes.byteLength),
      },
    }),
    (error: unknown) => {
      if (error instanceof MenuImageFetchError) return errorResponse(error.status, error.message);
      return errorResponse(502, "이미지를 불러오지 못했어요.");
    },
  );
}

function errorResponse(status: number, message: string): Response {
  return new Response(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function loadMenuImage(start: string, fetchImpl: typeof fetch, maxBytes: number): Promise<MenuImageBytes> {
  let current = start;
  for (let attempt = 0; attempt < MAX_REQUESTS; attempt += 1) {
    const response = await requestImage(current, fetchImpl);
    if (response.status >= 300 && response.status < 400) {
      const next = nextMenuImageUrl(current, response.headers.get("location"));
      await response.body?.cancel();
      if (!next) throw new MenuImageFetchError(502, "이미지를 불러오지 못했어요.");
      current = next;
      continue;
    }
    if (response.status !== 200) {
      await response.body?.cancel();
      throw new MenuImageFetchError(502, "이미지를 불러오지 못했어요.");
    }
    const contentType = mediaType(response.headers.get("content-type"));
    if (!IMAGE_TYPES.has(contentType)) {
      await response.body?.cancel();
      throw new MenuImageFetchError(415, "이미지 형식을 확인할 수 없어요.");
    }
    const bytes = await readLimited(response, maxBytes);
    if (bytes.byteLength === 0) throw new MenuImageFetchError(502, "이미지를 불러오지 못했어요.");
    return { bytes, contentType };
  }
  throw new MenuImageFetchError(502, "이미지를 불러오지 못했어요.");
}

async function requestImage(url: string, fetchImpl: typeof fetch): Promise<Response> {
  try {
    return await fetchImpl(url, {
      redirect: "manual",
      cache: "no-store",
      headers: {
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif,image/*;q=0.8",
        Referer: SOURCE.url,
      },
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new MenuImageFetchError(502, "이미지를 불러오지 못했어요.");
  }
}

function nextMenuImageUrl(current: string, location: string | null): string | null {
  const trimmed = location?.trim();
  if (!trimmed) return null;
  try {
    const next = new URL(trimmed, current).href;
    return isMenuImageUrl(next) ? next : null;
  } catch {
    return null;
  }
}

function mediaType(header: string | null): string {
  return header?.split(";")[0]?.trim().toLowerCase() ?? "";
}

async function readLimited(response: Response, maxBytes: number): Promise<ArrayBuffer> {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    await response.body?.cancel();
    throw new MenuImageFetchError(413, "이미지가 너무 커요.");
  }
  if (!response.body) throw new MenuImageFetchError(502, "이미지를 불러오지 못했어요.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new MenuImageFetchError(413, "이미지가 너무 커요.");
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof MenuImageFetchError) throw error;
    throw new MenuImageFetchError(502, "이미지를 불러오지 못했어요.");
  }
  const body = new ArrayBuffer(total);
  const bytes = new Uint8Array(body);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}
