import { useRef, useEffect, useCallback, useState } from "react";

// 패널 높이 저장/복원 키 접두사
const STORAGE_KEY_PREFIX = "jia-sidebar-splitter-";

interface SplitterProps {
  id: string;
  minHeight?: number;
  topMinHeight?: number;
  bottomMinHeight?: number;
}

function loadStoredHeight(id: string, totalAvailable: number, defaultHeight: number): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + id);
    if (raw === null) return defaultHeight;
    const stored = Number(raw);
    if (isNaN(stored) || stored < 0) return defaultHeight;
    // 저장된 값이 전체 가용 높이보다 크면 clamp
    return Math.min(stored, totalAvailable);
  } catch {
    return defaultHeight;
  }
}

function storeHeight(id: string, height: number) {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + id, String(Math.round(height)));
  } catch {
    /* ignore quota errors */
  }
}

export default function Splitter({ id, topMinHeight = 40, bottomMinHeight = 40 }: SplitterProps) {
  const splitterRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startTopHeight = useRef(0);
  const startTotal = useRef(0);

  const [topHeight, setTopHeight] = useState<number | null>(null); // null = 사용하지 않음(자동 계산)

  // 형제 요소(ref로 접근)를 통해 실제 높이의 합을 구함
  const getTotalHeight = useCallback(() => {
    const el = splitterRef.current;
    if (!el) return 0;
    const parent = el.parentElement;
    if (!parent) return 0;
    return parent.clientHeight;
  }, []);

  const getTopElement = useCallback(() => {
    const el = splitterRef.current;
    if (!el) return null;
    return el.previousElementSibling as HTMLElement | null;
  }, []);

  const getBottomElement = useCallback(() => {
    const el = splitterRef.current;
    if (!el) return null;
    return el.nextElementSibling as HTMLElement | null;
  }, []);

  // 초기 높이 설정: 저장된 값이 있으면 복원, 없으면 현재 높이 사용
  useEffect(() => {
    const total = getTotalHeight();
    if (total === 0) return;

    const topEl = getTopElement();
    const bottomEl = getBottomElement();
    if (!topEl || !bottomEl) return;

    // 현재 실제 높이 측정
    const currentTop = topEl.getBoundingClientRect().height;
    const stored = loadStoredHeight(id, total, currentTop);

    // 최솟값 제약 적용
    const clamped = Math.max(topMinHeight, Math.min(stored, total - bottomMinHeight));
    setTopHeight(clamped);

    // top 요소의 높이를 명시적으로 설정
    topEl.style.height = `${clamped}px`;
    topEl.style.flexGrow = "0";
    topEl.style.flexShrink = "0";
    // bottom 요소는 남은 공간을 flex로 채움
    bottomEl.style.flexGrow = "1";
    bottomEl.style.flexShrink = "1";
    bottomEl.style.minHeight = `${bottomMinHeight}px`;
    topEl.style.minHeight = `${topMinHeight}px`;
  }, [id, topMinHeight, bottomMinHeight, getTotalHeight, getTopElement, getBottomElement]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const el = splitterRef.current;
      if (!el) return;
      const topEl = getTopElement();
      const bottomEl = getBottomElement();
      if (!topEl || !bottomEl) return;

      // 활성 splitter 표시
      el.classList.add("active");

      const total = getTotalHeight();
      const currentTop = topEl.getBoundingClientRect().height;

      dragging.current = true;
      startY.current = e.clientY;
      startTopHeight.current = currentTop;
      startTotal.current = total;

      // 포인터 캡처
      el.setPointerCapture(e.pointerId);
      e.preventDefault();
    },
    [getTopElement, getBottomElement, getTotalHeight],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const el = splitterRef.current;
      if (!el) return;
      const topEl = getTopElement();
      const bottomEl = getBottomElement();
      if (!topEl || !bottomEl) return;

      const delta = e.clientY - startY.current;
      const newTop = startTopHeight.current + delta;
      const total = startTotal.current;

      // 제약 적용
      const clamped = Math.max(topMinHeight, Math.min(newTop, total - bottomMinHeight));

      setTopHeight(clamped);
      topEl.style.height = `${clamped}px`;
      // bottom은 flex로 남은 공간 자동 채움 (이미 flex-grow:1 설정됨)
    },
    [topMinHeight, bottomMinHeight, getTopElement, getBottomElement],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      dragging.current = false;

      const el = splitterRef.current;
      if (!el) {
        return;
      }
      el.classList.remove("active");

      // 높이 저장
      const topEl = getTopElement();
      if (topEl && topHeight !== null) {
        storeHeight(id, topHeight);
      }

      // 포인터 캡처 해제
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [id, topHeight, getTopElement],
  );

  return (
    <div
      ref={splitterRef}
      className="panel-splitter"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    />
  );
}
