interface PlayerAreaProps {
  playerName: string;
  chips: number;
  currentBet?: number;
  isActive?: boolean;
  isDealer?: boolean;
  position: "top" | "left" | "right";
}

export function PlayerArea({
  playerName,
  chips,
  currentBet,
  isActive,
  isDealer,
  position,
}: PlayerAreaProps) {
  const positionStyles = {
    top: "top-4 left-1/2 -translate-x-1/2",
    left: "left-4 top-1/2 -translate-y-1/2",
    right: "right-4 top-1/2 -translate-y-1/2",
  };

  return (
    <div className={`absolute ${positionStyles[position]} z-10`}>
      <div
        className="p-4 min-w-[180px]"
        style={{
          backgroundColor: isActive ? "var(--primary)" : "var(--input-game-bg)",
          border: isActive ? "3px solid var(--status-waiting)" : "2px solid var(--border)",
          boxShadow: "var(--elevation-sm)",
          borderRadius: "var(--radius-card)",
          transition: "all 0.3s ease",
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: "var(--muted)",
              border: "2px solid var(--border)",
            }}
          >
            <span style={{ fontSize: "18px" }}>👤</span>
          </div>
          <div className="flex-1">
            <p style={{ color: "var(--foreground)", fontFamily: "'Goldman Sans', sans-serif" }}>{playerName}</p>
            {isDealer && (
              <div
                className="micro inline-block px-2 py-1"
                style={{
                  backgroundColor: "var(--status-waiting)",
                  color: "var(--foreground)",
                  borderRadius: "var(--radius)",
                }}
              >
                DEALER
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label style={{ color: "var(--muted-foreground)", fontFamily: "'Goldman Sans', sans-serif" }}>Chips:</label>
            <span
              className="micro"
              style={{
                color: "var(--status-win)",
                fontSize: "14px",
              }}
            >
              {chips}
            </span>
          </div>
          {currentBet !== undefined && currentBet > 0 && (
            <div className="flex justify-between items-center">
              <label style={{ color: "var(--muted-foreground)", fontFamily: "'Goldman Sans', sans-serif" }}>Bet:</label>
              <span
                className="micro"
                style={{
                  color: "var(--status-waiting)",
                  fontSize: "14px",
                }}
              >
                {currentBet}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
