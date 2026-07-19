// ╔════════════════════════════════════════════════════════════════════╗
// ║  APP — the traffic controller                                       ║
// ║                                                                      ║
// ║  Decides which screen is showing. The journey is:                   ║
// ║                                                                      ║
// ║   welcome ──► home ──► (waiting) ──► playing                        ║
// ║   (first     (menu)    (only for     (GameBoard)                    ║
// ║    run only)            friend games)                               ║
// ║                                                                      ║
// ║  Your name is asked ONCE, on first launch, and saved on the device. ║
// ║  After that the app opens straight onto the home screen.            ║
// ║  "Play vs Bot" starts instantly — no extra steps.                   ║
// ╚════════════════════════════════════════════════════════════════════╝
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { GameLobby } from "./components/GameLobby";
import { WaitingRoom } from "./components/WaitingRoom";
import { GameBoard } from "./components/GameBoard";
import { NameEntry } from "./components/NameEntry";
import { apiFetch } from "./api";
import * as gameStorage from "../lib/gameStorage";
import { getOrCreatePlayerId } from "../lib/playerIdentity";
import { retryFailedSyncs, refreshGlobalPriors } from "../lib/gameSync";

type GameScreen = "welcome" | "home" | "waiting" | "playing";

const NAME_KEY = "cardBattle_playerName";

export default function App() {
  // If a name was saved on a previous visit, skip the welcome screen
  const savedName = (() => {
    try { return localStorage.getItem(NAME_KEY) ?? ""; } catch { return ""; }
  })();

  const [currentScreen, setCurrentScreen] = useState<GameScreen>(savedName ? "home" : "welcome");
  const [playerName, setPlayerName] = useState<string>(savedName);
  const [playerId, setPlayerId] = useState<string>("");
  const [gameCode, setGameCode] = useState<string>("");
  const [playerNumber, setPlayerNumber] = useState<1 | 2>(1);
  const [opponentJoined, setOpponentJoined] = useState(false);
  const [isBotMode, setIsBotMode] = useState(false);
  const [lobbyError, setLobbyError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  // Bumping this key remounts GameBoard — used for instant bot rematches
  const [gameKey, setGameKey] = useState(0);

  // ── ON APP LOAD: init storage, establish identity, background syncs ────────
  useEffect(() => {
    (async () => {
      await gameStorage.init();
      const id = await getOrCreatePlayerId();
      setPlayerId(id);
      retryFailedSyncs();      // fire and forget
      refreshGlobalPriors();   // fire and forget
    })();
  }, []);

  // Poll for opponent in waiting room
  useEffect(() => {
    let interval: number;
    if (currentScreen === "waiting" && gameCode && !isBotMode && !opponentJoined) {
      interval = window.setInterval(async () => {
        try {
          const res = await apiFetch(`/game/${gameCode}`, { method: "GET" });
          if (res.ok) {
            const data = await res.json();
            if (data.players && data.players.length === 2) {
              setOpponentJoined(true);
              setTimeout(() => setCurrentScreen("playing"), 1200);
            }
          }
        } catch (e) {
          console.error("Polling error", e);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [currentScreen, gameCode, isBotMode, opponentJoined]);

  // ── First-run welcome: save the name, land on home ──
  const handleWelcomeContinue = (name: string) => {
    setPlayerName(name);
    try { localStorage.setItem(NAME_KEY, name); } catch { /* private mode */ }
    setCurrentScreen("home");
  };

  // Change name later from the home screen
  const handleEditName = () => setCurrentScreen("welcome");

  // ── Home actions ──
  const handlePlayVsBot = () => {
    setLobbyError(null);
    setIsBotMode(true);
    setPlayerNumber(1);
    setGameKey((k) => k + 1);
    setCurrentScreen("playing");
  };

  const handleCreateGame = async () => {
    setLobbyError(null);
    try {
      setIsCreating(true);
      setOpponentJoined(false);
      setIsBotMode(false);
      setPlayerNumber(1);
      const res = await apiFetch("/game/create", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setGameCode(data.gameCode);
        setCurrentScreen("waiting");
      } else {
        const errData = await res.json().catch(() => null);
        setLobbyError(errData?.error || `Server error (${res.status})`);
      }
    } catch (e: any) {
      setLobbyError(
        e?.message?.includes("unreachable")
          ? e.message
          : "Could not reach game server. Please try again.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinGame = async (code: string) => {
    setLobbyError(null);
    try {
      setIsJoining(true);
      const res = await apiFetch("/game/join", {
        method: "POST",
        body: JSON.stringify({ gameCode: code }),
      });
      if (res.ok) {
        setGameCode(code);
        setPlayerNumber(2);
        setOpponentJoined(true);
        setIsBotMode(false);
        setGameKey((k) => k + 1);
        setCurrentScreen("playing");
      } else {
        const err = await res.json().catch(() => null);
        setLobbyError(err?.error || "Failed to join game");
      }
    } catch (e) {
      setLobbyError("Could not reach game server. Please try again.");
    } finally {
      setIsJoining(false);
    }
  };

  const handleCancelGame = () => {
    setCurrentScreen("home");
    setGameCode("");
    setOpponentJoined(false);
    setIsBotMode(false);
    setLobbyError(null);
  };

  const handleNewGame = () => {
    setCurrentScreen("home");
    setGameCode("");
    setOpponentJoined(false);
    setIsBotMode(false);
    setLobbyError(null);
  };

  // Instant rematch vs bot — remount the board, skip all menus
  const handleRematch = () => {
    setGameKey((k) => k + 1);
  };

  // The wrapper's KEY changes per screen — remounting it replays the
  // fade-in, giving a smooth transition without exit-animation plumbing.
  const screenKey =
    currentScreen === "playing" ? `playing-${gameKey}` : currentScreen;

  const screen =
    currentScreen === "welcome" ? (
      <NameEntry onContinue={handleWelcomeContinue} initialName={playerName} />
    ) : currentScreen === "home" ? (
      <GameLobby
        playerName={playerName}
        onEditName={handleEditName}
        onCreateGame={handleCreateGame}
        onJoinGame={handleJoinGame}
        onPlayVsBot={handlePlayVsBot}
        error={lobbyError}
        isCreating={isCreating}
        isJoining={isJoining}
      />
    ) : currentScreen === "waiting" ? (
      <WaitingRoom
        gameCode={gameCode}
        playerNumber={playerNumber}
        opponentJoined={opponentJoined}
        onCancel={handleCancelGame}
        onPlayVsBot={() => {
          setIsBotMode(true);
          setPlayerNumber(1);
          setGameKey((k) => k + 1);
          setCurrentScreen("playing");
        }}
      />
    ) : (
      <GameBoard
        key={gameKey}
        gameCode={gameCode}
        playerNumber={playerNumber}
        onNewGame={handleNewGame}
        onRematch={isBotMode ? handleRematch : undefined}
        isBotMode={isBotMode}
        playerName={playerName}
        playerId={playerId}
      />
    );

  return (
    <motion.div
      key={screenKey}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      {screen}
    </motion.div>
  );
}
