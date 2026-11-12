import type { NatalView } from "../lib/viewModel";
import { CharTile } from "./CharTile";

const EL = ["木", "火", "土", "金", "水"];

export function NatalCard({ view, reading }: { view: NatalView | null; reading: boolean }) {
  return (
    <section className="card natal" aria-labelledby="h-natal">
      <h2 id="h-natal">사주 원국</h2>
      {!view ? (
        <div className="empty">생년월일시를 입력하고<br />지도 생성을 누르세요</div>
      ) : (
        <>
          <div className="natal-grid">
            {view.columns.map((c) => (
              <div key={c.label} className={`natal-col${c.isDay ? " day" : ""}${c.unknown ? " unknown" : ""}`}>
                <div className="head">{c.label}{c.isDay && <span className="me">나</span>}{c.unknown && <span className="muted" style={{ fontWeight: 500 }}>(모름)</span>}</div>
                <CharTile cell={c.stem} pos="top" reading={reading} />
                <CharTile cell={c.branch} pos="bottom" reading={reading} />
                <div className="tg"><span>{c.stemLabel}</span><span>{c.branchLabel}</span></div>
              </div>
            ))}
          </div>
          <div className="natal-foot">
            <span><span className="muted">일간</span> <b style={{ fontFamily: "var(--serif)" }}>{view.dayMaster.hanja}</b> {EL[view.dayMaster.element]}</span>
            <span><span className="muted">음양</span> <b>{view.dayMaster.yinYang}</b></span>
            <span><span className="muted">12운성</span> <b>{view.dayMaster.stage}</b></span>
          </div>
        </>
      )}
    </section>
  );
}
