import type { ProjectDocument, ProjectLayer, Artboard, GroupData, DesignLayer, TextLayer, ImageLayer, ShapeLayer, IconLayer, AdjustmentLayerData, FillLayerData } from "../types/design";

export const blankDocument = (): ProjectDocument => {
  const artboards: Artboard[] = [
    {
      id: crypto.randomUUID(),
      name: "아트보드 1",
      width: 1080,
      height: 1350,
      background: "#ffffff",
      x: 0,
      y: 0,
      visible: true,
      locked: false,
    },
  ];
  return {
    id: crypto.randomUUID(),
    name: "제목 없는 디자인",
    artboards,
    layers: [],
    groups: [],
    selectedArtboardId: artboards[0].id,
    selectedLayerIds: [],
    zoom: 1,
    pan: { x: 0, y: 0 },
  };
};
export function makeLayer(
  type: DesignLayer["type"],
  extra: Record<string, unknown> = {},
  artboardId: string = "",
): DesignLayer {
  let name: string;
  if (type === "text") name = "텍스트";
  else if (type === "image") name = "이미지";
  else if (type === "icon") name = "아이콘";
  else if (type === "shape") {
    switch (extra.shape) {
      case "rounded":
        name = "둥근 사각형";
        break;
      case "circle":
        name = "원";
        break;
      case "path":
        name = "펜 경로";
        break;
      default:
        name = "사각형";
    }
  } else name = "레이어";

  const base = {
    id: crypto.randomUUID(),
    name,
    type,
    x: 100,
    y: 100,
    width: 320,
    height: 100,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    zIndex: 0,
    artboardId,
    parentId: null,
    groupId: null,
  };
  const defaults = {
    text: {
      textSizing: "auto" as const,
      width: 600,
      height: 150,
      text: "텍스트를 입력하세요",
      fontFamily: "Arial",
      fontSize: 48,
      fontWeight: 500,
      lineHeight: 1.25,
      letterSpacing: 0,
      align: "left" as const,
      color: "#172f47",
    },
    shape: {
      height: 240,
      shape: "rectangle" as const,
      fill: "#d9eafb",
      stroke: "#8eb5d8",
      strokeWidth: 0,
      radius: 0,
      path: undefined,
    },
    image: {
      height: 320,
      src: "",
      flipX: false,
      flipY: false,
      keepRatio: true,
    },
    icon: { width: 90, height: 90, icon: "sparkle" as const, fill: "#4786bb" },
  };
  return { ...base, ...defaults[type], ...extra } as DesignLayer;
}

export function uniqueName(
  baseName: string,
  existingNames: readonly string[],
): string {
  if (!existingNames.includes(baseName)) return baseName;
  const nums = existingNames
    .filter((n) => n.startsWith(baseName))
    .map((n) => {
      const s = n.slice(baseName.length).trimStart();
      const n2 = parseInt(s, 10);
      return isNaN(n2) || n2 === 0 ? null : n2;
    })
    .filter((n) => n !== null) as number[];
  const maxNum = nums.length ? Math.max(...nums) : 0;
  return `${baseName} ${maxNum + 1}`;
}

export function mockDocument(): ProjectDocument {
  const doc = blankDocument();
  const artboardId = doc.artboards[0].id;
  doc.name = "9월 스킨케어 이벤트";
  doc.selectedArtboardId = artboardId;
  doc.layers = [
    makeLayer("shape", {
      name: "배경",
      x: 0,
      y: 0,
      width: 1080,
      height: 1350,
      fill: "#eaf3fa",
    }, artboardId),
    makeLayer("shape", {
      name: "장식 원",
      shape: "circle",
      x: 580,
      y: 50,
      width: 600,
      height: 600,
      fill: "#d5e8f7",
    }, artboardId),
    makeLayer("text", {
      name: "브랜드",
      text: "JIA SKIN CLINIC",
      x: 80,
      y: 80,
      width: 700,
      height: 55,
      fontSize: 26,
      letterSpacing: 6,
    }, artboardId),
    makeLayer("text", {
      name: "메인 제목",
      text: "나를 위한\n빛나는 9월",
      x: 80,
      y: 205,
      width: 820,
      height: 230,
      fontSize: 88,
      fontWeight: 700,
      lineHeight: 1.18,
    }, artboardId),
    makeLayer("text", {
      name: "서브 제목",
      text: "피부에 전하는 새로운 계절의 시작",
      x: 85,
      y: 475,
      width: 850,
      height: 70,
      fontSize: 30,
      color: "#58738b",
    }, artboardId),
    makeLayer("shape", {
      name: "이벤트 카드",
      x: 65,
      y: 625,
      width: 615,
      height: 485,
      shape: "rounded",
      radius: 28,
      fill: "#ffffff",
    }, artboardId),
    makeLayer("text", {
      name: "카드 제목",
      text: "SEPTEMBER SPECIAL",
      x: 100,
      y: 673,
      width: 540,
      height: 55,
      fontSize: 25,
      letterSpacing: 3,
      color: "#4786bb",
    }, artboardId),
    ...[
      "수분 케어    59,000원",
      "진정 케어    79,000원",
      "광채 케어    99,000원",
    ].map((text, i) =>
      makeLayer("text", {
        name: `가격 0${i + 1}`,
        text,
        x: 105,
        y: 790 + i * 95,
        width: 545,
        height: 65,
        fontSize: 34,
        fontWeight: 600,
      }, artboardId),
    ),
    makeLayer("image", {
      name: "이미지 플레이스홀더",
      x: 735,
      y: 665,
      width: 260,
      height: 420,
      src:
        "data:image/svg+xml;charset=utf-8," +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="260" height="420"><rect width="260" height="420" rx="130" fill="#c8dfef"/><circle cx="130" cy="170" r="45" fill="#a4c5dd"/><path d="M45 320a85 85 0 0 1 170 0" fill="#a4c5dd"/></svg>',
        ),
    }, artboardId),
    makeLayer("icon", {
      name: "반짝임 아이콘",
      x: 870,
      y: 535,
      width: 85,
      height: 85,
    }, artboardId),
    makeLayer("text", {
      name: "안내",
      text: "09.01 – 09.30  ·  상담 후 프로그램을 선택하세요",
      x: 80,
      y: 1220,
      width: 950,
      height: 60,
      fontSize: 24,
      color: "#58738b",
    }, artboardId),
  ].map((l, zIndex) => ({ ...l, zIndex }));
  return doc;
}
