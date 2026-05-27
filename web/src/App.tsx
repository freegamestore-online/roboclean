import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { ExecutionStep } from "./types";
import { levels, SANDBOX_LEVEL_ID, createSandboxLevel, defaultSandboxGrid } from "./engine/levels";
import { execute, checkWin } from "./engine/interpreter";
import RoomGrid from "./components/RoomGrid";
import CodeEditor from "./components/CodeEditor";
import GameControls from "./components/GameControls";
import LevelSelect from "./components/LevelSelect";
import LevelComplete from "./components/LevelComplete";
import RoomEditor from "./components/RoomEditor";

// Starter comments per level
const STARTER_CODE: Record<number, string> = {
  1: "// Move right and vacuum each tile\n",
  2: "// Turn the corner and keep cleaning!\n",
  3: "// Clean both directions from the start\n",
  4: "// Use repeat(n) to save typing!\n",
  5: "// Nested repeat + turnRight for a square\n",
  6: "// collect() picks up garbage\n",
  7: "// while (!roomClean()) keeps going\n",
  8: "// Check wallAhead() before moving\n",
  9: "// Navigate around furniture\n",
  10: "// Use if (dirty()) and if (garbageHere())\n",
  11: "// Two rooms — clean both!\n",
  12: "// Right-hand rule: always try right first\n",
};

function loadCompleted(): Set<number> {
  try {
    const raw = localStorage.getItem("roboclean_completed");
    if (raw) return new Set(JSON.parse(raw) as number[]);
  } catch { /* ignore */ }
  return new Set();
}

function loadStars(): Record<number, number> {
  try {
    const raw = localStorage.getItem("roboclean_stars");
    if (raw) return JSON.parse(raw) as Record<number, number>;
  } catch { /* ignore */ }
  return {};
}

function saveCompleted(set: Set<number>) {
  localStorage.setItem("roboclean_completed", JSON.stringify([...set]));
}

function saveStars(map: Record<number, number>) {
  localStorage.setItem("roboclean_stars", JSON.stringify(map));
}

function computeStars(moves: number, threeStarMoves: number, twoStarMoves: number): number {
  if (moves <= threeStarMoves) return 3;
  if (moves <= twoStarMoves) return 2;
  return 1;
}

export default function App() {
  const [levelId, setLevelId] = useState(1);
  const [code, setCode] = useState(STARTER_CODE[1] ?? "");
  const [steps, setSteps] = useState<ExecutionStep[]>([]);
  const [stepIndex, setStepIndex] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(300);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showLevels, setShowLevels] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [completedLevels, setCompletedLevels] = useState(loadCompleted);
  const [starRatings, setStarRatings] = useState(loadStars);
  const [sandboxGrid, setSandboxGrid] = useState(defaultSandboxGrid);
  const [isSandboxEditing, setIsSandboxEditing] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const level = useMemo(
    () =>
      levelId === SANDBOX_LEVEL_ID
        ? createSandboxLevel(sandboxGrid)
        : levels.find((l) => l.id === levelId) ?? levels[0]!,
    [levelId, sandboxGrid],
  );

  // Current display state
  const currentStep = stepIndex >= 0 && stepIndex < steps.length ? steps[stepIndex] : null;
  const displayGrid = currentStep ? currentStep.grid : level.grid;
  const displayPos = currentStep ? currentStep.state.position : level.start;
  const displayDir = currentStep ? currentStep.state.direction : level.startDirection;
  const activeLine = currentStep ? currentStep.lineNumber : 0;

  // Can we step forward?
  const canStep = steps.length > 0 && stepIndex < steps.length - 1;

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const clearRunning = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const handleReset = useCallback(() => {
    clearRunning();
    setSteps([]);
    setStepIndex(-1);
    setMessage("");
    setIsError(false);
    setIsSuccess(false);
    setShowComplete(false);
  }, [clearRunning]);

  const handleSelectLevel = useCallback(
    (id: number) => {
      clearRunning();
      setLevelId(id);
      setCode(
        id === SANDBOX_LEVEL_ID
          ? "// Sandbox mode — experiment freely!\n"
          : STARTER_CODE[id] ?? "",
      );
      setSteps([]);
      setStepIndex(-1);
      setMessage("");
      setIsError(false);
      setIsSuccess(false);
      setShowComplete(false);
      setShowLevels(false);
      if (id === SANDBOX_LEVEL_ID) {
        setSandboxGrid(defaultSandboxGrid());
        setIsSandboxEditing(false);
      }
    },
    [clearRunning],
  );

  const finishExecution = useCallback(
    (executionSteps: ExecutionStep[]) => {
      const lastStep = executionSteps[executionSteps.length - 1];
      if (!lastStep) return;
      const result = checkWin(level, lastStep);
      setMessage(result.message);
      if (result.won) {
        setIsSuccess(true);
        setIsError(false);
        const stars = computeStars(lastStep.state.moveCount, level.threeStarMoves, level.twoStarMoves);
        setCompletedLevels((prev) => {
          const next = new Set(prev);
          next.add(level.id);
          saveCompleted(next);
          return next;
        });
        setStarRatings((prev) => {
          const existing = prev[level.id] ?? 0;
          if (stars > existing) {
            const next = { ...prev, [level.id]: stars };
            saveStars(next);
            return next;
          }
          return prev;
        });
        setTimeout(() => setShowComplete(true), 400);
      } else {
        setIsError(true);
        setIsSuccess(false);
      }
    },
    [level],
  );

  const handleRun = useCallback(() => {
    handleReset();

    const { steps: execSteps, error } = execute(code, level);
    setSteps(execSteps);

    if (error && execSteps.length <= 1) {
      // Parse error - show immediately
      setStepIndex(0);
      setMessage(error);
      setIsError(true);
      return;
    }

    // Animate through steps
    setIsRunning(true);
    let idx = 0;
    setStepIndex(0);

    timerRef.current = setInterval(() => {
      idx++;
      if (idx >= execSteps.length) {
        clearRunning();
        setStepIndex(execSteps.length - 1);
        finishExecution(execSteps);
        return;
      }
      setStepIndex(idx);
    }, speed);
  }, [code, level, speed, handleReset, clearRunning, finishExecution]);

  const handleStep = useCallback(() => {
    if (steps.length === 0) {
      // First step: execute and show step 0
      const { steps: execSteps, error } = execute(code, level);
      setSteps(execSteps);
      setStepIndex(0);
      if (error && execSteps.length <= 1) {
        setMessage(error);
        setIsError(true);
      }
      return;
    }

    if (stepIndex < steps.length - 1) {
      const nextIdx = stepIndex + 1;
      setStepIndex(nextIdx);
      if (nextIdx === steps.length - 1) {
        finishExecution(steps);
      }
    }
  }, [steps, stepIndex, code, level, finishExecution]);

  // Win modal data
  const lastStep = steps.length > 0 ? steps[steps.length - 1] : null;
  const winStars = lastStep
    ? computeStars(lastStep.state.moveCount, level.threeStarMoves, level.twoStarMoves)
    : 0;
  const hasNextLevel = levels.some((l) => l.id === levelId + 1);

  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          padding: "8px 16px",
          borderBottom: "1px solid var(--line)",
          background: "var(--panel)",
          gap: 12,
          flexShrink: 0,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span>{"🧹"}</span>
          <span>RoboClean</span>
        </h1>

        <div style={{ flex: 1 }} />

        <button
          onClick={() => setShowLevels(true)}
          style={{
            padding: "4px 12px",
            borderRadius: 6,
            border: "1px solid var(--line-strong)",
            background: "var(--paper)",
            color: "var(--ink)",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Levels
        </button>
      </header>

      {/* Level info bar */}
      <div
        style={{
          padding: "6px 16px",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontSize: 13,
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: 700, color: "var(--accent)" }}>
          {levelId === SANDBOX_LEVEL_ID ? "Sandbox" : `Level ${level.id}`}
        </span>
        <span style={{ fontWeight: 600 }}>{level.name}</span>
        <span style={{ color: "var(--muted)" }}>{level.description}</span>
        <span
          style={{
            marginLeft: "auto",
            color: "var(--muted)",
            fontSize: 12,
            fontStyle: "italic",
          }}
        >
          Hint: {level.hint}
        </span>
      </div>

      {/* Main split layout */}
      <div
        style={{
          flex: 1,
          display: "flex",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {/* Left: Grid view */}
        <div
          style={{
            flex: "0 0 60%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            overflow: "auto",
            background: "var(--paper)",
          }}
        >
          <RoomGrid
            level={level}
            robotPos={displayPos}
            robotDir={displayDir}
            currentGrid={displayGrid}
          />
        </div>

        {/* Right: Editor + Controls */}
        <div
          style={{
            flex: "0 0 40%",
            display: "flex",
            flexDirection: "column",
            borderLeft: "1px solid var(--line)",
            padding: 12,
            gap: 10,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <GameControls
            onRun={handleRun}
            onStep={handleStep}
            onReset={handleReset}
            isRunning={isRunning}
            hasCode={code.trim().length > 0}
            canStep={canStep || steps.length === 0}
            speed={speed}
            onSpeedChange={setSpeed}
            message={message}
            isError={isError}
            isSuccess={isSuccess}
          />

          {levelId === SANDBOX_LEVEL_ID && (
            <RoomEditor
              grid={sandboxGrid}
              onGridChange={(g) => {
                setSandboxGrid(g);
                handleReset();
              }}
              isEditing={isSandboxEditing}
              onToggleEdit={() => setIsSandboxEditing((v) => !v)}
            />
          )}

          <CodeEditor
            code={code}
            onChange={setCode}
            activeLine={activeLine}
            availableCommands={level.availableCommands}
            disabled={isRunning}
            hasError={isError}
          />
        </div>
      </div>

      {/* Modals */}
      {showLevels && (
        <LevelSelect
          currentLevel={levelId}
          completedLevels={completedLevels}
          starRatings={starRatings}
          onSelect={handleSelectLevel}
          onClose={() => setShowLevels(false)}
        />
      )}

      {showComplete && lastStep && (
        <LevelComplete
          levelName={level.name}
          moves={lastStep.state.moveCount}
          stars={winStars}
          threeStarMoves={level.threeStarMoves}
          hasNextLevel={hasNextLevel}
          onNext={() => handleSelectLevel(levelId + 1)}
          onRetry={() => {
            setShowComplete(false);
            handleReset();
          }}
          onLevels={() => {
            setShowComplete(false);
            setShowLevels(true);
          }}
        />
      )}
    </div>
  );
}
