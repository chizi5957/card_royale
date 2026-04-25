import { useState } from "react";
import { motion } from "motion/react";
import { FancyButton } from "./FancyButton";
import { HowToPlay } from "./HowToPlay";
import { DatabaseSetupModal } from "./DatabaseSetupModal";

interface GameLobbyProps {
  onCreateGame: () => void;
  onJoinGame: (code: string) => void;
  onPlayVsBot: () => void;
  error?: string | null;
  isCreating?: boolean;
}

const MOBILE_BG = "linear-gradient(180deg, #352A91 0%, #434CAF 33.235%, #4751BC 62.524%, #352A91 90.344%), linear-gradient(180deg, #050313 0%, #18164C 50.952%, #25276B 100%)";

function MobileTitleBar() {
  return (
    <div className="relative w-full flex-none" style={{ height: "85px", overflow: "hidden" }}>
      <div className="absolute inset-0" style={{
        background: "#1e1b4b",
        border: "1px solid #000",
        boxShadow: "0px 2px 4px rgba(0,0,0,0.5), 0px 4px 12px rgba(0,0,0,0.45)",
        clipPath: "polygon(0 0, 100% 0, 100% 80%, 50% 100%, 0 80%)",
      }} />
      <div className="absolute" style={{
        left: 0, right: 0, top: "2px", bottom: "18px",
        background: "linear-gradient(90deg, #635DC2 0%, #9090FB 42%, #635DC2 100%)",
        border: "1px solid #D2BFFF",
        clipPath: "polygon(0 0, 100% 0, 100% 80%, 50% 100%, 0 80%)",
      }} />
      <div className="absolute" style={{
        left: 0, right: 0, top: "2px", bottom: "56px",
        background: "radial-gradient(163% 191% at 50% 191%, rgba(255,255,255,0.078) 34%, rgba(255,255,255,0.3) 100%)",
        mixBlendMode: "hard-light",
        clipPath: "polygon(0 0, 100% 0, 100% 80%, 50% 100%, 0 80%)",
      }} />
      <div className="absolute flex items-center justify-center" style={{ left: "10px", right: "10px", top: "11px", height: "40px" }}>
        <span style={{
          fontFamily: "'Goldman Sans', sans-serif",
          fontWeight: 900,
          fontSize: "24px",
          color: "#fff",
          textShadow: "-1px -1px 0 #3B3B3B, 1px -1px 0 #3B3B3B, -1px 1px 0 #3B3B3B, 1px 1px 0 #3B3B3B, 0px 1.778px 2.54px rgba(0,0,0,0.8)",
          textTransform: "uppercase",
          letterSpacing: "-0.24px",
        }}>
          THE BIDDING WAR
        </span>
      </div>
    </div>
  );
}

export function GameLobby({ onCreateGame, onJoinGame, onPlayVsBot, error, isCreating }: GameLobbyProps) {
  const [gameCode, setGameCode] = useState("");
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showDatabaseSetup, setShowDatabaseSetup] = useState(false);

  // Check if error is database-related
  const isDatabaseError = error && (
    error.includes("kv_store") ||
    error.includes("table") ||
    error.includes("schema cache") ||
    error.includes("does not exist")
  );

  // Auto-show database setup modal on database errors
  if (isDatabaseError && !showDatabaseSetup) {
    setShowDatabaseSetup(true);
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (value.length <= 6) {
      setGameCode(value);
    }
  };

  return (
    <>
      {/* ═══════════════════════════════════════
          MOBILE LAYOUT  (< 640 px)
          ═══════════════════════════════════════ */}
      <div
        className="flex sm:hidden flex-col relative overflow-hidden"
        style={{ minHeight: "100dvh", backgroundImage: MOBILE_BG }}
      >
        <MobileTitleBar />

        {/* Centered content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px 100px" }}>
          {/* Error banner */}
          {error && !isDatabaseError && (
            <div style={{ width: "100%", marginBottom: "16px", padding: "12px", background: "rgba(255,70,70,0.15)", border: "1px solid var(--destructive)", borderRadius: "8px" }}>
              <span style={{ fontFamily: "'Goldman Sans', sans-serif", fontSize: "12px", color: "var(--destructive)", textTransform: "uppercase", display: "block", textAlign: "center" }}>
                {error}
              </span>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "36px", width: "100%" }}>
            {/* CREATE NEW GAME + ENTER CODE+JOIN */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <FancyButton onClick={onCreateGame} variant="primary" width="100%" height="56px" fontSize="16px" disabled={isCreating}>
                {isCreating ? "Creating..." : "Create New Game"}
              </FancyButton>

              <div style={{ display: "flex", gap: "12px", height: "56px" }}>
                <div style={{ flex: 1, background: "#003343", border: "2px solid rgba(0,89,117,0.5)", borderRadius: "8px", padding: "0 16px", display: "flex", alignItems: "center" }}>
                  <input
                    type="text"
                    value={gameCode}
                    onChange={handleCodeChange}
                    placeholder="ENTER CODE"
                    className="w-full bg-transparent border-none outline-none text-center uppercase game-input-placeholder"
                    style={{ fontFamily: "'Goldman Sans', sans-serif", fontWeight: 700, fontSize: "16px", textTransform: "uppercase", color: "var(--foreground)", letterSpacing: "0.32px" }}
                  />
                </div>
                <FancyButton
                  onClick={() => gameCode.length === 6 && onJoinGame(gameCode)}
                  variant="secondary"
                  width="100px"
                  height="56px"
                  fontSize="16px"
                  disabled={gameCode.length !== 6}
                >
                  Join
                </FancyButton>
              </div>
            </div>

            {/* Or divider */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.2)" }} />
              <span style={{ fontFamily: "'Goldman Sans', sans-serif", fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>Or</span>
              <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.2)" }} />
            </div>

            {/* PLAY VS BOT */}
            <FancyButton onClick={onPlayVsBot} variant="tertiary" width="100%" height="56px" fontSize="16px">
              Play vs Bot
            </FancyButton>
          </div>
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
        {/* Main Card Frame — CSS spec: Frame */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative box-border flex flex-col items-center overflow-hidden"
          style={{
            width: "448px",
            padding: "0px 35px 35px",
            gap: "36px",
            background: "var(--game-card-bg)",
            border: "3px solid var(--game-card-border)",
            boxShadow: "var(--elevation-sm)",
            borderRadius: "var(--game-card-radius)",
          }}
        >
          {/* 1. Title Bar — CSS spec: UI-SectionTitle-Primary-FullWidth */}
          <div className="relative w-[449px] h-[85px] flex-none order-0 flex-grow-0 z-0 -mt-[3px]" style={{ margin: "0 -35px" }}>

  {/* TitleBar-Base - V Shape */}
  <div
    className="absolute left-0 right-0 top-0 bottom-[16.47%]"
    style={{
      background: "#1e1b4b",
      border: "1px solid #000000",
      boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.5), 0px 4px 12px rgba(0, 0, 0, 0.45)",
      clipPath: "polygon(0 0, 100% 0, 100% 80%, 50% 100%, 0 80%)"
    }}
  />

  {/* TitleBar-Mid - V Shape */}
  <div
    className="absolute left-0 right-0 top-[2.35%] bottom-[21.18%]"
    style={{
      background: "linear-gradient(90deg, #635DC2 0%, #9090FB 42%, #635DC2 100%)",
      border: "1px solid #D2BFFF",
      clipPath: "polygon(0 0, 100% 0, 100% 80%, 50% 100%, 0 80%)"
    }}
  />

  {/* TitleBar-Shine - V Shape */}
  <div
    className="absolute left-0 right-0 top-[2.35%] bottom-[65.88%]"
    style={{
      background: "radial-gradient(163.49% 190.74% at 50% 190.74%, rgba(255, 255, 255, 0.078) 34%, rgba(255, 255, 255, 0.3) 100%)",
      backgroundBlendMode: "hard-light",
      mixBlendMode: "hard-light",
      clipPath: "polygon(0 0, 100% 0, 100% 80%, 50% 100%, 0 80%)"
    }}
  />

  {/* Mask & Shine - V Shape */}
  <div
    className="absolute left-0 right-0 top-[2.35%] bottom-[21.18%] overflow-hidden"
    style={{
      background: "#635DC2",
      border: "1px solid #8541BD",
      boxSizing: "border-box",
      clipPath: "polygon(0 0, 100% 0, 100% 80%, 50% 100%, 0 80%)"
    }}
  >
    <div
      className="absolute"
      style={{
        background: "#D9D9D9",
        opacity: "0.3",
        left: "-7.21%", right: "-7.21%",
        top: "-15.29%", bottom: "65.88%"
      }}
    />
  </div>

  {/* Card Title */}
  <div
    className="absolute left-[10px] right-[10px] top-[11px] h-[40px] flex items-center justify-center text-center"
    style={{
      fontFamily: "'Goldman Sans', sans-serif",
      fontWeight: 900,
      fontSize: "30px",
      lineHeight: "36px",
      letterSpacing: "-0.02em",
      textTransform: "uppercase",
      fontFeatureSettings: "'pnum' on, 'lnum' on",
      color: "#FFFFFF",
      textShadow: "-1px -1px 0 #3B3B3B, 1px -1px 0 #3B3B3B, -1px 1px 0 #3B3B3B, 1px 1px 0 #3B3B3B, 0px 1.778px 2.54px rgba(0, 0, 0, 0.8), 0px 1px 0px #000000, 0px 1px 0px #000000"
    }}
  >
    THE BIDDING WAR
  </div>

</div>

          {/* Error Banner */}
          {error && (
            <div
              className="px-4 py-3"
              style={{
                width: "378px",
                backgroundColor: error.includes("kv_store") || error.includes("table") || error.includes("schema cache")
                  ? "rgba(255, 164, 3, 0.15)"
                  : "rgba(255, 70, 70, 0.15)",
                border: error.includes("kv_store") || error.includes("table") || error.includes("schema cache")
                  ? "1px solid var(--accent)"
                  : "1px solid var(--destructive)",
                borderRadius: "var(--radius-button)",
              }}
            >
              {(error.includes("kv_store") || error.includes("table") || error.includes("schema cache")) ? (
                <div className="flex flex-col gap-2">
                  <span
                    style={{
                      fontFamily: "'Goldman Sans', sans-serif",
                      fontWeight: "var(--font-weight-medium)" as any,
                      fontSize: "var(--text-label)",
                      color: "var(--accent)",
                      textTransform: "uppercase",
                      textAlign: "center",
                    }}
                  >
                    ⚠️ Database Setup Required
                  </span>
                  <a
                    href="https://supabase.com/dashboard/project/rfdehdikogvisujmduuo/sql/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontFamily: "'Goldman Sans', sans-serif",
                      fontWeight: "var(--font-weight-normal)" as any,
                      fontSize: "10px",
                      color: "rgba(255, 255, 255, 0.8)",
                      textAlign: "center",
                      textDecoration: "underline",
                    }}
                  >
                    Click to open SQL Editor & run setup →
                  </a>
                </div>
              ) : (
                <span
                  style={{
                    fontFamily: "'Goldman Sans', sans-serif",
                    fontWeight: "var(--font-weight-medium)" as any,
                    fontSize: "var(--text-label)",
                    color: "var(--destructive)",
                    textTransform: "uppercase",
                    textAlign: "center",
                    display: "block",
                  }}
                >
                  {error}
                </span>
              )}
            </div>
          )}

          {/* 2. CREATE NEW GAME Button — CSS spec: Section Title - Button (gold/primary) */}
          <FancyButton
            onClick={onCreateGame}
            variant="primary"
            width="378px"
            height="64px"
            fontSize="20px"
            disabled={isCreating}
          >
            {isCreating ? "Creating..." : "Create New Game"}
          </FancyButton>

          {/* 3. Enter Code + JOIN row — CSS spec: Frame 42 */}
          <div
            className="flex flex-row items-start flex-none"
            style={{
              width: "378px",
              height: "64px",
              gap: "16px",
            }}
          >
            {/* Input Container — CSS spec: Container 262px */}
            <div
              className="box-border flex flex-row items-center"
              style={{
                width: "262px",
                height: "64px",
                padding: "16px",
                background: "var(--input-game-bg)",
                border: "2px solid var(--input-game-border)",
                borderRadius: "var(--radius-button)",
                flexGrow: 1,
              }}
            >
              <input
                type="text"
                value={gameCode}
                onChange={handleCodeChange}
                placeholder="ENTER CODE"
                className="w-full bg-transparent border-none outline-none text-center uppercase game-input-placeholder"
                style={{
                  fontFamily: "'Goldman Sans', sans-serif",
                  fontWeight: "var(--font-weight-medium)" as any,
                  fontSize: "16px",
                  lineHeight: "19px",
                  textTransform: "uppercase",
                  color: "var(--foreground)",
                }}
              />
            </div>

            {/* JOIN Button — CSS spec: CardInfoComponent - Button (blue) 100px */}
            <FancyButton
              onClick={() => gameCode.length === 6 && onJoinGame(gameCode)}
              variant="secondary"
              width="100px"
              height="64px"
              fontSize="16px"
              disabled={gameCode.length !== 6}
            >
              Join
            </FancyButton>
          </div>

          {/* 4. "Or" Divider — CSS spec: Container with divider lines */}
          <div
            className="relative flex-none"
            style={{ width: "378px", height: "12px" }}
          >
            {/* Frame 44: two horizontal lines */}
            <div
              className="absolute flex flex-row items-start"
              style={{
                width: "378px",
                height: "18px",
                left: "-2px",
                top: "5.5px",
                gap: "40px",
              }}
            >
              {/* Left line */}
              <div
                className="box-border"
                style={{
                  width: "169px",
                  height: "18px",
                  opacity: 0.2,
                  borderTop: "2px solid var(--divider-line)",
                  borderRadius: "0px",
                  flexGrow: 1,
                }}
              />
              {/* Right line */}
              <div
                className="box-border"
                style={{
                  width: "169px",
                  height: "18px",
                  opacity: 0.2,
                  borderTop: "2px solid var(--divider-line)",
                  borderRadius: "0px",
                  flexGrow: 1,
                }}
              />
            </div>
            {/* "Or" text overlay */}
            <div
              className="absolute flex flex-row justify-center items-start"
              style={{
                width: "378px",
                height: "18px",
                left: "-2px",
                top: "5.5px",
                borderRadius: "0px",
              }}
            >
              <span
                style={{
                  fontFamily: "'Goldman Sans', sans-serif",
                  fontWeight: "var(--font-weight-normal)" as any,
                  fontSize: "12px",
                  lineHeight: "18px",
                  color: "var(--muted-foreground)",
                  position: "relative",
                  top: "-2.5px",
                }}
              >
                Or
              </span>
            </div>
          </div>

          {/* 5. PLAY VS BOT Button — CSS spec: Battle - SettingsButton (tertiary) */}
          <FancyButton
            onClick={onPlayVsBot}
            variant="tertiary"
            width="378px"
            height="64px"
            fontSize="20px"
          >
            Play vs Bot
          </FancyButton>

          {/* 6. Footer text — CSS spec: "Games expires after 30 minutes of inactivity" */}
          <div
            className="relative flex-none self-stretch"
            style={{
              width: "378px",
              height: "15px",
              borderRadius: "0px",
            }}
          >
            <p
              className="text-center"
              style={{
                fontFamily: "'Goldman Sans', sans-serif",
                fontWeight: "var(--font-weight-normal)" as any,
                fontSize: "12px",
                lineHeight: "15px",
                color: "var(--muted-foreground)",
                margin: 0,
              }}
            >
              Games expires after 30 minutes of inactivity
            </p>
          </div>
        </motion.div>

        {/* HOW TO PLAY? Button — CSS spec: CardInfoComponent - Button (blue), outside card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-[52px]"
        >
          <FancyButton
            variant="secondary"
            width="407px"
            height="48px"
            fontSize="14px"
            onClick={() => setShowHowToPlay(true)}
          >
            How to Play?
          </FancyButton>
        </motion.div>

        {/* How to Play Modal */}
        <HowToPlay isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />

        {/* Database Setup Modal */}
        <DatabaseSetupModal
          isOpen={showDatabaseSetup}
          onClose={() => setShowDatabaseSetup(false)}
          error={error || undefined}
        />
      </div>
    </>
  );
}
