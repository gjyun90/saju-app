// 서비스 워커 등록 (iPad/브라우저 전용). Electron(file://)에서는 등록하지 않음
import { registerSW } from "virtual:pwa-register";

export function setupPwa(): void {
  if (window.sajuDesktop) return;
  if (!("serviceWorker" in navigator)) return;
  const secure = location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";
  if (!secure) return; // http://PC-IP:5173 같은 개발용 접속에서는 등록하지 않음
  registerSW({ immediate: true });
}

/** 홈 화면 앱(standalone)으로 실행 중인지 */
export function isStandalone(): boolean {
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}
