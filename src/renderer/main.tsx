import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/noto-sans-kr/400.css";
import "@fontsource/noto-sans-kr/700.css";
import "@fontsource/noto-serif-kr/700.css";
import "@fontsource/noto-serif-kr/900.css";
import "./styles.css";
import { App } from "./App";
import { setupPwa } from "./lib/pwa";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

setupPwa();
