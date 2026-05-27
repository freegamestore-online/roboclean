import { levels, SANDBOX_LEVEL_ID } from "../engine/levels";

interface LevelSelectProps {
  currentLevel: number;
  completedLevels: Set<number>;
  starRatings: Record<number, number>;
  onSelect: (levelId: number) => void;
  onClose: () => void;
}

function Stars({ count }: { count: number }) {
  return (
    <span style={{ fontSize: 12, letterSpacing: 1 }}>
      {Array.from({ length: 3 }, (_, i) => (
        <span key={i} style={{ opacity: i < count ? 1 : 0.2 }}>
          {"★"}
        </span>
      ))}
    </span>
  );
}

export default function LevelSelect({
  currentLevel,
  completedLevels,
  starRatings,
  onSelect,
  onClose,
}: LevelSelectProps) {
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
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--paper)",
          borderRadius: 12,
          padding: 24,
          maxWidth: 480,
          width: "90%",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Select Level</h2>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              fontSize: 20,
              cursor: "pointer",
              color: "var(--muted)",
              padding: 4,
            }}
          >
            {"✕"}
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 10,
          }}
        >
          {levels.map((lvl) => {
            const completed = completedLevels.has(lvl.id);
            const isCurrent = lvl.id === currentLevel;
            const stars = starRatings[lvl.id] ?? 0;

            return (
              <button
                key={lvl.id}
                onClick={() => onSelect(lvl.id)}
                style={{
                  padding: "10px 8px",
                  borderRadius: 8,
                  border: isCurrent
                    ? "2px solid var(--accent)"
                    : "1px solid var(--line)",
                  background: isCurrent
                    ? "rgba(5, 150, 105, 0.08)"
                    : completed
                      ? "var(--panel)"
                      : "var(--paper)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: completed ? "var(--success)" : "var(--ink)",
                  }}
                >
                  {lvl.id}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--muted)",
                    textAlign: "center",
                    lineHeight: 1.2,
                  }}
                >
                  {lvl.name}
                </span>
                {completed && <Stars count={stars} />}
              </button>
            );
          })}
        </div>

        {/* Sandbox button */}
        <button
          onClick={() => onSelect(SANDBOX_LEVEL_ID)}
          style={{
            marginTop: 12,
            padding: "12px 16px",
            borderRadius: 8,
            border: currentLevel === SANDBOX_LEVEL_ID
              ? "2px solid var(--accent)"
              : "2px dashed var(--accent)",
            background: currentLevel === SANDBOX_LEVEL_ID
              ? "rgba(5, 150, 105, 0.08)"
              : "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            width: "100%",
          }}
        >
          <span style={{ fontSize: 18 }}>{"🎨"}</span>
          <span style={{ fontWeight: 700, fontSize: 14, color: "var(--accent)" }}>
            Sandbox — Draw Your Own!
          </span>
        </button>
      </div>
    </div>
  );
}
