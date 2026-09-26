import type Konva from "konva";
import { useEditorStore } from "@/store/editorStore";
import type { DesignLayerPatch } from "@/types/design";
import PositionSection from "./properties/PositionSection";
import AppearanceSection from "./properties/AppearanceSection";
import FillSection from "./properties/FillSection";
import StrokeSection from "./properties/StrokeSection";
import EffectsSection from "./properties/EffectsSection";
import ExportSection from "./properties/ExportSection";
import TextSection from "./properties/TextSection";
import { Section, ColorField } from "./properties/Fields";
import { cropPatch } from "@/lib/imageEditing";
export default function PropertiesPanel({
  onSeparate,
  stageRef,
}: {
  onSeparate: () => void;
  stageRef: React.RefObject<Konva.Stage | null>;
}) {
  const s = useEditorStore(),
    base = (s.palettePreview ?? s.document).layers.find(
      (l) => l.id === s.selectedLayerIds[0],
    ),
    l =
      base && s.preview?.id === base.id
        ? { ...base, ...s.preview.values }
        : base;
  const patch = (p: DesignLayerPatch) => l && s.patch(l.id, p);
  const props = l ? { layer: l, patch } : null;
  const selectedType = l ? l.type : null;
  return (
    <aside className="properties inspector-dark">
      <div className="panel-heading">
        <h2>디자인</h2>
        <span>
          {l
            ? {
                text: "텍스트",
                image: "이미지",
                shape: "도형",
                icon: "아이콘",
              }[l.type]
            : "캔버스"}
        </span>
      </div>
      {l && props ? (
        <>
          <div className="inspector-name">
            <strong>{l.name}</strong>
            <div className="checks">
              <label>
                <input
                  type="checkbox"
                  checked={l.visible}
                  onChange={(e) => patch({ visible: e.target.checked })}
                />{" "}
                표시
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={l.locked}
                  onChange={(e) => patch({ locked: e.target.checked })}
                />{" "}
                잠금
              </label>
            </div>
          </div>
          <fieldset disabled={l.locked}>
            <PositionSection {...props} />
            <AppearanceSection {...props} />
            {l.type === "text" && <TextSection {...props} />}{" "}
            {l.type === "image" ? (
              <Section title="이미지">
                <button className="section-add" onClick={onSeparate}>
                  영역 선택 · 자동 자리 채우기
                </button>
                <div className="two">
                  <button onClick={() => patch({ flipX: !l.flipX })}>
                    좌우 반전
                  </button>
                  <button onClick={() => patch({ flipY: !l.flipY })}>
                    상하 반전
                  </button>
                </div>
                {l.crop && (
                  <button
                    className="section-add"
                    onClick={() =>
                      patch(cropPatch(l, { x: 0, y: 0, width: 1, height: 1 }))
                    }
                  >
                    원본 자르기 해제
                  </button>
                )}
              </Section>
            ) : (
              <FillSection {...props} />
            )}
            <StrokeSection {...props} />
            <EffectsSection {...props} />
          </fieldset>
          <ExportSection key={l.id} layer={l} stageRef={stageRef} />
        </>
      ) : (
        <>
          <div className="selection-empty">
            <h3>편집할 객체를 선택하세요</h3>
            <p>위치, 색상, 효과를 이곳에서 조절합니다.</p>
          </div>
          <Section title="아트보드">
            <ColorField
              label="배경 색상"
              value={s.document.artboards.find((a) => a.id === s.selectedArtboardId)?.background || "#ffffff"}
              onChange={(background) => {
                const artboard = s.document.artboards.find((a) => a.id === s.selectedArtboardId);
                if (artboard) {
                  s.commit({
                    ...s.document,
                    artboards: s.document.artboards.map((a) =>
                      a.id === s.selectedArtboardId ? { ...a, background } : a
                    ),
                  });
                }
              }}
            />
            <p className="hint">
              {s.document.artboards.find((a) => a.id === s.selectedArtboardId)?.width || 1080} × {s.document.artboards.find((a) => a.id === s.selectedArtboardId)?.height || 1350} px
            </p>
          </Section>
        </>
      )}
    </aside>
  );
}
