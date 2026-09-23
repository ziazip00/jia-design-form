import { repairPixels } from "./repair.mjs";
self.onmessage = ({ data }) => {
  try {
    const pixels = repairPixels(
      data.pixels,
      data.mask,
      data.width,
      data.height,
      data.solid,
    );
    self.postMessage({ pixels }, [pixels.buffer]);
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};
