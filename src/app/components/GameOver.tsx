import { motion } from "motion/react";
import { TitleBar } from "./TitleBar";

interface GameOverProps {
  playerScore: number;
  opponentScore: number;
  playerNumber: 1 | 2;
  onNewGame: () => void;
  isBotMode?: boolean;
}

export function GameOver({ playerScore, opponentScore, playerNumber, onNewGame, isBotMode }: GameOverProps) {
  const playerWon = playerScore > opponentScore;
  const isTie = playerScore === opponentScore;

  const playerSuit = playerNumber === 1 ? "♠" : "♣";
  const opponentSuit = playerNumber === 1 ? "♣" : "♠";

  let resultText = "IT'S A TIE!";
  let resultColor = "rgba(255,255,255,0.7)";
  let resultEmoji = "🤝";

  if (!isTie) {
    if (playerWon) {
      resultText = "YOU WIN!";
      resultColor = "#22C55E";
      resultEmoji = "🎉";
    } else {
      resultText = isBotMode ? "BOT WINS" : "YOU LOSE";
      resultColor = "#EF4444";
      resultEmoji = "😔";
    }
  }

  const playerIsWinner = playerWon && !isTie;
  const opponentIsWinner = !playerWon && !isTie;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
    >
      <motion.div
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="relative box-border flex flex-col items-center overflow-hidden"
        style={{
          width: "448px",
          padding: "0px 35px 35px",
          gap: "32px",
          background: "var(--game-card-bg)",
          border: "3px solid var(--game-card-border)",
          boxShadow: "var(--popup-card-shadow)",
          borderRadius: "var(--game-card-radius)",
        }}
      >
        {/* Title Bar */}
        <TitleBar title="GAME OVER!" fontSize="30px" />

        {/* Result Emoji */}
        <div className="flex flex-col items-center w-full" style={{ gap: "8px" }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            style={{ fontSize: "48px", lineHeight: 1, textAlign: "center" }}
          >
            {resultEmoji}
          </motion.div>

          {/* Result Text */}
          <h2
            style={{
              fontFamily: "'Goldman Sans', sans-serif",
              fontWeight: "var(--font-weight-black)" as any,
              fontSize: "28px",
              lineHeight: "34px",
              letterSpacing: "-0.02em",
              textTransform: "uppercase",
              textAlign: "center",
              color: resultColor,
              textShadow: `-1px -1px 0 #3B3B3B, 1px -1px 0 #3B3B3B, -1px 1px 0 #3B3B3B, 1px 1px 0 #3B3B3B, 0 0 20px ${resultColor}40`,
            }}
          >
            {resultText}
          </h2>
        </div>

        {/* Score Comparison */}
        <div className="w-full flex items-center" style={{ gap: "16px" }}>
          {/* Player Score Box */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex-1 flex flex-col items-center justify-center"
            style={{
              padding: "16px",
              borderRadius: "12px",
              background: "rgba(0,0,0,0.2)",
              border: playerIsWinner
                ? "2px solid var(--popup-highlight-color)"
                : "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <span style={{ fontSize: "20px", color: "var(--foreground)", lineHeight: 1 }}>
              {playerSuit}
            </span>
            <span
              style={{
                fontFamily: "'Goldman Sans', sans-serif",
                fontWeight: "var(--font-weight-medium)" as any,
                fontSize: "var(--text-micro)",
                lineHeight: "12px",
                color: "rgba(255,255,255,0.6)",
                textTransform: "uppercase",
                marginTop: "6px",
              }}
            >
              YOU
            </span>
            <span
              style={{
                fontFamily: "'Goldman Sans', sans-serif",
                fontWeight: "var(--font-weight-black)" as any,
                fontSize: "36px",
                lineHeight: "43px",
                color: playerIsWinner ? "#F5A623" : "var(--foreground)",
                marginTop: "4px",
                textShadow: "-1px -1px 0 #3B3B3B, 1px -1px 0 #3B3B3B, -1px 1px 0 #3B3B3B, 1px 1px 0 #3B3B3B",
              }}
            >
              {playerScore}
            </span>
          </motion.div>

          {/* VS */}
          <span
            style={{
              fontFamily: "'Goldman Sans', sans-serif",
              fontWeight: "var(--font-weight-medium)" as any,
              fontSize: "12px",
              color: "rgba(255,255,255,0.5)",
              textTransform: "uppercase",
              flexShrink: 0,
            }}
          >
            VS
          </span>

          {/* Opponent Score Box */}
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex-1 flex flex-col items-center justify-center"
            style={{
              padding: "16px",
              borderRadius: "12px",
              background: "rgba(0,0,0,0.2)",
              border: opponentIsWinner
                ? "2px solid var(--popup-highlight-color)"
                : "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <span style={{ fontSize: "20px", color: "var(--foreground)", lineHeight: 1 }}>
              {opponentSuit}
            </span>
            <span
              style={{
                fontFamily: "'Goldman Sans', sans-serif",
                fontWeight: "var(--font-weight-medium)" as any,
                fontSize: "var(--text-micro)",
                lineHeight: "12px",
                color: "rgba(255,255,255,0.6)",
                textTransform: "uppercase",
                marginTop: "6px",
              }}
            >
              {isBotMode ? "BOT" : "OPP"}
            </span>
            <span
              style={{
                fontFamily: "'Goldman Sans', sans-serif",
                fontWeight: "var(--font-weight-black)" as any,
                fontSize: "36px",
                lineHeight: "43px",
                color: opponentIsWinner ? "#F5A623" : "var(--foreground)",
                marginTop: "4px",
                textShadow: "-1px -1px 0 #3B3B3B, 1px -1px 0 #3B3B3B, -1px 1px 0 #3B3B3B, 1px 1px 0 #3B3B3B",
              }}
            >
              {opponentScore}
            </span>
          </motion.div>
        </div>

        {/* New Game Button — full layered spec button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="w-full"
        >
          <div
            className="relative w-full cursor-pointer"
            style={{
              height: "64px",
              border: "1.5px solid var(--border)",
              borderRadius: "var(--radius-button)",
            }}
            onClick={onNewGame}
          >
            {/* ButtonBase */}
            <div
              className="absolute inset-0"
              style={{
                background: "var(--btn-primary-base)",
                borderRadius: "var(--radius-button)",
              }}
            />
            {/* ButtonMid */}
            <div
              className="absolute"
              style={{
                left: "1px",
                right: "1px",
                top: "1px",
                bottom: "4px",
                background: "var(--btn-primary-mid)",
                borderRadius: "var(--radius-button)",
              }}
            />
            {/* Shine */}
            <div
              className="absolute"
              style={{
                left: "4px",
                right: "4px",
                top: "4px",
                bottom: "7px",
                background: "var(--btn-primary-shine)",
                filter: "blur(0.25px)",
                borderRadius: "3px",
              }}
            />
            {/* Border overlay */}
            <div
              className="absolute inset-0"
              style={{
                border: "1.5px solid var(--border)",
                borderRadius: "var(--radius-button)",
              }}
            />
            {/* Label */}
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                fontFamily: "'Goldman Sans', sans-serif",
                fontWeight: "var(--font-weight-black)" as any,
                fontSize: "20px",
                lineHeight: "24px",
                letterSpacing: "-0.02em",
                textTransform: "uppercase",
                color: "var(--foreground)",
                textShadow: "-1px -1px 0 #3B3B3B, 1px -1px 0 #3B3B3B, -1px 1px 0 #3B3B3B, 1px 1px 0 #3B3B3B, 0px 0.7px 1px rgba(0,0,0,0.8), 0px 0.5px 0px #000000",
              }}
            >
              NEW GAME
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}