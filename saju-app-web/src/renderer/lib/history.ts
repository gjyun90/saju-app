// 조회 이력 저장소 (IndexedDB) — Electron과 iPad(PWA)에서 같은 코드로 동작
export interface HistoryInput {
  name: string;
  gender: "M" | "F";
  calendar: "SOLAR" | "LUNAR";
  isLeapMonth: boolean;
  year: number;
  month: number;
  day: number;
  time: string | null; // "HH:MM", 모름이면 null
}

export interface HistoryEntry extends HistoryInput {
  id: number;
  updatedAt: number; // 마지막 조회 시각 (epoch ms)
}

const DB_NAME = "saju-map";
const DB_VERSION = 1;
const STORE = "history";
const MAX_ENTRIES = 300;

export function sameBirth(a: HistoryInput, b: HistoryInput): boolean {
  return a.name === b.name && a.gender === b.gender && a.calendar === b.calendar &&
    a.isLeapMonth === b.isLeapMonth && a.year === b.year && a.month === b.month &&
    a.day === b.day && a.time === b.time;
}

const req = <T>(r: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });

const done = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("transaction aborted"));
  });

export class HistoryStore {
  private dbp: Promise<IDBDatabase> | null = null;

  constructor(private factory: IDBFactory = globalThis.indexedDB, private dbName = DB_NAME) {}

  private db(): Promise<IDBDatabase> {
    if (!this.dbp) {
      this.dbp = new Promise((resolve, reject) => {
        const open = this.factory.open(this.dbName, DB_VERSION);
        open.onupgradeneeded = () => {
          const db = open.result;
          if (!db.objectStoreNames.contains(STORE)) {
            const s = db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
            s.createIndex("updatedAt", "updatedAt");
          }
        };
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
      });
    }
    return this.dbp;
  }

  /** 최근 조회 순 */
  async list(): Promise<HistoryEntry[]> {
    const db = await this.db();
    const all = await req(db.transaction(STORE, "readonly").objectStore(STORE).getAll() as IDBRequest<HistoryEntry[]>);
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /** 같은 인물·생년월일시가 있으면 조회 시각만 갱신, 없으면 추가. 저장된 항목을 반환 */
  async save(input: HistoryInput, now = Date.now()): Promise<HistoryEntry> {
    const db = await this.db();
    const all = await this.list();
    const hit = all.find((e) => sameBirth(e, input));
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    let saved: HistoryEntry;
    if (hit) {
      saved = { ...hit, updatedAt: now };
      store.put(saved);
    } else {
      const id = await req(store.add({ ...input, updatedAt: now }) as IDBRequest<number>);
      saved = { ...input, id, updatedAt: now };
    }
    // 오래된 항목 정리
    const overflow = (hit ? all.length : all.length + 1) - MAX_ENTRIES;
    if (overflow > 0) all.slice(-overflow).forEach((e) => { if (e.id !== saved.id) store.delete(e.id); });
    await done(tx);
    return saved;
  }

  async remove(id: number): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    await done(tx);
  }

  /** 백업 가져오기: 같은 항목은 더 최근 조회 시각으로 갱신, 없는 항목은 추가 */
  async importMany(items: BackupItem[]): Promise<{ added: number; updated: number }> {
    const existing = await this.list();
    const db = await this.db();
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    let added = 0, updated = 0;
    for (const it of items) {
      const hit = existing.find((e) => sameBirth(e, it));
      if (hit) {
        if (it.updatedAt > hit.updatedAt) { store.put({ ...hit, updatedAt: it.updatedAt }); updated++; }
      } else {
        store.add({ ...it });
        existing.push({ ...it, id: -1 });
        added++;
      }
    }
    await done(tx);
    return { added, updated };
  }
}

// ---------------- 백업 파일 (JSON) ----------------
export type BackupItem = HistoryInput & { updatedAt: number };

export interface HistoryBackup {
  app: "saju-map";
  version: 1;
  exportedAt: string;
  entries: BackupItem[];
}

export function makeBackup(entries: HistoryEntry[], now = new Date()): HistoryBackup {
  return {
    app: "saju-map",
    version: 1,
    exportedAt: now.toISOString(),
    entries: entries.map(({ id: _id, ...rest }) => rest),
  };
}

const isInt = (v: unknown, min: number, max: number) => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

/** 백업 파일 내용 검증. 잘못된 항목은 건너뛰고, 형식 자체가 다르면 예외 */
export function parseBackup(text: string): { items: BackupItem[]; skipped: number } {
  let data: unknown;
  try { data = JSON.parse(text); } catch { throw new Error("백업 파일을 읽을 수 없습니다 (JSON 형식 아님)"); }
  const d = data as Partial<HistoryBackup>;
  if (d?.app !== "saju-map" || !Array.isArray(d.entries)) throw new Error("사주 분석 지도의 백업 파일이 아닙니다");
  const items: BackupItem[] = [];
  let skipped = 0;
  for (const e of d.entries as unknown as Record<string, unknown>[]) {
    const ok = e && typeof e.name === "string" && e.name.trim() &&
      (e.gender === "M" || e.gender === "F") && (e.calendar === "SOLAR" || e.calendar === "LUNAR") &&
      typeof e.isLeapMonth === "boolean" && isInt(e.year, 1900, 2100) && isInt(e.month, 1, 12) && isInt(e.day, 1, 31) &&
      (e.time === null || (typeof e.time === "string" && /^\d{2}:\d{2}$/.test(e.time)));
    if (!ok) { skipped++; continue; }
    items.push({
      name: (e.name as string).trim(), gender: e.gender as "M" | "F", calendar: e.calendar as "SOLAR" | "LUNAR",
      isLeapMonth: e.isLeapMonth as boolean, year: e.year as number, month: e.month as number, day: e.day as number,
      time: e.time as string | null, updatedAt: typeof e.updatedAt === "number" ? e.updatedAt : Date.now(),
    });
  }
  return { items, skipped };
}
