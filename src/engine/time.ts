// 입력 정규화: 음력→양력, 표준시/서머타임 이력, 진태양시(경도 + 균시차)
import { lunarToSolar } from "./calendar";

export interface CalcOptions {
  useTrueSolarTime: boolean;          // true: 경도 + 균시차 보정한 진태양시로 일/시주 판정
  jasiMode: "SPLIT" | "UNIFIED";      // SPLIT: 23시~자정은 당일 일주(야자시) / UNIFIED: 23시부터 익일 일주
  hourBoundary: "ODD" | "HALF";       // ODD: 23,1,3..시 경계 / HALF: 23:30,1:30..경계 (보정 없이 시계시각 쓸 때 관행)
  daeunNumberRounding: "FLOOR" | "ROUND";
  branchTenGodTable: "EXCEL_JIN" | "ENGINE"; // EXCEL_JIN: 지지 辰의 십신을 외부 조견표(엑셀 P열) 값으로 사용
  schoolId: string;
}

export const DEFAULT_OPTIONS: CalcOptions = {
  useTrueSolarTime: true,
  jasiMode: "SPLIT",
  hourBoundary: "ODD",
  daeunNumberRounding: "ROUND",
  branchTenGodTable: "EXCEL_JIN",
  schoolId: "default",
};

export interface BirthInput {
  calendar: "SOLAR" | "LUNAR";
  isLeapMonth: boolean;
  year: number;
  month: number;
  day: number;
  hour: number | null; // null = 시 모름 → 삼주
  minute: number;
  gender: "M" | "F";
  longitude: number;   // 출생지 경도 (서울 126.98)
  tzId: string;        // IANA 타임존 (Asia/Seoul) → 서머타임/표준시 변경 이력 자동 반영
}

export interface LocalDateTime { y: number; m: number; d: number; h: number; mi: number }

export interface Correction {
  kind: "LONGITUDE" | "EQ_OF_TIME";
  minutes: number;
}

export interface NormalizedBirth {
  input: BirthInput;
  solarDate: { y: number; m: number; d: number }; // 양력 날짜 (음력 입력이면 변환 결과)
  utcMs: number;                 // 출생 절대시각 (년/월주, 대운 계산 기준)
  utcOffsetMinutes: number;      // 당시 실제 적용된 UTC 오프셋 (서머타임 포함, 예: +540, +600, +510)
  clock: LocalDateTime;          // 입력된 시계 시각
  effective: LocalDateTime;      // 일/시주 판정 기준 시각 (진태양시 또는 시계 시각)
  corrections: Correction[];     // 시계 시각 → 진태양시 보정 내역
  hourKnown: boolean;
}

// ---- 타임존 처리 (Intl 사용: Node/브라우저/iPad Safari 공통) ----
const fmtCache = new Map<string, Intl.DateTimeFormat>();
function offsetMinutesAt(utcMs: number, tzId: string): number {
  let fmt = fmtCache.get(tzId);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-US", { timeZone: tzId, timeZoneName: "longOffset" });
    fmtCache.set(tzId, fmt);
  }
  const name = fmt.formatToParts(new Date(utcMs)).find((p) => p.type === "timeZoneName")!.value; // "GMT+08:30"
  const m = /GMT([+-])(\d{2}):?(\d{2})?/.exec(name);
  if (!m) return 0; // "GMT"
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (parseInt(m[2], 10) * 60 + parseInt(m[3] ?? "0", 10));
}

/** 현지 벽시계 시각 → UTC ms (서머타임 전환 구간은 앞쪽 오프셋 우선) */
export function zonedToUtc(t: LocalDateTime, tzId: string): { utcMs: number; offset: number } {
  const naive = Date.UTC(t.y, t.m - 1, t.d, t.h, t.mi);
  let offset = offsetMinutesAt(naive, tzId);
  let utc = naive - offset * 60000;
  const offset2 = offsetMinutesAt(utc, tzId);
  if (offset2 !== offset) {
    offset = offset2;
    utc = naive - offset * 60000;
  }
  return { utcMs: utc, offset };
}

/** 균시차(분) - NOAA 근사식, 오차 약 ±1분 */
export function equationOfTime(utcMs: number): number {
  const d = new Date(utcMs);
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  const n = Math.floor((utcMs - start) / 86400000) + 1;
  const b = (2 * Math.PI * (n - 81)) / 364;
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
}

function msToLocal(ms: number): LocalDateTime {
  const d = new Date(ms);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes() };
}

export function normalizeBirth(input: BirthInput, opt: CalcOptions = DEFAULT_OPTIONS): NormalizedBirth {
  const date = input.calendar === "LUNAR"
    ? lunarToSolar(input.year, input.month, input.day, input.isLeapMonth)
    : { y: input.year, m: input.month, d: input.day };

  const hourKnown = input.hour !== null;
  // 시 모름: 정오로 두고 시주는 계산하지 않음 (일주 판정이 자정 경계에 걸리지 않도록)
  const clock: LocalDateTime = { ...date, h: input.hour ?? 12, mi: hourKnown ? input.minute : 0 };
  const { utcMs, offset } = zonedToUtc(clock, input.tzId);

  let effective = clock;
  const corrections: Correction[] = [];
  if (opt.useTrueSolarTime && hourKnown) {
    const lonMin = input.longitude * 4 - offset; // 지방평균시 - 시계시각
    const eot = equationOfTime(utcMs);
    corrections.push({ kind: "LONGITUDE", minutes: round1(lonMin) });
    corrections.push({ kind: "EQ_OF_TIME", minutes: round1(eot) });
    effective = msToLocal(utcMs + (input.longitude * 4 + eot) * 60000);
  }

  return { input, solarDate: date, utcMs, utcOffsetMinutes: offset, clock, effective, corrections, hourKnown };
}

const round1 = (x: number) => Math.round(x * 10) / 10;
