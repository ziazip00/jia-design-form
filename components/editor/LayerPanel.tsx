import {
  Eye,
  EyeOff,
  LockKeyhole,
  UnlockKeyhole,
  Type,
  Image,
  Shapes,
  Sparkles,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Link2,
  Link2Off,
  Layers,
  Plus,
  Shield,
  Sliders,
  Folder,
} from "lucide-react";
import { useEditorStore } from "@/store/editorStore";
import type { DesignLayer, GroupData, Artboard } from "@/types/design";
import Splitter from "./Splitter";
export default function LayerPanel() {
  const s = useEditorStore();
  const active = s.selectedLayerIds.length === 1
    ? s.document.layers.find((l) => l.id === s.selectedLayerIds[0])
    : null;
  const selectedLayers = s.selectedLayerIds
    .map((id) => s.document.layers.find((l) => l.id === id))
    .filter(Boolean) as DesignLayer[];
  const canOperate = selectedLayers.some((l) => !l.locked);
  return (
    <section className="layers-panel">
      <div className="section-title">
        <div className="section-inner">
          <h3>Layers</h3>
          <span>{s.document.layers.length}</span>
        </div>
      </div>
      <Splitter id="layerpanel-sectionlist" topMinHeight={60} bottomMinHeight={80} />
      <div className="layer-list">
        {[...s.document.layers]
          .filter((l) => (l as DesignLayer).artboardId === s.selectedArtboardId)
          .reverse()
          .map((l) => {
            const layer = l as DesignLayer;
            const Icon = {
              text: Type,
              image: Image,
              shape: Shapes,
              icon: Sparkles,
              path: Shapes,
            }[layer.type];
            const isSelected = s.selectedLayerIds.includes(layer.id);
            const inGroup = layer.groupId;
            return (
              <div
                key={layer.id}
                className={`layer-row ${isSelected ? "selected" : ""} ${!layer.visible ? "muted" : ""} ${inGroup ? "grouped" : ""}`}
                draggable={!layer.locked}
                onDragStart={(e) => e.dataTransfer.setData("text/layer", layer.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  s.reorder(layer.id, (l as DesignLayer).zIndex);
                }}
              >
                <GripVertical size={12} />
                <button
                  className="layer-select"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    const newName = prompt("레이어 이름:", layer.name);
                    if (newName && newName.trim() && newName.trim() !== layer.name) {
                      s.patch(layer.id, { name: newName.trim() });
                    }
                  }}
                  onClick={() => {
                    if (e.shiftKey) {
                      const newIds = isSelected
                        ? s.selectedLayerIds.filter((id) => id !== layer.id)
                        : [...s.selectedLayerIds, layer.id];
                      s.selectLayers(newIds);
                    } else {
                      s.selectLayer(layer.id);
                    }
                  }}
                >
                  {inGroup && <Folder size={12} className="group-indicator" />}
                  <Icon size={16} />
                  <span>{layer.name}</span>
                </button>
                <button
                  aria-label={`${layer.name} ${layer.visible ? "숨김" : "표시"}`}
                  onClick={() => s.patch(layer.id, { visible: !layer.visible })}
                >
                  {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button
                  aria-label={`${layer.name} ${layer.locked ? "잠금 해제" : "잠금"}`}
                  onClick={() => s.patch(layer.id, { locked: !layer.locked })}
                >
                  {layer.locked ? (
                    <LockKeyhole size={14} />
                  ) : (
                    <UnlockKeyhole size={14} />
                  )}
                </button>
              </div>
            );
          })}
        {!s.document.layers.filter((l) => (l as DesignLayer).artboardId === s.selectedArtboardId).length && (
          <p className="empty-layers">
            첫 번째 레이어를 추가해
            <br />
            디자인을 시작하세요.
          </p>
        )}
      </div>
      <div className="layer-tools">
        <button
          aria-label="앞으로 가져오기"
          disabled={!active || active.locked}
          onClick={() => active && s.reorder(active.id, active.zIndex + 1)}
        >
          <ArrowUp size={16} />
        </button>
        <button
          aria-label="뒤로 보내기"
          disabled={!active || active.locked}
          onClick={() => active && s.reorder(active.id, active.zIndex - 1)}
        >
          <ArrowDown size={16} />
        </button>
        <button
          aria-label="레이어 복제"
          disabled={!canOperate}
          onClick={() => s.duplicateLayers(s.selectedLayerIds)}
        >
          <Copy size={16} />
        </button>
        <button
          aria-label="레이어 삭제"
          disabled={!canOperate}
          onClick={() => s.removeLayers(s.selectedLayerIds)}
        >
          <Trash2 size={16} />
        </button>
      </div>
      <div className="layer-bottom-tools">
        <span className="bottom-label">레이어</span>
        <button
          aria-label="새 레이어"
          onClick={() => {
            const artboardId = s.selectedArtboardId || s.document.artboards[0]?.id || "";
            s.add({
              id: crypto.randomUUID(),
              name: "레이어 " + (s.document.layers.length + 1),
              type: "shape",
              shape: "rectangle",
              x: 100,
              y: 100,
              width: 200,
              height: 200,
              rotation: 0,
              opacity: 1,
              visible: true,
              locked: false,
              zIndex: 0,
              fill: "#d9eafb",
              stroke: "#8eb5d8",
              strokeWidth: 0,
              radius: 0,
              artboardId,
              parentId: null,
              groupId: null,
            } as DesignLayer);
          }}
        >
          <Plus size={14} /> 새 레이어
        </button>
        <button
          aria-label="그룹"
          disabled={s.selectedLayerIds.length < 2}
          onClick={() => s.groupLayers(s.selectedLayerIds)}
        >
          <Folder size={14} /> 그룹
        </button>
        <button
          aria-label="레이어 연결"
          disabled={s.selectedLayerIds.length < 2}
          onClick={() => {
            const linkId = crypto.randomUUID();
            s.document.layers
              .filter((l) => s.selectedLayerIds.includes(l.id))
              .forEach((l) => {
                s.patch(l.id, { parentId: linkId });
              });
          }}
        >
          <Link2 size={14} /> 연결
        </button>
        <button
          aria-label="레이어 효과"
          disabled={!active}
          onClick={() => {
            s.selectLayer(active.id);
          }}
        >
          <Shield size={14} /> FX
        </button>
        <button
          aria-label="마스크"
          disabled={!active || active.type !== "image"}
          onClick={() => {
            if (active) {
              s.patch(active.id, { maskEnabled: !active.maskEnabled });
            }
          }}
        >
          <Shield size={14} /> 마스크
        </button>
        <button
          aria-label="조정 레이어"
          onClick={() => {
            const artboardId = s.selectedArtboardId || s.document.artboards[0]?.id || "";
            s.add({
              id: crypto.randomUUID(),
              name: "밝기/대비",
              type: " adjustment",
              artboardId,
              adjustmentType: "brightness",
              values: { brightness: 0, contrast: 0 },
              visible: true,
              locked: false,
            } as any);
          }}
        >
          <Sliders size={14} /> 조정
        </button>
      </div>
      <div className="artboard-list">
        <Splitter id="layerpanel-artboardlist" topMinHeight={80} bottomMinHeight={120} />
        <div>
          <span className="bottom-label">아트보드 ({s.document.artboards.length})</span>
        {s.document.artboards.map((a) => (
          <div
            key={a.id}
            className={`artboard-item ${a.id === s.selectedArtboardId ? "active" : ""}`}
          >
            <button
              onClick={() => s.selectArtboard(a.id)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                const name = prompt("아트보드 이름:", a.name);
                if (name && name.trim()) {
                  s.commit({
                    ...s.document,
                    artboards: s.document.artboards.map((ab) =>
                      ab.id === a.id ? { ...ab, name: name.trim() } : ab
                    ),
                  });
                }
              }}
            >
              <Layers size={14} />
              <span>{a.name}</span>
              <span className="artboard-size">{a.width}×{a.height}</span>
            </button>
            <button
              aria-label="아트보드 복제"
              onClick={() => s.duplicateArtboard(a.id)}
              title="복제"
            >
              <Copy size={12} />
            </button>
            <button
              aria-label="아트보드 삭제"
              onClick={() => s.removeArtboard(a.id)}
              disabled={s.document.artboards.length <= 1}
              title="삭제"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        <button
          className="artboard-add-btn"
          onClick={() => s.addArtboard()}
        >
          <Plus size={14} /> 아트보드 추가
        </button>
        </div>
      </div>
    </section>
  );
}
