import { useEffect, useRef, useState } from "react";
import type Konva from "konva";
import {
  LayoutTemplate,
  Type,
  ImagePlus,
  Shapes,
  Layers,
  Sparkles,
  Plus,
  Upload,
  Square,
  RectangleHorizontal,
  Circle,
  Star,
  Heart,
  Scissors,
} from "lucide-react";
import { useEditorStore } from "@/store/editorStore";
import { makeLayer, blankDocument } from "@/lib/designParser";
import { exportDesign } from "@/lib/exportDesign";
import { fitImage } from "@/lib/imagePlacement";
import ConnectionsDialog from "./ConnectionsDialog";
import CanvasEditor from "./CanvasEditor";
import EditorToolbar from "./EditorToolbar";
import LayerPanel from "./LayerPanel";
import PropertiesPanel from "./PropertiesPanel";
import AIComposer from "./AIComposer";
import ImageSeparationDialog from "./ImageSeparationDialog";
import type { ImageLayer } from "@/types/design";
export default function Editor() {
  const stageRef = useRef<Konva.Stage>(null),
    fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState("Design"),
    [message, setMessage] = useState("");
  const [separateLayer, setSeparateLayer] = useState<ImageLayer | null>(null);
  const splitUpload = useRef(false);
  const [connections, setConnections] = useState(false);
  const s = useEditorStore();
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).closest(
          "input,textarea,select,[contenteditable],dialog",
        )
      )
        return;
      const state = useEditorStore.getState();
      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === "z") {
          e.preventDefault();
          e.shiftKey ? state.redo() : state.undo();
        }
        if (e.key.toLowerCase() === "y") {
          e.preventDefault();
          state.redo();
        }
        if (e.key.toLowerCase() === "d") {
          e.preventDefault();
          state.duplicate();
        }
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        state.remove();
      }
      if (e.key === "Escape") state.select(null);
      const l = state.document.layers.find((l) => l.id === state.selectedId);
      if (l && e.key.startsWith("Arrow")) {
        e.preventDefault();
        const d = e.shiftKey ? 10 : 1;
        state.patch(l.id, {
          x:
            l.x + (e.key === "ArrowRight" ? d : e.key === "ArrowLeft" ? -d : 0),
          y: l.y + (e.key === "ArrowDown" ? d : e.key === "ArrowUp" ? -d : 0),
        });
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  async function upload(file?: File, separate = false) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setMessage("PNG, JPG, WEBP 이미지를 선택해 주세요.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setMessage("20MB 이하의 이미지를 선택해 주세요.");
      return;
    }
    try {
      const src = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new window.Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = src;
      });
      const added = makeLayer("image", {
        name: file.name,
        src,
        ...fitImage(image.width, image.height, useEditorStore.getState().document.canvas),
      }) as ImageLayer;
      useEditorStore.getState().add(added);
      if (separate)
        setSeparateLayer(
          useEditorStore
            .getState()
            .document.layers.find((l) => l.id === added.id) as ImageLayer,
        );
      setMessage("이미지를 추가했습니다.");
    } catch {
      setMessage("이미지를 읽을 수 없습니다. 다른 파일을 선택해 주세요.");
    }
  }
  function startSeparation() {
    const selected = s.document.layers.find((l) => l.id === s.selectedId);
    if (selected?.type === "image") {
      if (selected.locked) {
        setMessage("이미지 레이어의 잠금을 해제한 뒤 분리해 주세요.");
        return;
      }
      setSeparateLayer(selected);
    } else {
      splitUpload.current = true;
      fileRef.current?.click();
    }
  }
  return (
    <div className="editor">
      <EditorToolbar
        onConnections={() => setConnections(true)}
        onExport={async (format) => {
          try {
            if (stageRef.current) {
              await exportDesign(stageRef.current, s.document, format);
              setMessage(`${format.toUpperCase()} 파일을 내보냈습니다.`);
            }
          } catch {
            setMessage(
              "내보내기에 실패했습니다. 이미지가 모두 표시된 후 다시 시도해 주세요.",
            );
          }
        }}
      />
      <div className="editor-body">
        <nav className="rail" aria-label="도구">
          {[
            { name: "Design", icon: LayoutTemplate },
            { name: "Text", icon: Type },
            { name: "Image", icon: ImagePlus },
            { name: "Shape", icon: Shapes },
            { name: "Layers", icon: Layers },
          ].map(({ name, icon: Icon }) => (
            <button
              className={tab === name ? "active" : ""}
              key={name}
              onClick={() => {
                setTab(name);
                if (name === "Text") s.add(makeLayer("text"));
                if (name === "Image") {
                  splitUpload.current = false;
                  fileRef.current?.click();
                }
              }}
            >
              <Icon size={21} />
              <span>{name}</span>
            </button>
          ))}
          <span className="rail-bottom">PHASE 01</span>
        </nav>
        <aside className="sidebar">
          <div className="panel-heading">
            <h2>{tab === "Design" ? "디자인 도구" : tab}</h2>
            <span className="tiny-label">나의 스튜디오</span>
          </div>
          <div className="assets">
            <h3>
              {tab === "Layers"
                ? "레이어 관리"
                : tab === "Icon"
                  ? "기본 아이콘"
                  : tab === "Shape"
                    ? "기본 도형"
                    : "만들기를 시작하세요"}
            </h3>
            {tab === "Icon" ? (
              <div className="asset-grid">
                {(["sparkle", "heart", "star"] as const).map((icon, i) => {
                  const I = [Sparkles, Heart, Star][i];
                  return (
                    <button
                      key={icon}
                      onClick={() => s.add(makeLayer("icon", { icon }))}
                    >
                      <I size={24} />
                      {["반짝임", "하트", "별"][i]}
                    </button>
                  );
                })}
              </div>
            ) : (
              <>
                <button
                  className="add-text"
                  onClick={() => s.add(makeLayer("text"))}
                >
                  <Type size={20} />
                  <span>텍스트 추가</span>
                  <Plus size={16} />
                </button>
                <button
                  className="upload-button"
                  onClick={() => {
                    splitUpload.current = false;
                    fileRef.current?.click();
                  }}
                >
                  <Upload size={18} /> 이미지 업로드
                </button>
                <button
                  className="upload-button separation-entry"
                  onClick={startSeparation}
                >
                  <Scissors size={18} /> 이미지 레이어 분리
                </button>
                <div className="asset-grid">
                  {(["rectangle", "rounded", "circle"] as const).map(
                    (shape, i) => {
                      const I = [Square, RectangleHorizontal, Circle][i];
                      return (
                        <button
                          key={shape}
                          onClick={() =>
                            s.add(
                              makeLayer("shape", {
                                shape,
                                radius: shape === "rounded" ? 30 : 0,
                                width: 260,
                                height: 260,
                              }),
                            )
                          }
                        >
                          <I size={25} />
                          {["사각형", "둥근 사각형", "원"][i]}
                        </button>
                      );
                    },
                  )}
                </div>
              </>
            )}
            <input
              ref={fileRef}
              className="hidden"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                void upload(e.target.files?.[0], splitUpload.current);
                splitUpload.current = false;
                e.target.value = "";
              }}
            />
            {tab === "Design" && (
              <button
                className="new-design"
                onClick={() => s.commit(blankDocument())}
              >
                <Plus size={14} /> 빈 디자인 만들기
              </button>
            )}
          </div>
          <LayerPanel />
        </aside>
        <div className="center">
          <CanvasEditor stageRef={stageRef} />
          <AIComposer
            onSeparate={startSeparation}
            onApply={async (src, separate) => {
              const image = new window.Image();
              image.src = src;
              await image.decode();
              const state = useEditorStore.getState();
              const layer = makeLayer("image", {
                src,
                name: "AI 완성 이미지",
                ...fitImage(image.width, image.height, state.document.canvas),
              }) as ImageLayer;
              state.add(layer);
              if (separate)
                setSeparateLayer(
                  useEditorStore
                    .getState()
                    .document.layers.find(
                      (l) => l.id === layer.id,
                    ) as ImageLayer,
                );
            }}
          />
        </div>
        <PropertiesPanel onSeparate={startSeparation} />
      </div>
      {connections && <ConnectionsDialog onClose={() => setConnections(false)} />}
      {separateLayer && (
        <ImageSeparationDialog
          layer={separateLayer}
          onClose={() => setSeparateLayer(null)}
          onDone={() =>
            setMessage(
              "선택 영역이 삭제되고 배경이 복원되었습니다. 원본은 보관했고 Ctrl Z로 되돌릴 수 있습니다.",
            )
          }
        />
      )}
      {message && (
        <div role="status" className="toast" onClick={() => setMessage("")}>
          {message}
          <button aria-label="알림 닫기">×</button>
        </div>
      )}
    </div>
  );
}
