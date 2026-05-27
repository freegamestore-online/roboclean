interface GameControlsProps {
  onRun: () => void;
  onStep: () => void;
  onReset: () => void;
  isRunning: boolean;
  hasCode: boolean;
  canStep: boolean;
  speed: number;
  onSpeedChange: (speed: number) => void;
  message: string;
  isError: boolean;
  isSuccess: boolean;
}

const SPEEDS: { label: string; value: number }[] = [
  { label: "Slow", value: 600 },
  { label: "Normal", value: 300 },
  { label: "Fast", value: 100 },
];

export default function GameControls({
  onRun,
  onStep,
  onReset,
  isRunning,
  hasCode,
  canStep,
  speed,
  onSpeedChange,
  message,
  isError,
  isSuccess,
}: GameControlsProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Buttons row */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <button
          onClick={onRun}
          disabled={!hasCode || isRunning}
          style={{
            padding: "6px 16px",
            borderRadius: 6,
            border: "none",
            background: isRunning ? "var(--muted)" : "var(--success)",
            color: "#fff",
            fontWeight: 600,
            fontSize: 14,
            cursor: !hasCode || isRunning ? "default" : "pointer",
            opacity: !hasCode || isRunning ? 0.5 : 1,
          }}
        >
          {isRunning ? "Running..." : "▶ Run"}
        </button>

        <button
          onClick={onStep}
          disabled={!canStep || isRunning}
          style={{
            padding: "6px 16px",
            borderRadius: 6,
            border: "none",
            background: "#3b82f6",
            color: "#fff",
            fontWeight: 600,
            fontSize: 14,
            cursor: !canStep || isRunning ? "default" : "pointer",
            opacity: !canStep || isRunning ? 0.5 : 1,
          }}
        >
          {"⏭ Step"}
        </button>

        <button
          onClick={onReset}
          style={{
            padding: "6px 16px",
            borderRadius: 6,
            border: "1px solid var(--line-strong)",
            background: "transparent",
            color: "var(--ink)",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          {"↺ Reset"}
        </button>

        {/* Speed selector */}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 2,
            background: "var(--panel)",
            borderRadius: 6,
            border: "1px solid var(--line)",
            overflow: "hidden",
          }}
        >
          {SPEEDS.map((s) => (
            <button
              key={s.value}
              onClick={() => onSpeedChange(s.value)}
              style={{
                padding: "4px 10px",
                border: "none",
                background: speed === s.value ? "var(--accent)" : "transparent",
                color: speed === s.value ? "#fff" : "var(--muted)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Status message */}
      {message && (
        <div
          style={{
            padding: "6px 10px",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            background: isError
              ? "rgba(220, 38, 38, 0.1)"
              : isSuccess
                ? "rgba(5, 150, 105, 0.1)"
                : "var(--panel)",
            color: isError
              ? "var(--error)"
              : isSuccess
                ? "var(--success)"
                : "var(--ink)",
            border: `1px solid ${
              isError
                ? "var(--error)"
                : isSuccess
                  ? "var(--success)"
                  : "var(--line)"
            }`,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}
