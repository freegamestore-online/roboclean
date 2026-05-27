interface LevelCompleteProps {
  levelName: string;
  moves: number;
  stars: number;
  threeStarMoves: number;
  hasNextLevel: boolean;
  onNext: () => void;
  onRetry: () => void;
  onLevels: () => void;
}

function StarDisplay({ stars }: { stars: number }) {
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center", margin: "12px 0" }}>
      {Array.from({ length: 3 }, (_, i) => (
        <span
          key={i}
          style={{
            fontSize: 36,
            opacity: i < stars ? 1 : 0.15,
            color: i < stars ? "#fbbf24" : "var(--muted)",
            transition: "transform 0.3s ease",
            transform: i < stars ? "scale(1)" : "scale(0.8)",
          }}
        >
          {"★"}
        </span>
      ))}
    </div>
  );
}

export default function LevelComplete({
  levelName,
  moves,
  stars,
  threeStarMoves,
  hasNextLevel,
  onNext,
  onRetry,
  onLevels,
}: LevelCompleteProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
    >
      <div
        style={{
          background: "var(--paper)",
          borderRadius: 12,
          padding: 28,
          maxWidth: 360,
          width: "90%",
          textAlign: "center",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 4 }}>{"🎉"}</div>
        <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700 }}>Level Complete!</h2>
        <p style={{ margin: 0, fontSize: 14, color: "var(--muted)" }}>{levelName}</p>

        <StarDisplay stars={stars} />

        <p style={{ margin: "8px 0 0", fontSize: 14, color: "var(--ink)" }}>
          <strong>{moves}</strong> moves
          {stars < 3 && (
            <span style={{ color: "var(--muted)" }}>
              {" "}(need {threeStarMoves} for 3 stars)
            </span>
          )}
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginTop: 20,
          }}
        >
          {hasNextLevel && (
            <button
              onClick={onNext}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                border: "none",
                background: "var(--success)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              Next Level →
            </button>
          )}
          <button
            onClick={onRetry}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border: "1px solid var(--line-strong)",
              background: "transparent",
              color: "var(--ink)",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
          <button
            onClick={onLevels}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border: "none",
              background: "transparent",
              color: "var(--muted)",
              fontWeight: 500,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            All Levels
          </button>
        </div>
      </div>
    </div>
  );
}
