// 플랫폼 어댑터: Electron(데스크톱)과 브라우저/iPad(PWA)의 차이를 여기서만 처리
import type { SajuDesktopApi } from "../../../electron/preload";

declare global {
  interface Window {
    sajuDesktop?: SajuDesktopApi;
  }
}

export const isDesktop = (): boolean => !!window.sajuDesktop;

export type SaveResult = { status: "saved"; path?: string } | { status: "canceled" } | { status: "unsupported" } | { status: "error"; message: string };

/** Electron: 창 전체를 캡처해 저장 대화상자로 저장 */
export async function saveScreenshotDesktop(suggestedName: string): Promise<SaveResult> {
  const api = window.sajuDesktop;
  if (!api) return { status: "unsupported" };
  try {
    const r = await api.saveScreenshot(suggestedName);
    if (r.saved) return { status: "saved", path: r.path };
    if (r.error) return { status: "error", message: r.error };
    return { status: "canceled" };
  } catch (e) {
    return { status: "error", message: (e as Error).message };
  }
}
