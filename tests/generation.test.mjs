import { test } from "node:test";
import assert from "node:assert/strict";
import { generate, documentSchema, conforms } from "../server/generate.mjs";
const doc = {
  id: "test",
  name: "test",
  canvas: { width: 1080, height: 1350, background: "#ffffff" },
  layers: [],
};
const payload = {
  prompt: "푸른색 이벤트 디자인",
  mode: "new",
  document: doc,
  fonts: ["Arial"],
  assets: [],
};
const request = (body = payload, headers = {}) =>
  new Request("https://studio.example/api/generate", {
    method: "POST",
    headers: {
      origin: "https://studio.example",
      "Content-Type": "application/json",
      "oai-authenticated-user-id": "owner",
      ...headers,
    },
    body: JSON.stringify(body),
  });
const fake = async (result) =>
  Response.json({
    status: "completed",
    output: [
      { content: [{ type: "output_text", text: JSON.stringify(result) }] },
    ],
  });
test("missing key reports setup, unauthenticated and cross-origin requests never call the model", async () => {
  assert.equal((await generate(request(), {})).status, 503);
  assert.equal(
    (
      await generate(request(payload, { "oai-authenticated-user-id": "" }), {
        OPENAI_API_KEY: "test",
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await generate(request(payload, { origin: "https://other.example" }), {
        OPENAI_API_KEY: "test",
      })
    ).status,
    403,
  );
});
test("valid structured result is returned; browser never receives the API key", async () => {
  const response = await generate(
    request(),
    { OPENAI_API_KEY: "test-secret" },
    {
      fetcher: () =>
        fake({ summary: "완료", document: { ...doc, name: "생성 결과" } }),
    },
  );
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.document.name, "생성 결과");
  assert.ok(!JSON.stringify(result).includes("test-secret"));
});
test("invalid model layers do not reach the editor", async () => {
  const response = await generate(
    request(),
    { OPENAI_API_KEY: "test" },
    {
      fetcher: () =>
        fake({
          summary: "완료",
          document: {
            ...doc,
            layers: [{ type: "image", src: "https://untrusted.example/pixel" }],
          },
        }),
    },
  );
  assert.equal(response.status, 502);
});
test("schema rejects unknown fields, invalid colors and excessive canvas sizes", () => {
  const schema = documentSchema([], ["Arial"]);
  assert.ok(conforms(doc, schema));
  assert.ok(!conforms({ ...doc, secret: "x" }, schema));
  assert.ok(
    !conforms({ ...doc, canvas: { ...doc.canvas, width: 99999 } }, schema),
  );
  assert.ok(
    !conforms(
      { ...doc, canvas: { ...doc.canvas, background: "javascript:x" } },
      schema,
    ),
  );
});
test("upstream errors are shown without leaking the upstream response", async () => {
  const response = await generate(
    request(),
    { OPENAI_API_KEY: "test" },
    {
      fetcher: async () =>
        new Response("sensitive upstream info", { status: 429 }),
    },
  );
  assert.equal(response.status, 502);
  assert.ok(!(await response.text()).includes("sensitive"));
});
