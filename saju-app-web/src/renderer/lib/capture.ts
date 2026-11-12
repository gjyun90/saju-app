// 웹(iPad)용 화면 캡처: DOM을 PNG로 변환
// 한글 글꼴은 496조각으로 나뉘어 있어, 화면에 실제로 쓰인 글자의 조각만 골라 이미지에 포함한다.
import { toBlob } from "html-to-image";

type Range = [number, number];

function parseUnicodeRange(v: string): Range[] {
  return v.split(",").map((s) => s.trim().replace(/^U\+/i, "")).filter(Boolean).map((p) => {
    if (p.includes("?")) return [parseInt(p.replace(/\?/g, "0"), 16), parseInt(p.replace(/\?/g, "F"), 16)] as Range;
    const [a, b] = p.split("-");
    return [parseInt(a, 16), parseInt(b ?? a, 16)] as Range;
  });
}

const hits = (ranges: Range[], cps: Set<number>) => {
  for (const cp of cps) for (const [a, b] of ranges) if (cp >= a && cp <= b) return true;
  return false;
};

const toDataUrl = (url: string) =>
  fetch(url).then((r) => r.blob()).then((b) => new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(b);
  }));

async function buildFontCss(root: HTMLElement): Promise<string> {
  const cps = new Set<number>();
  for (const ch of root.innerText + "0123456789:·~–") cps.add(ch.codePointAt(0)!);
  const jobs: Promise<string>[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try { rules = sheet.cssRules; } catch { continue; }
    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSFontFaceRule)) continue;
      const s = rule.style;
      const range = s.getPropertyValue("unicode-range");
      if (range && !hits(parseUnicodeRange(range), cps)) continue;
      const m = /url\(["']?([^"')]+\.woff2)["']?\)/.exec(s.getPropertyValue("src"));
      if (!m) continue;
      const url = new URL(m[1], sheet.href ?? location.href).href;
      jobs.push(toDataUrl(url).then((data) =>
        `@font-face{font-family:${s.getPropertyValue("font-family")};font-style:${s.getPropertyValue("font-style") || "normal"};` +
        `font-weight:${s.getPropertyValue("font-weight") || "400"};src:url(${data}) format("woff2");` +
        (range ? `unicode-range:${range};` : "") + "}"));
    }
  }
  return (await Promise.all(jobs)).join("\n");
}

const isSafari = () => /Safari/.test(navigator.userAgent) && !/Chrome|Chromium|CriOS|Edg/.test(navigator.userAgent);

/**
 * 캡처용 복제본은 스크롤 위치를 잃으므로, 가로 스크롤 영역의 위치를 transform으로 옮겨 둔다.
 * 실제 화면은 scrollLeft를 0으로 바꾸고 같은 거리만큼 translate하므로 보이는 모습은 그대로다.
 */
function freezeScrollers(root: HTMLElement): () => void {
  const saved: { el: HTMLElement; left: number; kids: HTMLElement[] }[] = [];
  root.classList.add("capturing");
  root.querySelectorAll<HTMLElement>(".hs").forEach((el) => {
    const left = el.scrollLeft;
    const kids = Array.from(el.children) as HTMLElement[];
    el.style.scrollSnapType = "none";
    el.scrollLeft = 0;
    kids.forEach((k) => { k.style.transform = `translateX(${-left}px)`; });
    saved.push({ el, left, kids });
  });
  return () => {
    root.classList.remove("capturing");
    for (const { el, left, kids } of saved) {
      kids.forEach((k) => { k.style.transform = ""; });
      el.scrollLeft = left;
      el.style.scrollSnapType = "";
    }
  };
}

/** root 요소를 PNG Blob으로. data-no-capture 속성이 있는 요소(토스트, 대화상자)는 제외 */
export async function captureElement(root: HTMLElement): Promise<Blob> {
  const fontEmbedCSS = await buildFontCss(root);
  const opts = {
    pixelRatio: Math.min(2, window.devicePixelRatio || 1),
    backgroundColor: "#F4EFE5",
    fontEmbedCSS,
    filter: (node: Node) => !(node instanceof HTMLElement && node.dataset.noCapture !== undefined),
  };
  const restore = freezeScrollers(root);
  try {
    // Safari는 첫 렌더링에서 글꼴·이미지가 빠지는 경우가 있어 한 번 미리 그린다
    if (isSafari()) await toBlob(root, opts);
    const blob = await toBlob(root, opts);
    if (!blob) throw new Error("이미지를 만들지 못했습니다");
    return blob;
  } finally {
    restore();
  }
}
