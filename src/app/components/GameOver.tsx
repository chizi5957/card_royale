// ╔════════════════════════════════════════════════════════════════════╗
// ║  GAME OVER — full-screen result, not a popup.                       ║
// ║  Scores count up from zero, the verdict lands with a spring,        ║
// ║  confetti rains on a win. "Rematch" (vs bot) restarts instantly.    ║
// ╚════════════════════════════════════════════════════════════════════╝
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { FancyButton } from "./FancyButton";

interface GameOverProps {
  playerScore: number;
  opponentScore: number;
  playerNumber: 1 | 2;
  onNewGame: () => void;
  onRematch?: () => void;   // present only in bot mode
  isBotMode?: boolean;
  playerName?: string;
}

const STROKE = "-1px -1px 0 #3B3B3B, 1px -1px 0 #3B3B3B, -1px 1px 0 #3B3B3B, 1px 1px 0 #3B3B3B";
const BG =
  "linear-gradient(180deg, #352A91 0%, #434CAF 33.235%, #4751BC 62.524%, #352A91 90.344%), linear-gradient(180deg, #050313 0%, #18164C 50.952%, #25276B 100%)";

// Numbers that roll from 0 to their final value — makes the score land
function CountUp({ to, delay }: { to: number; delay: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now() + delay * 1000;
    const dur = 900;
    const tick = (t: number) => {
      if (t < start) { raf = requestAnimationFrame(tick); return; }
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setN(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, delay]);
  return <>{n}</>;
}

// Lightweight confetti — 36 card-suit pieces falling with random drift
function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 1.6,
        dur: 2.6 + Math.random() * 1.8,
        rot: (Math.random() - 0.5) * 720,
        char: ["♠", "♥", "♦", "♣", "★"][i % 5],
        color: ["#FFC400", "#4FEA4F", "#FF6B6B", "#7DB4FF", "#FFFFFF"][i % 5],
        size: 12 + Math.random() * 12,
      })),
    [],
  );
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 5 }}>
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          initial={{ y: "-6vh", x: 0, opacity: 1, rotate: 0 }}
          animate={{ y: "110vh", x: [0, 30, -20, 10], opacity: [1, 1, 1, 0.6], rotate: p.rot }}
          transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: "linear" }}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: 0,
            fontSize: `${p.size}px`,
            color: p.color,
            textShadow: "0 2px 4px rgba(0,0,0,0.4)",
          }}
        >
          {p.char}
        </motion.span>
      ))}
    </div>
  );
}

export function GameOver({
  playerScore,
  opponentScore,
  playerNumber,
  onNewGame,
  onRematch,
  isBotMode,
  playerName,
}: GameOverProps) {
  const playerWon = playerScore > opponentScore;
  const isTie = playerScore === opponentScore;
  const playerSuit = playerNumber === 1 ? "♠" : "♣";
  const opponentSuit = playerNumber === 1 ? "♣" : "♠";
  const displayName = playerName ? playerName.toUpperCase().slice(0, 10) : null;
  const margin = Math.abs(playerScore - opponentScore);

  let resultText = "IT'S A TIE!";
  let resultColor = "rgba(255,255,255,0.9)";
  let glowColor = "rgba(255,255,255,0.3)";
  let resultEmoji = "🤝";
  let subline = "Dead even. Run it back?";

  if (!isTie) {
    if (playerWon) {
      resultText = "VICTORY!";
      resultColor = "#FFC400";
      glowColor = "rgba(255,196,0,0.4)";
      resultEmoji = "🏆";
      subline = `${displayName || "You"} won by ${margin} point${margin === 1 ? "" : "s"}`;
    } else {
      resultText = "DEFEAT";
      resultColor = "#EF4444";
      glowColor = "rgba(239,68,68,0.35)";
      resultEmoji = "💔";
      subline = `Lost by ${margin} point${margin === 1 ? "" : "s"} — revenge time?`;
    }
  }

  const playerIsWinner = playerWon && !isTie;
  const opponentIsWinner = !playerWon && !isTie;

  const scoreBox = (
    suit: string,
    label: string,
    score: number,
    winner: boolean,
    delay: number,
  ) => (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 240, damping: 20 }}
      className="flex-1 flex flex-col items-center justify-center"
      style={{
        padding: "22px 12px",
        borderRadius: "16px",
        background: winner ? "rgba(255,196,0,0.09)" : "rgba(255,255,255,0.04)",
        border: winner ? "2px solid rgba(255,196,0,0.55)" : "1.5px solid rgba(255,255,255,0.1)",
        boxShadow: winner ? "0 0 30px rgba(255,196,0,0.15)" : "none",
        gap: "8px",
      }}
    >
      <span style={{ fontSize: "24px", lineHeight: 1 }}>{suit}</span>
      <span
        style={{
          fontFamily: "'Goldman Sans', sans-serif",
          fontWeight: 500,
          fontSize: "10px",
          letterSpacing: "0.12em",
          color: "rgba(255,255,255,0.5)",
          textTransform: "uppercase",
        }}
      >
        {label} {winner && "👑"}
      </span>
      <span
        style={{
          fontFamily: "'Goldman Sans', sans-serif",
          fontWeight: 900,
          fontSize: "46px",
          lineHeight: 1,
          color: winner ? "#FFC400" : "rgba(255,255,255,0.9)",
          textShadow: STROKE,
        }}
      >
        <CountUp to={score} delay={delay + 0.2} />
      </span>
    </motion.div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ backgroundImage: BG, padding: "24px" }}
    >
      {playerIsWinner && <Confetti />}

      <div className="flex flex-col items-center w-full" style={{ maxWidth: "420px", gap: "30px", zIndex: 10 }}>
        {/* Verdict */}
        <div className="flex flex-col items-center" style={{ gap: "14px" }}>
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 14 }}
            style={{ fontSize: "72px", lineHeight: 1, filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.5))" }}
          >
            {resultEmoji}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, scale: 0.7, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.25, type: "spring", stiffness: 280, damping: 16 }}
            style={{
              fontFamily: "'Goldman Sans', sans-serif",
              fontWeight: 900,
              fontSize: "52px",
              lineHeight: 1,
              letterSpacing: "-0.03em",
              textTransform: "uppercase",
              textAlign: "center",
              color: resultColor,
              textShadow: `${STROKE}, 0 0 40px ${glowColor}, 0 6px 12px rgba(0,0,0,0.6)`,
              margin: 0,
            }}
          >
            {resultText}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{
              fontFamily: "'Goldman Sans', sans-serif",
              fontSize: "13px",
              color: "rgba(255,255,255,0.6)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              margin: 0,
              textAlign: "center",
            }}
          >
            {subline}
          </motion.p>
        </div>

        {/* Scores */}
        <div className="w-full flex items-stretch" style={{ gap: "14px" }}>
          {scoreBox(playerSuit, displayName || "You", playerScore, playerIsWinner, 0.55)}
          <div className="flex items-center justify-center flex-shrink-0" style={{ width: "30px" }}>
            <span
              style={{
                fontFamily: "'Goldman Sans', sans-serif",
                fontWeight: 500,
                fontSize: "12px",
                color: "rgba(255,255,255,0.3)",
                letterSpacing: "0.1em",
              }}
            >
              VS
            </span>
          </div>
          {scoreBox(opponentSuit, isBotMode ? "Bot" : "Opponent", opponentScore, opponentIsWinner, 0.65)}
        </div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85 }}
          className="w-full flex flex-col"
          style={{ gap: "12px" }}
        >
          {onRematch && (
            <FancyButton onClick={onRematch} variant="primary" width="100%" height="58px" fontSize="17px">
              ⚡ Rematch
            </FancyButton>
          )}
          <FancyButton
            onClick={onNewGame}
            variant={onRematch ? "secondary" : "primary"}
            width="100%"
            height={onRematch ? "50px" : "58px"}
            fontSize={onRematch ? "14px" : "17px"}
          >
            Home
          </FancyButton>
        </motion.div>
      </div>
    </motion.div>
  );
}
