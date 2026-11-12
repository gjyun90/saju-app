// 파일 내보내기: iPad는 공유 창(사진에 저장, 파일에 저장 등), 그 외는 다운로드
export type ShareResult = "shared" | "downloaded" | "canceled";

export async function shareOrDownload(blob: Blob, filename: string): Promise<ShareResult> {
  const file = new File([blob], filename, { type: blob.type });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (!window.sajuDesktop && nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return "shared";
    } catch (e) {
      if ((e as DOMException).name === "AbortError") return "canceled";
      // 공유 실패 시 다운로드로 대체
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return "downloaded";
}
