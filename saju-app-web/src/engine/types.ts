// 계산 결과 모델
import type { TenGod, TenGodGroup, TwelveStage, HiddenRole, Element } from "./constants";
import type { NormalizedBirth, CalcOptions } from "./time";
import type { TenGodSource } from "./tengodTable";

export type Layer = "NATAL" | "DAEUN" | "SEUN" | "WOLUN";
export type Position = "YEAR" | "MONTH" | "DAY" | "HOUR";

export interface PillarRef {
  layer: Layer;
  position?: Position; // NATAL 전용
}

export interface Pillar {
  ref: PillarRef;
  ganzhi: number;               // 60갑자 인덱스
  stem: number;
  branch: number;
  stemTenGod: TenGod | null;    // 일간 자신은 null
  branchTenGod: TenGod | null;  // 정기 기준. 외부 표가 그룹만 줄 때(辰) null
  branchGroup: TenGodGroup;     // 지지 십신 그룹 (항상 존재)
  branchLabel: string;          // 표시용 십신명 또는 그룹명
  branchTenGodSource: TenGodSource;
  hidden: { stem: number; role: HiddenRole; days: number; tenGod: TenGod }[];
  twelveStage: TwelveStage;     // 일간 기준
}

export interface NatalChart {
  birth: NormalizedBirth;
  options: CalcOptions;
  pillars: Pillar[];            // 년, 월, 일, (시)
  dayMaster: number;            // 일간 천간 인덱스
}

export interface LuckCycle {
  order: number;                // 1부터
  pillar: Pillar;
  startUtcMs: number;           // 교운 시각
  endUtcMs: number;
  startAge: number;             // 대운수 기준 나이 (대운수 + 10*(order-1))
}

export interface LuckTimeline {
  direction: "FORWARD" | "BACKWARD";
  offset: { years: number; months: number; days: number; hours: number }; // 출생 ~ 첫 대운
  daeunNumber: number;          // 대운수
  daeun: LuckCycle[];
}

export interface PeriodPillar {
  pillar: Pillar;
  startUtcMs: number;           // 세운: 입춘 / 월운: 입절
  endUtcMs: number;
}

export interface LayeredChart {
  natal: NatalChart;
  daeun?: Pillar;
  seun?: Pillar;
  wolun?: Pillar;
  atUtcMs?: number;
}

// ---- 관계 ----
export type RelationType =
  | "STEM_HAP" | "STEM_CHUNG"
  | "YUKHAP" | "SAMHAP" | "BANHAP" | "BANGHAP"
  | "CHUNG" | "HYUNG" | "PA" | "HAE" | "WONJIN" | "GWIMUN";

export interface RelationParticipant {
  ref: PillarRef;
  part: "STEM" | "BRANCH";
  index: number;                // 천간 또는 지지 인덱스
}

export interface Relation {
  type: RelationType;
  participants: RelationParticipant[];
  complete: boolean;            // 삼합/방합/삼형 완성 여부 (쌍 관계는 true)
  result?: Element;             // 합화 오행
  variant?: string;             // 예: 반합 왕지 포함 여부 "WITH_CENTER" | "NO_CENTER", 자형 "SELF"
  layers: Layer[];              // 관여 레이어 (중복 제거)
}
