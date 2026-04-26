import { useState, useEffect } from "react";
import { GameLobby } from "./components/GameLobby";
import { WaitingRoom } from "./components/WaitingRoom";
import { GameBoard } from "./components/GameBoard";
import { NameEntry } from "./components/NameEntry";
import { apiFetch } from "./api";

type GameScreen = "lobby" | "name-entry" | "waiting" | "playing";
type PendingAction =
  | { type: "create" }
  | { type: "join"; code: string }
  | { type: "bot" };

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<GameScreen>("lobby");
  const [playerName, setPlayerName] = useState<string>("");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [gameCode, setGameCode] = useState<string>("");
  const [playerNumber, setPlayerNumber] = useState<1 | 2>(1);
  const [opponentJoined, setOpponentJoined] = useState(false);
  const [isBotMode, setIsBotMode] = useState(false);
  const [lobbyError, setLobbyError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

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
              setTimeout(() => setCurrentScreen("playing"), 2000);
            }
          }
        } catch (e) {
          console.error("Polling error", e);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [currentScreen, gameCode, isBotMode, opponentJoined]);

  // ── Lobby action interceptors — store intent, ask for name first ──
  const handleCreateGame = () => {
    setLobbyError(null);
    setPendingAction({ type: "create" });
    setCurrentScreen("name-entry");
  };

  const handleJoinGame = (code: string) => {
    setLobbyError(null);
    setPendingAction({ type: "join", code });
    setCurrentScreen("name-entry");
  };

  const handlePlayVsBot = () => {
    setLobbyError(null);
    setPendingAction({ type: "bot" });
    setCurrentScreen("name-entry");
  };

  // ── After name is entered, execute the stored action ──
  const handleNameContinue = async (name: string) => {
    setPlayerName(name);

    if (!pendingAction) {
      setCurrentScreen("lobby");
      return;
    }

    if (pendingAction.type === "bot") {
      setIsBotMode(true);
      setPlayerNumber(1);
      setCurrentScreen("playing");
      return;
    }

    if (pendingAction.type === "create") {
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
          setCurrentScreen("lobby");
        }
      } catch (e: any) {
        setLobbyError(
          e?.message?.includes("unreachable")
            ? e.message
            : "Could not reach game server. Please try again.",
        );
        setCurrentScreen("lobby");
      } finally {
        setIsCreating(false);
      }
      return;
    }

    if (pendingAction.type === "join") {
      try {
        const res = await apiFetch("/game/join", {
          method: "POST",
          body: JSON.stringify({ gameCode: pendingAction.code }),
        });
        if (res.ok) {
          setGameCode(pendingAction.code);
          setPlayerNumber(2);
          setOpponentJoined(true);
          setIsBotMode(false);
          setCurrentScreen("waiting");
          setTimeout(() => setCurrentScreen("playing"), 2000);
        } else {
          const err = await res.json().catch(() => null);
          setLobbyError(err?.error || "Failed to join game");
          setCurrentScreen("lobby");
        }
      } catch (e) {
        setLobbyError("Could not reach game server. Please try again.");
        setCurrentScreen("lobby");
      }
    }
  };

  const handleCancelGame = () => {
    setCurrentScreen("lobby");
    setGameCode("");
    setOpponentJoined(false);
    setIsBotMode(false);
    setLobbyError(null);
  };

  const handleNewGame = () => {
    setCurrentScreen("lobby");
    setGameCode("");
    setOpponentJoined(false);
    setIsBotMode(false);
    setLobbyError(null);
  };

  return (
    <>
      {currentScreen === "lobby" && (
        <GameLobby
          onCreateGame={handleCreateGame}
          onJoinGame={handleJoinGame}
          onPlayVsBot={handlePlayVsBot}
          error={lobbyError}
          isCreating={isCreating}
        />
      )}

      {currentScreen === "name-entry" && (
        <NameEntry
          onContinue={handleNameContinue}
          onBack={() => setCurrentScreen("lobby")}
          pendingAction={pendingAction?.type ?? "create"}
        />
      )}

      {currentScreen === "waiting" && (
        <WaitingRoom
          gameCode={gameCode}
          playerNumber={playerNumber}
          opponentJoined={opponentJoined}
          onCancel={handleCancelGame}
          onPlayVsBot={() => {
            setIsBotMode(true);
            setPlayerNumber(1);
            setCurrentScreen("playing");
          }}
        />
      )}

      {currentScreen === "playing" && (
        <GameBoard
          gameCode={gameCode}
          playerNumber={playerNumber}
          onNewGame={handleNewGame}
          isBotMode={isBotMode}
          playerName={playerName}
        />
      )}
    </>
  );
}
