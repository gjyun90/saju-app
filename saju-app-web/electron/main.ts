// Electron main 프로세스: 창 관리, 화면 캡처 저장
import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const DEV_URL = process.env.VITE_DEV_SERVER_URL;

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1194,
    height: 834,
    minWidth: 1024,
    minHeight: 700,
    useContentSize: true,
    backgroundColor: "#F4EFE5",
    title: "사주 분석 지도",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once("ready-to-show", () => win.show());

  // 외부 링크는 기본 브라우저로, 앱 안에서는 다른 페이지로 이동하지 않음
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, url) => {
    if (DEV_URL && url.startsWith(DEV_URL)) return;
    e.preventDefault();
  });

  if (DEV_URL) win.loadURL(DEV_URL);
  else win.loadFile(path.join(__dirname, "../dist/index.html"));
  return win;
}

/** 현재 창을 PNG로 저장. 렌더러가 넘긴 파일명 제안을 기본값으로 사용 */
ipcMain.handle("capture:save", async (event, suggestedName: unknown) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return { saved: false, error: "창을 찾을 수 없습니다" };
  const image = await win.webContents.capturePage();
  const safeName = String(suggestedName ?? "사주")
    .replace(/[\\/:*?"<>|\r\n]/g, "_")
    .slice(0, 80) || "사주";
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: "이미지로 저장",
    defaultPath: path.join(app.getPath("pictures"), `${safeName}.png`),
    filters: [{ name: "PNG 이미지", extensions: ["png"] }],
  });
  if (canceled || !filePath) return { saved: false };
  await writeFile(filePath, image.toPNG());
  return { saved: true, path: filePath };
});

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
