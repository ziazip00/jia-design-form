import { test } from "node:test";
import assert from "node:assert/strict";
import { buildChatPrompt } from "../lib/chatgptHandoff";
import { blankDocument, makeLayer } from "../lib/designParser";
test("ChatGPT handoff includes the request, dimensions and photo names but no image bytes", () => {
  const doc = blankDocument();
  doc.layers = [
    makeLayer("text", { name: "제목", text: "가을 이벤트" }),
    makeLayer("image", { src: "data:image/png;base64,PRIVATE_IMAGE_BYTES" }),
  ];
  const prompt = buildChatPrompt("  제목을 크게 해줘  ", doc, ["참고사진.jpg"]);
  assert.ok(prompt.includes("요청: 제목을 크게 해줘"));
  assert.ok(prompt.includes("1080 × 1350px"));
  assert.ok(prompt.includes("제목: 가을 이벤트"));
  assert.ok(prompt.includes("참고사진.jpg"));
  assert.ok(!prompt.includes("PRIVATE_IMAGE_BYTES"));
  assert.ok(prompt.includes("별도로 첨부"));
});
