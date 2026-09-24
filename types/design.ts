export interface Paint {
  id: string;
  color: string;
  opacity: number;
  visible: boolean;
}
export interface Stroke extends Paint {
  width: number;
  position: "inside" | "center" | "outside";
}
export interface LayerEffect extends Paint {
  type: "shadow" | "inner" | "blur" | "glow";
  x: number;
  y: number;
  blur: number;
  spread: number;
}
export interface BaseLayer {
  fills?: Paint[];
  strokes?: Stroke[];
  effects?: LayerEffect[];
  keepRatio?: boolean;
  cornerRadius?: number;
  id: string;
  name: string;
  type: "text" | "image" | "shape" | "icon";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  zIndex: number;
  shadowColor?: string;
  shadowEnabled?: boolean;
  shadowOpacity?: number;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  outlineEnabled?: boolean;
  outlineColor?: string;
  outlineWidth?: number;
  outlineDash?: "solid" | "dashed" | "dotted";
  glowEnabled?: boolean;
  glowColor?: string;
  glowOpacity?: number;
  glowBlur?: number;
}
export interface TextLayer extends BaseLayer {
  type: "text";
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
  align: "left" | "center" | "right";
  color: string;
}
export interface ImageLayer extends BaseLayer {
  type: "image";
  src: string;
  flipX: boolean;
  flipY: boolean;
  keepRatio: boolean;
  crop?: { x: number; y: number; width: number; height: number };
}
export interface ShapeLayer extends BaseLayer {
  type: "shape";
  shape: "rectangle" | "rounded" | "circle";
  fill: string;
  stroke: string;
  strokeWidth: number;
  radius: number;
}
export interface IconLayer extends BaseLayer {
  type: "icon";
  icon: "sparkle" | "heart" | "star";
  fill: string;
}
export type DesignLayer = TextLayer | ImageLayer | ShapeLayer | IconLayer;
export type LayerPatch = Partial<BaseLayer> &
  Partial<Omit<TextLayer, "type">> &
  Partial<Omit<ImageLayer, "type">> &
  Partial<Omit<ShapeLayer, "type">> &
  Partial<Omit<IconLayer, "type">>;
export interface DesignDocument {
  id: string;
  name: string;
  canvas: { width: number; height: number; background: string };
  layers: DesignLayer[];
}
