import * as ort from "./ort/ort.wasm.min.mjs";
ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;
ort.env.wasm.wasmPaths = new URL("./ort/", import.meta.url).href;
self.onmessage = async ({ data: rgba }) => {
  let session;
  try {
    self.postMessage({ status: "피사체 분석 도구를 준비하고 있습니다…" });
    session = await ort.InferenceSession.create(
      new URL("./models/u2netp.onnx", import.meta.url).href,
      { executionProviders: ["wasm"] },
    );
    const n = 320 * 320,
      input = new Float32Array(n * 3);
    let max = 1;
    for (let i = 0; i < n; i++)
      for (let c = 0; c < 3; c++) max = Math.max(max, rgba[i * 4 + c]);
    const means = [0.485, 0.456, 0.406],
      deviations = [0.229, 0.224, 0.225];
    for (let i = 0; i < n; i++)
      for (let c = 0; c < 3; c++)
        input[c * n + i] = (rgba[i * 4 + c] / max - means[c]) / deviations[c];
    self.postMessage({ status: "주요 피사체의 경계를 찾고 있습니다…" });
    const result = await session.run({
      [session.inputNames[0]]: new ort.Tensor(
        "float32",
        input,
        [1, 3, 320, 320],
      ),
    });
    const values = result[session.outputNames[0]].data;
    let min = Infinity,
      high = -Infinity;
    for (let i = 0; i < n; i++) {
      min = Math.min(min, values[i]);
      high = Math.max(high, values[i]);
    }
    if (high - min < 0.00001)
      throw new Error(
        "피사체 경계를 찾지 못했습니다. 배경과 피사체가 뚜렷한 이미지를 사용해 주세요.",
      );
    const mask = new Uint8ClampedArray(n);
    for (let i = 0; i < n; i++)
      mask[i] = Math.round((255 * (values[i] - min)) / (high - min));
    self.postMessage({ mask }, [mask.buffer]);
  } catch {
    self.postMessage({
      error:
        "피사체 분석에 실패했습니다. 다시 시도하거나 다른 이미지를 사용해 주세요.",
    });
  } finally {
    if (session) await session.release();
  }
};
