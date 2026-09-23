import { Undo2, Redo2, Download } from "lucide-react";
import { useEditorStore } from "@/store/editorStore";
import CanvasSizeSelector from "./CanvasSizeSelector";
export default function EditorToolbar({
  onExport,
  onConnections,
}: {
  onExport: (format: "png" | "jpeg") => void;
  onConnections: () => void;
}) {
  const s = useEditorStore();
  return (
    <header className="toolbar">
      <div className="brand">
        <span className="brand-mark">j.</span>
        <strong>지아디자인폼</strong>
        <span className="badge">STUDIO</span>
      </div>
      <input
        aria-label="프로젝트 이름"
        className="project-name"
        value={s.document.name}
        onChange={(e) => s.commit({ ...s.document, name: e.target.value })}
      />
      <div className="toolbar-actions">
        <button
          title="실행 취소 (Ctrl+Z)"
          aria-label="Undo"
          disabled={!s.past.length}
          onClick={s.undo}
        >
          <Undo2 size={18} />
        </button>
        <button
          title="다시 실행 (Ctrl+Shift+Z)"
          aria-label="Redo"
          disabled={!s.future.length}
          onClick={s.redo}
        >
          <Redo2 size={18} />
        </button>
        <span className="divider" />
        <CanvasSizeSelector />
        <button onClick={onConnections}>MCP 연결</button>
        <details className="export-menu">
          <summary className="primary">
            <Download size={16} /> Export
          </summary>
          <div>
            <button onClick={() => onExport("png")}>PNG 다운로드</button>
            <button onClick={() => onExport("jpeg")}>JPG 다운로드</button>
          </div>
        </details>
      </div>
    </header>
  );
}
