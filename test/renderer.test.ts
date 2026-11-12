import { describe, expect, it } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { HistoryStore, makeBackup, parseBackup, type HistoryInput } from "../src/renderer/lib/history";
import {
  EMPTY_FORM, ageInYear, analyze, daeunIndexOfYear, daeunItems, daeunStartYear, formFromHistory, initialSelection,
  natalView, selectionForDaeun, seunItems, seunYearsOf, tenGodGroups, validateForm, wolunItems, ganzhiText,
  type AgeMode,
} from "../src/renderer/lib/viewModel";

const FORM_A = { ...EMPTY_FORM, name: "샘플A", gender: "M" as const, calendar: "LUNAR" as const, year: "1975", month: "1", day: "3", time: "08:00" };
const kst = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d, 3); // KST 12:00

describe("입력 검증", () => {
  it("정상 입력 → 서울 고정 BirthInput", () => {
    const r = validateForm(FORM_A);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.birth).toMatchObject({ calendar: "LUNAR", year: 1975, month: 1, day: 3, hour: 8, minute: 0, longitude: 126.98, tzId: "Asia/Seoul" });
    expect(r.history.time).toBe("08:00");
  });
  it("오류 메시지", () => {
    expect(validateForm({ ...FORM_A, name: " " })).toMatchObject({ ok: false });
    expect(validateForm({ ...FORM_A, month: "13" })).toMatchObject({ ok: false });
    expect(validateForm({ ...FORM_A, calendar: "SOLAR", month: "2", day: "30" })).toMatchObject({ ok: false });
    expect(validateForm({ ...FORM_A, time: "" })).toMatchObject({ ok: false });
    expect(validateForm({ ...FORM_A, time: ":30" })).toMatchObject({ ok: false });
    expect(validateForm({ ...FORM_A, time: "24:00" })).toMatchObject({ ok: false });
  });
  it("시·분 칸 입력: 분 생략은 0분, 한 자리 시 허용", () => {
    const r = validateForm({ ...FORM_A, time: "8:" });
    expect(r.ok && [r.birth.hour, r.birth.minute, r.history.time]).toEqual([8, 0, "08:00"]);
  });
  it("시간 모름 → 원국은 4칸 유지, 시주는 빈 칸(?)", () => {
    const r = validateForm({ ...FORM_A, time: "", timeUnknown: true });
    if (!r.ok) throw new Error(r.error);
    const n = natalView(analyze("샘플A", r.birth).chart);
    expect(n.columns.map((c) => [c.label, c.unknown])).toEqual([["시주", true], ["일주", false], ["월주", false], ["연주", false]]);
    expect(n.columns[0]).toMatchObject({ stem: { hanja: "?", element: -1 }, branch: { hanja: "?", element: -1 }, stemLabel: "-", branchLabel: "-" });
    expect(n.columns.slice(1).map((c) => ganzhiText(c))).toEqual(["庚寅", "戊寅", "乙卯"]);
  });
  it("시간 모름 → hour null, 이력 time null", () => {
    const r = validateForm({ ...FORM_A, time: "", timeUnknown: true });
    expect(r.ok && r.birth.hour).toBe(null);
    expect(r.ok && r.history.time).toBe(null);
  });
  it("양력이면 윤달 무시", () => {
    const r = validateForm({ ...FORM_A, calendar: "SOLAR", isLeapMonth: true, month: "2", day: "13" });
    expect(r.ok && r.birth.isLeapMonth).toBe(false);
  });
});

describe("화면 데이터 (샘플A, 2026-11-10 기준)", () => {
  const r = validateForm(FORM_A);
  if (!r.ok) throw new Error(r.error);
  const a = analyze("샘플A", r.birth);
  const now = kst(2026, 11, 10);

  it("원국: 시·일·월·연 순서, 辰 = 관성", () => {
    const n = natalView(a.chart);
    expect(n.columns.map((c) => c.label)).toEqual(["시주", "일주", "월주", "연주"]);
    expect(n.columns.map((c) => ganzhiText(c))).toEqual(["庚辰", "庚寅", "戊寅", "乙卯"]);
    expect(n.columns[0].branchLabel).toBe("관성");
    expect(n.dayMaster).toMatchObject({ hanja: "庚", yinYang: "양", stage: "절" });
  });

  it("십성 그룹: 비겁1 식상0 재성4 관성1 인성1", () => {
    const g = tenGodGroups(a.chart);
    expect(g.map((x) => x.chars.length)).toEqual([1, 0, 4, 1, 1]);
    expect(g[3].chars.map((c) => c.hanja)).toEqual(["辰"]);
  });

  it("전통나이: 대운 현재 = 43–52세 癸酉, 세운 2017~2026, 올해 2026 丙午(52세), 이번 달 = 己亥", () => {
    const d = daeunItems(a, now, "KOREAN");
    expect(d.find((x) => x.current)!.top).toBe("43–52세");
    const sel = initialSelection(a, now, "KOREAN");
    expect(sel.daeun).toBe(4);
    expect(seunYearsOf(a, 4, "KOREAN")).toEqual([2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]);
    const s = seunItems(a, 4, now, "KOREAN");
    expect(ganzhiText(s.find((x) => x.current)!.pillar)).toBe("丙午");
    expect(s.map((x) => x.sub.replace("올해 · ", ""))).toEqual(["43세", "44세", "45세", "46세", "47세", "48세", "49세", "50세", "51세", "52세"]);
    expect(sel.year).toBe(2026);
    const w = wolunItems(a, 2026, now);
    expect(w).toHaveLength(12);
    expect(ganzhiText(w[sel.month].pillar)).toBe("己亥");
    expect(w[sel.month].sub).toBe("이번 달");
  });

  it("만 나이: 43–52세 대운 = 2018~2027, 올해 2026은 만 51세", () => {
    expect(seunYearsOf(a, 4, "INTERNATIONAL")).toEqual([2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027]);
    expect(seunItems(a, 4, now, "INTERNATIONAL").find((x) => x.current)!.sub).toBe("올해 · 51세");
  });
});

describe("버그 재현: 양력 1967-08-29 남, 시간 모름 (대운수 7, 역행)", () => {
  const r = validateForm({ ...EMPTY_FORM, name: "샘플C", gender: "M", calendar: "SOLAR", year: "1967", month: "8", day: "29", timeUnknown: true });
  if (!r.ok) throw new Error(r.error);
  const a = analyze("샘플C", r.birth);
  const now = kst(2026, 11, 13);
  const i57 = a.luck.daeun.findIndex((c) => c.startAge === 57);

  it("원국과 대운 순서가 참고 만세력 앱과 일치", () => {
    expect(natalView(a.chart).columns.slice(1).map((c) => ganzhiText(c))).toEqual(["乙丑", "戊申", "丁未"]);
    expect(a.luck.direction).toBe("BACKWARD");
    expect(a.luck.daeunNumber).toBe(7);
    expect(a.luck.daeun.map((c) => c.startAge)).toEqual([7, 17, 27, 37, 47, 57, 67, 77, 87, 97]);
    // 참고 앱 화면: 47 癸, 57 壬, 67 辛, 77 庚, 87 己 (천간)
    expect(daeunItems(a, now, "KOREAN").slice(4, 9).map((d) => ganzhiText(d.pillar))).toEqual(["癸卯", "壬寅", "辛丑", "庚子", "己亥"]);
  });

  it("전통나이: 57–66세 대운 → 세운 2023~2032, 나이 57~66세, 현재 대운", () => {
    const years = seunYearsOf(a, i57, "KOREAN");
    expect(years).toEqual([2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032]);
    expect(seunItems(a, i57, now, "KOREAN").map((x) => x.sub.replace("올해 · ", ""))).toEqual(
      ["57세", "58세", "59세", "60세", "61세", "62세", "63세", "64세", "65세", "66세"]);
    expect(daeunItems(a, now, "KOREAN")[i57]).toMatchObject({ top: "57–66세", sub: "2023~", current: true });
  });

  it("만 나이: 57–66세 대운 → 세운 2024~2033, 나이 57~66세", () => {
    expect(seunYearsOf(a, i57, "INTERNATIONAL")).toEqual([2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033]);
    expect(seunItems(a, i57, now, "INTERNATIONAL").map((x) => x.sub.replace("올해 · ", ""))).toEqual(
      ["57세", "58세", "59세", "60세", "61세", "62세", "63세", "64세", "65세", "66세"]);
  });
});

describe("속성 검증: 무작위 출생 400건 × 나이 기준 2가지", () => {
  let seed = 20261113;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  const cases = Array.from({ length: 400 }, () => {
    const t = new Date(Date.UTC(1930, 0, 1) + Math.floor(rnd() * 85 * 365.25) * 86400000);
    return {
      ...EMPTY_FORM, name: "무작위", gender: (rnd() < 0.5 ? "M" : "F") as "M" | "F", calendar: "SOLAR" as const,
      year: String(t.getUTCFullYear()), month: String(t.getUTCMonth() + 1), day: String(t.getUTCDate()),
      time: `${Math.floor(rnd() * 24)}:${String(Math.floor(rnd() * 60)).padStart(2, "0")}`,
    };
  });

  for (const mode of ["KOREAN", "INTERNATIONAL"] as AgeMode[]) {
    it(`${mode}: 모든 대운에서 세운 나이 = 대운 나이 범위, 대운끼리 빈틈·겹침 없음`, () => {
      const problems: string[] = [];
      for (const f of cases) {
        const r = validateForm(f);
        if (!r.ok) throw new Error(r.error);
        const a = analyze("무작위", r.birth);
        const now = Date.UTC(2026, 10, 13);
        const items = daeunItems(a, now, mode);
        a.luck.daeun.forEach((c, i) => {
          const ages = seunYearsOf(a, i, mode).map((y) => ageInYear(a, y, mode));
          const want = Array.from({ length: 10 }, (_, k) => c.startAge + k);
          if (ages.join() !== want.join()) problems.push(`${f.year}-${f.month}-${f.day} 대운${i}: ${ages} ≠ ${want}`);
          if (items[i].top !== `${c.startAge}–${c.startAge + 9}세`) problems.push(`라벨 불일치 ${items[i].top}`);
          const s = seunItems(a, i, now, mode).map((x) => x.sub.replace("올해 · ", ""));
          if (s.join() !== want.map((n) => `${n}세`).join()) problems.push(`세운 표시 불일치 ${s}`);
          for (const y of seunYearsOf(a, i, mode)) if (daeunIndexOfYear(a, y, mode) !== i) problems.push(`연도→대운 역조회 실패 ${y}`);
          if (i > 0 && daeunStartYear(a, i, mode) !== daeunStartYear(a, i - 1, mode) + 10) problems.push("대운 사이 빈틈/겹침");
          const sel = selectionForDaeun(a, i, now, mode);
          if (!seunYearsOf(a, i, mode).includes(sel.year)) problems.push("선택된 세운이 대운 밖");
        });
        // 현재 대운 표시는 올해가 속한 대운과 같아야 함
        const cur = items.findIndex((x) => x.current);
        const sel = initialSelection(a, now, mode);
        if (cur >= 0 && (sel.daeun !== cur || !seunYearsOf(a, cur, mode).includes(sel.year))) problems.push("현재 대운/올해 선택 불일치");
      }
      expect(problems.slice(0, 5)).toEqual([]);
    });
  }
});

describe("조회 이력 (IndexedDB)", () => {
  const entry: HistoryInput = { name: "샘플A", gender: "M", calendar: "LUNAR", isLeapMonth: false, year: 1975, month: 1, day: 3, time: "08:00" };

  it("저장·중복 병합·최근순·삭제", async () => {
    const store = new HistoryStore(new IDBFactory(), "t1");
    const a = await store.save(entry, 1000);
    await store.save({ ...entry, name: "홍길동", year: 1980 }, 2000);
    const again = await store.save(entry, 3000); // 같은 항목 → 시각만 갱신
    expect(again.id).toBe(a.id);
    let list = await store.list();
    expect(list.map((x) => x.name)).toEqual(["샘플A", "홍길동"]);
    expect(list[0].updatedAt).toBe(3000);

    await store.save({ ...entry, time: "09:00" }, 4000); // 시간이 다르면 별도 항목
    list = await store.list();
    expect(list).toHaveLength(3);

    await store.remove(a.id);
    list = await store.list();
    expect(list.map((x) => x.time)).toEqual(["09:00", "08:00"]);
  });

  it("이력 → 폼 복원 (시간 모름 포함)", () => {
    expect(formFromHistory(entry)).toMatchObject({ name: "샘플A", year: "1975", month: "1", day: "3", time: "08:00", timeUnknown: false });
    expect(formFromHistory({ ...entry, time: null })).toMatchObject({ time: "", timeUnknown: true });
  });
});

describe("조회 이력 백업 파일", () => {
  const base: HistoryInput = { name: "샘플A", gender: "M", calendar: "LUNAR", isLeapMonth: false, year: 1975, month: 1, day: 3, time: "08:00" };

  it("내보내기 → 가져오기: 새 저장소에 그대로 복원", async () => {
    const src = new HistoryStore(new IDBFactory(), "b1");
    await src.save(base, 1000);
    await src.save({ ...base, name: "홍길동", calendar: "SOLAR", time: null }, 2000);
    const json = JSON.stringify(makeBackup(await src.list()));
    const { items, skipped } = parseBackup(json);
    expect(skipped).toBe(0);
    const dst = new HistoryStore(new IDBFactory(), "b2");
    expect(await dst.importMany(items)).toEqual({ added: 2, updated: 0 });
    const list = await dst.list();
    expect(list.map((x) => [x.name, x.time, x.updatedAt])).toEqual([["홍길동", null, 2000], ["샘플A", "08:00", 1000]]);
  });

  it("중복은 더 최근 조회 시각으로만 갱신", async () => {
    const st = new HistoryStore(new IDBFactory(), "b3");
    await st.save(base, 5000);
    expect(await st.importMany([{ ...base, updatedAt: 1000 }])).toEqual({ added: 0, updated: 0 });
    expect(await st.importMany([{ ...base, updatedAt: 9000 }])).toEqual({ added: 0, updated: 1 });
    expect((await st.list())[0].updatedAt).toBe(9000);
  });

  it("잘못된 파일·항목 처리", () => {
    expect(() => parseBackup("not json")).toThrow(/JSON/);
    expect(() => parseBackup(JSON.stringify({ app: "other", entries: [] }))).toThrow(/백업 파일이 아닙니다/);
    const r = parseBackup(JSON.stringify({ app: "saju-map", version: 1, entries: [{ ...base, updatedAt: 1 }, { ...base, month: 13 }, { name: "" }] }));
    expect(r.items).toHaveLength(1);
    expect(r.skipped).toBe(2);
  });
});
