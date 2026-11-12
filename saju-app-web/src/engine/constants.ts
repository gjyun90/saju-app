// 사주 계산 엔진 - 기초 마스터 데이터 (불변 상수)
// 모든 값은 정수 인덱스 기준. 천간 0=甲..9=癸, 지지 0=子..11=亥, 60갑자 0=甲子..59=癸亥

export enum Element { WOOD = 0, FIRE = 1, EARTH = 2, METAL = 3, WATER = 4 } // 상생 순서
export enum YinYang { YANG = 0, YIN = 1 }

export const ELEMENT_HANJA = ["木", "火", "土", "金", "水"] as const;
export const ELEMENT_HANGUL = ["목", "화", "토", "금", "수"] as const;

export interface Stem {
  index: number;
  hanja: string;
  hangul: string;
  element: Element;
  yinYang: YinYang;
}

export const STEMS: readonly Stem[] = [
  ["甲", "갑"], ["乙", "을"], ["丙", "병"], ["丁", "정"], ["戊", "무"],
  ["己", "기"], ["庚", "경"], ["辛", "신"], ["壬", "임"], ["癸", "계"],
].map(([hanja, hangul], index) => ({
  index,
  hanja,
  hangul,
  element: Math.floor(index / 2) as Element,
  yinYang: (index % 2) as YinYang,
}));

export type HiddenRole = "YEOGI" | "JUNGGI" | "JEONGGI"; // 여기 / 중기 / 정기(본기)

export interface HiddenStem {
  stem: number;
  role: HiddenRole;
  days: number; // 월률분야 일수
}

export interface Branch {
  index: number;
  hanja: string;
  hangul: string;
  animal: string;
  element: Element;
  yinYang: YinYang; // 체(體) 기준 음양. 십성은 정기(본기) 지장간으로 계산
  hidden: HiddenStem[];
}

const s = (h: string) => STEMS.findIndex((x) => x.hanja === h);
const hs = (list: [string, HiddenRole, number][]): HiddenStem[] =>
  list.map(([h, role, days]) => ({ stem: s(h), role, days }));

export const BRANCHES: readonly Branch[] = [
  { index: 0, hanja: "子", hangul: "자", animal: "쥐", element: Element.WATER, yinYang: YinYang.YANG,
    hidden: hs([["壬", "YEOGI", 10], ["癸", "JEONGGI", 20]]) },
  { index: 1, hanja: "丑", hangul: "축", animal: "소", element: Element.EARTH, yinYang: YinYang.YIN,
    hidden: hs([["癸", "YEOGI", 9], ["辛", "JUNGGI", 3], ["己", "JEONGGI", 18]]) },
  { index: 2, hanja: "寅", hangul: "인", animal: "호랑이", element: Element.WOOD, yinYang: YinYang.YANG,
    hidden: hs([["戊", "YEOGI", 7], ["丙", "JUNGGI", 7], ["甲", "JEONGGI", 16]]) },
  { index: 3, hanja: "卯", hangul: "묘", animal: "토끼", element: Element.WOOD, yinYang: YinYang.YIN,
    hidden: hs([["甲", "YEOGI", 10], ["乙", "JEONGGI", 20]]) },
  { index: 4, hanja: "辰", hangul: "진", animal: "용", element: Element.EARTH, yinYang: YinYang.YANG,
    hidden: hs([["乙", "YEOGI", 9], ["癸", "JUNGGI", 3], ["戊", "JEONGGI", 18]]) },
  { index: 5, hanja: "巳", hangul: "사", animal: "뱀", element: Element.FIRE, yinYang: YinYang.YIN,
    hidden: hs([["戊", "YEOGI", 7], ["庚", "JUNGGI", 7], ["丙", "JEONGGI", 16]]) },
  { index: 6, hanja: "午", hangul: "오", animal: "말", element: Element.FIRE, yinYang: YinYang.YANG,
    hidden: hs([["丙", "YEOGI", 10], ["己", "JUNGGI", 9], ["丁", "JEONGGI", 11]]) },
  { index: 7, hanja: "未", hangul: "미", animal: "양", element: Element.EARTH, yinYang: YinYang.YIN,
    hidden: hs([["丁", "YEOGI", 9], ["乙", "JUNGGI", 3], ["己", "JEONGGI", 18]]) },
  { index: 8, hanja: "申", hangul: "신", animal: "원숭이", element: Element.METAL, yinYang: YinYang.YANG,
    hidden: hs([["戊", "YEOGI", 7], ["壬", "JUNGGI", 7], ["庚", "JEONGGI", 16]]) },
  { index: 9, hanja: "酉", hangul: "유", animal: "닭", element: Element.METAL, yinYang: YinYang.YIN,
    hidden: hs([["庚", "YEOGI", 10], ["辛", "JEONGGI", 20]]) },
  { index: 10, hanja: "戌", hangul: "술", animal: "개", element: Element.EARTH, yinYang: YinYang.YANG,
    hidden: hs([["辛", "YEOGI", 9], ["丁", "JUNGGI", 3], ["戊", "JEONGGI", 18]]) },
  { index: 11, hanja: "亥", hangul: "해", animal: "돼지", element: Element.WATER, yinYang: YinYang.YIN,
    hidden: hs([["戊", "YEOGI", 7], ["甲", "JUNGGI", 7], ["壬", "JEONGGI", 16]]) },
];

export enum TenGod {
  BIGYEON, GEOPJAE, SIKSIN, SANGGWAN, PYEONJAE,
  JEONGJAE, PYEONGWAN, JEONGGWAN, PYEONIN, JEONGIN,
}
export const TEN_GOD_HANGUL = [
  "비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인",
] as const;

/** 십신 그룹 (십신 인덱스 / 2) */
export enum TenGodGroup { BIGEOP, SIKSANG, JAESEONG, GWANSEONG, INSEONG }
export const TEN_GOD_GROUP_HANGUL = ["비겁", "식상", "재성", "관성", "인성"] as const;
export const groupOfTenGod = (t: TenGod): TenGodGroup => Math.floor(t / 2) as TenGodGroup;

export enum TwelveStage {
  JANGSAENG, MOKYOK, GWANDAE, GEONROK, JEWANG, SOE,
  BYEONG, SA, MYO, JEOL, TAE, YANG,
}
export const TWELVE_STAGE_HANGUL = [
  "장생", "목욕", "관대", "건록", "제왕", "쇠", "병", "사", "묘", "절", "태", "양",
] as const;

// ---- 60갑자 ----
export const ganzhiIndex = (stem: number, branch: number): number =>
  (((6 * stem - 5 * branch) % 60) + 60) % 60;
export const ganzhiStem = (idx: number): number => ((idx % 10) + 10) % 10;
export const ganzhiBranch = (idx: number): number => ((idx % 12) + 12) % 12;
export const ganzhiHanja = (idx: number): string =>
  STEMS[ganzhiStem(idx)].hanja + BRANCHES[ganzhiBranch(idx)].hanja;
export const ganzhiHangul = (idx: number): string =>
  STEMS[ganzhiStem(idx)].hangul + BRANCHES[ganzhiBranch(idx)].hangul;

export const stemByHanja = (h: string): number => {
  const i = STEMS.findIndex((x) => x.hanja === h);
  if (i < 0) throw new Error(`Unknown stem: ${h}`);
  return i;
};
export const branchByHanja = (h: string): number => {
  const i = BRANCHES.findIndex((x) => x.hanja === h);
  if (i < 0) throw new Error(`Unknown branch: ${h}`);
  return i;
};
export const ganzhiByHanja = (gz: string): number =>
  ganzhiIndex(stemByHanja(gz[0]), branchByHanja(gz[1]));
