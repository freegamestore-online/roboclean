export type Direction = "up" | "down" | "left" | "right";

export type CellType =
  | "floor_dirty"
  | "floor_clean"
  | "wall"
  | "furniture"
  | "garbage";

export interface Position {
  row: number;
  col: number;
}

export interface RobotState {
  position: Position;
  direction: Direction;
  tilesVacuumed: number;
  garbageCollected: number;
  moveCount: number;
  error: string | null;
}

export interface ExecutionStep {
  state: RobotState;
  grid: CellType[][];
  lineNumber: number;
}

export interface Level {
  id: number;
  name: string;
  description: string;
  hint: string;
  grid: CellType[][];
  start: Position;
  startDirection: Direction;
  availableCommands: string[];
  threeStarMoves: number;
  twoStarMoves: number;
}

export const CELL_DISPLAY: Record<CellType, { emoji: string; bg: string }> = {
  floor_dirty: { emoji: "·", bg: "#d4c5a9" },
  floor_clean: { emoji: "", bg: "#f0ebe3" },
  wall: { emoji: "", bg: "#4b5563" },
  furniture: { emoji: "🪑", bg: "#9ca3af" },
  garbage: { emoji: "🗑", bg: "#d4c5a9" },
};

export const COMMAND_HELP: Record<string, { syntax: string; desc: string }> = {
  move: { syntax: "move(n)", desc: "Move forward n tiles" },
  turnLeft: { syntax: "turnLeft()", desc: "Turn left 90°" },
  turnRight: { syntax: "turnRight()", desc: "Turn right 90°" },
  turnAround: { syntax: "turnAround()", desc: "Turn 180°" },
  vacuum: { syntax: "vacuum()", desc: "Clean current tile" },
  collect: { syntax: "collect()", desc: "Pick up garbage" },
  dirty: { syntax: "dirty()", desc: "Is current tile dirty?" },
  wallAhead: { syntax: "wallAhead()", desc: "Is there a wall ahead?" },
  garbageHere: { syntax: "garbageHere()", desc: "Is there garbage here?" },
  roomClean: { syntax: "roomClean()", desc: "Is the whole room clean?" },
  repeat: { syntax: "repeat(n) { ... }", desc: "Repeat n times" },
  while_loop: { syntax: "while (cond) { ... }", desc: "Loop while condition true" },
  if_stmt: { syntax: "if (cond) { ... }", desc: "Run if condition true" },
};
