"use client";
import dynamic from "next/dynamic";
const Editor = dynamic(() => import("@/components/editor/Editor"), {
  ssr: false,
  loading: () => <div className="loading">지아디자인폼을 준비하고 있어요…</div>,
});
export default function Page() {
  return <Editor />;
}
