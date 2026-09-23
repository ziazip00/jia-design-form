import { useEffect, useState } from "react";
import { Text, Rect, Ellipse, Image as KImage, Path } from "react-konva";
import type { DesignLayer, ImageLayer } from "@/types/design";
export function ImageNode({ layer }: { layer: ImageLayer }) {
  const [image, setImage] = useState<HTMLImageElement>();
  useEffect(() => {
    let active = true;
    const i = new window.Image();
    i.onload = () => {
      if (active) setImage(i);
    };
    i.src = layer.src;
    return () => {
      active = false;
    };
  }, [layer.src]);
  return (
    <KImage
      image={image}
      width={layer.width}
      height={layer.height}
      x={layer.flipX ? layer.width : 0}
      y={layer.flipY ? layer.height : 0}
      scaleX={layer.flipX ? -1 : 1}
      scaleY={layer.flipY ? -1 : 1}
    />
  );
}
export function LayerNode({ layer: l }: { layer: DesignLayer }) {
  switch (l.type) {
    case "text":
      return (
        <Text
          text={l.text}
          width={l.width}
          height={l.height}
          fontFamily={l.fontFamily}
          fontSize={l.fontSize}
          fontStyle={String(l.fontWeight)}
          lineHeight={l.lineHeight}
          letterSpacing={l.letterSpacing}
          align={l.align}
          fill={l.color}
        />
      );
    case "image":
      return <ImageNode layer={l} />;
    case "shape":
      return l.shape === "circle" ? (
        <Ellipse
          x={l.width / 2}
          y={l.height / 2}
          radiusX={l.width / 2}
          radiusY={l.height / 2}
          fill={l.fill}
          stroke={l.stroke}
          strokeWidth={l.strokeWidth}
        />
      ) : (
        <Rect
          width={l.width}
          height={l.height}
          fill={l.fill}
          stroke={l.stroke}
          strokeWidth={l.strokeWidth}
          cornerRadius={l.radius}
        />
      );
    case "icon":
      return (
        <Path
          data={
            l.icon === "heart"
              ? "M50 90 L12 52 C-18 14 30 -5 50 24 C70 -5 118 14 88 52 Z"
              : l.icon === "star"
                ? "M50 0 L62 35 L100 38 L70 61 L80 100 L50 77 L20 100 L30 61 L0 38 L38 35 Z"
                : "M50 0 Q55 45 100 50 Q55 55 50 100 Q45 55 0 50 Q45 45 50 0 Z"
          }
          fill={l.fill}
          scaleX={l.width / 100}
          scaleY={l.height / 100}
        />
      );
  }
}
