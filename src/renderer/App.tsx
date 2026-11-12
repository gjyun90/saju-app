import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BirthForm } from "./components/BirthForm";
import { IconInfo } from "./components/Icons";
import { ImagePreview } from "./components/ImagePreview";
import { LuckStrip } from "./components/LuckStrip";
import { NatalCard } from "./components/NatalCard";
import { NavRail } from "./components/NavRail";
import { SettingsDialog } from "./components/SettingsDialog";
import { TenGodMap } from "./components/TenGodMap";
import { captureElement } from "./lib/capture";
import { HistoryStore, makeBackup, parseBackup, type HistoryEntry } from "./lib/history";
import { isDesktop, saveScreenshotDesktop } from "./lib/platform";
import { shareOrDownload } from "./lib/share";
import {
  EMPTY_FORM, analyze, daeunItems, formFromHistory, initialSelection, natalView, seunItems,
  tenGodGroups, validateForm, wolunItems, type Analysis, type FormState,
} from "./lib/viewModel";
import { STEMS, ganzhiHanja } from "../engine";

const store = new HistoryStore();

type Toast = { text: string; kind: "info" | "error" } | null;

// 개인 설정(브라우저 저장소). 사용할 수 없는 환경이면 기본값
const READING_KEY = "saju.reading";
const loadReading = () => { try { return localStorage.getItem(READING_KEY) !== "0"; } catch { return true; } };
const saveReading = (v: boolean) => { try { localStorage.setItem(READING_KEY, v ? "1" : "0"); } catch { /* 무시 */ } };

const dateStamp = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
};

export function App() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [sel, setSel] = useState<{ daeun: number; year: number; month: number } | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [reading, setReading] = useState(loadReading);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preview, setPreview] = useState<{ blob: Blob; filename: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const appRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<number>();
  const now = useMemo(() => Date.now(), [analysis]);

  const showToast = useCallback((text: string, kind: "info" | "error" = "info") => {
    window.clearTimeout(toastTimer.current);
    setToast({ text, kind });
    toastTimer.current = window.setTimeout(() => setToast(null), 2800);
  }, []);

  const refreshHistory = useCallback(() => store.list().then(setHistory), []);

  const run = useCallback((f: FormState, save: boolean) => {
    const v = validateForm(f);
    if (!v.ok) { showToast(v.error, "error"); return false; }
    let a: Analysis;
    try {
      a = analyze(v.history.name, v.birth);
    } catch (e) {
      showToast((e as Error).message.replace(/ \(.*\)$/, ""), "error");
      return false;
    }
    setAnalysis(a);
    setSel(initialSelection(a, Date.now()));
    if (save) {
      store.save(v.history).then(refreshHistory)
        .catch(() => showToast("조회 이력을 저장하지 못했습니다", "error"));
    }
    return true;
  }, [showToast, refreshHistory]);

  // 시작: 이력을 불러오고 가장 최근 항목으로 명식 표시
  useEffect(() => {
    store.list().then((list) => {
      setHistory(list);
      if (list[0]) {
        const f = formFromHistory(list[0]);
        setForm(f);
        run(f, false);
      }
    }).catch(() => showToast("조회 이력을 불러오지 못했습니다", "error"));
  }, [run, showToast]);

  const onSubmit = () => {
    if (run(form, true)) showToast("명식을 만들고 조회 이력에 저장했습니다");
  };

  const onPickHistory = (h: HistoryEntry) => {
    const f = formFromHistory(h);
    setForm(f);
    run(f, true);
  };

  const onDeleteHistory = (h: HistoryEntry) => {
    store.remove(h.id).then(refreshHistory).catch(() => showToast("이력을 삭제하지 못했습니다", "error"));
  };

  // ---- 이미지 저장 ----
  const onSaveImage = async () => {
    const filename = `사주_${analysis?.name ?? "화면"}_${dateStamp()}`;
    if (isDesktop()) {
      const r = await saveScreenshotDesktop(filename);
      if (r.status === "saved") showToast("현재 화면을 이미지로 저장했습니다");
      else if (r.status === "error") showToast(`이미지 저장 실패: ${r.message}`, "error");
      return;
    }
    // iPad/브라우저: 캡처 → 미리보기 → (사용자가 누르면) 공유 창
    if (!appRef.current || busy) return;
    setBusy(true);
    showToast("화면을 이미지로 만드는 중입니다…");
    try {
      const blob = await captureElement(appRef.current);
      setToast(null);
      setPreview({ blob, filename: `${filename}.png` });
    } catch (e) {
      showToast(`이미지를 만들지 못했습니다: ${(e as Error).message}`, "error");
    } finally {
      setBusy(false);
    }
  };

  const onSharePreview = async () => {
    if (!preview) return;
    const r = await shareOrDownload(preview.blob, preview.filename);
    if (r === "canceled") return;
    setPreview(null);
    showToast(r === "shared" ? "공유 창으로 보냈습니다" : "이미지 파일을 내려받았습니다");
  };

  // ---- 이력 백업 ----
  const onExport = async () => {
    const json = JSON.stringify(makeBackup(history), null, 2);
    const r = await shareOrDownload(new Blob([json], { type: "application/json" }), `사주이력_${dateStamp()}.json`);
    if (r !== "canceled") showToast(`조회 이력 ${history.length}명을 내보냈습니다`);
  };

  const onImport = async (file: File) => {
    try {
      const { items, skipped } = parseBackup(await file.text());
      const { added, updated } = await store.importMany(items);
      await refreshHistory();
      showToast(`가져오기 완료: 추가 ${added}명, 갱신 ${updated}명${skipped ? `, 잘못된 항목 ${skipped}개 제외` : ""}`);
    } catch (e) {
      showToast((e as Error).message, "error");
    }
  };

  const onReadingChange = (v: boolean) => { setReading(v); saveReading(v); };

  // ---- 화면 데이터 ----
  const natal = useMemo(() => (analysis ? natalView(analysis.chart) : null), [analysis]);
  const groups = useMemo(() => (analysis ? tenGodGroups(analysis.chart) : null), [analysis]);
  const daeun = useMemo(() => (analysis ? daeunItems(analysis, now) : null), [analysis, now]);
  const cycle = analysis && sel ? analysis.luck.daeun[sel.daeun] : null;
  const seun = useMemo(() => (analysis && cycle ? seunItems(analysis, cycle, now) : null), [analysis, cycle, now]);
  const wolun = useMemo(() => (analysis && sel ? wolunItems(analysis, sel.year, now) : null), [analysis, sel?.year, now]);

  const selectDaeun = (i: number) => {
    if (!analysis) return;
    const c = analysis.luck.daeun[i];
    const items = seunItems(analysis, c, now);
    const year = (items.find((s) => s.current) ?? items[0]).key;
    const months = wolunItems(analysis, year, now);
    setSel({ daeun: i, year, month: Math.max(0, months.findIndex((m) => m.current)) });
  };
  const selectYear = (year: number) => {
    if (!analysis || !sel) return;
    const months = wolunItems(analysis, year, now);
    setSel({ ...sel, year, month: Math.max(0, months.findIndex((m) => m.current)) });
  };
  const selectMonth = (month: number) => sel && setSel({ ...sel, month });

  const yearGz = analysis && sel ? ganzhiHanja((((sel.year - 4) % 60) + 60) % 60) : "";
  const dm = analysis ? STEMS[analysis.chart.dayMaster] : null;

  return (
    <div className="app" ref={appRef}>
      <NavRail
        onSaveImage={onSaveImage}
        onPdf={() => showToast("AI 분석 리포트(PDF) 기능은 준비 중입니다")}
        onSettings={() => setSettingsOpen(true)}
      />
      <main className="main">
        <BirthForm
          form={form}
          onChange={(p) => setForm((f) => ({ ...f, ...p }))}
          onSubmit={onSubmit}
          history={history}
          onPickHistory={onPickHistory}
          onDeleteHistory={onDeleteHistory}
        />
        <div className="body">
          <div className="col-left">
            <NatalCard view={natal} reading={reading} />
            <TenGodMap groups={groups} dayMaster={dm ? { hanja: dm.hanja, hangul: dm.hangul, element: dm.element } : null} />
          </div>
          <div className="col-right">
            <LuckStrip
              title="대운"
              sub={analysis ? `10년 단위 · ${analysis.luck.direction === "FORWARD" ? "순행" : "역행"} · 대운수 ${analysis.luck.daeunNumber}` : ""}
              items={daeun} selectedKey={sel?.daeun ?? null} onSelect={selectDaeun} reading={reading}
            />
            <LuckStrip
              title="세운"
              sub={cycle && seun ? `${ganzhiHanja(cycle.pillar.ganzhi)} 대운 ${seun[0].key}–${seun[seun.length - 1].key}` : ""}
              items={seun} selectedKey={sel?.year ?? null} onSelect={selectYear} reading={reading}
            />
            <LuckStrip
              title="월운"
              sub={sel ? `${sel.year}년 ${yearGz} · 절입 기준` : ""}
              items={wolun} selectedKey={sel?.month ?? null} onSelect={selectMonth} reading={reading}
            />
          </div>
        </div>
      </main>

      {toast && (
        <div role="status" data-no-capture className={`toast${toast.kind === "error" ? " error" : ""}`}><IconInfo />{toast.text}</div>
      )}
      {settingsOpen && (
        <SettingsDialog
          reading={reading} onReadingChange={onReadingChange}
          historyCount={history.length} onExport={onExport} onImport={onImport}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      {preview && (
        <ImagePreview blob={preview.blob} filename={preview.filename} onSave={onSharePreview} onClose={() => setPreview(null)} />
      )}
    </div>
  );
}
