import { useState, useEffect } from "react";
import { GameLobby } from "./components/GameLobby";
import { WaitingRoom } from "./components/WaitingRoom";
import { GameBoard } from "./components/GameBoard";
import { NameEntry } from "./components/NameEntry";
import { apiFetch } from "./api";

type GameScreen = "name-entry" | "lobby" | "waiting" | "playing";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<GameScreen>("name-entry");
  const [playerName, setPlayerName] = useState<string>("");
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

  const handleCreateGame = async () => {
    try {
      setLobbyError(null);
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
      console.error("Error creating game", e);
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
    try {
      setLobbyError(null);
      const res = await apiFetch("/game/join", {
        method: "POST",
        body: JSON.stringify({ gameCode: code }),
      });

      if (res.ok) {
        setGameCode(code);
        setPlayerNumber(2);
        setOpponentJoined(true);
        setIsBotMode(false);
        setCurrentScreen("waiting");
        setTimeout(() => setCurrentScreen("playing"), 2000);
      } else {
        const err = await res.json().catch(() => null);
        setLobbyError(err?.error || "Failed to join game");
      }
    } catch (e) {
      console.error("Error joining game", e);
      setLobbyError("Could not reach game server. Please try again.");
    }
  };

  const handlePlayVsBot = () => {
    setLobbyError(null);
    setIsBotMode(true);
    setPlayerNumber(1);
    setCurrentScreen("playing");
  };

  const handleCancelGame = () => {
    setCurrentScreen("lobby");
    setGameCode("");
    setOpponentJoined(false);
    setIsBotMode(false);
    setLobbyError(null);
  };

  const handleNameContinue = (name: string) => {
    setPlayerName(name);
    setCurrentScreen("lobby");
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
      {currentScreen === "name-entry" && (
        <NameEntry onContinue={handleNameContinue} />
      )}

      {currentScreen === "lobby" && (
        <GameLobby
          onCreateGame={handleCreateGame}
          onJoinGame={handleJoinGame}
          onPlayVsBot={handlePlayVsBot}
          error={lobbyError}
          isCreating={isCreating}
        />
      )}

      {currentScreen === "waiting" && (
        <WaitingRoom
          gameCode={gameCode}
          playerNumber={playerNumber}
          opponentJoined={opponentJoined}
          onCancel={handleCancelGame}
          onPlayVsBot={handlePlayVsBot}
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