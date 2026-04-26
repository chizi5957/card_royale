import { useState } from "react";
import { motion } from "motion/react";
import { FancyButton } from "./FancyButton";

interface NameEntryProps {
  onContinue: (name: string) => void;
}

const MOBILE_BG =
  "linear-gradient(180deg, #352A91 0%, #434CAF 33.235%, #4751BC 62.524%, #352A91 90.344%), linear-gradient(180deg, #050313 0%, #18164C 50.952%, #25276B 100%)";

export function NameEntry({ onContinue }: NameEntryProps) {
  const [name, setName] = useState("");

  const trimmed = name.trim();
  const canContinue = trimmed.length >= 2;

  const handleSubmit = () => {
    if (canContinue) onContinue(trimmed);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && canContinue) handleSubmit();
  };

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
      {/* simple header bar */}
      <div
        className="relative w-full flex-none flex items-center justify-center"
        style={{ height: "72px" }}
      >
        <span
          style={{
            fontFamily: "'Goldman Sans', sans-serif",
            fontWeight: 900,
            fontSize: "22px",
            color: "#fff",
            textShadow:
              "-1px -1px 0 #3B3B3B,1px -1px 0 #3B3B3B,-1px 1px 0 #3B3B3B,1px 1px 0 #3B3B3B,0 2px 4px rgba(0,0,0,0.8)",
            textTransform: "uppercase",
            letterSpacing: "-0.02em",
          }}
        >
          THE BIDDING WAR
        </span>
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
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>🃏</div>
          <h2
            style={{
              fontFamily: "'Goldman Sans', sans-serif",
              fontWeight: 900,
              fontSize: "26px",
              color: "#fff",
              textTransform: "uppercase",
              letterSpacing: "-0.02em",
              margin: 0,
              textShadow: "-1px -1px 0 #3B3B3B,1px -1px 0 #3B3B3B,-1px 1px 0 #3B3B3B,1px 1px 0 #3B3B3B",
            }}
          >
            What's your name?
          </h2>
          <p
            style={{
              fontFamily: "'Goldman Sans', sans-serif",
              fontSize: "12px",
              color: "rgba(255,255,255,0.55)",
              marginTop: "8px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Enter at least 2 characters
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
        transition={{ duration: 0.45 }}
        className="relative box-border flex flex-col items-center overflow-hidden"
        style={{
          width: "448px",
          padding: "0 35px 40px",
          gap: "28px",
          background: "var(--game-card-bg)",
          border: "3px solid var(--game-card-border)",
          boxShadow: "var(--elevation-sm)",
          borderRadius: "var(--game-card-radius)",
        }}
      >
        {/* Title bar — same as GameLobby */}
        <div className="relative w-[449px] h-[85px] flex-none" style={{ margin: "0 -35px" }}>
          <div
            className="absolute left-0 right-0 top-0 bottom-[16.47%]"
            style={{
              background: "#1e1b4b",
              border: "1px solid #000",
              boxShadow: "0px 2px 4px rgba(0,0,0,0.5),0px 4px 12px rgba(0,0,0,0.45)",
              clipPath: "polygon(0 0,100% 0,100% 80%,50% 100%,0 80%)",
            }}
          />
          <div
            className="absolute left-0 right-0 top-[2.35%] bottom-[21.18%]"
            style={{
              background: "linear-gradient(90deg,#635DC2 0%,#9090FB 42%,#635DC2 100%)",
              border: "1px solid #D2BFFF",
              clipPath: "polygon(0 0,100% 0,100% 80%,50% 100%,0 80%)",
            }}
          />
          <div
            className="absolute left-0 right-0 top-[2.35%] bottom-[65.88%]"
            style={{
              background:
                "radial-gradient(163.49% 190.74% at 50% 190.74%,rgba(255,255,255,0.078) 34%,rgba(255,255,255,0.3) 100%)",
              mixBlendMode: "hard-light",
              clipPath: "polygon(0 0,100% 0,100% 80%,50% 100%,0 80%)",
            }}
          />
          <div
            className="absolute left-[10px] right-[10px] top-[11px] h-[40px] flex items-center justify-center text-center"
            style={{
              fontFamily: "'Goldman Sans', sans-serif",
              fontWeight: 900,
              fontSize: "30px",
              letterSpacing: "-0.02em",
              textTransform: "uppercase",
              color: "#fff",
              textShadow:
                "-1px -1px 0 #3B3B3B,1px -1px 0 #3B3B3B,-1px 1px 0 #3B3B3B,1px 1px 0 #3B3B3B,0px 1.778px 2.54px rgba(0,0,0,0.8)",
            }}
          >
            THE BIDDING WAR
          </div>
        </div>

        {/* Icon + heading */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{ textAlign: "center", paddingTop: "4px" }}
        >
          <div style={{ fontSize: "52px", lineHeight: 1, marginBottom: "14px" }}>🃏</div>
          <h2
            style={{
              fontFamily: "'Goldman Sans', sans-serif",
              fontWeight: 900,
              fontSize: "28px",
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
            Enter at least 2 characters
          </p>
        </motion.div>

        {/* Input */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
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
          transition={{ delay: 0.35 }}
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
