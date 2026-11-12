import { useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import type { HistoryEntry } from "../lib/history";
import type { FormState } from "../lib/viewModel";
import { IconClock, IconClose, IconCompass } from "./Icons";

interface Props {
  form: FormState;
  onChange(patch: Partial<FormState>): void;
  onSubmit(): void;
  history: HistoryEntry[];
  onPickHistory(h: HistoryEntry): void;
  onDeleteHistory(h: HistoryEntry): void;
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const digits = (v: string) => v.replace(/\D/g, "");

export function BirthForm({ form, onChange, onSubmit, history, onPickHistory, onDeleteHistory }: Props) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState(false);   // 직접 타이핑한 경우에만 이름으로 거름
  const [active, setActive] = useState(-1);
  const blurTimer = useRef<number>();

  const list = useMemo(() => {
    const q = typed ? form.name.trim() : "";
    return history.filter((h) => !q || h.name.includes(q));
  }, [history, form.name, typed]);

  const close = () => { setOpen(false); setActive(-1); };
  const pick = (h: HistoryEntry) => { onPickHistory(h); close(); setTyped(false); };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(list.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Enter" && open && active >= 0 && list[active]) { e.preventDefault(); pick(list[active]); }
    else if (e.key === "Escape") close();
  };

  const submit = (e: FormEvent) => { e.preventDefault(); close(); onSubmit(); };
  const lunar = form.calendar === "LUNAR";
  const [hh = "", mm = ""] = form.time.split(":");

  return (
    <form className="card form" aria-label="기본 정보" onSubmit={submit}>
      <div className="field">
        <label className="label" htmlFor="f-name">이름</label>
        <div className="name-wrap">
          <input
            id="f-name" className="input name-input" style={{ borderColor: open ? "var(--nav)" : undefined }}
            type="text" autoComplete="off" role="combobox" aria-expanded={open} aria-controls="hist-list" aria-autocomplete="list"
            value={form.name}
            onChange={(e) => { onChange({ name: e.target.value }); setTyped(true); setOpen(true); setActive(-1); }}
            onFocus={() => { window.clearTimeout(blurTimer.current); setOpen(true); setTyped(false); }}
            onBlur={() => { blurTimer.current = window.setTimeout(close, 150); }}
            onKeyDown={onKey}
          />
          <IconClock />
        </div>
        {open && (
          <div className="hist" onMouseDown={(e) => e.preventDefault()}>
            <div className="hist-head"><b>조회 이력</b><span className="muted">{history.length}명</span></div>
            <div id="hist-list" className="hist-list" role="listbox" aria-label="조회 이력">
              {list.map((h, i) => (
                <div key={h.id} role="option" aria-selected={i === active} className={`hist-row${i === active ? " active" : ""}`}>
                  <button type="button" className="hist-pick" onClick={() => pick(h)}>
                    <span className="avatar">{h.name.charAt(0)}</span>
                    <span className="hist-text">
                      <span className="hist-name">{h.name}</span>
                      <span className="hist-meta">
                        <span className="tag">{h.gender === "M" ? "남" : "여"}</span>
                        <span className={`tag ${h.calendar === "LUNAR" ? "lunar" : "solar"}`}>
                          {h.calendar === "LUNAR" ? (h.isLeapMonth ? "음력·윤" : "음력") : "양력"}
                        </span>
                        <span>{h.year}.{pad2(h.month)}.{pad2(h.day)} · {h.time ?? "시간 모름"}</span>
                      </span>
                    </span>
                  </button>
                  <button type="button" className="icon-btn" aria-label={`${h.name} 이력 삭제`} onClick={() => onDeleteHistory(h)}>
                    <IconClose />
                  </button>
                </div>
              ))}
              {list.length === 0 && (
                <div className="hist-empty">{history.length === 0 ? "아직 조회 이력이 없습니다" : "일치하는 이력이 없습니다"}</div>
              )}
            </div>
            <div className="hist-foot">이름·성별·음/양·생년월일·태어난 시간을 기억합니다.</div>
          </div>
        )}
      </div>

      <div className="field">
        <span className="label" id="lbl-g">성별</span>
        <div className="seg" role="group" aria-labelledby="lbl-g">
          <button type="button" style={{ width: 46 }} aria-pressed={form.gender === "M"} onClick={() => onChange({ gender: "M" })}>남</button>
          <button type="button" style={{ width: 46 }} aria-pressed={form.gender === "F"} onClick={() => onChange({ gender: "F" })}>여</button>
        </div>
      </div>

      <div className="field">
        <span className="label" id="lbl-c">음력 / 양력</span>
        <div className="row" style={{ gap: 8 }}>
          <div className="seg" role="group" aria-labelledby="lbl-c">
            <button type="button" style={{ width: 52 }} aria-pressed={!lunar} onClick={() => onChange({ calendar: "SOLAR", isLeapMonth: false })}>양력</button>
            <button type="button" style={{ width: 52 }} aria-pressed={lunar} onClick={() => onChange({ calendar: "LUNAR" })}>음력</button>
          </div>
          <label className={`check${lunar ? "" : " off"}`}>
            <input type="checkbox" role="switch" checked={form.isLeapMonth} disabled={!lunar} onChange={(e) => onChange({ isLeapMonth: e.target.checked })} />
            윤달
          </label>
        </div>
      </div>

      <fieldset className="field">
        <legend>생년월일 ({lunar ? "음력" : "양력"})</legend>
        <div className="row" style={{ gap: 4 }}>
          <input aria-label="년" className="input num" style={{ width: 66 }} inputMode="numeric" maxLength={4} value={form.year} onChange={(e) => onChange({ year: digits(e.target.value) })} />
          <span className="unit">년</span>
          <input aria-label="월" className="input num" style={{ width: 44 }} inputMode="numeric" maxLength={2} value={form.month} onChange={(e) => onChange({ month: digits(e.target.value) })} />
          <span className="unit">월</span>
          <input aria-label="일" className="input num" style={{ width: 44 }} inputMode="numeric" maxLength={2} value={form.day} onChange={(e) => onChange({ day: digits(e.target.value) })} />
          <span className="unit">일</span>
        </div>
      </fieldset>

      <fieldset className="field">
        <legend>태어난 시간</legend>
        <div className="row" style={{ gap: 4 }}>
          <input id="f-time" aria-label="시 (0~23)" className="input num" style={{ width: 44 }} inputMode="numeric" maxLength={2} placeholder="시"
            value={hh} disabled={form.timeUnknown} onChange={(e) => onChange({ time: `${digits(e.target.value)}:${mm}` })} />
          <span className="unit" style={{ margin: 0 }}>:</span>
          <input aria-label="분" className="input num" style={{ width: 44 }} inputMode="numeric" maxLength={2} placeholder="분"
            value={mm} disabled={form.timeUnknown} onChange={(e) => onChange({ time: `${hh}:${digits(e.target.value)}` })} />
          <label className="check" style={{ fontSize: 14, marginLeft: 4 }}>
            <input type="checkbox" checked={form.timeUnknown} onChange={(e) => onChange({ timeUnknown: e.target.checked })} />
            모름
          </label>
        </div>
      </fieldset>

      <button type="submit" className="primary"><IconCompass />지도 생성</button>
    </form>
  );
}
