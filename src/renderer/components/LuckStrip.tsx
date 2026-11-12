import { useEffect, useRef } from "react";
import { useHScroll } from "../hooks/useHScroll";
import { luckTenGodText, type LuckItem } from "../lib/viewModel";
import { CharTile } from "./CharTile";
import { IconNext, IconPrev } from "./Icons";

interface Props {
  title: string;
  sub: string;
  items: LuckItem[] | null;
  selectedKey: number | null;
  onSelect(key: number): void;
  reading: boolean;
}

export function LuckStrip({ title, sub, items, selectedKey, onSelect, reading }: Props) {
  const { ref, edges, page, scrollToKey, handlers, guard } = useHScroll();
  const first = useRef(true);
  const signature = items?.map((i) => i.key).join(",") ?? "";

  // 선택 항목(또는 목록)이 바뀌면 가운데로 이동. 처음 한 번은 애니메이션 없이
  useEffect(() => {
    if (selectedKey === null) return;
    scrollToKey(selectedKey, !first.current);
    first.current = false;
  }, [selectedKey, signature, scrollToKey]);

  return (
    <section className="card strip" aria-label={title}>
      <div className="strip-head">
        <div className="strip-title"><h2>{title}</h2><span>{sub}</span></div>
        <div className="arrows">
          <button type="button" className="arrow" aria-label={`${title} 이전`} disabled={!items || edges.atStart} onClick={() => page(-1)}><IconPrev /></button>
          <button type="button" className="arrow" aria-label={`${title} 다음`} disabled={!items || edges.atEnd} onClick={() => page(1)}><IconNext /></button>
        </div>
      </div>
      <div ref={ref} className="hs" tabIndex={0} aria-label={`${title} 목록, 좌우로 스크롤`} {...handlers}>
        {!items ? (
          <div className="empty" style={{ padding: "40px 0" }}>명식을 만들면 표시됩니다</div>
        ) : (
          items.map((it) => (
            <button
              key={it.key} type="button" className="luck" data-key={it.key}
              aria-pressed={it.key === selectedKey}
              onClick={guard(() => onSelect(it.key))}
            >
              <span className="top">{it.top}</span>
              <CharTile cell={it.pillar.stem} pos="top" reading={reading} />
              <CharTile cell={it.pillar.branch} pos="bottom" reading={reading} />
              <span className="tg">{luckTenGodText(it.pillar)}</span>
              <span className={`sub${it.current ? " cur" : ""}`}>{it.current && !/올해|이번/.test(it.sub) ? `현재 · ${it.sub}` : it.sub}</span>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
