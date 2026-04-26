import { useState } from "react";
import { motion } from "motion/react";
import { FancyButton } from "./FancyButton";

interface NameEntryProps {
  onContinue: (name: string) => void;
  onBack: () => void;
  pendingAction?: "create" | "join" | "bot";
}

const MOBILE_BG =
  "linear-gradient(180deg, #352A91 0%, #434CAF 33.235%, #4751BC 62.524%, #352A91 90.344%), linear-gradient(180deg, #050313 0%, #18164C 50.952%, #25276B 100%)";

const SUBTITLE: Record<string, string> = {
  create: "Creating a new game",
  join: "Joining a game",
  bot: "Playing vs Bot",
};

export function NameEntry({ onContinue, onBack, pendingAction = "create" }: NameEntryProps) {
  const [name, setName] = useState("");

  const trimmed = name.trim();
  const canContinue = trimmed.length >= 2;

  const handleSubmit = () => {
    if (canContinue) onContinue(trimmed);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && canContinue) handleSubmit();
  };

  const subtitle = SUBTITLE[pendingAction];

  const inputStyle: React.CSSProperties = {
    fontFamily: "'Goldman Sans', sans-serif",
    fontWeight: 700,
    fontSize: "18px",
    textTransform: "uppercase",
    color: "var(--foreground)",
    letterSpacing: "0.04em",
    background: "transparent",
    border: "none",
    outline: "none",
    width: "100%",
    textAlign: "center",
  };

  const inputWrap: React.CSSProperties = {
    background: "var(--input-game-bg, #003343)",
    border: "2px solid var(--input-game-border, rgba(0,89,117,0.5))",
    borderRadius: "10px",
    height: "60px",
    display: "flex",
    alignItems: "center",
    padding: "0 20px",
  };

  /* ───── Mobile ───── */
  const mobile = (
    <div
      className="flex sm:hidden flex-col relative overflow-hidden"
      style={{ minHeight: "100dvh", backgroundImage: MOBILE_BG }}
    >
      {/* Back arrow */}
      <div style={{ padding: "16px 20px 0" }}>
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "rgba(255,255,255,0.6)",
            fontFamily: "'Goldman Sans', sans-serif",
            fontSize: "13px",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: 0,
          }}
        >
          ← Back
        </button>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 24px 80px",
          gap: "28px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "52px", marginBottom: "14px" }}>🃏</div>
          <h2
            style={{
              fontFamily: "'Goldman Sans', sans-serif",
              fontWeight: 900,
              fontSize: "26px",
              color: "#fff",
              textTransform: "uppercase",
              letterSpacing: "-0.02em",
              margin: 0,
              textShadow:
                "-1px -1px 0 #3B3B3B,1px -1px 0 #3B3B3B,-1px 1px 0 #3B3B3B,1px 1px 0 #3B3B3B",
            }}
          >
            What's your name?
          </h2>
          <p
            style={{
              fontFamily: "'Goldman Sans', sans-serif",
              fontSize: "11px",
              color: "rgba(255,255,255,0.45)",
              marginTop: "8px",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            {subtitle}
          </p>
        </div>

        <div style={{ width: "100%", ...inputWrap }}>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 20))}
            onKeyDown={handleKey}
            placeholder="YOUR NAME"
            className="game-input-placeholder"
            style={inputStyle}
          />
        </div>

        <FancyButton
          onClick={handleSubmit}
          variant="primary"
          width="100%"
          height="56px"
          fontSize="16px"
          disabled={!canContinue}
        >
          Let's Play
        </FancyButton>
      </div>
    </div>
  );

  /* ───── Desktop ───── */
  const desktop = (
    <div
      className="hidden sm:flex min-h-screen w-full flex-col items-center justify-center relative overflow-hidden"
      style={{ background: "var(--game-bg)" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="relative box-border flex flex-col items-center overflow-hidden"
        style={{
          width: "448px",
          padding: "40px 35px",
          gap: "24px",
          background: "var(--game-card-bg)",
          border: "3px solid var(--game-card-border)",
          boxShadow: "var(--elevation-sm)",
          borderRadius: "var(--game-card-radius)",
        }}
      >
        {/* Back link */}
        <div style={{ width: "378px", display: "flex", alignItems: "center" }}>
          <button
            onClick={onBack}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "rgba(255,255,255,0.5)",
              fontFamily: "'Goldman Sans', sans-serif",
              fontSize: "12px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: 0,
            }}
          >
            ← Back
          </button>
        </div>

        {/* Icon + heading */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ textAlign: "center" }}
        >
          <div style={{ fontSize: "56px", lineHeight: 1, marginBottom: "16px" }}>🃏</div>
          <h2
            style={{
              fontFamily: "'Goldman Sans', sans-serif",
              fontWeight: 900,
              fontSize: "30px",
              color: "#fff",
              textTransform: "uppercase",
              letterSpacing: "-0.02em",
              margin: 0,
              textShadow:
                "-1px -1px 0 #3B3B3B,1px -1px 0 #3B3B3B,-1px 1px 0 #3B3B3B,1px 1px 0 #3B3B3B",
            }}
          >
            What's your name?
          </h2>
          <p
            style={{
              fontFamily: "'Goldman Sans', sans-serif",
              fontSize: "11px",
              color: "rgba(255,255,255,0.4)",
              marginTop: "8px",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
            }}
          >
            {subtitle}
          </p>
        </motion.div>

        {/* Input */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          style={{ width: "378px", ...inputWrap }}
        >
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 20))}
            onKeyDown={handleKey}
            placeholder="YOUR NAME"
            className="game-input-placeholder"
            style={{ ...inputStyle, fontSize: "20px" }}
          />
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26 }}
          style={{ width: "378px" }}
        >
          <FancyButton
            onClick={handleSubmit}
            variant="primary"
            width="378px"
            height="64px"
            fontSize="20px"
            disabled={!canContinue}
          >
            Let's Play
          </FancyButton>
        </motion.div>
      </motion.div>
    </div>
  );

  return (
    <>
      {mobile}
      {desktop}
    </>
  );
}
