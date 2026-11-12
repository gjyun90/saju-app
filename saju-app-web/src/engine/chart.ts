// 원국(4주) 계산
import { BRANCHES, ganzhiBranch, ganzhiIndex, ganzhiStem } from "./constants";
import { ipchun, prevJie } from "./calendar";
import { tenGodOfStem, twelveStage } from "./tengod";
import { branchTenGod } from "./tengodTable";
import { BirthInput, CalcOptions, DEFAULT_OPTIONS, normalizeBirth, NormalizedBirth } from "./time";
import type { NatalChart, Pillar, PillarRef } from "./types";

/** 그레고리력 율리우스 일수 */
export function julianDayNumber(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4)
    - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

/** 날짜의 일진 (60갑자 인덱스) */
export function dayGanzhi(y: number, m: number, d: number): number {
  return (julianDayNumber(y, m, d) + 49) % 60;
}

function addDays(y: number, m: number, d: number, n: number) {
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

/** 기둥 하나 생성 (일간 기준 십성/12운성 포함) */
export function buildPillar(ref: PillarRef, ganzhi: number, dayMaster: number, opt: CalcOptions = DEFAULT_OPTIONS): Pillar {
  const stem = ganzhiStem(ganzhi);
  const branch = ganzhiBranch(ganzhi);
  const isDayMaster = ref.layer === "NATAL" && ref.position === "DAY";
  const btg = branchTenGod(dayMaster, branch, opt);
  return {
    ref,
    ganzhi,
    stem,
    branch,
    stemTenGod: isDayMaster ? null : tenGodOfStem(dayMaster, stem),
    branchTenGod: btg.tenGod,
    branchGroup: btg.group,
    branchLabel: btg.label,
    branchTenGodSource: btg.source,
    hidden: BRANCHES[branch].hidden.map((h) => ({ ...h, tenGod: tenGodOfStem(dayMaster, h.stem) })),
    twelveStage: twelveStage(dayMaster, branch),
  };
}

/** 년주: 입춘 기준 */
export function yearGanzhiAt(utcMs: number, approxYear: number): { ganzhi: number; sajuYear: number } {
  let y = approxYear + 1;
  while (utcMs < ipchun(y).utcMs) y--;
  return { ganzhi: (((y - 4) % 60) + 60) % 60, sajuYear: y };
}

/** 월주: 직전 절(節) 기준, 월간은 년간에서 유도 (갑기년 병인월 ...) */
export function monthGanzhiAt(utcMs: number, yearStem: number): number {
  const branch = prevJie(utcMs).branch;
  const fromIn = (branch - 2 + 12) % 12;
  const stem = ((yearStem % 5) * 2 + 2 + fromIn) % 10;
  return ganzhiIndex(stem, branch);
}

/** 시지 인덱스 (0=子) */
export function hourBranchOf(h: number, mi: number, boundary: CalcOptions["hourBoundary"]): number {
  const shift = boundary === "ODD" ? 60 : 30;
  const minutes = (h * 60 + mi + shift) % 1440;
  return Math.floor(minutes / 120);
}

export function computeChartFromNormalized(birth: NormalizedBirth, opt: CalcOptions): NatalChart {
  const { ganzhi: yGz } = yearGanzhiAt(birth.utcMs, birth.solarDate.y);
  const mGz = monthGanzhiAt(birth.utcMs, ganzhiStem(yGz));

  const e = birth.effective;
  let dayDate = { y: e.y, m: e.m, d: e.d };
  let hourGz: number | null = null;

  if (birth.hourKnown) {
    const hb = hourBranchOf(e.h, e.mi, opt.hourBoundary);
    const lateJa = hb === 0 && e.h >= 12; // 자정 이전의 子시 (야자시 구간)
    let stemDayForHour = dayDate;
    if (lateJa) {
      const next = addDays(e.y, e.m, e.d, 1);
      stemDayForHour = next;                       // 시간(時干)은 두 학파 모두 익일 기준
      if (opt.jasiMode === "UNIFIED") dayDate = next; // 일주까지 익일로 넘김
    }
    const hDayStem = ganzhiStem(dayGanzhi(stemDayForHour.y, stemDayForHour.m, stemDayForHour.d));
    hourGz = ganzhiIndex(((hDayStem % 5) * 2 + hb) % 10, hb);
  }

  const dGz = dayGanzhi(dayDate.y, dayDate.m, dayDate.d);
  const dayMaster = ganzhiStem(dGz);

  const pillars: Pillar[] = [
    buildPillar({ layer: "NATAL", position: "YEAR" }, yGz, dayMaster, opt),
    buildPillar({ layer: "NATAL", position: "MONTH" }, mGz, dayMaster, opt),
    buildPillar({ layer: "NATAL", position: "DAY" }, dGz, dayMaster, opt),
  ];
  if (hourGz !== null) pillars.push(buildPillar({ layer: "NATAL", position: "HOUR" }, hourGz, dayMaster, opt));

  return { birth, options: opt, pillars, dayMaster };
}

export function computeChart(input: BirthInput, opt: CalcOptions = DEFAULT_OPTIONS): NatalChart {
  return computeChartFromNormalized(normalizeBirth(input, opt), opt);
}

export const pillarAt = (chart: NatalChart, pos: "YEAR" | "MONTH" | "DAY" | "HOUR") =>
  chart.pillars.find((p) => p.ref.position === pos);
