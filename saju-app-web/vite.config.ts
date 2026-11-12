import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const pkg = JSON.parse(readFileSync(r("./package.json"), "utf8")) as { version: string };

// 배포 빌드에만 CSP 적용 (개발 서버는 HMR 인라인 스크립트가 필요)
const csp = (): Plugin => ({
  name: "inject-csp",
  apply: "build",
  transformIndexHtml: (html) =>
    html.replace(
      "<meta charset=\"utf-8\">",
      "<meta charset=\"utf-8\">\n  <meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob:; worker-src 'self'\">",
    ),
});

// 화면(renderer) 빌드
// - Electron: file:// 로 열기 때문에 base는 상대경로
// - GitHub Pages: https://아이디.github.io/saju-app/ 하위 경로에서도 상대경로로 동작
export default defineConfig({
  root: r("./src/renderer"),
  base: "./",
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    react(),
    csp(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false, // Electron에서는 등록하지 않도록 lib/pwa.ts에서 직접 등록
      manifestFilename: "manifest.webmanifest",
      includeAssets: ["icons/apple-touch-icon.png", "icons/favicon-64.png"],
      manifest: {
        id: "./",
        name: "사주 분석 지도",
        short_name: "사주 지도",
        description: "생년월일시로 사주 원국과 대운·세운·월운을 보는 앱",
        lang: "ko",
        start_url: "./",
        scope: "./",
        display: "standalone",
        orientation: "any",
        background_color: "#F4EFE5",
        theme_color: "#16233F",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // 앱 본체는 미리 저장(오프라인 실행). 한글 글꼴(약 11MB, 496조각)은 화면에 쓰인 조각만 사용 시점에 저장
        globPatterns: ["**/*.{js,css,html,png,webmanifest}"],
        navigateFallback: "index.html",
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === "font",
            handler: "CacheFirst",
            options: {
              cacheName: "fonts",
              expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: { port: 5173, strictPort: true },
  build: { outDir: r("./dist"), emptyOutDir: true, target: ["chrome120", "safari16"], chunkSizeWarningLimit: 1500 },
});
