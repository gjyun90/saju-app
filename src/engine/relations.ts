// 합·충·형·파·해·원진·귀문 판정 엔진
// 정의는 데이터(RELATION_DEFS), 엔진은 LayeredChart의 모든 기둥 조합에 대해 패턴 매칭
import { BRANCHES, Element, STEMS, branchByHanja, stemByHanja } from "./constants";
import type { Layer, LayeredChart, Pillar, Relation, RelationParticipant, RelationType } from "./types";

// ---- 정의 데이터 (JSON으로 분리 가능) ----
const RAW = {
  STEM_HAP: [["甲", "己", "EARTH"], ["乙", "庚", "METAL"], ["丙", "辛", "WATER"], ["丁", "壬", "WOOD"], ["戊", "癸", "FIRE"]],
  STEM_CHUNG: [["甲", "庚"], ["乙", "辛"], ["丙", "壬"], ["丁", "癸"]],
  YUKHAP: [["子", "丑", "EARTH"], ["寅", "亥", "WOOD"], ["卯", "戌", "FIRE"], ["辰", "酉", "METAL"], ["巳", "申", "WATER"], ["午", "未", "FIRE"]],
  SAMHAP: [["申", "子", "辰", "WATER"], ["亥", "卯", "未", "WOOD"], ["寅", "午", "戌", "FIRE"], ["巳", "酉", "丑", "METAL"]], // 가운데가 왕지
  BANGHAP: [["寅", "卯", "辰", "WOOD"], ["巳", "午", "未", "FIRE"], ["申", "酉", "戌", "METAL"], ["亥", "子", "丑", "WATER"]],
  SAMHYUNG: [["寅", "巳", "申"], ["丑", "戌", "未"]],
  SANGHYUNG: [["子", "卯"]],
  JAHYUNG: ["辰", "午", "酉", "亥"],
  PA: [["子", "酉"], ["丑", "辰"], ["寅", "亥"], ["卯", "午"], ["巳", "申"], ["未", "戌"]],
  HAE: [["子", "未"], ["丑", "午"], ["寅", "巳"], ["卯", "辰"], ["申", "亥"], ["酉", "戌"]],
  WONJIN: [["子", "未"], ["丑", "午"], ["寅", "酉"], ["卯", "申"], ["辰", "亥"], ["巳", "戌"]],
  GWIMUN: [["子", "酉"], ["丑", "午"], ["寅", "未"], ["卯", "申"], ["辰", "亥"], ["巳", "戌"]],
} as const;

const el = (s: string) => Element[s as keyof typeof Element];
const pairKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

type PairMap = Map<string, Element | undefined>;
const stemPairs = (rows: readonly (readonly string[])[]): PairMap =>
  new Map(rows.map((r) => [pairKey(stemByHanja(r[0]), stemByHanja(r[1])), r[2] ? el(r[2]) : undefined]));
const branchPairs = (rows: readonly (readonly string[])[]): PairMap =>
  new Map(rows.map((r) => [pairKey(branchByHanja(r[0]), branchByHanja(r[1])), r[2] ? el(r[2]) : undefined]));
const branchGroups = (rows: readonly (readonly string[])[]) =>
  rows.map((r) => ({ members: r.slice(0, 3).map(branchByHanja), result: r[3] ? el(r[3]) : undefined }));

const DEF = {
  stemHap: stemPairs(RAW.STEM_HAP),
  stemChung: stemPairs(RAW.STEM_CHUNG),
  yukhap: branchPairs(RAW.YUKHAP),
  pa: branchPairs(RAW.PA),
  hae: branchPairs(RAW.HAE),
  wonjin: branchPairs(RAW.WONJIN),
  gwimun: branchPairs(RAW.GWIMUN),
  sanghyung: branchPairs(RAW.SANGHYUNG),
  jahyung: new Set(RAW.JAHYUNG.map(branchByHanja)),
  samhap: branchGroups(RAW.SAMHAP),
  banghap: branchGroups(RAW.BANGHAP),
  samhyung: branchGroups(RAW.SAMHYUNG),
};

// ---- 엔진 ----
export function chartPillars(lc: LayeredChart): Pillar[] {
  return [...lc.natal.pillars, lc.daeun, lc.seun, lc.wolun].filter((p): p is Pillar => !!p);
}

function make(type: RelationType, participants: RelationParticipant[], extra: Partial<Relation> = {}): Relation {
  const layers = [...new Set(participants.map((p) => p.ref.layer))] as Layer[];
  return { type, participants, complete: true, layers, ...extra };
}

export function findRelations(lc: LayeredChart): Relation[] {
  const pillars = chartPillars(lc);
  const stems: RelationParticipant[] = pillars.map((p) => ({ ref: p.ref, part: "STEM", index: p.stem }));
  const branches: RelationParticipant[] = pillars.map((p) => ({ ref: p.ref, part: "BRANCH", index: p.branch }));
  const out: Relation[] = [];

  // 천간 쌍
  for (let i = 0; i < stems.length; i++) {
    for (let j = i + 1; j < stems.length; j++) {
      const a = stems[i], b = stems[j];
      const k = pairKey(a.index, b.index);
      if (DEF.stemHap.has(k)) out.push(make("STEM_HAP", [a, b], { result: DEF.stemHap.get(k) }));
      if (DEF.stemChung.has(k)) out.push(make("STEM_CHUNG", [a, b]));
    }
  }

  // 지지 쌍
  for (let i = 0; i < branches.length; i++) {
    for (let j = i + 1; j < branches.length; j++) {
      const a = branches[i], b = branches[j];
      const k = pairKey(a.index, b.index);
      if (DEF.yukhap.has(k)) out.push(make("YUKHAP", [a, b], { result: DEF.yukhap.get(k) }));
      if (Math.abs(a.index - b.index) === 6) out.push(make("CHUNG", [a, b]));
      if (DEF.pa.has(k)) out.push(make("PA", [a, b]));
      if (DEF.hae.has(k)) out.push(make("HAE", [a, b]));
      if (DEF.wonjin.has(k)) out.push(make("WONJIN", [a, b]));
      if (DEF.gwimun.has(k)) out.push(make("GWIMUN", [a, b]));
      if (DEF.sanghyung.has(k)) out.push(make("HYUNG", [a, b], { variant: "SANGHYUNG" }));
      if (a.index === b.index && DEF.jahyung.has(a.index)) out.push(make("HYUNG", [a, b], { variant: "SELF" }));
    }
  }

  // 3지 그룹: 삼합/방합/삼형
  const groupScan = (
    groups: { members: number[]; result?: Element }[],
    full: RelationType,
    partial: ((a: RelationParticipant, b: RelationParticipant, g: { members: number[]; result?: Element }) => Relation | null) | null,
  ) => {
    for (const g of groups) {
      const nodes = branches.filter((n) => g.members.includes(n.index));
      const distinct = new Set(nodes.map((n) => n.index));
      if (distinct.size === 3) {
        out.push(make(full, nodes, { result: g.result, complete: true }));
      } else if (distinct.size === 2 && partial) {
        for (let i = 0; i < nodes.length; i++)
          for (let j = i + 1; j < nodes.length; j++)
            if (nodes[i].index !== nodes[j].index) {
              const r = partial(nodes[i], nodes[j], g);
              if (r) out.push(r);
            }
      }
    }
  };

  groupScan(DEF.samhap, "SAMHAP", (a, b, g) => {
    const center = g.members[1];
    const withCenter = a.index === center || b.index === center;
    return make("BANHAP", [a, b], {
      result: g.result,
      complete: false,
      variant: withCenter ? "WITH_CENTER" : "NO_CENTER",
    });
  });
  groupScan(DEF.banghap, "BANGHAP", null);
  groupScan(DEF.samhyung.map((g) => ({ members: g.members })), "HYUNG",
    (a, b) => make("HYUNG", [a, b], { complete: false, variant: "SAMHYUNG_PART" }));

  return out;
}

/** 특정 레이어가 관여한 관계만 */
export const relationsInvolving = (rels: Relation[], layer: Layer) =>
  rels.filter((r) => r.layers.includes(layer));

// ---- 표시용 ----
const TYPE_KO: Record<RelationType, string> = {
  STEM_HAP: "천간합", STEM_CHUNG: "천간충", YUKHAP: "육합", SAMHAP: "삼합", BANHAP: "반합",
  BANGHAP: "방합", CHUNG: "충", HYUNG: "형", PA: "파", HAE: "해", WONJIN: "원진", GWIMUN: "귀문",
};
const LAYER_KO: Record<Layer, string> = { NATAL: "", DAEUN: "대운", SEUN: "세운", WOLUN: "월운" };
const POS_KO = { YEAR: "년", MONTH: "월", DAY: "일", HOUR: "시" } as const;

export function describeRelation(r: Relation): string {
  const parts = r.participants.map((p) => {
    const ch = p.part === "STEM" ? STEMS[p.index].hanja : BRANCHES[p.index].hanja;
    const where = p.ref.layer === "NATAL" ? POS_KO[p.ref.position!] + (p.part === "STEM" ? "간" : "지") : LAYER_KO[p.ref.layer];
    return `${ch}(${where})`;
  });
  let name = TYPE_KO[r.type];
  if (r.type === "HYUNG" && r.complete && r.participants.length >= 3) name = "삼형";
  const res = r.result !== undefined ? ` →${["木", "火", "土", "金", "水"][r.result]}` : "";
  const v = r.variant === "NO_CENTER" ? " (왕지 없음)" : "";
  return `${name}: ${parts.join(" - ")}${res}${v}`;
}
