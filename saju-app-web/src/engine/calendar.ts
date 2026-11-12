// 외부 천문/역법 라이브러리 어댑터 (lunar-javascript 의존성은 이 파일에만 존재)
// - 음력 → 양력 변환
// - 12절(節) 입절 시각 (UTC 절대시각)
import lunarLib from "lunar-javascript";

const { Lunar } = lunarLib;

export interface Ymd { y: number; m: number; d: number }

/** 음력 → 양력. isLeapMonth=true면 윤달 */
export function lunarToSolar(y: number, m: number, d: number, isLeapMonth: boolean): Ymd {
  let solar;
  try {
    solar = Lunar.fromYmd(y, isLeapMonth ? -m : m, d).getSolar();
  } catch (e) {
    throw new Error(`유효하지 않은 음력 날짜: ${y}-${isLeapMonth ? "윤" : ""}${m}-${d} (${(e as Error).message})`);
  }
  return { y: solar.getYear(), m: solar.getMonth(), d: solar.getDay() };
}

// 월의 시작이 되는 12절(節)과 해당 월지(지지 인덱스)
// 라이브러리는 직전/다음 해 항목을 병음 키로 제공하므로 둘 다 매핑
const JIE_BRANCH: Record<string, number> = {
  "小寒": 1, "XIAO_HAN": 1,   // 丑월
  "立春": 2, "LI_CHUN": 2,    // 寅월
  "惊蛰": 3, "JING_ZHE": 3,   // 卯월
  "清明": 4,                  // 辰월
  "立夏": 5,                  // 巳월
  "芒种": 6,                  // 午월
  "小暑": 7,                  // 未월
  "立秋": 8,                  // 申월
  "白露": 9,                  // 酉월
  "寒露": 10,                 // 戌월
  "立冬": 11,                 // 亥월
  "大雪": 0, "DA_XUE": 0,     // 子월
};

export interface JieInstant {
  utcMs: number;    // 입절 절대시각 (UTC epoch ms)
  branch: number;   // 이 절부터 시작되는 월지
  solarYear: number; // 입절 시각의 양력 연도 (입춘이면 사주 연도)
}

const CST_OFFSET_MS = 8 * 3600_000; // 라이브러리 절기 시각은 중국 표준시(UTC+8)
const cache = new Map<number, JieInstant[]>();

/** 해당 음력 연도 테이블에서 12절 추출 */
function jieOfLunarYear(lunarYear: number): JieInstant[] {
  const hit = cache.get(lunarYear);
  if (hit) return hit;
  const table = Lunar.fromYmd(lunarYear, 1, 1).getJieQiTable();
  const out: JieInstant[] = [];
  for (const [name, solar] of Object.entries(table)) {
    const branch = JIE_BRANCH[name];
    if (branch === undefined) continue;
    const utcMs = Date.UTC(solar.getYear(), solar.getMonth() - 1, solar.getDay(),
      solar.getHour(), solar.getMinute(), solar.getSecond()) - CST_OFFSET_MS;
    out.push({ utcMs, branch, solarYear: solar.getYear() });
  }
  cache.set(lunarYear, out);
  return out;
}

/** 주어진 양력 연도 전후를 포괄하는 12절 목록 (시간순, 중복 제거) */
export function jieAround(solarYear: number): JieInstant[] {
  const all = [solarYear - 1, solarYear, solarYear + 1].flatMap(jieOfLunarYear);
  const map = new Map<number, JieInstant>();
  for (const j of all) map.set(Math.round(j.utcMs / 60000), j); // 분 단위로 중복 제거
  return [...map.values()].sort((a, b) => a.utcMs - b.utcMs);
}

/** 시각 t 이전(포함) 가장 가까운 절 */
export function prevJie(utcMs: number): JieInstant {
  const y = new Date(utcMs).getUTCFullYear();
  const list = jieAround(y);
  for (let i = list.length - 1; i >= 0; i--) if (list[i].utcMs <= utcMs) return list[i];
  throw new Error("이전 절기를 찾을 수 없음");
}

/** 시각 t 이후(초과) 가장 가까운 절 */
export function nextJie(utcMs: number): JieInstant {
  const y = new Date(utcMs).getUTCFullYear();
  const list = jieAround(y);
  for (const j of list) if (j.utcMs > utcMs) return j;
  throw new Error("다음 절기를 찾을 수 없음");
}

/** 해당 양력 연도의 입춘 시각 */
export function ipchun(solarYear: number): JieInstant {
  const j = jieAround(solarYear).find((x) => x.branch === 2 && x.solarYear === solarYear);
  if (!j) throw new Error(`${solarYear}년 입춘을 찾을 수 없음`);
  return j;
}

/** 입춘(寅)부터 다음 해 입춘 직전까지의 12절 (월운 계산용) */
export function jieOfSajuYear(solarYear: number): JieInstant[] {
  const start = ipchun(solarYear).utcMs;
  const end = ipchun(solarYear + 1).utcMs;
  const list = [...jieAround(solarYear), ...jieAround(solarYear + 1)];
  const map = new Map<number, JieInstant>();
  for (const j of list) if (j.utcMs >= start && j.utcMs < end) map.set(Math.round(j.utcMs / 60000), j);
  return [...map.values()].sort((a, b) => a.utcMs - b.utcMs);
}
