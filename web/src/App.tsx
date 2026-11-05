import { GameShell, GameTopbar, GameButton, useGameSounds } from "@freegamestore/games";
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
  [SANDBOX_LEVEL_ID]: "// Sandbox mode — experiment freely!\n",
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

function loadSavedCode(): Record<number, string> {
  try {
    const raw = localStorage.getItem("roboclean_code");
    if (raw) return JSON.parse(raw) as Record<number, string>;
  } catch { /* ignore */ }
  return {};
}

function loadCode(levelId: number): string {
  return loadSavedCode()[levelId] ?? STARTER_CODE[levelId] ?? "";
}

function saveCode(levelId: number, code: string) {
  try {
    localStorage.setItem("roboclean_code", JSON.stringify({ ...loadSavedCode(), [levelId]: code }));
    localStorage.setItem("roboclean_level", String(levelId));
  } catch { /* ignore */ }
}

function loadLevel(): number {
  try {
    const id = Number(localStorage.getItem("roboclean_level"));
    if (id === SANDBOX_LEVEL_ID || levels.some((l) => l.id === id)) return id;
  } catch { /* ignore */ }
  return 1;
}

function computeStars(moves: number, threeStarMoves: number, twoStarMoves: number): number {
  if (moves <= threeStarMoves) return 3;
  if (moves <= twoStarMoves) return 2;
  return 1;
}

function GameContent() {
  const { playTick, playError, playLevelUp } = useGameSounds();
  const [levelId, setLevelId] = useState(loadLevel);
  const [code, setCode] = useState(() => loadCode(levelId));
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

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Read by the running animation so speed changes apply mid-run
  const speedRef = useRef(speed);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

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

  useEffect(() => {
    saveCode(levelId, code);
  }, [levelId, code]);

  // Tick on every animated or manual step
  useEffect(() => {
    if (stepIndex > 0) playTick();
  }, [stepIndex]);

  // Can we step forward?
  const canStep = steps.length > 0 && stepIndex < steps.length - 1;

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
    };
  }, []);

  const clearRunning = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // A pending success modal belongs to the run being cleared
    if (completeTimerRef.current) {
      clearTimeout(completeTimerRef.current);
      completeTimerRef.current = null;
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
      handleReset();
      setLevelId(id);
      setCode(loadCode(id));
      setShowLevels(false);
      if (id === SANDBOX_LEVEL_ID) {
        setSandboxGrid(defaultSandboxGrid());
        setIsSandboxEditing(false);
      }
    },
    [handleReset],
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
        const completed = new Set(completedLevels).add(level.id);
        saveCompleted(completed);
        setCompletedLevels(completed);
        if (stars > (starRatings[level.id] ?? 0)) {
          const ratings = { ...starRatings, [level.id]: stars };
          saveStars(ratings);
          setStarRatings(ratings);
        }
        playLevelUp();
        completeTimerRef.current = setTimeout(() => setShowComplete(true), 400);
      } else {
        setIsError(true);
        setIsSuccess(false);
        playError();
      }
    },
    [level, completedLevels, starRatings, playError, playLevelUp],
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
      playError();
      return;
    }

    // Animate through steps
    setIsRunning(true);
    let idx = 0;
    setStepIndex(0);

    const tick = () => {
      idx++;
      if (idx >= execSteps.length) {
        clearRunning();
        setStepIndex(execSteps.length - 1);
        finishExecution(execSteps);
        return;
      }
      setStepIndex(idx);
      timerRef.current = setTimeout(tick, speedRef.current);
    };
    timerRef.current = setTimeout(tick, speedRef.current);
  }, [code, level, handleReset, clearRunning, finishExecution, playError]);

  const handleStep = useCallback(() => {
    if (steps.length === 0) {
      // First step: execute and show step 0
      const { steps: execSteps, error } = execute(code, level);
      setSteps(execSteps);
      setStepIndex(0);
      if (error && execSteps.length <= 1) {
        setMessage(error);
        setIsError(true);
        playError();
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
  }, [steps, stepIndex, code, level, finishExecution, playError]);

  // Win modal data
  const lastStep = steps.length > 0 ? steps[steps.length - 1] : null;
  const winStars = lastStep
    ? computeStars(lastStep.state.moveCount, level.threeStarMoves, level.twoStarMoves)
    : 0;
  const hasNextLevel = levels.some((l) => l.id === levelId + 1);

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div className="shrink-0">
        <GameTopbar title="RoboClean" actions={<GameButton size="sm" variant="ghost" onClick={() => setShowLevels(true)}>Levels</GameButton>} />
      </div>

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
          flexWrap: "wrap",
          rowGap: 2,
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

      {/* Stacked on phones (stage on top), side by side from md up */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        {/* Grid view — a size container so the room scales to fit */}
        <div
          className="flex shrink-0 basis-[45%] items-center justify-center overflow-hidden p-3 [container-type:size] md:basis-[60%] md:p-4"
          style={{ background: "var(--paper)" }}
        >
          <RoomGrid
            level={level}
            robotPos={displayPos}
            robotDir={displayDir}
            currentGrid={displayGrid}
          />
        </div>

        {/* Editor + Controls */}
        <div
          className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto border-t border-[var(--line)] p-3 md:border-t-0 md:border-l"
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

export default function App() {
  return <GameShell><GameContent /></GameShell>;
}
