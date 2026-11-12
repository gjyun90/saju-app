import { useEffect, useMemo } from "react";
import { Modal } from "./Modal";

interface Props {
  blob: Blob;
  filename: string;
  onSave(): void;
  onClose(): void;
}

/** iPad/브라우저: 캡처한 이미지를 보여주고, 버튼을 누르면 공유 창(사진에 저장)을 연다 */
export function ImagePreview({ blob, filename, onSave, onClose }: Props) {
  const url = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return (
    <Modal title="이미지로 저장" onClose={onClose} wide>
      <img className="preview" src={url} alt="현재 화면 캡처 미리보기" />
      <div className="dialog-foot">
        <span className="muted">{filename}</span>
        <button type="button" className="btn primary-btn" onClick={onSave}>공유 · 저장</button>
      </div>
    </Modal>
  );
}
