import assert from "node:assert/strict";
import test from "node:test";
import { MENU_IMAGE_MAX_BYTES, menuImageResponse } from "./menu-image-fetch";

const allowed = "https://cafeptthumb-phinf.pstatic.net/menu.jpg";

function requestFor(url?: string): Request {
  const target = new URL("https://panbab.local/api/menu-image");
  if (url !== undefined) target.searchParams.set("url", url);
  return new Request(target);
}

function imageResponse(body: BodyInit | null, init: { status?: number; type?: string; location?: string; length?: string } = {}): Response {
  const headers = new Headers();
  if (init.type) headers.set("content-type", init.type);
  if (init.location) headers.set("location", init.location);
  if (init.length) headers.set("content-length", init.length);
  return new Response(body, { status: init.status ?? 200, headers });
}

test("rejects addresses that are not public menu images", async () => {
  let called = false;
  const fetchImpl: typeof fetch = async () => {
    called = true;
    return imageResponse(null, { status: 500 });
  };
  const rejected = [
    "",
    "not a url",
    "http://cafeptthumb-phinf.pstatic.net/menu.jpg",
    "https://evil.example/menu.jpg",
    "https://user:pass@cafeptthumb-phinf.pstatic.net/menu.jpg",
    "https://cafeptthumb-phinf.pstatic.net:8443/menu.jpg",
    "https://cafeptthumb-phinf.pstatic.net.evil.example/menu.jpg",
    "https://127.0.0.1/menu.jpg",
  ];
  for (const url of rejected) {
    const response = await menuImageResponse(requestFor(url), fetchImpl);
    assert.equal(response.status, 400, url);
    assert.equal(await response.text(), "허용되지 않은 이미지 주소입니다.");
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  const missing = await menuImageResponse(requestFor(), fetchImpl);
  assert.equal(missing.status, 400);
  assert.equal(called, false);
});

test("returns the image bytes without upstream headers", async () => {
  const bytes = Uint8Array.from([1, 2, 3, 4]);
  let redirectMode = "";
  const response = await menuImageResponse(requestFor(allowed), async (_input, init) => {
    redirectMode = init?.redirect ?? "";
    return imageResponse(bytes, {
      type: "image/jpeg; charset=binary",
    });
  });
  assert.equal(redirectMode, "manual");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/jpeg");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("set-cookie"), null);
  assert.match(response.headers.get("cache-control") ?? "", /^private/);
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes);
});

test("follows a redirect only when the next address is also a menu image", async () => {
  const calls: string[] = [];
  const bytes = Uint8Array.from([9]);
  const response = await menuImageResponse(requestFor(allowed), async (input) => {
    const url = String(input);
    calls.push(url);
    if (calls.length === 1) return imageResponse(null, { status: 302, location: "/dated/menu.png" });
    return imageResponse(bytes, { type: "image/png" });
  });
  assert.equal(response.status, 200);
  assert.deepEqual(calls, [allowed, "https://cafeptthumb-phinf.pstatic.net/dated/menu.png"]);
  assert.equal(response.headers.get("content-type"), "image/png");
});

test("does not follow an insecure or off-host redirect", async () => {
  for (const location of [
    "https://127.0.0.1/secret",
    "http://cafeptthumb-phinf.pstatic.net/menu.jpg",
  ]) {
    const calls: string[] = [];
    const response = await menuImageResponse(requestFor(allowed), async (input) => {
      calls.push(String(input));
      return imageResponse(null, { status: 307, location });
    });
    assert.equal(response.status, 502, location);
    assert.equal(await response.text(), "이미지를 불러오지 못했어요.");
    assert.deepEqual(calls, [allowed]);
  }
});

test("stops after three requests when redirects do not end", async () => {
  let calls = 0;
  const response = await menuImageResponse(requestFor(allowed), async () => {
    calls += 1;
    return imageResponse(null, { status: 302, location: `${allowed}?hop=${calls}` });
  });
  assert.equal(response.status, 502);
  assert.equal(calls, 3);
});

test("rejects responses that are not a supported image", async () => {
  const html = await menuImageResponse(requestFor(allowed), async () => imageResponse("<html></html>", { type: "text/html" }));
  assert.equal(html.status, 415);
  assert.equal(await html.text(), "이미지 형식을 확인할 수 없어요.");
  const svg = await menuImageResponse(requestFor(allowed), async () => imageResponse("<svg></svg>", { type: "image/svg+xml" }));
  assert.equal(svg.status, 415);
  const empty = await menuImageResponse(requestFor(allowed), async () => imageResponse(new Uint8Array(), { type: "image/png" }));
  assert.equal(empty.status, 502);
});

test("rejects an image larger than the limit before or while reading it", async () => {
  const declared = await menuImageResponse(requestFor(allowed), async () => imageResponse(new Uint8Array([1]), {
    type: "image/png",
    length: String(MENU_IMAGE_MAX_BYTES + 1),
  }));
  assert.equal(declared.status, 413);
  assert.equal(await declared.text(), "이미지가 너무 커요.");

  let read = false;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      read = true;
      controller.enqueue(new Uint8Array(3));
      controller.enqueue(new Uint8Array(3));
      controller.close();
    },
  });
  const streamed = await menuImageResponse(requestFor(allowed), async () => new Response(stream, {
    headers: { "content-type": "image/webp" },
  }), { maxBytes: 4 });
  assert.equal(streamed.status, 413);
  assert.equal(read, true);
});

test("hides upstream failures", async () => {
  const missing = await menuImageResponse(requestFor(allowed), async () => imageResponse("nope", { status: 404, type: "text/plain" }));
  assert.equal(missing.status, 502);
  const failed = await menuImageResponse(requestFor(allowed), async () => {
    throw new Error("connect ECONNREFUSED 10.0.0.8:443");
  });
  assert.equal(failed.status, 502);
  assert.equal(await failed.text(), "이미지를 불러오지 못했어요.");
  assert.equal(failed.headers.get("x-content-type-options"), "nosniff");
});
