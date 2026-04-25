interface GameLogProps {
  logs: Array<{
    id: string;
    message: string;
    type: "action" | "system" | "win";
  }>;
}

export function GameLog({ logs }: GameLogProps) {
  const getLogColor = (type: string) => {
    switch (type) {
      case "win":
        return "var(--status-win)";
      case "action":
        return "var(--status-waiting)";
      default:
        return "var(--muted-foreground)";
    }
  };

  return (
    <div
      className="h-full p-4 overflow-hidden flex flex-col"
      style={{
        backgroundColor: "var(--input-game-bg)",
        border: "2px solid var(--border)",
        boxShadow: "var(--elevation-sm)",
        borderRadius: "var(--radius-card)",
      }}
    >
      <h3
        className="mb-4"
        style={{
          color: "var(--foreground)",
          fontFamily: "'Goldman Sans', sans-serif",
          fontWeight: "var(--font-weight-black)" as any,
        }}
      >
        Game Log
      </h3>

      <div className="flex-1 overflow-y-auto space-y-2">
        {logs.map((log) => (
          <div
            key={log.id}
            className="p-2"
            style={{
              backgroundColor: "var(--input)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
            }}
          >
            <p
              style={{
                color: getLogColor(log.type),
                fontSize: "var(--text-label)",
                fontFamily: "'Goldman Sans', sans-serif",
                textTransform: "none",
                textShadow: "none",
              }}
            >
              {log.message}
            </p>
          </div>
        ))}

        {logs.length === 0 && (
          <p
            className="text-center"
            style={{
              color: "rgba(255, 255, 255, 0.5)",
              fontSize: "14px",
              fontFamily: "'Goldman Sans', sans-serif",
            }}
          >
            No actions yet
          </p>
        )}
      </div>
    </div>
  );
}
