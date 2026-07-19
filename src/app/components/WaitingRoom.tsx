// ╔════════════════════════════════════════════════════════════════════╗
// ║  WAITING ROOM — shown to the game creator while their friend joins. ║
// ║  Radar pulse says "we're live"; the code pops in character by       ║
// ║  character; tapping it copies. Auto-advances when a friend joins.   ║
// ╚════════════════════════════════════════════════════════════════════╝
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FancyButton } from "./FancyButton";

interface WaitingRoomProps {
  gameCode: string;
  playerNumber: 1 | 2;
  opponentJoined: boolean;
  onCancel: () => void;
  onPlayVsBot: () => void;
}

const BG =
  "linear-gradient(180deg, #352A91 0%, #434CAF 33.235%, #4751BC 62.524%, #352A91 90.344%), linear-gradient(180deg, #050313 0%, #18164C 50.952%, #25276B 100%)";

// Expanding rings — the "searching for an opponent" heartbeat
function RadarPulse({ found }: { found: boolean }) {
  const color = found ? "rgba(79,234,79," : "rgba(255,196,0,";
  return (
    <div className="relative flex items-center justify-center" style={{ width: "120px", height: "120px" }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{ width: "50px", height: "50px", border: `2px solid ${color}0.55)` }}
          animate={{ scale: [1, 2.3], opacity: [0.7, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.65, ease: "easeOut" }}
        />
      ))}
      <motion.div
        className="rounded-full flex items-center justify-center"
        style={{ width: "56px", height: "56px", background: `${color}0.16)`, border: `2px solid ${color}0.8)` }}
        animate={found ? { scale: [1, 1.15, 1] } : {}}
        transition={{ duration: 0.5 }}
      >
        <span style={{ fontSize: "26px" }}>{found ? "🤝" : "📡"}</span>
      </motion.div>
    </div>
  );
}

export function WaitingRoom({ gameCode, opponentJoined, onCancel, onPlayVsBot }: WaitingRoomProps) {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(gameCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center overflow-hidden"
      style={{ minHeight: "100dvh", backgroundImage: BG, padding: "24px" }}
    >
      <div className="flex flex-col items-center w-full" style={{ maxWidth: "400px", gap: "26px" }}>
        <RadarPulse found={opponentJoined} />

        <AnimatePresence mode="wait">
          <motion.h2
            key={opponentJoined ? "found" : "waiting"}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              fontFamily: "'Goldman Sans', sans-serif",
              fontWeight: 900,
              fontSize: "24px",
              color: opponentJoined ? "#4FEA4F" : "#fff",
              textTransform: "uppercase",
              letterSpacing: "-0.01em",
              margin: 0,
              textAlign: "center",
              textShadow:
                "-1px -1px 0 #3B3B3B,1px -1px 0 #3B3B3B,-1px 1px 0 #3B3B3B,1px 1px 0 #3B3B3B",
            }}
          >
            {opponentJoined ? "Opponent found!" : "Share this code"}
          </motion.h2>
        </AnimatePresence>

        {!opponentJoined && (
          <>
            {/* Tap-to-copy code — characters pop in one by one */}
            <motion.button
              onClick={copyCode}
              whileTap={{ scale: 0.96 }}
              style={{
                background: "rgba(8, 6, 28, 0.55)",
                border: "2px solid rgba(255,196,0,0.5)",
                borderRadius: "16px",
                padding: "18px 26px",
                cursor: "pointer",
                display: "flex",
                gap: "10px",
              }}
            >
              {gameCode.split("").map((ch, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 16, scale: 0.5 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.15 + i * 0.07, type: "spring", stiffness: 300, damping: 15 }}
                  style={{
                    fontFamily: "'Goldman Sans', sans-serif",
                    fontWeight: 900,
                    fontSize: "34px",
                    color: "#FFC400",
                    textShadow: "0 2px 8px rgba(0,0,0,0.6)",
                  }}
                >
                  {ch}
                </motion.span>
              ))}
            </motion.button>

            <AnimatePresence mode="wait">
              <motion.p
                key={copied ? "copied" : "hint"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  fontFamily: "'Goldman Sans', sans-serif",
                  fontSize: "11px",
                  color: copied ? "#4FEA4F" : "rgba(255,255,255,0.45)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  margin: "-10px 0 0",
                }}
              >
                {copied ? "✓ Copied — send it to your friend" : "Tap the code to copy"}
              </motion.p>
            </AnimatePresence>

            {/* Waiting dots */}
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <span
                style={{
                  fontFamily: "'Goldman Sans', sans-serif",
                  fontSize: "12px",
                  color: "rgba(255,255,255,0.5)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Waiting for them to join
              </span>
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                  style={{ color: "rgba(255,255,255,0.7)", fontSize: "16px", lineHeight: 1 }}
                >
                  ·
                </motion.span>
              ))}
            </div>

            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
              <FancyButton onClick={onPlayVsBot} variant="tertiary" width="100%" height="50px" fontSize="13px">
                🤖 Can't wait? Play the bot
              </FancyButton>
              <button
                onClick={onCancel}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "'Goldman Sans', sans-serif",
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.4)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  padding: "8px",
                  textDecoration: "underline",
                  textUnderlineOffset: "4px",
                }}
              >
                Cancel game
              </button>
            </div>
          </>
        )}

        {opponentJoined && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              fontFamily: "'Goldman Sans', sans-serif",
              fontSize: "13px",
              color: "rgba(255,255,255,0.6)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Dealing the cards…
          </motion.p>
        )}
      </div>
    </div>
  );
}
