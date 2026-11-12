// 십성 / 12운성 계산 (테이블 없이 공식으로)
import { BRANCHES, STEMS, TenGod, TwelveStage } from "./constants";

/** 일간 기준 대상 천간의 십성 */
export function tenGodOfStem(dayStem: number, target: number): TenGod {
  const d = STEMS[dayStem];
  const t = STEMS[target];
  const dist = (t.element - d.element + 5) % 5; // 0 같음, 1 내가 생, 2 내가 극, 3 나를 극, 4 나를 생
  const same = t.yinYang === d.yinYang;
  return (dist * 2 + (same ? 0 : 1)) as TenGod;
}

/** 일간 기준 지지의 십성 (정기 지장간 기준) */
export function tenGodOfBranch(dayStem: number, branch: number): TenGod {
  const jeonggi = BRANCHES[branch].hidden.find((h) => h.role === "JEONGGI")!;
  return tenGodOfStem(dayStem, jeonggi.stem);
}

// 각 천간의 장생 지지 (화토동법): 甲亥 乙午 丙寅 丁酉 戊寅 己酉 庚巳 辛子 壬申 癸卯
const JANGSAENG = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3];

/** 12운성: 양간 순행, 음간 역행 */
export function twelveStage(stem: number, branch: number): TwelveStage {
  const start = JANGSAENG[stem];
  return (stem % 2 === 0
    ? (branch - start + 12) % 12
    : (start - branch + 12) % 12) as TwelveStage;
}
