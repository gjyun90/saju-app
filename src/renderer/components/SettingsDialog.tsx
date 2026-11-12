import { useRef } from "react";
import type { AgeMode } from "../lib/viewModel";
import { Modal } from "./Modal";

interface Props {
  reading: boolean;
  onReadingChange(v: boolean): void;
  ageMode: AgeMode;
  onAgeModeChange(v: AgeMode): void;
  historyCount: number;
  onExport(): void;
  onImport(file: File): void;
  onClose(): void;
}

export function SettingsDialog({ reading, onReadingChange, ageMode, onAgeModeChange, historyCount, onExport, onImport, onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <Modal title="설정" onClose={onClose}>
      <div className="set-group">
        <h3>표시</h3>
        <label className="set-row">
          <span className="set-text"><b>한글 독음 표시</b><small>한자 아래에 갑·을·자·축 같은 읽는 법을 표시</small></span>
          <input type="checkbox" role="switch" className="switch" checked={reading} onChange={(e) => onReadingChange(e.target.checked)} />
        </label>
        <div className="set-row">
          <span className="set-text" id="lbl-age"><b>나이 기준</b><small>대운·세운의 나이와 연도를 맞추는 기준 (전통나이: 태어난 해가 1세)</small></span>
          <div className="seg" role="group" aria-labelledby="lbl-age">
            <button type="button" style={{ padding: "0 12px" }} aria-pressed={ageMode === "KOREAN"} onClick={() => onAgeModeChange("KOREAN")}>전통나이</button>
            <button type="button" style={{ padding: "0 12px" }} aria-pressed={ageMode === "INTERNATIONAL"} onClick={() => onAgeModeChange("INTERNATIONAL")}>만 나이</button>
          </div>
        </div>
      </div>

      <div className="set-group">
        <h3>조회 이력 백업 <span className="muted">· {historyCount}명</span></h3>
        <div className="set-row">
          <span className="set-text"><b>내보내기</b><small>이력을 파일로 저장 (iPad는 공유 창에서 "파일에 저장")</small></span>
          <button type="button" className="btn" onClick={onExport} disabled={historyCount === 0}>내보내기</button>
        </div>
        <div className="set-row">
          <span className="set-text"><b>가져오기</b><small>백업 파일의 이력을 합칩니다 (기존 이력은 유지)</small></span>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>가져오기</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ""; }} />
        </div>
      </div>

      <div className="set-group">
        <h3>정보</h3>
        <dl className="set-info">
          <dt>출생지</dt><dd>서울 (동경 126.98°) 고정</dd>
          <dt>시각 보정</dt><dd>진태양시 (경도·균시차)</dd>
          <dt>지지 辰 십신</dt><dd>엑셀 조견표 기준</dd>
          <dt>데이터 저장</dt><dd>이 기기 안에만 저장 (서버 전송 없음)</dd>
          <dt>버전</dt><dd>{__APP_VERSION__}</dd>
        </dl>
      </div>
    </Modal>
  );
}
