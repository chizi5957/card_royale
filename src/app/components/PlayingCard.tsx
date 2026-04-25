import { motion } from "motion/react";

interface PlayingCardProps {
  rank: string;
  suit: "hearts" | "diamonds" | "spades" | "clubs";
  size?: "small" | "medium" | "large";
  faceDown?: boolean;
  selected?: boolean;
  disabled?: boolean;
  placeholder?: boolean;
  placeholderText?: string;
  onClick?: () => void;
  className?: string;
}

const suitSymbols = {
  hearts: "♥",
  diamonds: "♦",
  spades: "♠",
  clubs: "♣",
};

const suitColors = {
  hearts: "var(--card-suit-red)",
  diamonds: "var(--card-suit-red)",
  spades: "var(--card-suit-black)",
  clubs: "var(--card-suit-black)",
};

const cardSizes = {
  small: "w-[60px] h-[84px]",
  medium: "w-[90px] h-[130px]",
  large: "w-[120px] h-[170px]",
};

const rankSizes = {
  small: { rank: "text-[12px]", center: "text-[24px]" },
  medium: { rank: "text-[16px]", center: "text-[36px]" },
  large: { rank: "text-[20px]", center: "text-[48px]" },
};

export function PlayingCard({
  rank,
  suit,
  size = "medium",
  faceDown,
  selected,
  disabled,
  placeholder,
  placeholderText = "Empty",
  onClick,
  className = "",
}: PlayingCardProps) {
  const suitSymbol = suitSymbols[suit];
  const suitColor = suitColors[suit];
  const sizes = rankSizes[size];

  // Placeholder State
  if (placeholder) {
    return (
      <div
        className={`${cardSizes[size]} border-2 border-dashed flex items-center justify-center ${className}`}
        style={{
          borderColor: "var(--card-placeholder-border)",
          backgroundColor: "var(--card-placeholder-bg)",
          borderRadius: "8px",
        }}
      >
        <p
          className="uppercase tracking-wide text-center"
          style={{
            color: "rgba(255, 255, 255, 0.5)",
            fontSize: size === "small" ? "10px" : "var(--text-label)",
            fontFamily: "'Goldman Sans', sans-serif",
            fontWeight: "var(--font-weight-medium)" as any,
          }}
        >
          {placeholderText}
        </p>
      </div>
    );
  }

  // Face Down State
  if (faceDown) {
    return (
      <motion.div
        whileHover={onClick && !disabled ? { scale: 1.05 } : {}}
        className={`${cardSizes[size]} relative overflow-hidden ${className}`}
        onClick={onClick && !disabled ? onClick : undefined}
        style={{
          background: "var(--card-face-down-bg)",
          border: "2px solid var(--card-face-down-border)",
          borderRadius: "8px",
          boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.3)",
          cursor: onClick && !disabled ? "pointer" : "default",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-white opacity-50"
            style={{
              fontFamily: "'Goldman Sans', sans-serif",
              fontWeight: "var(--font-weight-black)" as any,
              fontSize: size === "small" ? "24px" : "36px",
            }}
          >
            ?
          </span>
        </div>
      </motion.div>
    );
  }

  // Standard Face Up Card
  return (
    <motion.div
      whileHover={onClick && !disabled ? { scale: 1.05, y: -4 } : {}}
      whileTap={onClick && !disabled ? { scale: 0.98 } : {}}
      className={`${cardSizes[size]} cursor-pointer transition-all ${className} bg-white relative`}
      onClick={onClick && !disabled ? onClick : undefined}
      style={{
        backgroundColor: "var(--card-face-bg)",
        border: selected ? `3px solid var(--card-selected-border)` : "1px solid var(--border)",
        boxShadow: selected
          ? `0 0 15px var(--card-selected-glow), 0 4px 6px rgba(0,0,0,0.3)`
          : "0 4px 8px rgba(0, 0, 0, 0.4)",
        opacity: disabled ? 0.5 : 1,
        cursor: onClick && !disabled ? "pointer" : "default",
        borderRadius: "8px",
      }}
    >
      <div className="w-full h-full p-2 flex flex-col justify-between select-none">
        {/* Top rank */}
        <div className="flex flex-col items-start leading-none">
          <span
            className={`${sizes.rank} leading-none text-center`}
            style={{
              color: suitColor,
              fontFamily: "'Goldman Sans', sans-serif",
              fontWeight: "var(--font-weight-black)" as any,
              width: "100%",
              textAlign: "center",
            }}
          >
            {rank}
          </span>
        </div>

        {/* Center suit symbol */}
        <div className="flex-1 flex items-center justify-center">
          <span className={sizes.center} style={{ color: suitColor, lineHeight: 1 }}>
            {suitSymbol}
          </span>
        </div>

        {/* Bottom rank */}
        <div className="flex flex-col items-end leading-none">
          <span
            className={`${sizes.rank} leading-none text-center`}
            style={{
              color: suitColor,
              fontFamily: "'Goldman Sans', sans-serif",
              fontWeight: "var(--font-weight-black)" as any,
              width: "100%",
              textAlign: "center",
            }}
          >
            {rank}
          </span>
          
        </div>
      </div>
    </motion.div>
  );
}