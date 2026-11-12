import type { CharCell } from "../lib/viewModel";

export function CharTile({ cell, pos, reading }: { cell: CharCell; pos: "top" | "bottom"; reading: boolean }) {
  return (
    <span className={`tile ${pos} el-${cell.element}`} aria-label={`${cell.hanja}(${cell.hangul})`}>
      <span className="h" aria-hidden="true">{cell.hanja}</span>
      {reading && <span className="k" aria-hidden="true">{cell.hangul}</span>}
    </span>
  );
}
