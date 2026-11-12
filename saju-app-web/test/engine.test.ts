import { describe, expect, it } from "vitest";
import lunarLib from "lunar-javascript";
import {
  BirthInput, CalcOptions, DEFAULT_OPTIONS, TenGod, TenGodGroup, TwelveStage,
  EXCEL_JIN_COLUMN, TEN_GOD_GROUP_HANGUL, branchTenGod,
  computeChart, computeLuck, daeunAt, describeRelation, findRelations, ganzhiHanja,
  layeredAt, pillarAt, relationsInvolving, seunFor, wolunFor,
} from "../src/engine";

const SAMPLE_0102: BirthInput = {
  calendar: "LUNAR", isLeapMonth: false, year: 1975, month: 1, day: 2,
  hour: 8, minute: 0, gender: "M", longitude: 126.98, tzId: "Asia/Seoul",
};
const kst = (y: number, m: number, d: number, h = 12) => Date.UTC(y, m - 1, d, h - 9);
const kstDate = (ms: number) => new Date(ms + 9 * 3600_000).toISOString().slice(0, 10);

const SAMPLE_A: BirthInput = { ...SAMPLE_0102, day: 3 };

describe("기준 벡터 A: 음 1975.1.3 08시 남", () => {
  const chart = computeChart(SAMPLE_A);
  const luck = computeLuck(chart);

  it("양력 변환", () => {
    expect(chart.birth.solarDate).toEqual({ y: 1975, m: 2, d: 13 });
    expect(chart.birth.effective.h).toBe(7); // 진태양시 약 07:13 → 辰시
  });

  it("4주", () => {
    expect(chart.pillars.map((p) => ganzhiHanja(p.ganzhi))).toEqual(["乙卯", "戊寅", "庚寅", "庚辰"]);
  });

  it("십성 / 12운성 (일간 庚金)", () => {
    expect(pillarAt(chart, "YEAR")!.stemTenGod).toBe(TenGod.JEONGJAE);
    expect(pillarAt(chart, "MONTH")!.stemTenGod).toBe(TenGod.PYEONIN);
    expect(pillarAt(chart, "DAY")!.stemTenGod).toBeNull();
    expect(pillarAt(chart, "HOUR")!.stemTenGod).toBe(TenGod.BIGYEON);
    expect(pillarAt(chart, "YEAR")!.branchTenGod).toBe(TenGod.JEONGJAE);
    expect(pillarAt(chart, "MONTH")!.branchTenGod).toBe(TenGod.PYEONJAE);
    expect(pillarAt(chart, "DAY")!.branchTenGod).toBe(TenGod.PYEONJAE);
    expect(pillarAt(chart, "DAY")!.twelveStage).toBe(TwelveStage.JEOL);
  });

  it("시지 辰 = 관성 (엑셀 조견표 庚 행), ENGINE 옵션은 편인", () => {
    const h = pillarAt(chart, "HOUR")!;
    expect(h.branchLabel).toBe("관성");
    expect(h.branchGroup).toBe(TenGodGroup.GWANSEONG);
    expect(h.branchTenGodSource).toBe("EXCEL_TABLE");
    const he = pillarAt(computeChart(SAMPLE_A, { ...DEFAULT_OPTIONS, branchTenGodTable: "ENGINE" }), "HOUR")!;
    expect(he.branchTenGod).toBe(TenGod.PYEONIN);
  });

  it("대운: 역행, 대운수 3, 2년 10개월, 교운 2027-12-13", () => {
    expect(luck.direction).toBe("BACKWARD");
    expect(luck.daeunNumber).toBe(3);
    expect(luck.offset).toMatchObject({ years: 2, months: 10, days: 0 });
    expect(kstDate(luck.daeun[0].startUtcMs)).toBe("1977-12-13");
    expect(kstDate(luck.daeun[5].startUtcMs)).toBe("2027-12-13");
    expect(luck.daeun.slice(0, 7).map((c) => ganzhiHanja(c.pillar.ganzhi)))
      .toEqual(["丁丑", "丙子", "乙亥", "甲戌", "癸酉", "壬申", "辛未"]);
    expect(ganzhiHanja(daeunAt(luck, kst(2027, 11, 1))!.pillar.ganzhi)).toBe("癸酉");
    expect(ganzhiHanja(daeunAt(luck, kst(2027, 12, 20))!.pillar.ganzhi)).toBe("壬申");
  });

  it("원국 관계: 乙庚합 2건, 卯辰 해, 寅卯辰 방합", () => {
    const rels = findRelations({ natal: chart });
    expect(rels.filter((r) => r.type === "STEM_HAP")).toHaveLength(2);
    expect(rels.some((r) => r.type === "HAE")).toBe(true);
    expect(rels.some((r) => r.type === "BANGHAP" && r.complete)).toBe(true);
  });

  it("2027 세운 丁未: 귀문 2건(寅-未), 반합(卯-未)", () => {
    const seun = seunFor(chart, 2027);
    const types = relationsInvolving(findRelations({ natal: chart, seun: seun.pillar }), "SEUN").map((r) => r.type).sort();
    expect(types).toEqual(["BANHAP", "GWIMUN", "GWIMUN"]);
  });
});

describe("회귀 벡터: 음 1975.1.2 08시 남", () => {
  const chart = computeChart(SAMPLE_0102);
  const luck = computeLuck(chart);

  it("양력 변환과 진태양시 보정", () => {
    expect(chart.birth.solarDate).toEqual({ y: 1975, m: 2, d: 12 });
    expect(chart.birth.utcOffsetMinutes).toBe(540);
    expect(chart.birth.effective.h).toBe(7); // 약 07:13
    const lon = chart.birth.corrections.find((c) => c.kind === "LONGITUDE")!.minutes;
    expect(lon).toBeCloseTo(-32.1, 1);
  });

  it("4주", () => {
    expect(chart.pillars.map((p) => ganzhiHanja(p.ganzhi))).toEqual(["乙卯", "戊寅", "己丑", "戊辰"]);
  });

  it("십성 / 12운성", () => {
    expect(pillarAt(chart, "YEAR")!.stemTenGod).toBe(TenGod.PYEONGWAN);
    expect(pillarAt(chart, "MONTH")!.stemTenGod).toBe(TenGod.GEOPJAE);
    expect(pillarAt(chart, "DAY")!.stemTenGod).toBeNull();
    expect(pillarAt(chart, "MONTH")!.branchTenGod).toBe(TenGod.JEONGGWAN);
    expect(pillarAt(chart, "DAY")!.branchTenGod).toBe(TenGod.BIGYEON);
    expect(pillarAt(chart, "DAY")!.twelveStage).toBe(TwelveStage.MYO);
  });

  it("시지 辰: 기본 옵션은 엑셀 조견표(그룹), ENGINE 옵션은 공식 값", () => {
    const h = pillarAt(chart, "HOUR")!;
    expect(h.branchTenGod).toBeNull();
    expect(h.branchGroup).toBe(TenGodGroup.INSEONG);
    expect(h.branchLabel).toBe("인성");
    expect(h.branchTenGodSource).toBe("EXCEL_TABLE");
    // 辰 이외 지지는 엔진 값 그대로
    expect(pillarAt(chart, "DAY")!.branchTenGodSource).toBe("ENGINE");

    const eng = computeChart(SAMPLE_0102, { ...DEFAULT_OPTIONS, branchTenGodTable: "ENGINE" });
    const he = pillarAt(eng, "HOUR")!;
    expect(he.branchTenGod).toBe(TenGod.GEOPJAE);
    expect(he.branchGroup).toBe(TenGodGroup.BIGEOP);
    expect(he.branchLabel).toBe("겁재");
  });

  it("대운", () => {
    expect(luck.direction).toBe("BACKWARD");
    expect(luck.offset).toMatchObject({ years: 2, months: 6, days: 0 });
    expect(luck.daeunNumber).toBe(3);
    expect(kstDate(luck.daeun[0].startUtcMs)).toBe("1977-08-12");
    expect(luck.daeun.slice(0, 7).map((c) => ganzhiHanja(c.pillar.ganzhi)))
      .toEqual(["丁丑", "丙子", "乙亥", "甲戌", "癸酉", "壬申", "辛未"]);
    expect(kstDate(luck.daeun[5].startUtcMs)).toBe("2027-08-12");
  });

  it("원국 관계: 寅卯辰 방합, 卯辰 해, 丑辰 파", () => {
    const rels = findRelations({ natal: chart }).map(describeRelation);
    expect(rels).toContain("방합: 卯(년지) - 寅(월지) - 辰(시지) →木");
    expect(rels.some((r) => r.startsWith("해: 卯(년지) - 辰(시지)"))).toBe(true);
    expect(rels.some((r) => r.startsWith("파: 丑(일지) - 辰(시지)"))).toBe(true);
  });

  it("2027 세운 丁未와 원국의 관계", () => {
    const seun = seunFor(chart, 2027);
    expect(ganzhiHanja(seun.pillar.ganzhi)).toBe("丁未");
    const rels = relationsInvolving(findRelations({ natal: chart, seun: seun.pillar }), "SEUN");
    const types = rels.map((r) => r.type).sort();
    expect(types).toEqual(["BANHAP", "CHUNG", "GWIMUN", "HYUNG"]);
  });

  it("2027 월운", () => {
    const w = wolunFor(chart, 2027);
    expect(w.map((x) => ganzhiHanja(x.pillar.ganzhi)))
      .toEqual(["壬寅", "癸卯", "甲辰", "乙巳", "丙午", "丁未", "戊申", "己酉", "庚戌", "辛亥", "壬子", "癸丑"]);
    expect(kstDate(w[0].startUtcMs)).toBe("2027-02-04");
  });

  it("2027.10 庚戌월: 丑戌未 삼형 완성", () => {
    const lc = layeredAt(chart, luck, kst(2027, 10, 20));
    expect(ganzhiHanja(lc.daeun!.ganzhi)).toBe("壬申");
    const rels = findRelations(lc);
    expect(rels.some((r) => r.type === "HYUNG" && r.complete && r.participants.length === 3)).toBe(true);
  });

  it("2027.12 壬子월: 申子辰 삼합 완성 (대운+월운+원국)", () => {
    const lc = layeredAt(chart, luck, kst(2027, 12, 20));
    const sam = findRelations(lc).filter((r) => r.type === "SAMHAP");
    expect(sam).toHaveLength(1);
    expect(sam[0].layers.sort()).toEqual(["DAEUN", "NATAL", "WOLUN"]);
  });

  it("교운기 직전은 癸酉 대운", () => {
    expect(ganzhiHanja(daeunAt(luck, kst(2027, 8, 1))!.pillar.ganzhi)).toBe("癸酉");
  });
});

describe("엑셀 조견표 辰 열 오버라이드", () => {
  it("10개 일간 전체가 엑셀 P4:P13 값과 일치", () => {
    // 엑셀 '십신_조견매트릭스' P4:P13 원문
    const sheet = ["식상", "식상", "비겁", "비겁", "인성", "인성", "관성", "관성", "재성", "재성"];
    expect(EXCEL_JIN_COLUMN.map((g) => TEN_GOD_GROUP_HANGUL[g])).toEqual(sheet);
    for (let dm = 0; dm < 10; dm++) {
      expect(branchTenGod(dm, 4, DEFAULT_OPTIONS).label).toBe(sheet[dm]);
    }
  });

  it("辰 이외 11개 지지는 옵션과 관계없이 엔진 공식 값", () => {
    for (let dm = 0; dm < 10; dm++)
      for (let b = 0; b < 12; b++) {
        if (b === 4) continue;
        const a = branchTenGod(dm, b, { branchTenGodTable: "EXCEL_JIN" });
        const e = branchTenGod(dm, b, { branchTenGodTable: "ENGINE" });
        expect(a).toEqual(e);
        expect(a.source).toBe("ENGINE");
      }
  });

  it("대운/세운/월운의 辰에도 같은 규칙 적용", () => {
    const chart = computeChart(SAMPLE_0102);
    const luck = computeLuck(chart);
    const jin = luck.daeun.find((c) => ganzhiHanja(c.pillar.ganzhi) === "戊辰")!;
    expect(jin.pillar.branchLabel).toBe("인성");
    expect(jin.pillar.branchTenGodSource).toBe("EXCEL_TABLE");
    const apr = wolunFor(chart, 2027).find((w) => ganzhiHanja(w.pillar.ganzhi) === "甲辰")!;
    expect(apr.pillar.branchLabel).toBe("인성");
  });
});

describe("엑셀 검증 샘플", () => {
  const base = { calendar: "SOLAR" as const, isLeapMonth: false, gender: "F" as const, longitude: 126.98, tzId: "Asia/Seoul", minute: 0 };
  it("1975-08-16 오시 → 乙卯 甲申 甲午 庚午", () => {
    const c = computeChart({ ...base, year: 1975, month: 8, day: 16, hour: 12 });
    expect(c.pillars.map((p) => ganzhiHanja(p.ganzhi))).toEqual(["乙卯", "甲申", "甲午", "庚午"]);
  });
  it("1977-05-03 신시 → 丁巳 甲辰 庚申 甲申, 월지 辰은 엑셀 표의 庚 행 '관성'", () => {
    const c = computeChart({ ...base, year: 1977, month: 5, day: 3, hour: 16 });
    expect(c.pillars.map((p) => ganzhiHanja(p.ganzhi))).toEqual(["丁巳", "甲辰", "庚申", "甲申"]);
    expect(pillarAt(c, "MONTH")!.branchLabel).toBe("관성");
  });
});

describe("시간 처리 경계", () => {
  it("1987 서머타임: 시계 08:00 → 진태양시 06시대 卯시", () => {
    const c = computeChart({ ...SAMPLE_0102, calendar: "SOLAR", year: 1987, month: 7, day: 1, hour: 8 });
    expect(c.birth.utcOffsetMinutes).toBe(600);
    expect(ganzhiHanja(pillarAt(c, "HOUR")!.ganzhi)[1]).toBe("卯");
  });

  it("1958 표준시 UTC+8:30 적용", () => {
    const c = computeChart({ ...SAMPLE_0102, calendar: "SOLAR", year: 1958, month: 1, day: 1, hour: 12 });
    expect(c.birth.utcOffsetMinutes).toBe(510);
  });

  it("야자시: SPLIT은 당일 일주, UNIFIED는 익일 일주, 시주는 동일", () => {
    const base: BirthInput = { ...SAMPLE_0102, calendar: "SOLAR", year: 2000, month: 1, day: 1, hour: 23, minute: 50 };
    const opt: CalcOptions = { ...DEFAULT_OPTIONS, useTrueSolarTime: false };
    const split = computeChart(base, { ...opt, jasiMode: "SPLIT" });
    const unified = computeChart(base, { ...opt, jasiMode: "UNIFIED" });
    expect(ganzhiHanja(pillarAt(split, "DAY")!.ganzhi)).toBe("戊午");   // 2000-01-01
    expect(ganzhiHanja(pillarAt(unified, "DAY")!.ganzhi)).toBe("己未"); // 2000-01-02
    expect(pillarAt(split, "HOUR")!.ganzhi).toBe(pillarAt(unified, "HOUR")!.ganzhi);
    expect(ganzhiHanja(pillarAt(split, "HOUR")!.ganzhi)).toBe("甲子");
  });

  it("시 모름: 삼주", () => {
    const c = computeChart({ ...SAMPLE_0102, hour: null });
    expect(c.pillars).toHaveLength(3);
  });

  it("윤달 입력 검증", () => {
    expect(() => computeChart({ ...SAMPLE_0102, year: 2023, month: 3, isLeapMonth: true })).toThrow();
    const ok = computeChart({ ...SAMPLE_0102, year: 2023, month: 2, day: 1, isLeapMonth: true });
    expect(ok.birth.solarDate).toEqual({ y: 2023, m: 3, d: 22 });
  });
});

describe("교차 검증: lunar-javascript 팔자와 2,000건 비교", () => {
  it("UTC+8 고정, 보정 없음 조건에서 4주 일치", () => {
    const { Solar } = lunarLib;
    const opt: CalcOptions = { ...DEFAULT_OPTIONS, useTrueSolarTime: false, hourBoundary: "ODD", jasiMode: "SPLIT" };
    let seed = 12345;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    const mismatches: string[] = [];
    for (let i = 0; i < 2000; i++) {
      const t = new Date(Date.UTC(1930, 0, 1) + Math.floor(rnd() * 120 * 365.25 * 86400) * 1000);
      const y = t.getUTCFullYear(), m = t.getUTCMonth() + 1, d = t.getUTCDate(), h = t.getUTCHours(), mi = t.getUTCMinutes();
      const ec = Solar.fromYmdHms(y, m, d, h, mi, 0).getLunar().getEightChar();
      const ref = [ec.getYear(), ec.getMonth(), ec.getDay(), ec.getTime()].join(" ");
      const c = computeChart({
        calendar: "SOLAR", isLeapMonth: false, year: y, month: m, day: d, hour: h, minute: mi,
        gender: "M", longitude: 120, tzId: "Etc/GMT-8",
      }, opt);
      const mine = c.pillars.map((p) => ganzhiHanja(p.ganzhi)).join(" ");
      if (mine !== ref) mismatches.push(`${y}-${m}-${d} ${h}:${mi} lib=${ref} mine=${mine}`);
    }
    expect(mismatches.slice(0, 5)).toEqual([]);
  });
});
