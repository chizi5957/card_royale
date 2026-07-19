// ╔════════════════════════════════════════════════════════════════════╗
// ║  WELCOME — first-launch screen. Asks the player's name exactly      ║
// ║  once; it's saved on the device and never asked again.              ║
// ║  (Reachable later from Home via "not you?" to change the name.)     ║
// ╚════════════════════════════════════════════════════════════════════╝
import { useState } from "react";
import { motion } from "motion/react";
import { FancyButton } from "./FancyButton";

interface NameEntryProps {
  onContinue: (name: string) => void;
  initialName?: string;
}

const BG =
  "linear-gradient(180deg, #352A91 0%, #434CAF 33.235%, #4751BC 62.524%, #352A91 90.344%), linear-gradient(180deg, #050313 0%, #18164C 50.952%, #25276B 100%)";

// Three fanned cards that spring in one after another — the game's
// "hello" moment. Pure decoration, but it sets the mood immediately.
function CardFan() {
  const cards = [
    { rank: "A", suit: "♠", rot: -16, x: -34, delay: 0.15, red: false },
    { rank: "K", suit: "♥", rot: 0, x: 0, delay: 0.3, red: true },
    { rank: "Q", suit: "♣", rot: 16, x: 34, delay: 0.45, red: false },
  ];
  return (
    <div className="relative" style={{ width: "150px", height: "110px" }}>
      {cards.map((c) => (
        <motion.div
          key={c.rank}
          initial={{ opacity: 0, y: 40, rotate: 0, scale: 0.6 }}
          animate={{ opacity: 1, y: 0, rotate: c.rot, scale: 1 }}
          transition={{ delay: c.delay, type: "spring", stiffness: 260, damping: 17 }}
          className="absolute"
          style={{
            left: "50%",
            top: "8px",
            marginLeft: `${c.x - 27}px`,
            width: "54px",
            height: "76px",
            background: "#FDFDFD",
            borderRadius: "7px",
            boxShadow: "0 8px 20px rgba(0,0,0,0.45)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            transformOrigin: "50% 90%",
          }}
        >
          <span style={{ fontFamily: "'Goldman Sans', sans-serif", fontWeight: 900, fontSize: "18px", lineHeight: 1, color: c.red ? "#D22" : "#1E293B" }}>
            {c.rank}
          </span>
          <span style={{ fontSize: "20px", lineHeight: 1.2, color: c.red ? "#D22" : "#1E293B" }}>{c.suit}</span>
        </motion.div>
      ))}
    </div>
  );
}

export function NameEntry({ onContinue, initialName = "" }: NameEntryProps) {
  const [name, setName] = useState(initialName);
  const [focused, setFocused] = useState(false);

  const trimmed = name.trim();
  const canContinue = trimmed.length >= 2;

  const handleSubmit = () => {
    if (canContinue) onContinue(trimmed);
  };

  return (
    <div
      className="flex flex-col items-center justify-center overflow-hidden"
      style={{ minHeight: "100dvh", backgroundImage: BG, padding: "24px" }}
    >
      <div className="flex flex-col items-center w-full" style={{ maxWidth: "400px", gap: "30px" }}>
        <CardFan />

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          style={{ textAlign: "center" }}
        >
          <h1
            style={{
              fontFamily: "'Goldman Sans', sans-serif",
              fontWeight: 900,
              fontSize: "30px",
              color: "#fff",
              textTransform: "uppercase",
              letterSpacing: "-0.02em",
              margin: 0,
              textShadow:
                "-1px -1px 0 #3B3B3B,1px -1px 0 #3B3B3B,-1px 1px 0 #3B3B3B,1px 1px 0 #3B3B3B, 0 2px 6px rgba(0,0,0,0.6)",
            }}
          >
            The Bidding War
          </h1>
          <p
            style={{
              fontFamily: "'Goldman Sans', sans-serif",
              fontSize: "12px",
              color: "rgba(255,255,255,0.55)",
              marginTop: "10px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            What should we call you?
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.68 }}
          className="w-full"
          style={{
            background: "var(--input-game-bg, #003343)",
            border: focused
              ? "2px solid rgba(255,196,0,0.85)"
              : "2px solid var(--input-game-border, rgba(0,89,117,0.5))",
            boxShadow: focused ? "0 0 22px rgba(255,196,0,0.25)" : "none",
            transition: "border 0.2s ease, box-shadow 0.2s ease",
            borderRadius: "12px",
            height: "62px",
            display: "flex",
            alignItems: "center",
            padding: "0 20px",
          }}
        >
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 20))}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="YOUR NAME"
            className="game-input-placeholder"
            style={{
              fontFamily: "'Goldman Sans', sans-serif",
              fontWeight: 700,
              fontSize: "19px",
              textTransform: "uppercase",
              color: "var(--foreground)",
              letterSpacing: "0.05em",
              background: "transparent",
              border: "none",
              outline: "none",
              width: "100%",
              textAlign: "center",
            }}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.78 }}
          className="w-full"
        >
          <FancyButton
            onClick={handleSubmit}
            variant="primary"
            width="100%"
            height="58px"
            fontSize="17px"
            disabled={!canContinue}
          >
            Let's Play
          </FancyButton>
          <p
            style={{
              fontFamily: "'Goldman Sans', sans-serif",
              fontSize: "10px",
              color: "rgba(255,255,255,0.35)",
              textAlign: "center",
              marginTop: "12px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Asked once — we'll remember you
          </p>
        </motion.div>
      </div>
    </div>
  );
}
