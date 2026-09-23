import { useState } from "react";
import { ArrowUp, Sparkles } from "lucide-react";
import { mockDocument } from "@/lib/designParser";
import { useEditorStore } from "@/store/editorStore";
export default function PromptBar() {
  const [prompt, setPrompt] = useState("");
  const commit = useEditorStore((s) => s.commit);
  return (
    <footer className="prompt-bar">
      <div className="prompt-label">
        <Sparkles size={18} />
        <strong>아이디어를 디자인으로</strong>
        <span>MOCK AI</span>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          commit(mockDocument());
        }}
      >
        <input
          aria-label="디자인 프롬프트"
          placeholder="어떤 디자인을 만들까요?"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <button type="submit" className="primary">
          Generate <ArrowUp size={16} />
        </button>
      </form>
      <p>
        지금은 예시 SNS 디자인을 생성합니다. 모든 요소를 개별 레이어로 편집할 수
        있어요.
      </p>
    </footer>
  );
}
