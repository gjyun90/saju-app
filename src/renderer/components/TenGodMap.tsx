import { useState } from "react";
import type { CharCell, TenGodGroupView } from "../lib/viewModel";

// 오각형 배치 (비겁 위 → 시계방향 식상·재성·관성·인성), 박스 332×316
const NODE_POS = [
  { left: 121.9, top: 2 },
  { left: 239.9, top: 87.7 },
  { left: 194.8, top: 226.3 },
  { left: 49, top: 226.3 },
  { left: 4, top: 87.7 },
];
const RING = ["var(--wood)", "var(--fire)", "var(--earth)", "var(--metal-ring)", "var(--water)"];
const EL = ["木", "火", "土", "金", "水"];

interface Props {
  groups: TenGodGroupView[] | null;
  dayMaster: CharCell | null;
}

export function TenGodMap({ groups, dayMaster }: Props) {
  const [sel, setSel] = useState(-1);
  const caption = groups && sel >= 0
    ? `${groups[sel].name} (${groups[sel].relation}) — ${groups[sel].meaning}`
    : "원을 누르면 십성의 의미가 표시됩니다";

  return (
    <section className="card map" aria-labelledby="h-map">
      <div className="map-head">
        <h2 id="h-map">십성 관계 지도</h2>
        <div className="legend" aria-label="화살표 의미">
          <span>
            <svg width="26" height="10" viewBox="0 0 26 10" aria-hidden="true"><path d="M1 5h18" stroke="#A9792C" strokeWidth="2.2" /><path d="M18 1l7 4-7 4z" fill="#A9792C" /></svg>상생
          </span>
          <span>
            <svg width="26" height="10" viewBox="0 0 26 10" aria-hidden="true"><path d="M1 5h18" stroke="#4E73B0" strokeWidth="1.6" strokeDasharray="4 3" /><path d="M18 1l7 4-7 4z" fill="#4E73B0" /></svg>상극
          </span>
        </div>
      </div>
      {!groups || !dayMaster ? (
        <div className="empty">명식을 만들면 표시됩니다</div>
      ) : (
        <>
          <div className="map-box">
            <svg width="332" height="316" viewBox="0 0 332 316" aria-hidden="true">
              <defs>
                <marker id="mk-g" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" fill="#A9792C" /></marker>
                <marker id="mk-b" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" fill="#4E73B0" /></marker>
              </defs>
              <g fill="none" stroke="#4E73B0" strokeWidth="1.5" strokeDasharray="5 4" markerEnd="url(#mk-b)">
                <path d="M 181.4 93.6 L 223.4 222.8" />
                <path d="M 243.4 161.1 L 133.5 240.9" />
                <path d="M 198.4 240.9 L 88.5 161.1" />
                <path d="M 108.5 222.8 L 150.5 93.6" />
                <path d="M 98.0 131.7 L 233.9 131.7" />
              </g>
              <g fill="none" stroke="#A9792C" strokeWidth="2.2" markerEnd="url(#mk-g)">
                <path d="M 214.9 56.1 A 124 124 0 0 1 259.1 88.2" />
                <path d="M 289.4 181.4 A 124 124 0 0 1 272.5 233.4" />
                <path d="M 193.3 290.9 A 124 124 0 0 1 138.6 290.9" />
                <path d="M 59.4 233.4 A 124 124 0 0 1 42.5 181.4" />
                <path d="M 72.7 88.2 A 124 124 0 0 1 117.0 56.1" />
              </g>
            </svg>
            <div className="map-center" style={{ background: "#F6F4EF", boxShadow: `inset 0 0 0 2px ${RING[dayMaster.element]}` }}>
              <small>일간</small>
              <b>{dayMaster.hanja}</b>
            </div>
            {groups.map((g, i) => (
              <button
                key={g.name} type="button" className="node" aria-pressed={sel === i}
                aria-label={`${g.name} ${EL[g.element]}, ${g.chars.length ? g.chars.map((c) => c.hanja).join(" ") : "없음"}`}
                style={{ ...NODE_POS[i], borderColor: RING[g.element] }}
                onClick={() => setSel(sel === i ? -1 : i)}
              >
                <span className="nm">{g.name} <small>{EL[g.element]}</small></span>
                {g.chars.length ? (
                  <span className={`chars${g.chars.length > 4 ? " many" : ""}`}>
                    {g.chars.map((c, k) => <span key={k} className={`c el-${c.element}`}>{c.hanja}</span>)}
                  </span>
                ) : (
                  <span className="none">없음</span>
                )}
              </button>
            ))}
          </div>
          <div className="map-caption">{caption}</div>
        </>
      )}
    </section>
  );
}
