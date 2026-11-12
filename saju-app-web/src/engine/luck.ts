// 대운 / 세운 / 월운
import { ganzhiStem } from "./constants";
import { ipchun, jieOfSajuYear, nextJie, prevJie } from "./calendar";
import { buildPillar, monthGanzhiAt, pillarAt, yearGanzhiAt } from "./chart";
import { ganzhiIndex } from "./constants";
import type { LayeredChart, LuckCycle, LuckTimeline, NatalChart, PeriodPillar } from "./types";

const DAEUN_COUNT = 10;

/** 로컬 시각 기준 달력 덧셈 (연/월/일/시) */
function addLocal(utcMs: number, offsetMin: number, a: { years: number; months: number; days: number; hours: number }): number {
  const d = new Date(utcMs + offsetMin * 60000);
  const t = Date.UTC(d.getUTCFullYear() + a.years, d.getUTCMonth() + a.months, d.getUTCDate() + a.days,
    d.getUTCHours() + a.hours, d.getUTCMinutes());
  return t - offsetMin * 60000;
}

export function computeLuck(chart: NatalChart): LuckTimeline {
  const { birth, options } = chart;
  const yearStem = ganzhiStem(pillarAt(chart, "YEAR")!.ganzhi);
  const monthGz = pillarAt(chart, "MONTH")!.ganzhi;

  // 양년 남자 / 음년 여자 → 순행
  const yangYear = yearStem % 2 === 0;
  const male = birth.input.gender === "M";
  const direction = yangYear === male ? "FORWARD" : "BACKWARD";

  // 순행: 다음 절까지 / 역행: 직전 절까지
  const target = direction === "FORWARD" ? nextJie(birth.utcMs) : prevJie(birth.utcMs);
  const diffMin = Math.abs(target.utcMs - birth.utcMs) / 60000;

  // 3일 = 1년, 1일 = 4개월, 2시간 = 10일 → 1분 = 1/12일(30일 월 기준)
  const total = diffMin / 12;
  const years = Math.floor(total / 360);
  const months = Math.floor((total % 360) / 30);
  const dayFrac = total % 30;
  const days = Math.floor(dayFrac);
  const hours = Math.floor((dayFrac - days) * 24);
  const offset = { years, months, days, hours };

  const diffDays = diffMin / 1440;
  const raw = diffDays / 3;
  const daeunNumber = Math.max(1, options.daeunNumberRounding === "ROUND" ? Math.round(raw) : Math.floor(raw));

  const firstStart = addLocal(birth.utcMs, birth.utcOffsetMinutes, offset);
  const step = direction === "FORWARD" ? 1 : -1;
  const daeun: LuckCycle[] = [];
  for (let i = 1; i <= DAEUN_COUNT; i++) {
    const startUtcMs = addLocal(firstStart, birth.utcOffsetMinutes, { years: 10 * (i - 1), months: 0, days: 0, hours: 0 });
    const endUtcMs = addLocal(firstStart, birth.utcOffsetMinutes, { years: 10 * i, months: 0, days: 0, hours: 0 });
    const gz = (((monthGz + step * i) % 60) + 60) % 60;
    daeun.push({
      order: i,
      pillar: buildPillar({ layer: "DAEUN" }, gz, chart.dayMaster, chart.options),
      startUtcMs,
      endUtcMs,
      startAge: daeunNumber + 10 * (i - 1),
    });
  }
  return { direction, offset, daeunNumber, daeun };
}

/** 특정 시각의 대운 (첫 대운 이전이면 undefined) */
export function daeunAt(timeline: LuckTimeline, utcMs: number): LuckCycle | undefined {
  return timeline.daeun.find((c) => utcMs >= c.startUtcMs && utcMs < c.endUtcMs);
}

/** 세운: 사주 연도(입춘~다음 입춘) */
export function seunFor(chart: NatalChart, year: number): PeriodPillar {
  const gz = (((year - 4) % 60) + 60) % 60;
  return {
    pillar: buildPillar({ layer: "SEUN" }, gz, chart.dayMaster, chart.options),
    startUtcMs: ipchun(year).utcMs,
    endUtcMs: ipchun(year + 1).utcMs,
  };
}

/** 월운: 해당 사주 연도의 12개월 (寅월~丑월) */
export function wolunFor(chart: NatalChart, year: number): PeriodPillar[] {
  const yearStem = ganzhiStem((((year - 4) % 60) + 60) % 60);
  const jie = jieOfSajuYear(year);
  const end = ipchun(year + 1).utcMs;
  return jie.map((j, i) => {
    const fromIn = (j.branch - 2 + 12) % 12;
    const gz = ganzhiIndex(((yearStem % 5) * 2 + 2 + fromIn) % 10, j.branch);
    return {
      pillar: buildPillar({ layer: "WOLUN" }, gz, chart.dayMaster, chart.options),
      startUtcMs: j.utcMs,
      endUtcMs: i + 1 < jie.length ? jie[i + 1].utcMs : end,
    };
  });
}

/** 특정 시각 기준 원국 + 대운 + 세운 + 월운 */
export function layeredAt(chart: NatalChart, timeline: LuckTimeline, utcMs: number): LayeredChart {
  const approxYear = new Date(utcMs).getUTCFullYear();
  const { ganzhi: yGz } = yearGanzhiAt(utcMs, approxYear);
  const mGz = monthGanzhiAt(utcMs, ganzhiStem(yGz));
  return {
    natal: chart,
    daeun: daeunAt(timeline, utcMs)?.pillar,
    seun: buildPillar({ layer: "SEUN" }, yGz, chart.dayMaster, chart.options),
    wolun: buildPillar({ layer: "WOLUN" }, mGz, chart.dayMaster, chart.options),
    atUtcMs: utcMs,
  };
}
