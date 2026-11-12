import { IconHome, IconImage, IconPdf, IconSettings } from "./Icons";

interface Props {
  onSaveImage(): void;
  onPdf(): void;
  onSettings(): void;
}

export function NavRail({ onSaveImage, onPdf, onSettings }: Props) {
  return (
    <nav className="rail" aria-label="주 메뉴">
      <div className="seal" aria-hidden="true">命</div>
      <div className="brand">사주<br />분석 지도</div>
      <button type="button" aria-current="page"><IconHome />홈</button>
      <button type="button" onClick={onSaveImage}><IconImage />이미지<br />저장</button>
      <button type="button" onClick={onPdf}><IconPdf />PDF<br />출력</button>
      <button type="button" className="bottom" onClick={onSettings}><IconSettings />설정</button>
    </nav>
  );
}
