// 지지 십신 판정: 엔진 공식 + 외부 조견표 오버라이드
//
// 외부 데이터 출처: saju_algorithm_manual_and_calculator_v2_3.xlsx
//   시트 '십신_조견매트릭스', P4:P13 (辰 열)
// 이 열은 개별 십신(편재/정재 등)이 아니라 그룹명(식상/비겁/...)으로 기록되어 있으므로
// 辰에 대해서는 십신(TenGod)은 null, 그룹(TenGodGroup)만 확정된다.
import { BRANCHES, TEN_GOD_GROUP_HANGUL, TEN_GOD_HANGUL, TenGod, TenGodGroup, branchByHanja, groupOfTenGod } from "./constants";
import { tenGodOfBranch } from "./tengod";
import type { CalcOptions } from "./time";

const G = TenGodGroup;

/** 엑셀 조견표 辰 열. 인덱스 = 일간 천간 (0=甲 ... 9=癸) */
export const EXCEL_JIN_COLUMN: readonly TenGodGroup[] = [
  G.SIKSANG,   // 甲
  G.SIKSANG,   // 乙
  G.BIGEOP,    // 丙
  G.BIGEOP,    // 丁
  G.INSEONG,   // 戊
  G.INSEONG,   // 己
  G.GWANSEONG, // 庚
  G.GWANSEONG, // 辛
  G.JAESEONG,  // 壬
  G.JAESEONG,  // 癸
];

const JIN = branchByHanja("辰");

export type TenGodSource = "ENGINE" | "EXCEL_TABLE";

export interface BranchTenGodResult {
  tenGod: TenGod | null;   // 개별 십신 (외부 표가 그룹만 줄 때는 null)
  group: TenGodGroup;      // 십신 그룹 (십성 관계 지도 분류에 사용)
  label: string;           // 표시용 (십신명 또는 그룹명)
  source: TenGodSource;
}

/** 일간 기준 지지 십신. options.branchTenGodTable에 따라 辰 열을 외부 표로 대체 */
export function branchTenGod(dayStem: number, branch: number, opt: Pick<CalcOptions, "branchTenGodTable">): BranchTenGodResult {
  if (opt.branchTenGodTable === "EXCEL_JIN" && branch === JIN) {
    const group = EXCEL_JIN_COLUMN[dayStem];
    return { tenGod: null, group, label: TEN_GOD_GROUP_HANGUL[group], source: "EXCEL_TABLE" };
  }
  const tg = tenGodOfBranch(dayStem, branch);
  return { tenGod: tg, group: groupOfTenGod(tg), label: TEN_GOD_HANGUL[tg], source: "ENGINE" };
}

/** 표시용: 지지 하나의 엔진값과 외부표 값 비교 (설정 화면 등) */
export function describeJinOverride(dayStem: number): { engine: string; table: string } {
  return {
    engine: TEN_GOD_HANGUL[tenGodOfBranch(dayStem, JIN)],
    table: TEN_GOD_GROUP_HANGUL[EXCEL_JIN_COLUMN[dayStem]],
  };
}

export { BRANCHES };
