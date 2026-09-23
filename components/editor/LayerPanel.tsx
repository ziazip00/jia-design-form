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
} from "lucide-react";
import { useEditorStore } from "@/store/editorStore";
export default function LayerPanel() {
  const s = useEditorStore();
  const active = s.document.layers.find((l) => l.id === s.selectedId);
  return (
    <section className="layers-panel">
      <div className="section-title">
        <h3>Layers</h3>
        <span>{s.document.layers.length}</span>
      </div>
      <div className="layer-list">
        {[...s.document.layers].reverse().map((l) => {
          const Icon = {
            text: Type,
            image: Image,
            shape: Shapes,
            icon: Sparkles,
          }[l.type];
          return (
            <div
              key={l.id}
              className={`layer-row ${s.selectedId === l.id ? "selected" : ""} ${!l.visible ? "muted" : ""}`}
              draggable={!l.locked}
              onDragStart={(e) => e.dataTransfer.setData("text/layer", l.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                s.reorder(e.dataTransfer.getData("text/layer"), l.zIndex);
              }}
            >
              <GripVertical size={12} />
              <button className="layer-select" onClick={() => s.select(l.id)}>
                <Icon size={16} />
                <span>{l.name}</span>
              </button>
              <button
                aria-label={`${l.name} ${l.visible ? "숨김" : "표시"}`}
                onClick={() => s.patch(l.id, { visible: !l.visible })}
              >
                {l.visible ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
              <button
                aria-label={`${l.name} ${l.locked ? "잠금 해제" : "잠금"}`}
                onClick={() => s.patch(l.id, { locked: !l.locked })}
              >
                {l.locked ? (
                  <LockKeyhole size={14} />
                ) : (
                  <UnlockKeyhole size={14} />
                )}
              </button>
            </div>
          );
        })}
        {!s.document.layers.length && (
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
          disabled={!active || active.locked}
          onClick={s.duplicate}
        >
          <Copy size={16} />
        </button>
        <button
          aria-label="레이어 삭제"
          disabled={!active || active.locked}
          onClick={s.remove}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </section>
  );
}
