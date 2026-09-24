import { useEffect, useMemo, useState } from "react";
import { Shape } from "react-konva";
import type { DesignLayer } from "@/types/design";
import { renderLayerStyle } from "@/lib/renderLayerStyle";
import { useFontStore } from "@/store/fontStore";
export default function StyledLayer({ layer }: { layer: DesignLayer }) {
  const src = layer.type === "image" ? layer.src : undefined;
  const [image, setImage] = useState<HTMLImageElement>();
  const fonts = useFontStore((s) => s.fonts);
  useEffect(() => {
    if (!src) return;
    let active = true;
    const i = new Image();
    i.onload = () => {
      if (active) setImage(i);
    };
    i.src = src;
    return () => {
      active = false;
    };
  }, [src]);
  const result = useMemo(
    () => (src && image?.src !== src ? null : renderLayerStyle(layer, image)),
    [layer, image, src, fonts],
  );
  return (
    <Shape
      listening={false}
      name="styled-layer"
      width={layer.width}
      height={layer.height}
      styleReady={!!result}
      sceneFunc={(ctx) => {
        if (result)
          ctx.drawImage(
            result.canvas,
            -result.padding,
            -result.padding,
            result.canvas.width / result.scale,
            result.canvas.height / result.scale,
          );
      }}
    />
  );
}
