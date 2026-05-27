import { useMemo } from "react";
import type { Level, Position, Direction, CellType } from "../types";
import { CELL_DISPLAY } from "../types";

interface RoomGridProps {
  level: Level;
  robotPos: Position;
  robotDir: Direction;
  currentGrid: CellType[][];
}

const DIR_ARROW: Record<Direction, string> = {
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
};

export default function RoomGrid({ level, robotPos, robotDir, currentGrid }: RoomGridProps) {
  const rows = currentGrid.length;
  const cols = currentGrid[0]?.length ?? 0;

  // Track which dirty tiles have been cleaned (were dirty in original, now clean)
  const cleanedCells = useMemo(() => {
    const set = new Set<string>();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const orig = level.grid[r]?.[c];
        const curr = currentGrid[r]?.[c];
        if (
          (orig === "floor_dirty" || orig === "garbage") &&
          curr === "floor_clean"
        ) {
          set.add(`${r},${c}`);
        }
      }
    }
    return set;
  }, [level.grid, currentGrid, rows, cols]);

  // Cell size adapts to grid dimensions
  const maxCellSize = 56;
  const minCellSize = 32;
  const cellSize = Math.max(minCellSize, Math.min(maxCellSize, Math.floor(480 / Math.max(rows, cols))));
  const fontSize = Math.max(12, Math.floor(cellSize * 0.45));

  return (
    <div
      style={{
        display: "inline-grid",
        gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
        gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
        gap: "1px",
        background: "var(--line-strong)",
        borderRadius: "8px",
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
      }}
    >
      {currentGrid.map((row, r) =>
        row.map((cell, c) => {
          const isRobot = robotPos.row === r && robotPos.col === c;
          const wasCleaned = cleanedCells.has(`${r},${c}`);
          const display = CELL_DISPLAY[cell];

          let bg = display.bg;
          if (wasCleaned && cell === "floor_clean") {
            bg = "#e6f4ea"; // subtle green tint for cleaned trail
          }

          return (
            <div
              key={`${r}-${c}`}
              className="grid-cell"
              style={{
                width: cellSize,
                height: cellSize,
                background: bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize,
                position: "relative",
                userSelect: "none",
              }}
            >
              {/* Dirty dot pattern */}
              {cell === "floor_dirty" && !isRobot && (
                <span style={{ color: "#a08b6b", fontSize: fontSize * 0.8, opacity: 0.6 }}>
                  {"..."}
                </span>
              )}

              {/* Furniture emoji */}
              {cell === "furniture" && (
                <span style={{ fontSize: fontSize * 1.2 }}>{display.emoji}</span>
              )}

              {/* Garbage emoji */}
              {cell === "garbage" && (
                <span style={{ fontSize: fontSize * 1.2 }}>{display.emoji}</span>
              )}

              {/* Cleaned trail marker */}
              {wasCleaned && cell === "floor_clean" && !isRobot && (
                <span style={{ color: "#059669", fontSize: fontSize * 0.5, opacity: 0.35 }}>
                  {"✓"}
                </span>
              )}

              {/* Robot */}
              {isRobot && (
                <div
                  className="robot-animate"
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    zIndex: 2,
                  }}
                >
                  <span style={{ fontSize: fontSize * 1.1, lineHeight: 1 }}>
                    {"🤖"}
                  </span>
                  <span
                    style={{
                      fontSize: fontSize * 0.7,
                      fontWeight: 700,
                      color: "#059669",
                      marginTop: -2,
                      lineHeight: 1,
                    }}
                  >
                    {DIR_ARROW[robotDir]}
                  </span>
                </div>
              )}
            </div>
          );
        }),
      )}
    </div>
  );
}
