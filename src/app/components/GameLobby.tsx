// ╔════════════════════════════════════════════════════════════════════╗
// ║  HOME — the main menu.                                              ║
// ║                                                                      ║
// ║  Design: ONE clear primary action ("Play vs Bot" — instant), and    ║
// ║  a secondary "Play a Friend" that unfolds into Create / Join        ║
// ║  inline. No separate screens, no wall of options.                   ║
// ║  Greets the player by their saved name ("not you?" to change it).   ║
// ╚════════════════════════════════════════════════════════════════════╝
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FancyButton } from "./FancyButton";
import { HowToPlay } from "./HowToPlay";
import { DatabaseSetupModal } from "./DatabaseSetupModal";
import * as gameStorage from "../../lib/gameStorage";
import type { PlayerStats } from "../../lib/gameStorage";

interface GameLobbyProps {
  playerName: string;
  playerId?: string;
  onEditName: () => void;
  onCreateGame: () => void;
  onJoinGame: (code: string) => void;
  onPlayVsBot: () => void;
  error?: string | null;
  isCreating?: boolean;
  isJoining?: boolean;
}

const BG =
  "linear-gradient(180deg, #352A91 0%, #434CAF 33.235%, #4751BC 62.524%, #352A91 90.344%), linear-gradient(180deg, #050313 0%, #18164C 50.952%, #25276B 100%)";

const stagger = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.08 * i, type: "spring" as const, stiffness: 240, damping: 22 },
});

export function GameLobby({
  playerName,
  playerId,
  onEditName,
  onCreateGame,
  onJoinGame,
  onPlayVsBot,
  error,
  isCreating,
  isJoining,
}: GameLobbyProps) {
  const [friendOpen, setFriendOpen] = useState(false);
  const [gameCode, setGameCode] = useState("");
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showDatabaseSetup, setShowDatabaseSetup] = useState(false);

  // Lifetime record for this browser — proof the game remembers you
  const [stats, setStats] = useState<PlayerStats | null>(null);
  useEffect(() => {
    if (!playerId) return;
    let cancelled = false;
    gameStorage.getPlayerStats(playerId).then((s) => {
      if (!cancelled && s.gamesPlayed > 0) setStats(s);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [playerId]);

  const isDatabaseError =
    error &&
    (error.includes("kv_store") ||
      error.includes("table") ||
      error.includes("schema cache") ||
      error.includes("does not exist"));

  if (isDatabaseError && !showDatabaseSetup) setShowDatabaseSetup(true);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (value.length <= 6) setGameCode(value);
  };

  const codeReady = gameCode.length === 6;

  return (
    <>
      <div
        className="flex flex-col items-center overflow-hidden"
        style={{ minHeight: "100dvh", backgroundImage: BG, padding: "0 24px" }}
      >
        <div
          className="flex flex-col w-full"
          style={{ maxWidth: "420px", flex: 1, justifyContent: "center", gap: "26px", padding: "40px 0" }}
        >
          {/* Greeting */}
          <motion.div {...stagger(0)} style={{ textAlign: "center" }}>
            <p
              style={{
                fontFamily: "'Goldman Sans', sans-serif",
                fontSize: "12px",
                color: "rgba(255,255,255,0.5)",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              Welcome back
            </p>
            <h1
              style={{
                fontFamily: "'Goldman Sans', sans-serif",
                fontWeight: 900,
                fontSize: "34px",
                color: "#fff",
                textTransform: "uppercase",
                letterSpacing: "-0.02em",
                margin: "4px 0 0",
                textShadow:
                  "-1px -1px 0 #3B3B3B,1px -1px 0 #3B3B3B,-1px 1px 0 #3B3B3B,1px 1px 0 #3B3B3B, 0 2px 8px rgba(0,0,0,0.6)",
              }}
            >
              {playerName || "Player"}
            </h1>
            <button
              onClick={onEditName}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "'Goldman Sans', sans-serif",
                fontSize: "10px",
                color: "rgba(255,255,255,0.35)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginTop: "6px",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
                padding: "4px",
              }}
            >
              not you?
            </button>

            {/* Lifetime record — stored in this browser */}
            {stats && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                style={{
                  display: "inline-flex",
                  gap: "14px",
                  marginTop: "12px",
                  padding: "8px 18px",
                  background: "rgba(8, 6, 28, 0.4)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "20px",
                }}
              >
                {[
                  { n: stats.gamesPlayed, label: "Games" },
                  { n: stats.wins, label: "Wins" },
                  { n: stats.losses, label: "Losses" },
                ].map((s) => (
                  <span key={s.label} style={{ fontFamily: "'Goldman Sans', sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.55)", letterSpacing: "0.06em" }}>
                    <strong style={{ color: "#FFC400", fontSize: "13px" }}>{s.n}</strong>{" "}
                    {s.label.toUpperCase()}
                  </span>
                ))}
              </motion.div>
            )}
            {stats && stats.botGames >= 3 && (
              <p style={{ fontFamily: "'Goldman Sans', sans-serif", fontSize: "9px", color: "rgba(255,196,0,0.55)", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: "8px" }}>
                ⚠ The bot has studied your last {stats.botGames} games
              </p>
            )}
          </motion.div>

          {/* Error banner */}
          <AnimatePresence>
            {error && !isDatabaseError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: "hidden" }}
              >
                <div
                  style={{
                    padding: "12px",
                    background: "rgba(255,70,70,0.15)",
                    border: "1px solid var(--destructive)",
                    borderRadius: "10px",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Goldman Sans', sans-serif",
                      fontSize: "12px",
                      color: "var(--destructive)",
                      textTransform: "uppercase",
                      display: "block",
                      textAlign: "center",
                    }}
                  >
                    {error}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* PRIMARY — instant play */}
          <motion.div {...stagger(1)}>
            <FancyButton onClick={onPlayVsBot} variant="primary" width="100%" height="64px" fontSize="18px">
              ⚡ Play vs Bot
            </FancyButton>
            <p
              style={{
                fontFamily: "'Goldman Sans', sans-serif",
                fontSize: "10px",
                color: "rgba(255,255,255,0.4)",
                textAlign: "center",
                marginTop: "8px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Jump straight in
            </p>
          </motion.div>

          {/* SECONDARY — friend games unfold inline */}
          <motion.div {...stagger(2)}>
            <FancyButton
              onClick={() => setFriendOpen((v) => !v)}
              variant="secondary"
              width="100%"
              height="56px"
              fontSize="15px"
            >
              {friendOpen ? "▴  Play a Friend" : "▾  Play a Friend"}
            </FancyButton>

            <AnimatePresence>
              {friendOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  style={{ overflow: "hidden" }}
                >
                  <div
                    style={{
                      marginTop: "12px",
                      padding: "18px 16px",
                      background: "rgba(8, 6, 28, 0.45)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "14px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "14px",
                    }}
                  >
                    <FancyButton
                      onClick={onCreateGame}
                      variant="tertiary"
                      width="100%"
                      height="52px"
                      fontSize="14px"
                      disabled={isCreating}
                    >
                      {isCreating ? "Creating…" : "Create a Game"}
                    </FancyButton>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.15)" }} />
                      <span
                        style={{
                          fontFamily: "'Goldman Sans', sans-serif",
                          fontSize: "10px",
                          color: "rgba(255,255,255,0.45)",
                          letterSpacing: "0.1em",
                        }}
                      >
                        OR JOIN WITH A CODE
                      </span>
                      <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.15)" }} />
                    </div>

                    <div style={{ display: "flex", gap: "10px", height: "52px" }}>
                      <div
                        style={{
                          flex: 1,
                          background: "#003343",
                          border: codeReady
                            ? "2px solid rgba(79,234,79,0.6)"
                            : "2px solid rgba(0,89,117,0.5)",
                          transition: "border 0.2s ease",
                          borderRadius: "10px",
                          padding: "0 14px",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <input
                          type="text"
                          value={gameCode}
                          onChange={handleCodeChange}
                          onKeyDown={(e) => e.key === "Enter" && codeReady && onJoinGame(gameCode)}
                          placeholder="ENTER CODE"
                          className="w-full bg-transparent border-none outline-none text-center uppercase game-input-placeholder"
                          style={{
                            fontFamily: "'Goldman Sans', sans-serif",
                            fontWeight: 700,
                            fontSize: "16px",
                            textTransform: "uppercase",
                            color: "var(--foreground)",
                            letterSpacing: "0.3em",
                          }}
                        />
                      </div>
                      <motion.div
                        animate={codeReady ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                        transition={codeReady ? { repeat: Infinity, duration: 1.2 } : {}}
                      >
                        <FancyButton
                          onClick={() => codeReady && onJoinGame(gameCode)}
                          variant="secondary"
                          width="90px"
                          height="52px"
                          fontSize="14px"
                          disabled={!codeReady || isJoining}
                        >
                          {isJoining ? "…" : "Join"}
                        </FancyButton>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* How to play — quiet, out of the way */}
          <motion.div {...stagger(3)} style={{ textAlign: "center" }}>
            <button
              onClick={() => setShowHowToPlay(true)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "'Goldman Sans', sans-serif",
                fontSize: "12px",
                color: "rgba(255,255,255,0.55)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                padding: "10px",
                textDecoration: "underline",
                textUnderlineOffset: "4px",
              }}
            >
              How to play?
            </button>
          </motion.div>
        </div>
      </div>

      {/* Modals live outside the layout so they work on all screen sizes */}
      <HowToPlay isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
      <DatabaseSetupModal
        isOpen={showDatabaseSetup}
        onClose={() => setShowDatabaseSetup(false)}
        error={error || undefined}
      />
    </>
  );
}
