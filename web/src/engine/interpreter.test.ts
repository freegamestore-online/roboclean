import { describe, it, expect } from "vitest";
import { execute, checkWin } from "./interpreter";
import { levels } from "./levels";
import type { CellType, Level, ExecutionStep } from "../types";

/* ── Cell aliases (same as levels.ts) ─────────────────────────── */
const D = "floor_dirty" as CellType;
const C = "floor_clean" as CellType;
const W = "wall" as CellType;
const F = "furniture" as CellType;
const G = "garbage" as CellType;

/* ── Test helper ──────────────────────────────────────────────── */
function makeLevel(
  grid: CellType[][],
  start: { row: number; col: number } = { row: 1, col: 1 },
  startDirection: "up" | "down" | "left" | "right" = "right",
): Level {
  return {
    id: 99,
    name: "Test Level",
    description: "",
    hint: "",
    grid,
    start,
    startDirection,
    availableCommands: [],
    threeStarMoves: 99,
    twoStarMoves: 99,
  };
}

/** Return the final execution step (last snapshot). */
function lastStep(result: { steps: ExecutionStep[] }): ExecutionStep {
  return result.steps[result.steps.length - 1]!;
}

/* ================================================================
 * 1. Basic movement
 * ================================================================ */
describe("Basic movement", () => {
  const hallway = makeLevel([
    [W, W, W, W, W, W, W],
    [W, C, C, C, C, C, W],
    [W, W, W, W, W, W, W],
  ]);

  it("move(1) moves one tile forward", () => {
    const result = execute("move(1)", hallway);
    expect(result.error).toBeNull();
    const last = lastStep(result);
    expect(last.state.position).toEqual({ row: 1, col: 2 });
    expect(last.state.moveCount).toBe(1);
  });

  it("move(3) moves three tiles forward", () => {
    const result = execute("move(3)", hallway);
    expect(result.error).toBeNull();
    const last = lastStep(result);
    expect(last.state.position).toEqual({ row: 1, col: 4 });
    expect(last.state.moveCount).toBe(3);
  });

  it("move(3) produces 3 intermediate snapshots (one per tile)", () => {
    const result = execute("move(3)", hallway);
    // initial snapshot + 3 move snapshots
    expect(result.steps.length).toBe(4);
  });

  it("movement in all 4 directions", () => {
    const open = makeLevel(
      [
        [W, W, W, W, W],
        [W, C, C, C, W],
        [W, C, C, C, W],
        [W, C, C, C, W],
        [W, W, W, W, W],
      ],
      { row: 2, col: 2 },
      "right",
    );

    // right
    let r = execute("move(1)", { ...open, startDirection: "right" });
    expect(lastStep(r).state.position).toEqual({ row: 2, col: 3 });

    // left
    r = execute("move(1)", { ...open, startDirection: "left" });
    expect(lastStep(r).state.position).toEqual({ row: 2, col: 1 });

    // up
    r = execute("move(1)", { ...open, startDirection: "up" });
    expect(lastStep(r).state.position).toEqual({ row: 1, col: 2 });

    // down
    r = execute("move(1)", { ...open, startDirection: "down" });
    expect(lastStep(r).state.position).toEqual({ row: 3, col: 2 });
  });
});

/* ================================================================
 * 2. Turning
 * ================================================================ */
describe("Turning", () => {
  const level = makeLevel([
    [W, W, W],
    [W, C, W],
    [W, W, W],
  ]);

  it("turnLeft() rotates counter-clockwise", () => {
    const r = execute("turnLeft()", level);
    expect(lastStep(r).state.direction).toBe("up");
  });

  it("turnRight() rotates clockwise", () => {
    const r = execute("turnRight()", level);
    expect(lastStep(r).state.direction).toBe("down");
  });

  it("turnAround() reverses direction", () => {
    const r = execute("turnAround()", level);
    expect(lastStep(r).state.direction).toBe("left");
  });

  it("four turnLeft() calls return to original direction", () => {
    const code = "turnLeft()\nturnLeft()\nturnLeft()\nturnLeft()";
    const r = execute(code, level);
    expect(lastStep(r).state.direction).toBe("right");
  });

  it("full clockwise cycle: right -> down -> left -> up -> right", () => {
    const r = execute(
      "turnRight()\nturnRight()\nturnRight()\nturnRight()",
      level,
    );
    expect(r.steps[1]!.state.direction).toBe("down");
    expect(r.steps[2]!.state.direction).toBe("left");
    expect(r.steps[3]!.state.direction).toBe("up");
    expect(r.steps[4]!.state.direction).toBe("right");
  });
});

/* ================================================================
 * 3. vacuum()
 * ================================================================ */
describe("vacuum()", () => {
  it("cleans a dirty tile and increments counter", () => {
    const level = makeLevel([
      [W, W, W],
      [W, D, W],
      [W, W, W],
    ]);
    const r = execute("vacuum()", level);
    expect(lastStep(r).state.tilesVacuumed).toBe(1);
    expect(lastStep(r).grid[1]![1]).toBe("floor_clean");
  });

  it("does nothing on a clean tile", () => {
    const level = makeLevel([
      [W, W, W],
      [W, C, W],
      [W, W, W],
    ]);
    const r = execute("vacuum()", level);
    expect(lastStep(r).state.tilesVacuumed).toBe(0);
    expect(lastStep(r).grid[1]![1]).toBe("floor_clean");
  });

  it("vacuuming multiple dirty tiles increments counter each time", () => {
    const level = makeLevel([
      [W, W, W, W],
      [W, D, D, W],
      [W, W, W, W],
    ]);
    const code = "vacuum()\nmove(1)\nvacuum()";
    const r = execute(code, level);
    expect(lastStep(r).state.tilesVacuumed).toBe(2);
  });
});

/* ================================================================
 * 4. collect()
 * ================================================================ */
describe("collect()", () => {
  it("picks up garbage and increments counter", () => {
    const level = makeLevel([
      [W, W, W],
      [W, G, W],
      [W, W, W],
    ]);
    const r = execute("collect()", level);
    expect(lastStep(r).state.garbageCollected).toBe(1);
    expect(lastStep(r).grid[1]![1]).toBe("floor_clean");
  });

  it("does nothing on a non-garbage tile", () => {
    const level = makeLevel([
      [W, W, W],
      [W, C, W],
      [W, W, W],
    ]);
    const r = execute("collect()", level);
    expect(lastStep(r).state.garbageCollected).toBe(0);
  });
});

/* ================================================================
 * 5. Wall collision
 * ================================================================ */
describe("Wall collision", () => {
  it("move into a wall produces error", () => {
    const level = makeLevel([
      [W, W, W],
      [W, C, W],
      [W, W, W],
    ]);
    const r = execute("move(1)", level);
    expect(r.error).toContain("wall");
    expect(lastStep(r).state.error).toContain("wall");
  });

  it("move into furniture produces error", () => {
    const level = makeLevel([
      [W, W, W, W],
      [W, C, F, W],
      [W, W, W, W],
    ]);
    const r = execute("move(1)", level);
    expect(r.error).toContain("wall");
  });

  it("stops at the wall mid-move(3)", () => {
    const level = makeLevel([
      [W, W, W, W, W],
      [W, C, C, W, W],
      [W, W, W, W, W],
    ]);
    const r = execute("move(3)", level);
    expect(r.error).not.toBeNull();
    // Robot moved 1 tile (to col 2), then hit wall trying to enter col 3.
    // The error snapshot records the position where the collision was attempted from.
    expect(lastStep(r).state.position).toEqual({ row: 1, col: 2 });
  });
});

/* ================================================================
 * 6. repeat(n)
 * ================================================================ */
describe("repeat(n)", () => {
  it("repeat(3) { move(1) } moves 3 tiles", () => {
    const level = makeLevel([
      [W, W, W, W, W, W],
      [W, C, C, C, C, W],
      [W, W, W, W, W, W],
    ]);
    const r = execute("repeat(3) { move(1) }", level);
    expect(r.error).toBeNull();
    expect(lastStep(r).state.position).toEqual({ row: 1, col: 4 });
    expect(lastStep(r).state.moveCount).toBe(3);
  });

  it("repeat(4) with move+vacuum cleans 4 tiles", () => {
    const level = makeLevel([
      [W, W, W, W, W, W, W],
      [W, C, D, D, D, D, W],
      [W, W, W, W, W, W, W],
    ]);
    const code = "repeat(4) {\n  move(1)\n  vacuum()\n}";
    const r = execute(code, level);
    expect(r.error).toBeNull();
    expect(lastStep(r).state.tilesVacuumed).toBe(4);
  });

  it("nested repeat works", () => {
    const level = makeLevel([
      [W, W, W, W, W, W, W],
      [W, C, C, C, C, C, W],
      [W, W, W, W, W, W, W],
    ]);
    const code = "repeat(2) { repeat(2) { move(1) } }";
    const r = execute(code, level);
    expect(r.error).toBeNull();
    expect(lastStep(r).state.position).toEqual({ row: 1, col: 5 });
    expect(lastStep(r).state.moveCount).toBe(4);
  });
});

/* ================================================================
 * 7. while loop
 * ================================================================ */
describe("while loop", () => {
  it("while (!roomClean()) { vacuum(); move(1) } cleans a hallway", () => {
    const level = makeLevel([
      [W, W, W, W, W],
      [W, D, D, D, W],
      [W, W, W, W, W],
    ], { row: 1, col: 1 });
    const code = "while (!roomClean()) {\n  vacuum()\n  move(1)\n}";
    execute(code, level);
    // Should clean 3 dirty tiles; last move hits wall but that's ok —
    // actually let's check: after vacuuming all 3, roomClean() is true so
    // the loop body for the third iteration still has move(1) which could hit wall.
    // D at (1,1), (1,2), (1,3). Robot starts at (1,1).
    // Iter 1: vacuum (1,1), move to (1,2)
    // Iter 2: vacuum (1,2), move to (1,3)
    // Iter 3: vacuum (1,3) — now roomClean() is true, but we already entered the body
    // Wait — the while checks condition at the TOP, so after iter 3:
    //   vacuum (1,3), move to... hmm, we're at (1,3), facing right, next is wall.
    //   Actually the body runs vacuum then move. After vacuum(1,3) the room is clean.
    //   But move(1) will try to go right into wall at (1,4)=W. Error.
    // Let's adjust: use a hallway that ends with clean tile so robot can stop safely.
    // Actually, let me re-check: the while condition is checked before each iteration.
    // After cleaning all 3 tiles, the while condition !roomClean() is false, so loop exits.
    // But the issue is the body does vacuum THEN move. So:
    // Start: (1,1) facing right
    // Check: !roomClean() -> true (3 dirty)
    //   vacuum (1,1)->clean, move to (1,2)  [2 dirty remain]
    // Check: !roomClean() -> true (2 dirty)
    //   vacuum (1,2)->clean, move to (1,3)  [1 dirty remain]
    // Check: !roomClean() -> true (1 dirty)
    //   vacuum (1,3)->clean, move(1) -> hits wall! Error.
    // So this specific code on this specific grid WILL hit a wall. Let's use a longer hall.
    const level2 = makeLevel([
      [W, W, W, W, W, W],
      [W, D, D, D, C, W],
      [W, W, W, W, W, W],
    ], { row: 1, col: 1 });
    const r2 = execute(code, level2);
    expect(r2.error).toBeNull();
    expect(lastStep(r2).state.tilesVacuumed).toBe(3);
    expect(lastStep(r2).state.position).toEqual({ row: 1, col: 4 });
  });

  it("while (dirty()) { vacuum() } vacuums only current tile", () => {
    const level = makeLevel([
      [W, W, W, W],
      [W, D, D, W],
      [W, W, W, W],
    ]);
    const r = execute("while (dirty()) { vacuum() }", level);
    // dirty() checks the tile the robot is on; after first vacuum, that tile is clean
    // so the loop exits. Only 1 of 2 dirty tiles is cleaned.
    expect(lastStep(r).state.tilesVacuumed).toBe(1);
    // execute reports "not fully clean" because 1 dirty tile remains
    expect(r.error).toContain("not fully clean");
  });
});

/* ================================================================
 * 8. if statement
 * ================================================================ */
describe("if statement", () => {
  it("if (wallAhead()) { turnRight() } turns when facing wall", () => {
    const level = makeLevel([
      [W, W, W],
      [W, C, W],
      [W, C, W],
      [W, W, W],
    ]);
    // facing right, wall ahead at (1,2)
    const r = execute("if (wallAhead()) { turnRight() }", level);
    expect(r.error).toBeNull();
    expect(lastStep(r).state.direction).toBe("down");
  });

  it("if body does not execute when condition is false", () => {
    const level = makeLevel([
      [W, W, W, W],
      [W, C, C, W],
      [W, W, W, W],
    ]);
    // facing right, open tile ahead
    const r = execute("if (wallAhead()) { turnRight() }", level);
    expect(lastStep(r).state.direction).toBe("right"); // unchanged
  });

  it("if (dirty()) { vacuum() } cleans when on dirty tile", () => {
    const level = makeLevel([
      [W, W, W],
      [W, D, W],
      [W, W, W],
    ]);
    const r = execute("if (dirty()) { vacuum() }", level);
    expect(lastStep(r).state.tilesVacuumed).toBe(1);
  });

  it("if (dirty()) { vacuum() } skips when on clean tile", () => {
    const level = makeLevel([
      [W, W, W],
      [W, C, W],
      [W, W, W],
    ]);
    const r = execute("if (dirty()) { vacuum() }", level);
    expect(lastStep(r).state.tilesVacuumed).toBe(0);
  });
});

/* ================================================================
 * 9. Sensor functions
 * ================================================================ */
describe("Sensor functions", () => {
  it("dirty() is true on floor_dirty", () => {
    const level = makeLevel([
      [W, W, W],
      [W, D, W],
      [W, W, W],
    ]);
    // If dirty, vacuum runs; we check tilesVacuumed to infer condition value
    const r = execute("if (dirty()) { vacuum() }", level);
    expect(lastStep(r).state.tilesVacuumed).toBe(1);
  });

  it("dirty() is false on floor_clean", () => {
    const level = makeLevel([
      [W, W, W],
      [W, C, W],
      [W, W, W],
    ]);
    const r = execute("if (dirty()) { vacuum() }", level);
    expect(lastStep(r).state.tilesVacuumed).toBe(0);
  });

  it("wallAhead() is true when facing wall", () => {
    const level = makeLevel([
      [W, W, W],
      [W, C, W],
      [W, W, W],
    ]);
    const r = execute("if (wallAhead()) { turnLeft() }", level);
    expect(lastStep(r).state.direction).toBe("up");
  });

  it("wallAhead() is false when path is open", () => {
    const level = makeLevel([
      [W, W, W, W],
      [W, C, C, W],
      [W, W, W, W],
    ]);
    const r = execute("if (wallAhead()) { turnLeft() }", level);
    expect(lastStep(r).state.direction).toBe("right"); // no turn
  });

  it("wallAhead() is true when facing furniture", () => {
    const level = makeLevel([
      [W, W, W, W],
      [W, C, F, W],
      [W, W, W, W],
    ]);
    const r = execute("if (wallAhead()) { turnLeft() }", level);
    expect(lastStep(r).state.direction).toBe("up"); // turned
  });

  it("garbageHere() is true on garbage tile", () => {
    const level = makeLevel([
      [W, W, W],
      [W, G, W],
      [W, W, W],
    ]);
    const r = execute("if (garbageHere()) { collect() }", level);
    expect(lastStep(r).state.garbageCollected).toBe(1);
  });

  it("garbageHere() is false on clean tile", () => {
    const level = makeLevel([
      [W, W, W],
      [W, C, W],
      [W, W, W],
    ]);
    const r = execute("if (garbageHere()) { collect() }", level);
    expect(lastStep(r).state.garbageCollected).toBe(0);
  });

  it("roomClean() is true when no dirty/garbage tiles", () => {
    const level = makeLevel([
      [W, W, W],
      [W, C, W],
      [W, W, W],
    ]);
    // while (!roomClean()) should not execute body at all
    const r = execute("while (!roomClean()) { vacuum() }", level);
    // Only initial snapshot
    expect(r.steps.length).toBe(1);
  });

  it("roomClean() is false when dirty tiles remain", () => {
    const level = makeLevel([
      [W, W, W, W],
      [W, C, D, W],
      [W, W, W, W],
    ]);
    // roomClean() is false, so if(roomClean()) body should NOT run
    const r = execute("if (roomClean()) { turnLeft() }", level);
    expect(lastStep(r).state.direction).toBe("right"); // unchanged
  });

  it("roomClean() is false when garbage remains", () => {
    const level = makeLevel([
      [W, W, W, W],
      [W, C, G, W],
      [W, W, W, W],
    ]);
    const r = execute("if (roomClean()) { turnLeft() }", level);
    expect(lastStep(r).state.direction).toBe("right"); // unchanged
  });
});

/* ================================================================
 * 10. Negation
 * ================================================================ */
describe("Negation", () => {
  it("!dirty() is true on a clean tile", () => {
    const level = makeLevel([
      [W, W, W],
      [W, C, W],
      [W, W, W],
    ]);
    const r = execute("if (!dirty()) { turnLeft() }", level);
    expect(lastStep(r).state.direction).toBe("up"); // turned
  });

  it("!dirty() is false on a dirty tile", () => {
    const level = makeLevel([
      [W, W, W],
      [W, D, W],
      [W, W, W],
    ]);
    const r = execute("if (!dirty()) { turnLeft() }", level);
    expect(lastStep(r).state.direction).toBe("right"); // no turn
  });

  it("!wallAhead() is true when path is open", () => {
    const level = makeLevel([
      [W, W, W, W],
      [W, C, C, W],
      [W, W, W, W],
    ]);
    const r = execute("if (!wallAhead()) { move(1) }", level);
    expect(lastStep(r).state.position).toEqual({ row: 1, col: 2 });
  });

  it("!wallAhead() is false when wall is ahead", () => {
    const level = makeLevel([
      [W, W, W],
      [W, C, W],
      [W, W, W],
    ]);
    const r = execute("if (!wallAhead()) { move(1) }", level);
    // Didn't move, still at start
    expect(lastStep(r).state.position).toEqual({ row: 1, col: 1 });
  });

  it("!roomClean() drives a cleaning loop", () => {
    const level = makeLevel([
      [W, W, W, W],
      [W, D, C, W],
      [W, W, W, W],
    ]);
    const code = "while (!roomClean()) { vacuum() }";
    const r = execute(code, level);
    expect(r.error).toBeNull();
    expect(lastStep(r).state.tilesVacuumed).toBe(1);
  });
});

/* ================================================================
 * 11. Nested control flow
 * ================================================================ */
describe("Nested control flow", () => {
  it("while containing if avoids walls", () => {
    // L-shaped corridor: go right then down
    const level = makeLevel(
      [
        [W, W, W, W, W],
        [W, C, D, D, W],
        [W, W, W, D, W],
        [W, W, W, D, W],
        [W, W, W, W, W],
      ],
      { row: 1, col: 1 },
      "right",
    );
    const code = [
      "while (!roomClean()) {",
      "  if (dirty()) { vacuum() }",
      "  if (wallAhead()) { turnRight() }",
      "  if (!wallAhead()) { move(1) }",
      "}",
    ].join("\n");
    const r = execute(code, level);
    expect(r.error).toBeNull();
    expect(lastStep(r).state.tilesVacuumed).toBe(4);
  });

  it("repeat containing if", () => {
    const level = makeLevel([
      [W, W, W, W, W],
      [W, D, C, D, W],
      [W, W, W, W, W],
    ]);
    const code = "repeat(3) {\n  if (dirty()) { vacuum() }\n  if (!wallAhead()) { move(1) }\n}";
    const r = execute(code, level);
    expect(r.error).toBeNull();
    expect(lastStep(r).state.tilesVacuumed).toBe(2);
  });
});

/* ================================================================
 * 12. Parse errors
 * ================================================================ */
describe("Parse errors", () => {
  it("malformed code returns error", () => {
    const level = makeLevel([
      [W, W, W],
      [W, C, W],
      [W, W, W],
    ]);
    const r = execute("move(", level);
    expect(r.error).not.toBeNull();
    expect(r.steps.length).toBe(1);
    expect(r.steps[0]!.state.error).not.toBeNull();
  });

  it("unknown command returns error", () => {
    const level = makeLevel([
      [W, W, W],
      [W, C, W],
      [W, W, W],
    ]);
    const r = execute("fly()", level);
    expect(r.error).toContain("Unknown command");
  });

  it("missing brace returns parse error", () => {
    const level = makeLevel([
      [W, W, W],
      [W, C, W],
      [W, W, W],
    ]);
    const r = execute("repeat(3) { move(1)", level);
    expect(r.error).not.toBeNull();
  });

  it("unmatched paren returns error", () => {
    const level = makeLevel([
      [W, W, W],
      [W, C, W],
      [W, W, W],
    ]);
    const r = execute("move(1", level);
    expect(r.error).not.toBeNull();
  });
});

/* ================================================================
 * 13. Infinite loop protection
 * ================================================================ */
describe("Infinite loop protection", () => {
  it("while(true) equivalent stops at MAX_STEPS", () => {
    // !roomClean() is always true because we never vacuum
    const level = makeLevel([
      [W, W, W, W, W],
      [W, D, C, C, W],
      [W, W, W, W, W],
    ]);
    const code = "while (!roomClean()) { turnLeft() }";
    const r = execute(code, level);
    expect(r.error).toContain("Infinite loop");
    // Should not exceed MAX_STEPS (500) snapshots
    expect(r.steps.length).toBeLessThanOrEqual(502);
  });
});

/* ================================================================
 * 14. checkWin
 * ================================================================ */
describe("checkWin", () => {
  it("won when all dirty tiles vacuumed", () => {
    const level = makeLevel([
      [W, W, W],
      [W, D, W],
      [W, W, W],
    ]);
    const r = execute("vacuum()", level);
    const win = checkWin(level, lastStep(r));
    expect(win.won).toBe(true);
    expect(win.message).toContain("clean");
  });

  it("won when all garbage collected", () => {
    const level = makeLevel([
      [W, W, W],
      [W, G, W],
      [W, W, W],
    ]);
    const r = execute("collect()", level);
    const win = checkWin(level, lastStep(r));
    expect(win.won).toBe(true);
  });

  it("won when both dirty and garbage are cleared", () => {
    const level = makeLevel([
      [W, W, W, W],
      [W, D, G, W],
      [W, W, W, W],
    ]);
    const code = "vacuum()\nmove(1)\ncollect()";
    const r = execute(code, level);
    const win = checkWin(level, lastStep(r));
    expect(win.won).toBe(true);
  });

  it("not won when dirty tiles remain", () => {
    const level = makeLevel([
      [W, W, W, W],
      [W, C, D, W],
      [W, W, W, W],
    ]);
    const r = execute("move(1)", level);
    const win = checkWin(level, lastStep(r));
    expect(win.won).toBe(false);
    expect(win.message).toContain("dirty");
  });

  it("not won when garbage remains", () => {
    const level = makeLevel([
      [W, W, W, W],
      [W, C, G, W],
      [W, W, W, W],
    ]);
    const r = execute("move(1)", level);
    const win = checkWin(level, lastStep(r));
    expect(win.won).toBe(false);
    expect(win.message).toContain("garbage");
  });

  it("not won when there is an error", () => {
    const level = makeLevel([
      [W, W, W],
      [W, C, W],
      [W, W, W],
    ]);
    const r = execute("move(1)", level);
    const win = checkWin(level, lastStep(r));
    expect(win.won).toBe(false);
    expect(win.message).toContain("wall");
  });

  it("reports move count in win message", () => {
    const level = makeLevel([
      [W, W, W, W],
      [W, D, D, W],
      [W, W, W, W],
    ]);
    const code = "vacuum()\nmove(1)\nvacuum()";
    const r = execute(code, level);
    const win = checkWin(level, lastStep(r));
    expect(win.won).toBe(true);
    expect(win.message).toContain("1 moves");
  });
});

/* ================================================================
 * 15. Comments
 * ================================================================ */
describe("Comments", () => {
  it("// comment lines are ignored", () => {
    const level = makeLevel([
      [W, W, W, W],
      [W, D, C, W],
      [W, W, W, W],
    ]);
    const code = "// Clean the tile\nvacuum()\n// Done!";
    const r = execute(code, level);
    expect(r.error).toBeNull();
    expect(lastStep(r).state.tilesVacuumed).toBe(1);
  });

  it("inline comments after code are ignored", () => {
    const level = makeLevel([
      [W, W, W, W],
      [W, D, C, W],
      [W, W, W, W],
    ]);
    const code = "vacuum() // clean it";
    const r = execute(code, level);
    expect(r.error).toBeNull();
    expect(lastStep(r).state.tilesVacuumed).toBe(1);
  });

  it("comment-only program produces no error", () => {
    const level = makeLevel([
      [W, W, W],
      [W, C, W],
      [W, W, W],
    ]);
    const r = execute("// nothing to do", level);
    expect(r.error).toBeNull();
    expect(r.steps.length).toBe(1); // only initial snapshot
  });
});

/* ================================================================
 * 16. Empty program
 * ================================================================ */
describe("Empty program", () => {
  it("produces initial snapshot only", () => {
    const level = makeLevel([
      [W, W, W],
      [W, C, W],
      [W, W, W],
    ]);
    const r = execute("", level);
    expect(r.steps.length).toBe(1);
    expect(r.steps[0]!.state.position).toEqual({ row: 1, col: 1 });
    expect(r.steps[0]!.state.moveCount).toBe(0);
    expect(r.steps[0]!.lineNumber).toBe(0);
  });

  it("empty program on clean room has no error", () => {
    const level = makeLevel([
      [W, W, W],
      [W, C, W],
      [W, W, W],
    ]);
    const r = execute("", level);
    expect(r.error).toBeNull();
  });

  it("empty program on dirty room reports not fully clean", () => {
    const level = makeLevel([
      [W, W, W],
      [W, D, W],
      [W, W, W],
    ]);
    const r = execute("", level);
    expect(r.error).toContain("not fully clean");
  });
});

/* ================================================================
 * 17. Level solvability
 * ================================================================ */
describe("Level solvability", () => {
  it("Level 1 (First Clean) is solvable", () => {
    const level = levels[0]!;
    const code = [
      "move(1)",
      "vacuum()",
      "move(1)",
      "vacuum()",
      "move(1)",
      "vacuum()",
    ].join("\n");
    const r = execute(code, level);
    expect(r.error).toBeNull();
    expect(lastStep(r).state.tilesVacuumed).toBe(3);
    const win = checkWin(level, lastStep(r));
    expect(win.won).toBe(true);
  });

  it("Level 4 (Repeat After Me) is solvable with repeat", () => {
    const level = levels[3]!;
    const code = "repeat(6) {\n  move(1)\n  vacuum()\n}";
    const r = execute(code, level);
    expect(r.error).toBeNull();
    const win = checkWin(level, lastStep(r));
    expect(win.won).toBe(true);
  });

  it("Level 7 (Smart Vacuum) is solvable with while loop", () => {
    const level = levels[6]!;
    // Grid: [W, C, D, D, D, D, W] — robot starts at (1,1) facing right.
    // Must check wallAhead() before moving to avoid hitting the end wall.
    const code = [
      "while (!roomClean()) {",
      "  if (dirty()) { vacuum() }",
      "  if (!wallAhead()) { move(1) }",
      "}",
    ].join("\n");
    const r = execute(code, level);
    expect(r.error).toBeNull();
    const win = checkWin(level, lastStep(r));
    expect(win.won).toBe(true);
  });
});

/* ================================================================
 * Edge cases & grid immutability
 * ================================================================ */
describe("Edge cases", () => {
  it("execute does not mutate the original level grid", () => {
    const grid: CellType[][] = [
      [W, W, W],
      [W, D, W],
      [W, W, W],
    ];
    const level = makeLevel(grid);
    execute("vacuum()", level);
    expect(level.grid[1]![1]).toBe("floor_dirty");
  });

  it("each step snapshot has an independent grid", () => {
    const level = makeLevel([
      [W, W, W, W],
      [W, D, D, W],
      [W, W, W, W],
    ]);
    const code = "vacuum()\nmove(1)\nvacuum()";
    const r = execute(code, level);
    // Step 0 (initial) should still show dirty at (1,1)
    expect(r.steps[0]!.grid[1]![1]).toBe("floor_dirty");
    // After first vacuum, (1,1) should be clean
    expect(r.steps[1]!.grid[1]![1]).toBe("floor_clean");
    // Both (1,1) and (1,2) clean at end
    const last = lastStep(r);
    expect(last.grid[1]![1]).toBe("floor_clean");
    expect(last.grid[1]![2]).toBe("floor_clean");
  });

  it("whitespace-only program produces initial snapshot", () => {
    const level = makeLevel([
      [W, W, W],
      [W, C, W],
      [W, W, W],
    ]);
    const r = execute("   \n   \n", level);
    expect(r.steps.length).toBe(1);
    expect(r.error).toBeNull();
  });

  it("move() with no argument defaults to 1", () => {
    const level = makeLevel([
      [W, W, W, W],
      [W, C, C, W],
      [W, W, W, W],
    ]);
    const r = execute("move()", level);
    expect(r.error).toBeNull();
    expect(lastStep(r).state.position).toEqual({ row: 1, col: 2 });
    expect(lastStep(r).state.moveCount).toBe(1);
  });
});
