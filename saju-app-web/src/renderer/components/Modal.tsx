import { useEffect, useRef, type ReactNode } from "react";
import { IconClose } from "./Icons";

interface Props {
  title: string;
  onClose(): void;
  children: ReactNode;
  wide?: boolean;
}

/** 가운데 대화상자. 바깥 탭 또는 Esc로 닫힘. 화면 캡처에서는 제외 */
export function Modal({ title, onClose, children, wide }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); prev?.focus?.(); };
  }, [onClose]);

  return (
    <div className="backdrop" data-no-capture onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className={`dialog${wide ? " wide" : ""}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <div className="dialog-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" aria-label="닫기" onClick={onClose}><IconClose /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
