// 엔진 결과 → 화면 데이터 변환 (React와 무관한 순수 함수, 단위 테스트 대상)
import {
  BRANCHES, STEMS, TEN_GOD_GROUP_HANGUL, TEN_GOD_HANGUL, TWELVE_STAGE_HANGUL, TenGodGroup,
  computeChart, computeLuck, ganzhiStem, ipchun, seunFor, wolunFor,
  type BirthInput, type LuckTimeline, type NatalChart, type Pillar, type PeriodPillar,
} from "../../engine";
import type { HistoryInput } from "./history";

/** 출생지는 서울로 고정 */
export const SEOUL = { longitude: 126.98, tzId: "Asia/Seoul" } as const;

const KST_MS = 9 * 3600_000;
const kstParts = (ms: number) => {
  const d = new Date(ms + KST_MS);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
};

// ---------------- 입력 ----------------
export interface FormState {
  name: string;
  gender: "M" | "F";
  calendar: "SOLAR" | "LUNAR";
  isLeapMonth: boolean;
  year: string;
  month: string;
  day: string;
  time: string;      // "HH:MM"
  timeUnknown: boolean;
}

export const EMPTY_FORM: FormState = {
  name: "", gender: "M", calendar: "LUNAR", isLeapMonth: false,
  year: "", month: "", day: "", time: "", timeUnknown: false,
};

export type ValidateResult = { ok: true; birth: BirthInput; history: HistoryInput } | { ok: false; error: string };

export function validateForm(f: FormState): ValidateResult {
  const name = f.name.trim();
  if (!name) return { ok: false, error: "이름을 입력하세요" };
  const y = Number(f.year), m = Number(f.month), d = Number(f.day);
  if (!/^\d{4}$/.test(f.year) || y < 1900 || y > 2100) return { ok: false, error: "생년은 1900~2100 사이 4자리로 입력하세요" };
  if (!Number.isInteger(m) || m < 1 || m > 12) return { ok: false, error: "월은 1~12 사이로 입력하세요" };
  const maxDay = f.calendar === "LUNAR" ? 30 : new Date(Date.UTC(y, m, 0)).getUTCDate();
  if (!Number.isInteger(d) || d < 1 || d > maxDay) return { ok: false, error: `일은 1~${maxDay} 사이로 입력하세요` };

  let hour: number | null = null, minute = 0;
  if (!f.timeUnknown) {
    // "8:", "08:0", "08:00" 모두 허용 (분 생략 시 0분)
    const t = /^(\d{1,2}):(\d{0,2})$/.exec(f.time);
    if (!t || +t[1] > 23 || +(t[2] || 0) > 59) return { ok: false, error: "태어난 시간(시 0~23, 분 0~59)을 입력하거나 '모름'을 선택하세요" };
    hour = +t[1];
    minute = +(t[2] || 0);
  }
  const isLeap = f.calendar === "LUNAR" && f.isLeapMonth;
  const birth: BirthInput = {
    calendar: f.calendar, isLeapMonth: isLeap, year: y, month: m, day: d,
    hour, minute, gender: f.gender, ...SEOUL,
  };
  const history: HistoryInput = {
    name, gender: f.gender, calendar: f.calendar, isLeapMonth: isLeap, year: y, month: m, day: d,
    time: hour === null ? null : `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  };
  return { ok: true, birth, history };
}

export function formFromHistory(h: HistoryInput): FormState {
  return {
    name: h.name, gender: h.gender, calendar: h.calendar, isLeapMonth: h.isLeapMonth,
    year: String(h.year), month: String(h.month), day: String(h.day),
    time: h.time ?? "", timeUnknown: h.time === null,
  };
}

// ---------------- 계산 ----------------
export interface Analysis {
  name: string;
  chart: NatalChart;
  luck: LuckTimeline;
}

export function analyze(name: string, birth: BirthInput): Analysis {
  const chart = computeChart(birth); // 음력 날짜 오류 등은 예외로 전달
  return { name, chart, luck: computeLuck(chart) };
}

// ---------------- 표시 ----------------
export interface CharCell {
  hanja: string;
  hangul: string;
  element: number; // 0 木 1 火 2 土 3 金 4 水, -1 모름
}

export interface PillarView {
  stem: CharCell;
  branch: CharCell;
  stemLabel: string;
  branchLabel: string;
}

export function pillarView(p: Pillar): PillarView {
  const s = STEMS[p.stem], b = BRANCHES[p.branch];
  return {
    stem: { hanja: s.hanja, hangul: s.hangul, element: s.element },
    branch: { hanja: b.hanja, hangul: b.hangul, element: b.element },
    stemLabel: p.stemTenGod === null ? "일간" : TEN_GOD_HANGUL[p.stemTenGod],
    branchLabel: p.branchLabel,
  };
}

const POS_LABEL = { HOUR: "시주", DAY: "일주", MONTH: "월주", YEAR: "연주" } as const;

/** 오행 없음(-1): 시간을 모를 때의 빈 칸 */
const UNKNOWN_CELL: CharCell = { hanja: "?", hangul: "", element: -1 };
const UNKNOWN_PILLAR: PillarView = { stem: UNKNOWN_CELL, branch: UNKNOWN_CELL, stemLabel: "-", branchLabel: "-" };

export interface NatalView {
  columns: (PillarView & { label: string; isDay: boolean; unknown: boolean })[]; // 시·일·월·연 순서 (시 모름이면 시주는 unknown)
  dayMaster: { hanja: string; hangul: string; element: number; yinYang: string; stage: string };
}

export function natalView(chart: NatalChart): NatalView {
  const order = ["HOUR", "DAY", "MONTH", "YEAR"] as const;
  const columns = order.map((pos) => {
    const p = chart.pillars.find((x) => x.ref.position === pos);
    if (!p) return { ...UNKNOWN_PILLAR, label: POS_LABEL[pos], isDay: false, unknown: true }; // 시간 모름 → 빈 시주
    return { ...pillarView(p), label: POS_LABEL[pos], isDay: pos === "DAY", unknown: false };
  });
  const dm = STEMS[chart.dayMaster];
  const dayPillar = chart.pillars.find((p) => p.ref.position === "DAY")!;
  return {
    columns,
    dayMaster: {
      hanja: dm.hanja, hangul: dm.hangul, element: dm.element,
      yinYang: dm.yinYang === 0 ? "양" : "음",
      stage: TWELVE_STAGE_HANGUL[dayPillar.twelveStage],
    },
  };
}

export interface TenGodGroupView {
  group: TenGodGroup;
  name: string;
  element: number;       // 이 그룹에 해당하는 오행 (일간 기준)
  relation: string;
  meaning: string;
  chars: CharCell[];
}

const GROUP_INFO: [string, string][] = [
  ["같은 오행", "자기주장·동료·경쟁·도움"],
  ["내가 생함", "표현·재능·창의·활동"],
  ["내가 극함", "재물·기회·현실·결과"],
  ["나를 극함", "직장·명예·규칙·책임"],
  ["나를 생함", "학문·지식·보호·지원"],
];

/** 원국 글자(일간 제외)를 십성 그룹별로 분류. 지지는 branchGroup(엑셀 辰 규칙 반영)을 따름 */
export function tenGodGroups(chart: NatalChart): TenGodGroupView[] {
  const dmEl = STEMS[chart.dayMaster].element;
  const groups: TenGodGroupView[] = [0, 1, 2, 3, 4].map((g) => ({
    group: g as TenGodGroup,
    name: TEN_GOD_GROUP_HANGUL[g],
    element: (dmEl + g) % 5,
    relation: GROUP_INFO[g][0],
    meaning: GROUP_INFO[g][1],
    chars: [],
  }));
  for (const p of chart.pillars) {
    const v = pillarView(p);
    if (p.stemTenGod !== null) groups[Math.floor(p.stemTenGod / 2)].chars.push(v.stem);
    groups[p.branchGroup].chars.push(v.branch);
  }
  return groups;
}

export interface LuckItem {
  key: number;
  top: string;
  sub: string;
  current: boolean;
  pillar: PillarView;
}

const tgShort = (v: PillarView) => `${v.stemLabel}·${v.branchLabel}`;
export const luckTenGodText = tgShort;

// ---------------- 나이 기준 ----------------
// KOREAN(전통나이·세는 나이): 태어난 해 = 1세. 대운수 N이면 N세가 되는 해에 대운이 바뀜
// INTERNATIONAL(만 나이): 태어난 해 = 0세. 대운수 N이면 만 N세가 되는 해에 대운이 바뀜
// 연도는 모두 입춘 기준 사주 연도. 대운·세운·나이 표시가 항상 같은 기준을 쓰도록 이 함수들만 사용한다.
export type AgeMode = "KOREAN" | "INTERNATIONAL";

const ageOffset = (mode: AgeMode) => (mode === "KOREAN" ? 1 : 0);

/** 태어난 사주 연도 (연주의 해, 입춘 기준) */
export function birthSajuYear(a: Analysis): number {
  return sajuYearAt(a.chart.birth.utcMs);
}

export function ageInYear(a: Analysis, year: number, mode: AgeMode): number {
  return year - birthSajuYear(a) + ageOffset(mode);
}

/** i번째 대운(0부터)이 시작되는 사주 연도 */
export function daeunStartYear(a: Analysis, i: number, mode: AgeMode): number {
  return birthSajuYear(a) + a.luck.daeun[i].startAge - ageOffset(mode);
}

/** i번째 대운의 10개 세운 연도 = 대운 나이 범위(startAge ~ startAge+9)에 해당하는 연도 */
export function seunYearsOf(a: Analysis, i: number, mode: AgeMode): number[] {
  const y0 = daeunStartYear(a, i, mode);
  return Array.from({ length: 10 }, (_, k) => y0 + k);
}

/** 사주 연도 year가 속한 대운 인덱스 (첫 대운 이전이면 -1) */
export function daeunIndexOfYear(a: Analysis, year: number, mode: AgeMode): number {
  const n = a.luck.daeun.length;
  for (let i = n - 1; i >= 0; i--) if (year >= daeunStartYear(a, i, mode)) return year < daeunStartYear(a, i, mode) + 10 ? i : -1;
  return -1;
}

/** 시각 now가 속한 사주 연도 (입춘 기준) */
export function sajuYearAt(now: number): number {
  const y = kstParts(now).y;
  return now >= ipchun(y).utcMs ? y : y - 1;
}

export function daeunItems(a: Analysis, now: number, mode: AgeMode): LuckItem[] {
  const cur = daeunIndexOfYear(a, sajuYearAt(now), mode);
  return a.luck.daeun.map((c, i) => ({
    key: i,
    top: `${c.startAge}–${c.startAge + 9}세`,
    sub: `${daeunStartYear(a, i, mode)}~`,
    current: i === cur,
    pillar: pillarView(c.pillar),
  }));
}

export function seunItems(a: Analysis, daeunIndex: number, now: number, mode: AgeMode): LuckItem[] {
  const curYear = sajuYearAt(now);
  return seunYearsOf(a, daeunIndex, mode).map((y) => {
    const s: PeriodPillar = seunFor(a.chart, y);
    const age = `${ageInYear(a, y, mode)}세`;
    return {
      key: y,
      top: `${y}년`,
      sub: y === curYear ? `올해 · ${age}` : age,
      current: y === curYear,
      pillar: pillarView(s.pillar),
    };
  });
}

const JIE_NAME = ["대설", "소한", "입춘", "경칩", "청명", "입하", "망종", "소서", "입추", "백로", "한로", "입동"]; // 월지 인덱스 순

export function wolunItems(a: Analysis, year: number, now: number): LuckItem[] {
  return wolunFor(a.chart, year).map((w, i) => {
    const s = kstParts(w.startUtcMs);
    const current = now >= w.startUtcMs && now < w.endUtcMs;
    return {
      key: i,
      top: `${s.m}월`,
      sub: current ? "이번 달" : `${JIE_NAME[w.pillar.branch]} ${s.m}.${s.d}`,
      current,
      pillar: pillarView(w.pillar),
    };
  });
}

/** 대운 i를 골랐을 때의 세운·월운 기본 선택 (올해가 포함되면 올해, 아니면 첫 해) */
export function selectionForDaeun(a: Analysis, daeun: number, now: number, mode: AgeMode): { daeun: number; year: number; month: number } {
  const years = seunYearsOf(a, daeun, mode);
  const thisYear = sajuYearAt(now);
  const year = years.includes(thisYear) ? thisYear : years[0];
  const mi = wolunItems(a, year, now).findIndex((m) => m.current);
  return { daeun, year, month: mi >= 0 ? mi : 0 };
}

/** 화면 첫 선택값: 현재 대운 / 올해 / 이번 달 (해당 없으면 첫 항목) */
export function initialSelection(a: Analysis, now: number, mode: AgeMode): { daeun: number; year: number; month: number } {
  const cur = daeunIndexOfYear(a, sajuYearAt(now), mode);
  return selectionForDaeun(a, cur >= 0 ? cur : 0, now, mode);
}

export function ganzhiText(p: PillarView): string {
  return p.stem.hanja + p.branch.hanja;
}

export { ganzhiStem };
