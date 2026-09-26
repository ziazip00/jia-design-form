import { useEffect, useMemo, useState } from "react";
import { Text, Rect, Ellipse, Image as KImage, Path, Shape } from "react-konva";
import Konva from "konva";
import type { DesignLayer, ImageLayer, TextLayer, ShapeLayer, PathData } from "@/types/design";
import { useFontStore } from "@/store/fontStore";
import { advancedStyle } from "@/lib/layerStyles";
import StyledLayer from "./StyledLayer";
function shadow(l: DesignLayer) {
  return {
    shadowColor: l.shadowColor || "#172f47",
    shadowOpacity: l.shadowOpacity ?? 0,
    shadowBlur: l.shadowBlur ?? 12,
    shadowOffsetX: l.shadowOffsetX ?? 0,
    shadowOffsetY: l.shadowOffsetY ?? 8,
    shadowEnabled: l.shadowEnabled ?? (l.shadowOpacity ?? 0) > 0,
  };
}
function outline(l: DesignLayer) {
  const width = l.outlineWidth ?? 2;
  return {
    stroke: l.outlineColor || "#172f47",
    strokeWidth: width,
    strokeEnabled: l.outlineEnabled ?? false,
    dash:
      l.outlineDash === "dashed"
        ? [width * 4, width * 2]
        : l.outlineDash === "dotted"
          ? [width, width * 2]
          : [],
    lineJoin: "round" as const,
    fillAfterStrokeEnabled: true,
  };
}
function textConfig(l: TextLayer) {
  return {
    text: l.text,
    wrap: l.textSizing === "fixed" ? "word" : "none",
    width: l.width,
    height: l.height,
    fontFamily: l.fontFamily,
    fontSize: l.fontSize,
    fontStyle: String(l.fontWeight),
    lineHeight: l.lineHeight,
    letterSpacing: l.letterSpacing,
    align: l.align,
    fill: l.color,
    ...outline(l),
  };
}
function imageConfig(l: ImageLayer, image?: HTMLImageElement) {
  return {
    image,
    width: l.width,
    height: l.height,
    x: l.flipX ? l.width : 0,
    y: l.flipY ? l.height : 0,
    scaleX: l.flipX ? -1 : 1,
    scaleY: l.flipY ? -1 : 1,
    ...outline(l),
  };
}
function OuterGlow({
  layer: l,
  image,
}: {
  layer: TextLayer | ImageLayer;
  image?: HTMLImageElement;
}) {
  const fonts = useFontStore((s) => s.fonts);
  const glow = useMemo(() => {
    if (
      !l.glowEnabled ||
      (l.glowOpacity ?? 0.6) <= 0 ||
      (l.type === "image" && !image)
    )
      return null;
    const node =
      l.type === "text"
        ? new Konva.Text(textConfig(l))
        : new Konva.Image(imageConfig(l, image));
    const rect = node.getClientRect({ skipShadow: true });
    if (rect.width <= 0 || rect.height <= 0) {
      node.destroy();
      return null;
    }
    const blur = l.glowBlur ?? 20,
      padding = Math.ceil(blur * 3 + 2);
    // Keep the effect bitmap bounded. The document text remains an editable Text node.
    const scale = Math.min(
      1,
      2048 / (Math.max(rect.width, rect.height) + 2 * padding),
    );
    const mask = node.toCanvas({ ...rect, pixelRatio: scale });
    node.destroy();
    const tinted = document.createElement("canvas");
    tinted.width = mask.width;
    tinted.height = mask.height;
    const tc = tinted.getContext("2d")!;
    tc.drawImage(mask, 0, 0);
    tc.globalCompositeOperation = "source-in";
    tc.fillStyle = l.glowColor || "#64b5ff";
    tc.fillRect(0, 0, tinted.width, tinted.height);
    const canvas = document.createElement("canvas"),
      pad = Math.ceil(padding * scale);
    canvas.width = mask.width + pad * 2;
    canvas.height = mask.height + pad * 2;
    const ctx = canvas.getContext("2d")!;
    ctx.filter = `blur(${Math.max(0.5, (blur * scale) / 2)}px)`;
    ctx.globalAlpha = l.glowOpacity ?? 0.6;
    ctx.drawImage(tinted, pad, pad);
    ctx.filter = "none";
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "destination-out";
    ctx.drawImage(mask, pad, pad);
    return {
      canvas,
      x: rect.x - pad / scale,
      y: rect.y - pad / scale,
      width: canvas.width / scale,
      height: canvas.height / scale,
    };
  }, [l, image, fonts]);
  if (!glow) return null;
  // Logical bounds exclude the glow so transform handles stay on the object itself.
  return (
    <Shape
      name="outer-glow"
      listening={false}
      width={l.width}
      height={l.height}
      sceneFunc={(ctx) => {
        ctx.drawImage(glow.canvas, glow.x, glow.y, glow.width, glow.height);
      }}
    />
  );
}
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
    <>
      <OuterGlow layer={layer} image={image} />
      <KImage {...shadow(layer)} {...imageConfig(layer, image)} />
    </>
  );
}
export function LayerNode({ layer: l }: { layer: DesignLayer }) {
  if (advancedStyle(l)) return <StyledLayer layer={l} />;
  switch (l.type) {
    case "text":
      return (
        <>
          <OuterGlow layer={l} />
          <Text {...shadow(l)} {...textConfig(l)} />
        </>
      );
    case "image":
      return <ImageNode layer={l} />;
    case "shape":
      if (l.shape === "path" && (l as ShapeLayer).path) {
        const pathData = (l as ShapeLayer).path as PathData;
        if (pathData.points.length >= 2) {
          const parts: string[] = [];
          pathData.points.forEach((p, i) => {
            if (i === 0) {
              parts.push(`M${p.x} ${p.y}`);
            } else {
              const prev = pathData.points[i - 1];
              if (prev.handleOut || p.handleIn) {
                const hOut = prev.handleOut || { x: p.x, y: prev.y };
                const hIn = p.handleIn || { x: p.x, y: prev.y };
                parts.push(`C${hOut.x} ${hOut.y} ${hIn.x} ${hIn.y} ${p.x} ${p.y}`);
              } else {
                parts.push(`L${p.x} ${p.y}`);
              }
            }
          });
          if (pathData.closed && pathData.points.length >= 3) {
            const first = pathData.points[0];
            const last = pathData.points[pathData.points.length - 1];
            if (last.handleOut || first.handleIn) {
              const hOut = last.handleOut || { x: first.x, y: last.y };
              const hIn = first.handleIn || { x: first.x, y: last.y };
              parts.push(`C${hOut.x} ${hOut.y} ${hIn.x} ${hIn.y} ${first.x} ${first.y}`);
            } else {
              parts.push(`L${first.x} ${first.y}`);
            }
            parts.push("Z");
          }
          return (
            <Path
              {...shadow(l)}
              data={parts.join(" ")}
              fill={l.fill}
              stroke={l.stroke}
              strokeWidth={l.strokeWidth}
              listening
            />
          );
        }
      }
      return l.shape === "circle" ? (
        <Ellipse
          {...shadow(l)}
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
          {...shadow(l)}
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
          {...shadow(l)}
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
