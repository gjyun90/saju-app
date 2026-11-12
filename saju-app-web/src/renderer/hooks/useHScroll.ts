// 가로 스크롤: 터치/펜은 브라우저 기본 관성 스크롤, 마우스는 끌어서 이동, 좌우 버튼 페이지 이동
import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";

export function useHScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean; id: number } | null>(null);
  const suppressClick = useRef(false);
  const [edges, setEdges] = useState({ atStart: true, atEnd: true });

  const updateEdges = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const atStart = el.scrollLeft <= 2;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
    setEdges((e) => (e.atStart === atStart && e.atEnd === atEnd ? e : { atStart, atEnd }));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; updateEdges(); });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(updateEdges);
    ro.observe(el);
    updateEdges();
    return () => { el.removeEventListener("scroll", onScroll); ro.disconnect(); cancelAnimationFrame(raf); };
  }, [updateEdges]);

  const page = useCallback((dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  }, []);

  /** data-key가 일치하는 항목을 가운데로 */
  const scrollToKey = useCallback((key: string | number, smooth: boolean) => {
    const el = ref.current;
    if (!el) return;
    const item = el.querySelector<HTMLElement>(`[data-key="${key}"]`);
    if (!item) return;
    const left = item.offsetLeft - (el.clientWidth - item.offsetWidth) / 2;
    el.scrollTo({ left: Math.max(0, left), behavior: smooth ? "smooth" : "auto" });
    window.setTimeout(updateEdges, smooth ? 400 : 0);
  }, [updateEdges]);

  const handlers = {
    onPointerDown(e: PointerEvent<HTMLDivElement>) {
      if (e.pointerType !== "mouse" || e.button !== 0 || !ref.current) return;
      drag.current = { x: e.clientX, left: ref.current.scrollLeft, moved: false, id: e.pointerId };
    },
    onPointerMove(e: PointerEvent<HTMLDivElement>) {
      const d = drag.current, el = ref.current;
      if (!d || !el) return;
      const dx = e.clientX - d.x;
      if (!d.moved && Math.abs(dx) > 6) {
        d.moved = true;
        el.classList.add("dragging");
        try { el.setPointerCapture(d.id); } catch { /* 무시 */ }
      }
      if (d.moved) el.scrollLeft = d.left - dx;
    },
    onPointerUp() {
      const d = drag.current, el = ref.current;
      drag.current = null;
      if (!d || !el) return;
      el.classList.remove("dragging");
      if (d.moved) {
        suppressClick.current = true;
        window.setTimeout(() => { suppressClick.current = false; }, 0);
      }
    },
  };

  /** 드래그 직후 발생하는 click은 선택으로 처리하지 않음 */
  const guard = useCallback((fn: () => void) => () => { if (!suppressClick.current) fn(); }, []);

  return { ref, edges, page, scrollToKey, handlers: { ...handlers, onPointerCancel: handlers.onPointerUp }, guard };
}
