// preload: 렌더러에 최소한의 기능만 노출
import { contextBridge, ipcRenderer } from "electron";

export interface SajuDesktopApi {
  platform: "electron";
  saveScreenshot(suggestedName: string): Promise<{ saved: boolean; path?: string; error?: string }>;
}

const api: SajuDesktopApi = {
  platform: "electron",
  saveScreenshot: (suggestedName) => ipcRenderer.invoke("capture:save", suggestedName),
};

contextBridge.exposeInMainWorld("sajuDesktop", api);
