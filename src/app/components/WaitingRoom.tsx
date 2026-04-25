import { motion } from "motion/react";
import { useState } from "react";
import { FancyButton } from "./FancyButton";
import { HowToPlay } from "./HowToPlay";

interface WaitingRoomProps {
  gameCode: string;
  playerNumber: 1 | 2;
  opponentJoined: boolean;
  onCancel: () => void;
  onPlayVsBot?: () => void;
  onHowToPlay?: () => void;
}

const MOBILE_BG = "linear-gradient(180deg, #352A91 0%, #434CAF 33.235%, #4751BC 62.524%, #352A91 90.344%), linear-gradient(180deg, #050313 0%, #18164C 50.952%, #25276B 100%)";

export function WaitingRoom({ gameCode, playerNumber, opponentJoined, onCancel, onPlayVsBot }: WaitingRoomProps) {
  const [copied, setCopied] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const handleCopyCode = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(gameCode)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => fallbackCopyTextToClipboard(gameCode));
    } else {
      fallbackCopyTextToClipboard(gameCode);
    }
  };

  const fallbackCopyTextToClipboard = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Fallback: Could not copy text', err);
    }

    document.body.removeChild(textArea);
  };

  const playerSuit = playerNumber === 1 ? "♠ Spades" : "♣ Clubs";

  return (
    <>
      {/* ═══════════════════════════════════════
          MOBILE LAYOUT  (< 640 px)
          ═══════════════════════════════════════ */}
      <div
        className="flex sm:hidden flex-col relative overflow-hidden"
        style={{ minHeight: "100dvh", backgroundImage: MOBILE_BG }}
      >
        {/* Header — spinner + title */}
        <div style={{ padding: "24px 33px 0", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "12px" }}>
          {/* Spinner or check */}
          {!opponentJoined ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              style={{ width: "36px", height: "36px", borderRadius: "50%", borderTop: "3px solid var(--status-waiting)", borderRight: "3px solid transparent", borderBottom: "3px solid var(--status-waiting)", borderLeft: "3px solid transparent" }}
            />
          ) : (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--battle-area-border)", border: "2px solid var(--game-card-border)", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <span style={{ fontSize: "18px", color: "var(--foreground)" }}>✓</span>
            </motion.div>
          )}

          {/* Title */}
          <h2 style={{ fontFamily: "'Goldman Sans', sans-serif", fontWeight: 900, fontSize: "24px", color: "#fff", textTransform: "uppercase", letterSpacing: "-0.24px", textShadow: "-1px -1px 0 #3B3B3B, 1px -1px 0 #3B3B3B, -1px 1px 0 #3B3B3B, 1px 1px 0 #3B3B3B, 0px 1.778px 2.54px rgba(0,0,0,0.8)", margin: 0 }}>
            {opponentJoined ? "Battle Starting!" : "Waiting for Opponent..."}
          </h2>
        </div>

        {/* Main content */}
        <div style={{ marginTop: "40px", padding: "0 20px", display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Game Code section */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <p style={{ fontFamily: "'Goldman Sans', sans-serif", fontWeight: 700, fontSize: "14px", color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.6px", textAlign: "center", margin: 0 }}>
              Game Code
            </p>

            {/* Code display */}
            <div style={{ background: "#003343", border: "2px solid rgba(0,89,117,0.5)", borderRadius: "7px", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.2)", height: "72px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "'Goldman Sans', sans-serif", fontWeight: 900, fontSize: "32px", letterSpacing: "7px", color: "#fff", textTransform: "uppercase", textShadow: "-1px -1px 0 #3B3B3B, 1px -1px 0 #3B3B3B, -1px 1px 0 #3B3B3B, 1px 1px 0 #3B3B3B" }}>
                {gameCode}
              </span>
            </div>

            {/* Copy button */}
            <FancyButton onClick={handleCopyCode} variant="primary" width="100%" height="48px" fontSize="14px">
              {copied ? "✓ Copied!" : "📋  Copy Game Code"}
            </FancyButton>
          </div>

          {/* Or + Play vs Bot (only while waiting) */}
          {!opponentJoined && onPlayVsBot && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.2)" }} />
                <span style={{ fontFamily: "'Goldman Sans', sans-serif", fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>Or</span>
                <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.2)" }} />
              </div>
              <FancyButton onClick={onPlayVsBot} variant="tertiary" width="100%" height="56px" fontSize="16px">
                Play vs Bot
              </FancyButton>
            </>
          )}

          {/* Player info */}
          <div style={{ background: "#352A91", border: "1px solid #6B60D6", borderRadius: "16px", padding: "13px 25px", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
            <p style={{ fontFamily: "'Goldman Sans', sans-serif", fontWeight: 700, fontSize: "12px", color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "-0.64px", margin: 0 }}>
              You are — <strong style={{ color: "#fff" }}>Player {playerNumber}</strong>
            </p>
            <span style={{ fontFamily: "'Goldman Sans', sans-serif", fontSize: "16px", color: "#fff" }}>
              {playerSuit}
            </span>
          </div>

          {/* Cancel */}
          <button
            onClick={onCancel}
            style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Goldman Sans', sans-serif", fontWeight: 700, fontSize: "14px", color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.6px", padding: "4px 0", textAlign: "center" }}
          >
            cancel game
          </button>
        </div>

        {/* HOW TO PLAY — pinned to bottom */}
        <div style={{ position: "absolute", bottom: "32px", left: "20px", right: "20px" }}>
          <FancyButton onClick={() => setShowHowToPlay(true)} variant="secondary" width="100%" height="48px" fontSize="14px">
            How to Play?
          </FancyButton>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          DESKTOP LAYOUT  (≥ 640 px)
          ═══════════════════════════════════════ */}
      <div
        className="hidden sm:flex min-h-screen w-full flex-col items-center justify-center relative overflow-hidden"
        style={{ background: "var(--game-bg)" }}
      >
        <motion.div
  initial={{ opacity: 0, scale: 0.9 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.5 }}
  className="relative box-border flex flex-col items-center px-[35px] pb-[35px] gap-[24px] w-[448px] overflow-hidden"
  style={{
    background: "var(--game-card-bg)",
    border: "3px solid var(--game-card-border)",
    boxShadow: "var(--elevation-sm)",
    borderRadius: "var(--game-card-radius)",
    paddingTop: "35px",
  }}
>
  {/* Spinner + Status — compact, no separate checkmark block */}
  <div className="flex flex-col items-center gap-[12px] w-full">
    {!opponentJoined ? (
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          borderTop: "3px solid var(--status-waiting)",
          borderRight: "3px solid transparent",
          borderBottom: "3px solid var(--status-waiting)",
          borderLeft: "3px solid transparent",
        }}
      />
    ) : (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="flex items-center justify-center"
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          backgroundColor: "var(--battle-area-border)",
          border: "2px solid var(--game-card-border)",
        }}
      >
        <span style={{ fontSize: "18px", color: "var(--foreground)" }}>✓</span>
      </motion.div>
    )}

    <h2
      className="uppercase tracking-wide text-center"
      style={{
        color: "var(--foreground)",
        fontSize: "var(--text-h3)",
        fontFamily: "'Goldman Sans', sans-serif",
        fontWeight: "var(--font-weight-black)" as any,
        textShadow: "-1px -1px 0 #3B3B3B, 1px -1px 0 #3B3B3B, -1px 1px 0 #3B3B3B, 1px 1px 0 #3B3B3B, 0px 2px 4px rgba(0,0,0,0.5)",
        margin: 0,
      }}
    >
      {opponentJoined ? "Battle Starting!" : "Waiting for Opponent..."}
    </h2>
  </div>

  {/* Game Code Display */}
  <div className="w-full" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
    <label
      className="block text-center uppercase tracking-wider"
      style={{
        color: "var(--muted-foreground)",
        fontSize: "var(--text-label)",
        fontFamily: "'Goldman Sans', sans-serif",
        fontWeight: "var(--font-weight-medium)" as any,
      }}
    >
      Game Code
    </label>

    <div
      className="text-center w-full flex items-center justify-center"
      style={{
        padding: "12px 0",
        backgroundColor: "#003343",
        border: "2px solid rgba(0, 89, 117, 0.5)",
        borderRadius: "7px",
        boxShadow: "inset 0 2px 4px rgba(0,0,0,0.2)",
        height: "91px",
      }}
    >
      <div
        style={{
          fontSize: "40px",
          letterSpacing: "8.4px",
          color: "#FFFFFF",
          fontFamily: "'Goldman Sans', sans-serif",
          fontWeight: 900,
          textShadow: "-1px -1px 0 #3B3B3B, 1px -1px 0 #3B3B3B, -1px 1px 0 #3B3B3B, 1px 1px 0 #3B3B3B, 0px 2px 0px rgba(0,0,0,0.5)",
          textTransform: "uppercase",
        }}
      >
        {gameCode}
      </div>
    </div>

    <FancyButton onClick={handleCopyCode} variant="primary">
      {copied ? "✓ Copied!" : "📋 Copy Game Code"}
    </FancyButton>

    {!opponentJoined && onPlayVsBot && (
      <>
        <div className="flex items-center gap-2">
          <div className="h-[1px] flex-1 opacity-20" style={{ backgroundColor: "var(--divider-line)" }} />
          <span style={{ fontFamily: "'Goldman Sans', sans-serif", fontWeight: "var(--font-weight-medium)" as any, color: "var(--muted-foreground)", fontSize: "10px", opacity: 0.6, textTransform: "uppercase" }}>or</span>
          <div className="h-[1px] flex-1 opacity-20" style={{ backgroundColor: "var(--divider-line)" }} />
        </div>
        <FancyButton onClick={onPlayVsBot} variant="tertiary">
          🤖 Play vs Bot
        </FancyButton>
      </>
    )}
  </div>

  {/* Player Info Badge */}
  <div
    className="px-6 py-3 text-center w-full"
    style={{
      backgroundColor: "#352A91",
      border: "1px solid #6B60D6",
      borderRadius: "16px",
    }}
  >
    <p
      className="uppercase mb-1"
      style={{
        color: "rgba(255,255,255,0.7)",
        fontSize: "12px",
        fontFamily: "'Goldman Sans', sans-serif",
        fontWeight: 700,
        letterSpacing: "-0.64px",
        margin: 0,
      }}
    >
      You are: <strong style={{ color: "#FFFFFF" }}>Player {playerNumber}</strong>
    </p>
    <div className="flex items-center justify-center gap-2">
      <span style={{ fontSize: "16px", color: "#FFFFFF", fontFamily: "'Goldman Sans', sans-serif" }}>
        {playerSuit}
      </span>
    </div>
  </div>

  {/* Cancel */}
  <button
    onClick={onCancel}
    style={{
      background: "none",
      border: "none",
      cursor: "pointer",
      fontFamily: "'Goldman Sans', sans-serif",
      fontWeight: 700,
      fontSize: "12px",
      color: "#FFFFFF",
      opacity: 0.6,
      textTransform: "uppercase",
      letterSpacing: "0.6px",
      textShadow: "-1px -1px 0 #3B3B3B, 1px -1px 0 #3B3B3B, -1px 1px 0 #3B3B3B, 1px 1px 0 #3B3B3B",
    }}
  >
    Cancel Game
  </button>

</motion.div>
        {/* HOW TO PLAY button — outside card, bottom center */}
        <div
          className="flex justify-center w-full"
          style={{ marginTop: "24px" }}
        >
          <div
            className="relative"
            style={{
              width: "407px",
              height: "48px",
              border: "1.5px solid #000000",
              borderRadius: "7px",
              cursor: "pointer",
            }}
            onClick={() => setShowHowToPlay(true)}
          >
            {/* ButtonBase */}
            <div className="absolute inset-0" style={{ background: "var(--btn-secondary-base)", borderRadius: "7px" }} />
            {/* ButtonMid */}
            <div className="absolute" style={{ left: "1px", right: "1px", top: "1px", bottom: "4px", background: "var(--btn-secondary-mid)", borderRadius: "7px" }} />
            {/* Shine */}
            <div className="absolute" style={{ left: "4px", right: "4px", top: "4px", bottom: "7px", background: "var(--btn-secondary-shine)", filter: "blur(0.25px)", borderRadius: "3px" }} />
            {/* Border */}
            <div className="absolute inset-0" style={{ border: "1.5px solid #000000", borderRadius: "7px" }} />
            {/* Title */}
            <div
              className="absolute flex items-center justify-center"
              style={{
                left: "7px", right: "7px",
                top: "calc(50% - 13px)",
                height: "26px",
                fontFamily: "'Goldman Sans', sans-serif",
                fontWeight: 900,
                fontSize: "14px",
                lineHeight: "17px",
                letterSpacing: "-0.02em",
                textTransform: "uppercase",
                color: "var(--foreground)",
                textShadow: "-1px -1px 0 #3B3B3B, 1px -1px 0 #3B3B3B, -1px 1px 0 #3B3B3B, 1px 1px 0 #3B3B3B, 0px 0.7px 1px rgba(0,0,0,0.8), 0px 0.5px 0px #000000",
              }}
            >
              HOW TO PLAY?
            </div>
          </div>
        </div>

        {/* How to Play Modal */}
        <HowToPlay isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
      </div>
    </>
  );
}
