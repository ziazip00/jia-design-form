const active = new Set();
const json = (data, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
export async function images(
  request,
  env,
  { local = false, fetcher = fetch } = {},
) {
  const user = request.headers.get("oai-authenticated-user-id");
  if (!local && !user) return json({ error: "로그인 후 이용해 주세요." }, 401);
  if (request.method === "GET")
    return json({ ready: Boolean(env.OPENAI_API_KEY) });
  if (request.method !== "POST")
    return json({ error: "지원하지 않는 요청입니다." }, 405);
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return json({ error: "사이트에서 다시 요청하세요." }, 403);
  if (!env.OPENAI_API_KEY)
    return json({ error: "이미지 생성 연결을 준비 중입니다." }, 503);
  const id = user || "local";
  if (active.has(id))
    return json({ error: "이미 생성 중입니다. 결과를 기다려 주세요." }, 429);
  active.add(id);
  let timer;
  try {
    if (Number(request.headers.get("content-length")) > 6_000_000)
      return json({ error: "사진 용량을 줄여 주세요." }, 413);
    const reader = request.body?.getReader();
    if (!reader) return json({ error: "요청이 비어 있습니다." }, 400);
    const chunks = [];
    let length = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 6_000_000) {
        await reader.cancel();
        return json({ error: "사진 용량을 줄여 주세요." }, 413);
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    let body;
    try {
      body = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return json({ error: "요청 형식이 잘못되었습니다." }, 400);
    }
    if (
      typeof body.prompt !== "string" ||
      !body.prompt.trim() ||
      body.prompt.length > 4000 ||
      !["1024x1024", "1024x1536", "1536x1024"].includes(body.size) ||
      !["low", "medium"].includes(body.quality) ||
      !["new", "edit"].includes(body.mode)
    )
      return json({ error: "프롬프트와 출력 설정을 확인하세요." }, 400);
    const match =
      typeof body.image === "string" &&
      body.image.match(
        /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/,
      );
    if ((body.mode === "edit" && !match) || (body.image && !match))
      return json(
        { error: "수정할 이미지를 첨부하거나 결과를 선택하세요." },
        400,
      );
    const params = {
      model: env.OPENAI_IMAGE_MODEL || "gpt-image-2",
      prompt: body.prompt.trim(),
      size: body.size,
      quality: body.quality,
      n: 1,
      output_format: "png",
    };
    const maskMatch =
      typeof body.mask === "string" &&
      body.mask.match(/^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/);
    if (
      body.mask !== undefined &&
      (!maskMatch || !match || match[1] !== "png" || body.mode !== "edit")
    )
      return json({ error: "선택 영역 마스크와 PNG 원본이 필요합니다." }, 400);
    let payload,
      headers = { Authorization: `Bearer ${env.OPENAI_API_KEY}` };
    if (match) {
      payload = new FormData();
      for (const [key, value] of Object.entries(params))
        payload.set(key, String(value));
      const raw = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
      payload.set(
        "image[]",
        new Blob([raw], { type: `image/${match[1]}` }),
        `reference.${match[1]}`,
      );
      if (maskMatch) {
        const maskBytes = Uint8Array.from(atob(maskMatch[1]), (c) =>
          c.charCodeAt(0),
        );
        const pngSize = (bytes) => {
          if (
            bytes.length < 33 ||
            ![137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)
          )
            return null;
          const view = new DataView(
            bytes.buffer,
            bytes.byteOffset,
            bytes.byteLength,
          );
          return [view.getUint32(16), view.getUint32(20), bytes[25]];
        };
        const a = pngSize(raw),
          b = pngSize(maskBytes);
        if (
          !a ||
          !b ||
          a[0] !== b[0] ||
          a[1] !== b[1] ||
          ![4, 6].includes(b[2]) ||
          a[0] < 1 ||
          a[1] < 1 ||
          a[0] * a[1] > 4_000_000
        )
          return json(
            {
              error:
                "선택 영역 마스크는 원본과 같은 크기의 투명도 포함 PNG여야 합니다.",
            },
            400,
          );
        payload.set(
          "mask",
          new Blob([maskBytes], { type: "image/png" }),
          "selection-mask.png",
        );
      }
    } else {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(params);
    }
    const controller = new AbortController();
    timer = setTimeout(() => controller.abort(), 180000);
    const response = await fetcher(
      `https://api.openai.com/v1/images/${match ? "edits" : "generations"}`,
      { method: "POST", headers, body: payload, signal: controller.signal },
    );
    if (!response.ok) {
      const messages = {
        401: "API 키가 유효하지 않습니다. 키 설정을 확인해 주세요.",
        403: "이미지 모델 사용 권한 또는 OpenAI 조직 인증이 필요합니다.",
        429: "API 잔액 또는 요청 한도에 도달했습니다. 결제·사용량을 확인해 주세요.",
        400: "이미지 요청이 거절되었습니다. 프롬프트나 사진을 바꿔 주세요.",
      };
      return json(
        {
          error:
            messages[response.status] ||
            "이미지 생성에 실패했습니다. 자동 재시도하지 않았습니다.",
        },
        502,
      );
    }
    const result = await response.json(),
      data = result.data?.[0]?.b64_json;
    if (
      typeof data !== "string" ||
      !data ||
      data.length > 35_000_000 ||
      !/^[A-Za-z0-9+/=]+$/.test(data)
    )
      return json(
        { error: "완성 이미지를 받지 못했습니다. 기존 결과는 유지됩니다." },
        502,
      );
    return json({
      id: crypto.randomUUID(),
      src: `data:image/png;base64,${data}`,
      size: body.size,
    });
  } catch (error) {
    return json(
      {
        error:
          error.name === "AbortError"
            ? "생성 시간이 초과되었습니다. 요청이 처리되었을 수 있으니 사용량을 확인하세요."
            : "연결이 끊겼습니다. 자동 재시도하지 않았습니다. 사용량을 확인한 뒤 다시 요청하세요.",
      },
      502,
    );
  } finally {
    clearTimeout(timer);
    active.delete(id);
  }
}
