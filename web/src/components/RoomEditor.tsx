import { useState } from "react";
import type { CellType } from "../types";

type BrushType = CellType;

const BRUSHES: { type: BrushType; label: string; emoji: string }[] = [
  { type: "wall", label: "Wall", emoji: "🧱" },
  { type: "floor_clean", label: "Clean", emoji: "⬜" },
  { type: "floor_dirty", label: "Dirty", emoji: "🟫" },
  { type: "furniture", label: "Furniture", emoji: "🪑" },
  { type: "garbage", label: "Garbage", emoji: "🗑" },
];

const SIZE_OPTIONS = [6, 8, 10] as const;

interface RoomEditorProps {
  grid: CellType[][];
  onGridChange: (grid: CellType[][]) => void;
  isEditing: boolean;
  onToggleEdit: () => void;
}

function buildGrid(size: number): CellType[][] {
  const grid: CellType[][] = [];
  for (let r = 0; r < size; r++) {
    const row: CellType[] = [];
    for (let c = 0; c < size; c++) {
      if (r === 0 || r === size - 1 || c === 0 || c === size - 1) row.push("wall");
      else if (r === 1 && c === 1) row.push("floor_clean");
      else row.push("floor_dirty");
    }
    grid.push(row);
  }
  return grid;
}

const CELL_BG: Record<CellType, string> = {
  floor_dirty: "#d4c5a9",
  floor_clean: "#f0ebe3",
  wall: "#4b5563",
  furniture: "#9ca3af",
  garbage: "#d4c5a9",
};

const CELL_EMOJI: Record<CellType, string> = {
  floor_dirty: "·",
  floor_clean: "",
  wall: "",
  furniture: "🪑",
  garbage: "🗑",
};

export default function RoomEditor({
  grid,
  onGridChange,
  isEditing,
  onToggleEdit,
}: RoomEditorProps) {
  const [brush, setBrush] = useState<BrushType>("floor_dirty");
  const [isPainting, setIsPainting] = useState(false);

  const cols = grid[0]?.length ?? 0;
  const currentSize = grid.length;

  function handleSizeChange(size: number) {
    onGridChange(buildGrid(size));
  }

  function paintCell(r: number, c: number) {
    // Border walls are fixed
    if (r === 0 || r === grid.length - 1 || c === 0 || c === cols - 1) return;
    // Robot start position (1,1) stays clean
    if (r === 1 && c === 1) return;
    const next = grid.map((row) => [...row]);
    next[r]![c] = brush;
    onGridChange(next);
  }

  if (!isEditing) {
    return (
      <button
        onClick={onToggleEdit}
        style={{
          padding: "6px 14px",
          borderRadius: 8,
          border: "2px dashed var(--accent)",
          background: "transparent",
          color: "var(--accent)",
          fontWeight: 700,
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        {"🎨 Edit Room"}
      </button>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Size selector */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
        <span style={{ fontWeight: 600, color: "var(--muted)" }}>Size:</span>
        {SIZE_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => handleSizeChange(s)}
            style={{
              padding: "2px 8px",
              borderRadius: 4,
              border:
                s === currentSize
                  ? "2px solid var(--accent)"
                  : "1px solid var(--line)",
              background: s === currentSize ? "rgba(5, 150, 105, 0.08)" : "var(--paper)",
              color: "var(--ink)",
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {s}x{s}
          </button>
        ))}
      </div>

      {/* Brush selector */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {BRUSHES.map((b) => (
          <button
            key={b.type}
            onClick={() => setBrush(b.type)}
            title={b.label}
            style={{
              padding: "3px 8px",
              borderRadius: 6,
              border:
                brush === b.type
                  ? "2px solid var(--accent)"
                  : "1px solid var(--line)",
              background:
                brush === b.type ? "rgba(5, 150, 105, 0.08)" : "var(--paper)",
              cursor: "pointer",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span>{b.emoji}</span>
            <span style={{ fontSize: 11, fontWeight: 600 }}>{b.label}</span>
          </button>
        ))}
      </div>

      {/* Grid preview */}
      <div
        style={{
          display: "inline-grid",
          gridTemplateColumns: `repeat(${cols}, 28px)`,
          gap: 1,
          background: "var(--line)",
          border: "1px solid var(--line)",
          borderRadius: 4,
          overflow: "hidden",
          userSelect: "none",
        }}
        onMouseLeave={() => setIsPainting(false)}
      >
        {grid.map((row, r) =>
          row.map((cell, c) => {
            const isBorder =
              r === 0 ||
              r === grid.length - 1 ||
              c === 0 ||
              c === cols - 1;
            const isStart = r === 1 && c === 1;
            return (
              <div
                key={`${r}-${c}`}
                onMouseDown={() => {
                  setIsPainting(true);
                  paintCell(r, c);
                }}
                onMouseEnter={() => {
                  if (isPainting) paintCell(r, c);
                }}
                onMouseUp={() => setIsPainting(false)}
                style={{
                  width: 28,
                  height: 28,
                  background: CELL_BG[cell],
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  cursor: isBorder || isStart ? "not-allowed" : "pointer",
                  opacity: isBorder || isStart ? 0.7 : 1,
                  position: "relative",
                }}
              >
                {isStart ? (
                  <span style={{ fontSize: 16 }}>{"🤖"}</span>
                ) : (
                  CELL_EMOJI[cell]
                )}
              </div>
            );
          }),
        )}
      </div>

      {/* Done button */}
      <button
        onClick={onToggleEdit}
        style={{
          padding: "6px 14px",
          borderRadius: 8,
          border: "none",
          background: "var(--accent)",
          color: "#fff",
          fontWeight: 700,
          fontSize: 13,
          cursor: "pointer",
          alignSelf: "flex-start",
        }}
      >
        Done
      </button>
    </div>
  );
}
