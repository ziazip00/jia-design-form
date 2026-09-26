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
  type: "shadow" | "inner" | "blur" | "glow" | "stroke" | "gradientOverlay" | "patternOverlay" | "satin" | "bevelEmboss";
  x: number;
  y: number;
  blur: number;
  spread: number;
  angle?: number;
  distance?: number;
  size?: number;
  opacity: number;
  gradientType?: "linear" | "radial";
  gradientStops?: { color: string; position: number }[];
  pattern?: string;
  bevelStyle?: "outer" | "inner";
  bevelDepth?: number;
  bevelDirection?: number;
  satinOpacity?: number;
  satinBlur?: number;
  satinEdge?: number;
}
export interface PathPoint {
  x: number;
  y: number;
  handleIn?: { x: number; y: number };
  handleOut?: { x: number; y: number };
}
export interface PathData {
  closed: boolean;
  points: PathPoint[];
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
  artboardId: string;
  parentId: string | null;
  groupId: string | null;
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
  textSizing?: "auto" | "fixed";
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
  paletteMap?: { source: string[]; target: string[] };
}
export interface ShapeLayer extends BaseLayer {
  type: "shape";
  shape: "rectangle" | "rounded" | "circle" | "path";
  fill: string;
  stroke: string;
  strokeWidth: number;
  radius: number;
  path?: PathData;
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
export interface Artboard {
  id: string;
  name: string;
  width: number;
  height: number;
  background: string;
  x: number;
  y: number;
  visible: boolean;
  locked: boolean;
}
export interface GroupData {
  id: string;
  name: string;
  artboardId: string;
  layerIds: string[];
  visible: boolean;
  locked: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
}
export type AdjustmentType =
  | "brightness"
  | "levels"
  | "curves"
  | "exposure"
  | "hue"
  | "colorBalance"
  | "grayscale"
  | "photoFilter"
  | "channelMixer"
  | "selectiveColor"
  | "gradientMap"
  | "invert"
  | "threshold"
  | "posterize";
export interface AdjustmentLayerData {
  id: string;
  name: string;
  type: "adjustment";
  artboardId: string;
  adjustmentType: AdjustmentType;
  values: Record<string, number | string | boolean>;
  visible: boolean;
  locked: boolean;
}
export interface FillLayerData {
  id: string;
  name: string;
  type: "fill";
  artboardId: string;
  fillType: "solid" | "gradient" | "pattern";
  color?: string;
  gradient?: {
    type: "linear" | "radial";
    angle: number;
    stops: { color: string; position: number }[];
  };
  pattern?: string;
  visible: boolean;
  locked: boolean;
}
export type ProjectLayer = DesignLayer | AdjustmentLayerData | FillLayerData;
export interface ProjectDocument {
  id: string;
  name: string;
  artboards: Artboard[];
  layers: ProjectLayer[];
  groups: GroupData[];
  selectedArtboardId: string;
  selectedLayerIds: string[];
  zoom: number;
  pan: { x: number; y: number };
}
export type DesignDocument = ProjectDocument;
export type DesignLayerPatch = Partial<BaseLayer> &
  Partial<Omit<TextLayer, "type" | "artboardId" | "parentId" | "groupId">> &
  Partial<Omit<ImageLayer, "type" | "artboardId" | "parentId" | "groupId">> &
  Partial<Omit<ShapeLayer, "type" | "artboardId" | "parentId" | "groupId">> &
  Partial<Omit<IconLayer, "type" | "artboardId" | "parentId" | "groupId">>;
