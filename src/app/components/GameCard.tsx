import { motion } from "motion/react";

interface GameCardProps {
  rank: string;
  suit: string;
  faceDown?: boolean;
  selected?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

const suitColors: Record<string, string> = {
  hearts: "var(--destructive)",
  diamonds: "var(--destructive)",
  clubs: "var(--background)",
  spades: "var(--background)",
};

const suitSymbols: Record<string, string> = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

export function GameCard({ rank, suit, faceDown, selected, onClick, style }: GameCardProps) {
  const suitColor = suitColors[suit] || "var(--border)";
  const suitSymbol = suitSymbols[suit] || "";

  return (
    <motion.div
      whileHover={onClick ? { scale: 1.05, y: -8 } : {}}
      whileTap={onClick ? { scale: 0.95 } : {}}
      animate={selected ? { y: -12 } : { y: 0 }}
      style={style}
      className={`
        relative w-[90px] h-[130px] cursor-pointer transition-all duration-200
        ${selected ? "ring-2 ring-accent" : ""}
      `}
      onClick={onClick}
    >
      {faceDown ? (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            background: "var(--card-face-down-bg)",
            border: "2px solid var(--border)",
            boxShadow: "var(--elevation-sm)",
            borderRadius: "var(--radius-card)",
          }}
        >
          <div className="text-center">
            <div
              className="micro opacity-70"
              style={{ color: "var(--muted-foreground)" }}
            >
              CARD
            </div>
          </div>
        </div>
      ) : (
        <div
          className="w-full h-full p-2 flex flex-col"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            border: "2px solid var(--border)",
            boxShadow: "var(--elevation-sm)",
            borderRadius: "var(--radius-card)",
          }}
        >
          <div className="flex justify-between items-start">
            <div className="flex flex-col items-center">
              <span
                className="micro leading-none"
                style={{
                  color: suitColor,
                  textShadow: "none",
                  fontSize: "16px",
                }}
              >
                {rank}
              </span>
              <span style={{ color: suitColor, fontSize: "20px", lineHeight: 1 }}>
                {suitSymbol}
              </span>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <span style={{ color: suitColor, fontSize: "48px", lineHeight: 1 }}>
              {suitSymbol}
            </span>
          </div>
          <div className="flex justify-end items-end">
            <div className="flex flex-col items-center">
              <span
                className="micro leading-none"
                style={{
                  color: suitColor,
                  textShadow: "none",
                  fontSize: "16px",
                }}
              >
                {rank}
              </span>
              <span style={{ color: suitColor, fontSize: "20px", lineHeight: 1 }}>
                {suitSymbol}
              </span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}