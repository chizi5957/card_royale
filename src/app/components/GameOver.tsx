import { motion } from "motion/react";
import { FancyButton } from "./FancyButton";

interface GameOverProps {
  playerScore: number;
  opponentScore: number;
  playerNumber: 1 | 2;
  onNewGame: () => void;
  isBotMode?: boolean;
  playerName?: string;
}

const STROKE = "-1px -1px 0 #3B3B3B, 1px -1px 0 #3B3B3B, -1px 1px 0 #3B3B3B, 1px 1px 0 #3B3B3B";

export function GameOver({ playerScore, opponentScore, playerNumber, onNewGame, isBotMode, playerName }: GameOverProps) {
  const playerWon = playerScore > opponentScore;
  const isTie = playerScore === opponentScore;

  const playerSuit = playerNumber === 1 ? "♠" : "♣";
  const opponentSuit = playerNumber === 1 ? "♣" : "♠";

  // Name display: uppercase, max 10 chars so it fits
  const displayName = playerName ? playerName.toUpperCase().slice(0, 10) : null;

  let resultText = "IT'S A TIE!";
  let resultColor = "rgba(255,255,255,0.85)";
  let glowColor = "rgba(255,255,255,0.3)";
  let resultEmoji = "🤝";

  if (!isTie) {
    if (playerWon) {
      resultText = displayName ? `${displayName} WINS!` : "YOU WIN!";
      resultColor = "#22C55E";
      glowColor = "rgba(34,197,94,0.35)";
      resultEmoji = "🏆";
    } else {
      resultText = displayName ? `${displayName} LOSES` : "YOU LOSE";
      resultColor = "#EF4444";
      glowColor = "rgba(239,68,68,0.35)";
      resultEmoji = "💀";
    }
  }

  const playerIsWinner = playerWon && !isTie;
  const opponentIsWinner = !playerWon && !isTie;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ backgroundColor: "rgba(0,0,0,0.82)", backdropFilter: "blur(4px)" }}
    >
      <motion.div
        initial={{ scale: 0.85, y: 40, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 22 }}
        className="relative box-border flex flex-col items-center overflow-hidden"
        style={{
          width: "420px",
          borderRadius: "20px",
          background: "var(--game-card-bg)",
          border: "2px solid var(--game-card-border)",
          boxShadow: `var(--popup-card-shadow), 0 0 60px ${glowColor}`,
        }}
      >
        {/* Top accent bar — colour matches result */}
        <div
          style={{
            width: "100%",
            height: "4px",
            background: resultColor,
            boxShadow: `0 0 16px 2px ${glowColor}`,
            flexShrink: 0,
          }}
        />

        {/* Content */}
        <div
          className="flex flex-col items-center w-full"
          style={{ padding: "36px 32px 32px", gap: "28px" }}
        >
          {/* Emoji + Result heading */}
          <div className="flex flex-col items-center" style={{ gap: "12px" }}>
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 18 }}
              style={{ fontSize: "56px", lineHeight: 1, filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))" }}
            >
              {resultEmoji}
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              style={{
                fontFamily: "'Goldman Sans', sans-serif",
                fontWeight: "900",
                fontSize: resultText.length > 10 ? "32px" : "42px",
                lineHeight: 1,
                letterSpacing: "-0.03em",
                textTransform: "uppercase",
                textAlign: "center",
                color: resultColor,
                textShadow: `${STROKE}, 0 0 32px ${glowColor}, 0 4px 8px rgba(0,0,0,0.6)`,
                margin: 0,
              }}
            >
              {resultText}
            </motion.h2>
          </div>

          {/* Score Comparison */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="w-full flex items-stretch"
            style={{ gap: "12px" }}
          >
            {/* Player Score Box */}
            <div
              className="flex-1 flex flex-col items-center justify-center"
              style={{
                padding: "16px 12px",
                borderRadius: "14px",
                background: playerIsWinner ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.04)",
                border: playerIsWinner
                  ? "1.5px solid rgba(34,197,94,0.5)"
                  : "1.5px solid rgba(255,255,255,0.1)",
                gap: "6px",
              }}
            >
              <span style={{ fontSize: "22px", lineHeight: 1 }}>{playerSuit}</span>
              <span
                style={{
                  fontFamily: "'Goldman Sans', sans-serif",
                  fontWeight: "500",
                  fontSize: "10px",
                  letterSpacing: "0.1em",
                  color: "rgba(255,255,255,0.5)",
                  textTransform: "uppercase",
                }}
              >
                {displayName || "YOU"}
              </span>
              <span
                style={{
                  fontFamily: "'Goldman Sans', sans-serif",
                  fontWeight: "900",
                  fontSize: "40px",
                  lineHeight: 1,
                  color: playerIsWinner ? "#F5A623" : "rgba(255,255,255,0.9)",
                  textShadow: STROKE,
                }}
              >
                {playerScore}
              </span>
            </div>

            {/* VS divider */}
            <div className="flex items-center justify-center flex-shrink-0" style={{ width: "32px" }}>
              <span
                style={{
                  fontFamily: "'Goldman Sans', sans-serif",
                  fontWeight: "500",
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.3)",
                  letterSpacing: "0.1em",
                }}
              >
                VS
              </span>
            </div>

            {/* Opponent Score Box */}
            <div
              className="flex-1 flex flex-col items-center justify-center"
              style={{
                padding: "16px 12px",
                borderRadius: "14px",
                background: opponentIsWinner ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.04)",
                border: opponentIsWinner
                  ? "1.5px solid rgba(239,68,68,0.4)"
                  : "1.5px solid rgba(255,255,255,0.1)",
                gap: "6px",
              }}
            >
              <span style={{ fontSize: "22px", lineHeight: 1 }}>{opponentSuit}</span>
              <span
                style={{
                  fontFamily: "'Goldman Sans', sans-serif",
                  fontWeight: "500",
                  fontSize: "10px",
                  letterSpacing: "0.1em",
                  color: "rgba(255,255,255,0.5)",
                  textTransform: "uppercase",
                }}
              >
                {isBotMode ? "BOT" : "OPP"}
              </span>
              <span
                style={{
                  fontFamily: "'Goldman Sans', sans-serif",
                  fontWeight: "900",
                  fontSize: "40px",
                  lineHeight: 1,
                  color: opponentIsWinner ? "#F5A623" : "rgba(255,255,255,0.9)",
                  textShadow: STROKE,
                }}
              >
                {opponentScore}
              </span>
            </div>
          </motion.div>

          {/* New Game Button */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="w-full"
          >
            <FancyButton
              onClick={onNewGame}
              variant="primary"
              width="100%"
              height="56px"
              fontSize="18px"
            >
              NEW GAME
            </FancyButton>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
