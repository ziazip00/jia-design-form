import { useEditorStore } from "@/store/editorStore";
import type { ImageLayer } from "@/types/design";
import { cropPatch } from "@/lib/imageEditing";
export default function ImageMoreMenu({ layer: l }: { layer: ImageLayer }) {
  const s = useEditorStore();
  return (
    <details className="image-more">
      <summary>더 보기 ⌄</summary>
      <div role="menu">
        <button role="menuitem" onClick={() => s.duplicate()}>
          복제
        </button>
        <button
          role="menuitem"
          onClick={() => s.patch(l.id, { flipX: !l.flipX })}
        >
          좌우 반전
        </button>
        <button
          role="menuitem"
          onClick={() => s.patch(l.id, { flipY: !l.flipY })}
        >
          상하 반전
        </button>
        {l.crop && (
          <button
            role="menuitem"
            onClick={() =>
              s.patch(l.id, cropPatch(l, { x: 0, y: 0, width: 1, height: 1 }))
            }
          >
            원본 자르기 해제
          </button>
        )}
        <button
          role="menuitem"
          onClick={() => s.reorder(l.id, s.document.layers.length - 1)}
        >
          맨 앞으로
        </button>
        <button role="menuitem" onClick={() => s.remove()}>
          삭제
        </button>
      </div>
    </details>
  );
}
