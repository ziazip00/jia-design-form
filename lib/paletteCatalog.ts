import seeds from "../data/paletteSeeds.json";
import {
  fromHsl,
  hex,
  hsl,
  rgb,
  luminance,
  distance,
  type Palette,
} from "./paletteColors";
export interface CatalogPalette extends Palette {
  tags: string[];
  order: number;
  custom?: boolean;
}
export const filterGroups: Record<string, string[]> = {
  색상: [
    "Blue",
    "Teal",
    "Mint",
    "Green",
    "Sage",
    "Yellow",
    "Beige",
    "Brown",
    "Orange",
    "Peach",
    "Red",
    "Pink",
    "Purple",
    "Navy",
    "Black",
    "Grey",
    "White",
  ],
  분위기: [
    "Pastel",
    "Vintage",
    "Retro",
    "Neon",
    "Gold",
    "Light",
    "Dark",
    "Warm",
    "Cold",
  ],
  계절: ["Summer", "Fall", "Winter", "Spring"],
  테마: [
    "Nature",
    "Earth",
    "Night",
    "Space",
    "Gradient",
    "Sunset",
    "Sky",
    "Sea",
    "Medical",
    "Christmas",
  ],
};
// Our original seed collection, with deterministic small hue/saturation/lightness variations.
// Stable IDs allow additional JSON seed records without invalidating saved palettes.
const generated: CatalogPalette[] = seeds.flatMap((seed, index) =>
  Array.from({ length: 24 }, (_, variant) => ({
    id: `jia-${seed.id}-${variant}`,
    name: `${seed.name}${variant ? ` ${String(variant + 1).padStart(2, "0")}` : ""}`,
    colors:
      variant === 0
        ? seed.colors
        : seed.colors.map((c) => {
            const [h, s, l] = hsl(rgb(c));
            return hex(
              fromHsl([
                h + ((variant % 4) - 1.5) * 3,
                s * (0.88 + (Math.floor(variant / 4) % 3) * 0.12),
                Math.max(
                  0.04,
                  Math.min(0.99, l + (Math.floor(variant / 12) - 0.5) * 0.035),
                ),
              ]),
            );
          }),
    tags: seed.tags,
    order: index * 24 + variant,
  })),
);
export const paletteCatalog = [
  ...new Map(generated.map((p) => [p.colors.join(","), p])).values(),
];
const aliases: Record<string, string> = {
  파랑: "blue",
  블루: "blue",
  민트: "mint",
  초록: "green",
  그린: "green",
  베이지: "beige",
  따뜻한: "warm",
  따뜻함: "warm",
  파스텔: "pastel",
  네이비: "navy",
  골드: "gold",
  금색: "gold",
  의료: "medical",
  병원: "medical",
  피부과: "medical",
  크리스마스: "christmas",
  핑크: "pink",
  보라: "purple",
  노랑: "yellow",
  빨강: "red",
  회색: "grey",
  검정: "black",
  하양: "white",
  여름: "summer",
  가을: "fall",
  겨울: "winter",
  봄: "spring",
  바다: "sea",
  하늘: "sky",
  차분한: "sage",
  밝은: "light",
  어두운: "dark",
  gray: "grey",
  autumn: "fall",
};
export function searchTokens(query: string) {
  return query
    .toLowerCase()
    .trim()
    .split(/[\s,+]+/)
    .filter(Boolean)
    .map((t) => aliases[t] ?? t);
}
export function matchesPalette(
  p: CatalogPalette,
  query: string,
  filters: string[],
) {
  const haystack = [p.name, ...p.tags, ...p.colors].join(" ").toLowerCase();
  return (
    filters.every((t) => p.tags.includes(t.toLowerCase())) &&
    searchTokens(query).every((t) => haystack.includes(t))
  );
}
export type PaletteTab = "recommended" | "popular" | "new" | "random" | "saved";
function hash(value: string) {
  let h = 2166136261;
  for (const c of value) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
export function browsePalettes(
  items: CatalogPalette[],
  options: {
    query: string;
    filters: string[];
    tab: PaletteTab;
    saved: string[];
    uses: Record<string, number>;
    seed: number;
    source: string[];
  },
) {
  const { query, filters, tab, saved, uses, seed, source } = options;
  const result = items.filter(
    (p) =>
      (tab !== "saved" || saved.includes(p.id)) &&
      matchesPalette(p, query, filters),
  );
  const score = (p: CatalogPalette) =>
    p.colors.reduce(
      (sum, c) =>
        sum +
        Math.min(
          ...(source.length ? source : ["#ffffff"]).map((v) =>
            distance(rgb(c), rgb(v)),
          ),
        ),
      0,
    );
  const scores = new Map<string, number>();
  if (tab === "recommended") result.forEach((p) => scores.set(p.id, score(p)));
  const ordered = result.sort((a, b) =>
    tab === "popular"
      ? (uses[b.id] ?? 0) - (uses[a.id] ?? 0) || a.order - b.order
      : tab === "new"
        ? b.order - a.order
        : tab === "random"
          ? hash(`${seed}:${a.id}`) - hash(`${seed}:${b.id}`)
          : tab === "saved"
            ? saved.indexOf(b.id) - saved.indexOf(a.id)
            : scores.get(a.id)! - scores.get(b.id)! || a.order - b.order,
  );
  if (tab !== "recommended") return ordered;
  // Show different families before their close color variations.
  const families = new Map<string, CatalogPalette[]>();
  for (const p of ordered) {
    const family = p.id.startsWith("jia-") ? p.id.replace(/-\d+$/, "") : p.id;
    const group = families.get(family) ?? [];
    group.push(p);
    families.set(family, group);
  }
  const diverse: CatalogPalette[] = [];
  for (let round = 0; round < ordered.length; round++) {
    let added = false;
    for (const group of families.values())
      if (group[round]) {
        diverse.push(group[round]);
        added = true;
      }
    if (!added) break;
  }
  return diverse;
}
export interface PaletteLibrary {
  version: 1;
  saved: CatalogPalette[];
  uses: Record<string, number>;
}
export const emptyLibrary = (): PaletteLibrary => ({
  version: 1,
  saved: [],
  uses: {},
});
export function parseLibrary(raw: string | null): PaletteLibrary {
  if (!raw) return emptyLibrary();
  const data = JSON.parse(raw);
  if (
    data.version !== 1 ||
    !Array.isArray(data.saved) ||
    !data.uses ||
    typeof data.uses !== "object"
  )
    throw new Error("저장된 팔레트 형식이 올바르지 않습니다.");
  const saved: CatalogPalette[] = data.saved.filter(
    (p: CatalogPalette) =>
      p &&
      typeof p.id === "string" &&
      p.id.length < 150 &&
      typeof p.name === "string" &&
      p.name.length <= 100 &&
      Array.isArray(p.colors) &&
      p.colors.length === 4 &&
      p.colors.every((c) => /^#[a-f\d]{6}$/i.test(c)) &&
      Array.isArray(p.tags) &&
      p.tags.every((t) => typeof t === "string") &&
      Number.isFinite(p.order),
  );
  if (saved.length !== data.saved.length)
    throw new Error("저장된 팔레트에 손상된 항목이 있습니다.");
  const uses: Record<string, number> = {};
  for (const [key, v] of Object.entries(data.uses))
    if (typeof v === "number" && Number.isSafeInteger(v) && v >= 0)
      uses[key] = v;
  return {
    version: 1,
    saved: [...new Map(saved.map((p) => [p.id, p])).values()],
    uses,
  };
}
export function fourColors(colors: string[]) {
  return [0, 1, 2, 3].map(
    (i) => colors[Math.round((i * (colors.length - 1)) / 3)] ?? "#ffffff",
  );
}
export function customTags(colors: string[]) {
  const tags = new Set<string>();
  for (const c of colors) {
    const [h, s, l] = hsl(rgb(c));
    if (l > 0.9) tags.add("white");
    if (l < 0.17) tags.add("black");
    if (s < 0.12) tags.add("grey");
    else {
      tags.add(
        h < 15 || h >= 345
          ? "red"
          : h < 45
            ? "orange"
            : h < 70
              ? "yellow"
              : h < 160
                ? "green"
                : h < 190
                  ? "teal"
                  : h < 250
                    ? "blue"
                    : h < 290
                      ? "purple"
                      : "pink",
      );
      if (h > 145 && h < 185 && l > 0.6) tags.add("mint");
      if (h > 200 && h < 250 && l < 0.3) tags.add("navy");
    }
    if (l > 0.65 && s < 0.65) tags.add("pastel");
  }
  if (colors.every((c) => luminance(c) > 0.35)) tags.add("light");
  return [...tags];
}
