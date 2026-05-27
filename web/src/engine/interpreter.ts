import type { CellType, Direction, Level, ExecutionStep, RobotState } from "../types";

const DIR_DELTA: Record<Direction, { dr: number; dc: number }> = {
  up: { dr: -1, dc: 0 },
  down: { dr: 1, dc: 0 },
  left: { dr: 0, dc: -1 },
  right: { dr: 0, dc: 1 },
};

const TURN_LEFT: Record<Direction, Direction> = {
  up: "left", left: "down", down: "right", right: "up",
};
const TURN_RIGHT: Record<Direction, Direction> = {
  up: "right", right: "down", down: "left", left: "up",
};

const MAX_STEPS = 500;

interface Token {
  type: "command" | "number" | "lparen" | "rparen" | "lbrace" | "rbrace" | "keyword" | "not" | "comma";
  value: string;
  line: number;
}

function tokenize(code: string): Token[] {
  const tokens: Token[] = [];
  const lines = code.split("\n");
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    let line = lines[lineIdx]!;
    const lineNum = lineIdx + 1;
    line = line.replace(/\/\/.*$/, "").trim();
    let i = 0;
    while (i < line.length) {
      if (/\s/.test(line[i]!)) { i++; continue; }
      if (line[i] === "(") { tokens.push({ type: "lparen", value: "(", line: lineNum }); i++; continue; }
      if (line[i] === ")") { tokens.push({ type: "rparen", value: ")", line: lineNum }); i++; continue; }
      if (line[i] === "{") { tokens.push({ type: "lbrace", value: "{", line: lineNum }); i++; continue; }
      if (line[i] === "}") { tokens.push({ type: "rbrace", value: "}", line: lineNum }); i++; continue; }
      if (line[i] === ",") { tokens.push({ type: "comma", value: ",", line: lineNum }); i++; continue; }
      if (line[i] === "!") { tokens.push({ type: "not", value: "!", line: lineNum }); i++; continue; }
      if (/\d/.test(line[i]!)) {
        let num = "";
        while (i < line.length && /\d/.test(line[i]!)) { num += line[i]; i++; }
        tokens.push({ type: "number", value: num, line: lineNum });
        continue;
      }
      if (/[a-zA-Z_]/.test(line[i]!)) {
        let word = "";
        while (i < line.length && /[a-zA-Z_]/.test(line[i]!)) { word += line[i]; i++; }
        const keywords = ["while", "if", "repeat", "else"];
        tokens.push({ type: keywords.includes(word) ? "keyword" : "command", value: word, line: lineNum });
        continue;
      }
      i++;
    }
  }
  return tokens;
}

interface ASTNode {
  type: "call" | "repeat" | "while" | "if";
  name?: string;
  args?: number[];
  condition?: { fn: string; negated: boolean };
  body?: ASTNode[];
  line: number;
}

function parse(tokens: Token[]): ASTNode[] {
  let pos = 0;

  function peek(): Token | undefined { return tokens[pos]; }
  function advance(): Token { return tokens[pos++]!; }
  function expect(type: string): Token {
    const t = advance();
    if (t.type !== type) throw new Error(`Expected ${type} at line ${t.line}, got ${t.type} "${t.value}"`);
    return t;
  }

  function parseBlock(): ASTNode[] {
    expect("lbrace");
    const nodes: ASTNode[] = [];
    while (peek() && peek()!.type !== "rbrace") {
      nodes.push(parseStatement());
    }
    expect("rbrace");
    return nodes;
  }

  function parseCondition(): { fn: string; negated: boolean } {
    expect("lparen");
    let negated = false;
    if (peek()?.type === "not") { advance(); negated = true; }
    const fn = expect("command").value;
    expect("lparen"); expect("rparen");
    expect("rparen");
    return { fn, negated };
  }

  function parseStatement(): ASTNode {
    const t = peek()!;
    if (t.type === "keyword") {
      advance();
      if (t.value === "repeat") {
        expect("lparen");
        const count = parseInt(expect("number").value, 10);
        expect("rparen");
        const body = parseBlock();
        return { type: "repeat", args: [count], body, line: t.line };
      }
      if (t.value === "while") {
        const condition = parseCondition();
        const body = parseBlock();
        return { type: "while", condition, body, line: t.line };
      }
      if (t.value === "if") {
        const condition = parseCondition();
        const body = parseBlock();
        return { type: "if", condition, body, line: t.line };
      }
      throw new Error(`Unknown keyword "${t.value}" at line ${t.line}`);
    }
    if (t.type === "command") {
      advance();
      expect("lparen");
      const args: number[] = [];
      if (peek()?.type === "number") {
        args.push(parseInt(advance().value, 10));
      }
      expect("rparen");
      return { type: "call", name: t.value, args, line: t.line };
    }
    throw new Error(`Unexpected token "${t.value}" at line ${t.line}`);
  }

  const ast: ASTNode[] = [];
  while (pos < tokens.length) {
    ast.push(parseStatement());
  }
  return ast;
}

function cloneGrid(grid: CellType[][]): CellType[][] {
  return grid.map((row) => [...row]);
}

function isWalkable(grid: CellType[][], row: number, col: number): boolean {
  if (row < 0 || row >= grid.length) return false;
  const r = grid[row];
  if (!r || col < 0 || col >= r.length) return false;
  return r[col] !== "wall" && r[col] !== "furniture";
}

export function execute(code: string, level: Level): { steps: ExecutionStep[]; error: string | null } {
  let tokens: Token[];
  let ast: ASTNode[];
  try {
    tokens = tokenize(code);
    ast = parse(tokens);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Parse error";
    return {
      steps: [{
        state: { position: { ...level.start }, direction: level.startDirection, tilesVacuumed: 0, garbageCollected: 0, moveCount: 0, error: msg },
        grid: cloneGrid(level.grid),
        lineNumber: 0,
      }],
      error: msg,
    };
  }

  const steps: ExecutionStep[] = [];
  const grid = cloneGrid(level.grid);
  const state: RobotState = {
    position: { ...level.start },
    direction: level.startDirection,
    tilesVacuumed: 0,
    garbageCollected: 0,
    moveCount: 0,
    error: null,
  };

  function snapshot(line: number) {
    steps.push({
      state: { ...state, position: { ...state.position } },
      grid: cloneGrid(grid),
      lineNumber: line,
    });
  }

  snapshot(0);

  function evalCondition(cond: { fn: string; negated: boolean }): boolean {
    let result = false;
    const { row, col } = state.position;
    const ahead = DIR_DELTA[state.direction];
    switch (cond.fn) {
      case "dirty": {
        const cell = grid[row]?.[col];
        result = cell === "floor_dirty";
        break;
      }
      case "wallAhead": {
        result = !isWalkable(grid, row + ahead.dr, col + ahead.dc);
        break;
      }
      case "garbageHere": {
        result = grid[row]?.[col] === "garbage";
        break;
      }
      case "roomClean": {
        result = !grid.some((r) => r.some((c) => c === "floor_dirty" || c === "garbage"));
        break;
      }
      default:
        state.error = `Unknown sensor: ${cond.fn}`;
        return false;
    }
    return cond.negated ? !result : result;
  }

  function run(nodes: ASTNode[]): boolean {
    for (const node of nodes) {
      if (steps.length > MAX_STEPS || state.error) return false;

      switch (node.type) {
        case "call": {
          switch (node.name) {
            case "move": {
              const count = node.args?.[0] ?? 1;
              for (let i = 0; i < count; i++) {
                const delta = DIR_DELTA[state.direction];
                const nr = state.position.row + delta.dr;
                const nc = state.position.col + delta.dc;
                if (isWalkable(grid, nr, nc)) {
                  state.position = { row: nr, col: nc };
                  state.moveCount++;
                } else {
                  state.error = `Hit a wall at line ${node.line}!`;
                  snapshot(node.line);
                  return false;
                }
                snapshot(node.line);
              }
              break;
            }
            case "turnLeft":
              state.direction = TURN_LEFT[state.direction];
              snapshot(node.line);
              break;
            case "turnRight":
              state.direction = TURN_RIGHT[state.direction];
              snapshot(node.line);
              break;
            case "turnAround":
              state.direction = TURN_LEFT[TURN_LEFT[state.direction]];
              snapshot(node.line);
              break;
            case "vacuum": {
              const { row, col } = state.position;
              if (grid[row]?.[col] === "floor_dirty") {
                grid[row]![col] = "floor_clean";
                state.tilesVacuumed++;
              }
              snapshot(node.line);
              break;
            }
            case "collect": {
              const { row, col } = state.position;
              if (grid[row]?.[col] === "garbage") {
                grid[row]![col] = "floor_clean";
                state.garbageCollected++;
              }
              snapshot(node.line);
              break;
            }
            default:
              state.error = `Unknown command: ${node.name} at line ${node.line}`;
              snapshot(node.line);
              return false;
          }
          break;
        }
        case "repeat": {
          const count = node.args?.[0] ?? 2;
          for (let i = 0; i < count; i++) {
            if (!run(node.body ?? [])) return false;
          }
          break;
        }
        case "while": {
          let guard = 0;
          while (node.condition && evalCondition(node.condition)) {
            if (!run(node.body ?? [])) return false;
            if (++guard > MAX_STEPS || steps.length > MAX_STEPS) {
              state.error = "Infinite loop detected!";
              return false;
            }
          }
          break;
        }
        case "if": {
          if (node.condition && evalCondition(node.condition)) {
            if (!run(node.body ?? [])) return false;
          }
          break;
        }
      }
    }
    return true;
  }

  run(ast);

  const totalDirty = level.grid.flat().filter((c) => c === "floor_dirty").length;
  const totalGarbage = level.grid.flat().filter((c) => c === "garbage").length;
  const allClean = state.tilesVacuumed >= totalDirty && state.garbageCollected >= totalGarbage;

  return {
    steps,
    error: state.error ?? (allClean ? null : `Room not fully clean (${state.tilesVacuumed}/${totalDirty} tiles, ${state.garbageCollected}/${totalGarbage} garbage)`),
  };
}

export function checkWin(level: Level, lastStep: ExecutionStep): { won: boolean; message: string } {
  if (lastStep.state.error) {
    return { won: false, message: lastStep.state.error };
  }
  const totalDirty = level.grid.flat().filter((c) => c === "floor_dirty").length;
  const totalGarbage = level.grid.flat().filter((c) => c === "garbage").length;
  const allClean = lastStep.state.tilesVacuumed >= totalDirty && lastStep.state.garbageCollected >= totalGarbage;
  if (allClean) {
    return { won: true, message: `Room clean in ${lastStep.state.moveCount} moves!` };
  }
  return {
    won: false,
    message: `Not done yet — ${totalDirty - lastStep.state.tilesVacuumed} dirty tiles and ${totalGarbage - lastStep.state.garbageCollected} garbage remaining.`,
  };
}
