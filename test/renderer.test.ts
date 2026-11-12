import { describe, expect, it } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { HistoryStore, makeBackup, parseBackup, type HistoryInput } from "../src/renderer/lib/history";
import {
  EMPTY_FORM, analyze, daeunItems, formFromHistory, initialSelection, natalView, seunItems,
  seunYearsOf, tenGodGroups, validateForm, wolunItems, ganzhiText,
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

  it("대운 현재 = 癸酉, 세운 2018~2027, 올해 2026 丙午, 이번 달 = 己亥", () => {
    const d = daeunItems(a, now);
    expect(d.find((x) => x.current)!.top).toBe("43–52세");
    const sel = initialSelection(a, now);
    expect(sel.daeun).toBe(4);
    expect(seunYearsOf(a.luck.daeun[4])).toEqual([2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027]);
    const s = seunItems(a, a.luck.daeun[4], now);
    expect(ganzhiText(s.find((x) => x.current)!.pillar)).toBe("丙午");
    expect(sel.year).toBe(2026);
    const w = wolunItems(a, 2026, now);
    expect(w).toHaveLength(12);
    expect(ganzhiText(w[sel.month].pillar)).toBe("己亥");
    expect(w[sel.month].sub).toBe("이번 달");
  });
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
