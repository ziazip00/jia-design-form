import test from "node:test";
import assert from "node:assert/strict";
import { images } from "../server/images.mjs";
const origin = "https://example.test";
const request = (body, headers = {}) =>
  new Request(origin + "/api/images", {
    method: "POST",
    headers: {
      origin,
      "content-type": "application/json",
      "oai-authenticated-user-id": "test",
      ...headers,
    },
    body: JSON.stringify(body),
  });
const input = {
  prompt: "A simple poster",
  mode: "new",
  size: "1024x1024",
  quality: "low",
};
const png = (w, h, alpha = 6) => {
  const bytes = new Uint8Array(33);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, w);
  view.setUint32(20, h);
  bytes[25] = alpha;
  return "data:image/png;base64," + Buffer.from(bytes).toString("base64");
};
test("masked edit sends the selected PNG mask; rejects invalid masks before upstream", async () => {
  let calls = 0;
  const opts = {
    fetcher: async (url, init) => {
      calls++;
      assert.equal(url, "https://api.openai.com/v1/images/edits");
      assert.equal(init.body.get("mask").type, "image/png");
      assert.equal(init.body.get("mask").size, 33);
      return Response.json({ data: [{ b64_json: "aGVsbG8=" }] });
    },
  };
  const body = {
    ...input,
    mode: "edit",
    image: png(1024, 1024),
    mask: png(1024, 1024),
  };
  assert.equal(
    (await images(request(body), { OPENAI_API_KEY: "test" }, opts)).status,
    200,
  );
  for (const mask of [png(512, 512), png(1024, 1024, 2), "bad"])
    assert.equal(
      (
        await images(
          request({ ...body, mask }),
          { OPENAI_API_KEY: "test" },
          opts,
        )
      ).status,
      400,
    );
  assert.equal(
    (
      await images(
        request({ ...body, mode: "new" }),
        { OPENAI_API_KEY: "test" },
        opts,
      )
    ).status,
    400,
  );
  assert.equal(calls, 1);
});
test("image endpoint requires identity, same origin, valid input and configured key before calling upstream", async () => {
  let calls = 0;
  const options = {
    fetcher: async () => {
      calls++;
      throw Error("must not call");
    },
  };
  assert.equal(
    (
      await images(
        new Request(origin + "/api/images"),
        { OPENAI_API_KEY: "test" },
        options,
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await images(
        request(input, { origin: "https://evil.test" }),
        { OPENAI_API_KEY: "test" },
        options,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await images(
        request({ ...input, prompt: "" }),
        { OPENAI_API_KEY: "test" },
        options,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await images(
        request({ ...input, mode: "edit" }),
        { OPENAI_API_KEY: "test" },
        options,
      )
    ).status,
    400,
  );
  assert.equal((await images(request(input), {}, options)).status, 503);
  assert.equal(calls, 0);
});
test("generation makes exactly one bounded request and returns an image without exposing the secret", async () => {
  let calls = 0;
  const response = await images(
    request(input),
    { OPENAI_API_KEY: "test-secret" },
    {
      fetcher: async (url, init) => {
        calls++;
        assert.equal(url, "https://api.openai.com/v1/images/generations");
        const body = JSON.parse(init.body);
        assert.equal(body.n, 1);
        assert.equal(body.quality, "low");
        assert.equal(init.headers.Authorization, "Bearer test-secret");
        return Response.json({ data: [{ b64_json: "aGVsbG8=" }] });
      },
    },
  );
  const text = await response.text();
  assert.equal(calls, 1);
  assert.match(text, /data:image\/png;base64/);
  assert.ok(!text.includes("test-secret"));
});
test("image edit sends binary multipart and service errors never retry", async () => {
  let calls = 0;
  const response = await images(
    request({
      ...input,
      mode: "edit",
      image: "data:image/png;base64,aGVsbG8=",
    }),
    { OPENAI_API_KEY: "test" },
    {
      fetcher: async (url, init) => {
        calls++;
        assert.equal(url, "https://api.openai.com/v1/images/edits");
        assert.ok(init.body instanceof FormData);
        assert.equal(await init.body.get("image[]").text(), "hello");
        return Response.json(
          { error: "private provider details" },
          { status: 429 },
        );
      },
    },
  );
  assert.equal(calls, 1);
  assert.equal(response.status, 502);
  const body = await response.json();
  assert.match(body.error, /잔액/);
  assert.ok(!body.error.includes("private"));
});
