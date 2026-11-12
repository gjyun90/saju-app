// 엔진 동작 확인용 콘솔 데모: npm run demo
import {
  BirthInput, TEN_GOD_HANGUL, TWELVE_STAGE_HANGUL, computeChart, computeLuck, describeRelation,
  findRelations, ganzhiHanja, ganzhiHangul, layeredAt, relationsInvolving, seunFor, wolunFor,
} from "../src/engine";

const input: BirthInput = {
  calendar: "LUNAR", isLeapMonth: false, year: 1975, month: 1, day: 3,
  hour: 8, minute: 0, gender: "M", longitude: 126.98, tzId: "Asia/Seoul",
};
const TARGET_YEAR = 2027;

const kst = (ms: number) => new Date(ms + 9 * 3600_000).toISOString().slice(0, 16).replace("T", " ");
const tg = (t: number | null) => (t === null ? "일간" : TEN_GOD_HANGUL[t]);

const chart = computeChart(input);
const luck = computeLuck(chart);
const b = chart.birth;

console.log(`양력 ${b.solarDate.y}-${b.solarDate.m}-${b.solarDate.d}  UTC${b.utcOffsetMinutes >= 0 ? "+" : ""}${b.utcOffsetMinutes / 60}`);
console.log(`판정 시각 ${String(b.effective.h).padStart(2, "0")}:${String(b.effective.mi).padStart(2, "0")}  보정: ${b.corrections.map((c) => `${c.kind} ${c.minutes}분`).join(", ")}`);
console.log("\n[원국]");
for (const p of chart.pillars) {
  console.log(`${p.ref.position!.padEnd(5)} ${ganzhiHanja(p.ganzhi)}(${ganzhiHangul(p.ganzhi)})  ` +
    `${tg(p.stemTenGod)}/${p.branchLabel}  12운성:${TWELVE_STAGE_HANGUL[p.twelveStage]}  ` +
    `지장간:${p.hidden.map((h) => TEN_GOD_HANGUL[h.tenGod]).join("·")}`);
}
console.log("\n[원국 관계]");
findRelations({ natal: chart }).forEach((r) => console.log("  " + describeRelation(r)));

console.log(`\n[대운] ${luck.direction === "FORWARD" ? "순행" : "역행"}, 대운수 ${luck.daeunNumber} ` +
  `(출생 후 ${luck.offset.years}년 ${luck.offset.months}개월 ${luck.offset.days}일)`);
for (const c of luck.daeun) console.log(`  ${String(c.startAge).padStart(2)}세  ${ganzhiHanja(c.pillar.ganzhi)}  ${kst(c.startUtcMs).slice(0, 10)}~`);

const seun = seunFor(chart, TARGET_YEAR);
console.log(`\n[${TARGET_YEAR} 세운] ${ganzhiHanja(seun.pillar.ganzhi)}  ${tg(seun.pillar.stemTenGod)}/${seun.pillar.branchLabel}`);
relationsInvolving(findRelations({ natal: chart, seun: seun.pillar }), "SEUN")
  .forEach((r) => console.log("  " + describeRelation(r)));

console.log(`\n[${TARGET_YEAR} 월운]`);
for (const w of wolunFor(chart, TARGET_YEAR)) {
  const lc = layeredAt(chart, luck, w.startUtcMs + 86400_000);
  const rels = findRelations(lc).filter((r) => r.layers.includes("WOLUN") && r.layers.length >= 2);
  console.log(`  ${kst(w.startUtcMs)}  ${ganzhiHanja(w.pillar.ganzhi)} (대운 ${ganzhiHanja(lc.daeun!.ganzhi)})`);
  rels.forEach((r) => console.log("      " + describeRelation(r)));
}
