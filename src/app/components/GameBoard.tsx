import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { FancyButton } from "./FancyButton";
import { PlayingCard } from "./PlayingCard";
import { CardPile } from "./CardPile";
import { GameOver } from "./GameOver";
import { HowToPlay } from "./HowToPlay";
import { apiFetch } from "../api";
import { BotBrain } from "../botBrain";
import * as gameStorage from "../../lib/gameStorage";
import { syncGameRecord } from "../../lib/gameSync";

interface Card {
  rank: string;
  suit: "hearts" | "diamonds" | "spades" | "clubs";
  value: number;
}

interface GameBoardProps {
  gameCode: string;
  playerNumber: 1 | 2;
  onNewGame: () => void;
  isBotMode?: boolean;
  playerName?: string;
  playerId?: string;
}

const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function generatePlayerDeck(playerNumber: 1 | 2): Card[] {
  const suit = playerNumber === 1 ? "spades" : "clubs";
  return ranks.map((rank, index) => ({
    rank,
    suit,
    value: index + 1,
  }));
}

function generatePrizeDeck(): Card[] {
  const hearts = ranks.map((rank, index) => ({
    rank,
    suit: "hearts" as const,
    value: index + 1,
  }));
  const diamonds = ranks.map((rank, index) => ({
    rank,
    suit: "diamonds" as const,
    value: index + 1,
  }));
  return [...hearts, ...diamonds].sort(() => Math.random() - 0.5);
}

type GamePhase = "select" | "waiting" | "reveal" | "nextRound" | "game_over";

export function GameBoard({ gameCode, playerNumber, onNewGame, isBotMode, playerName, playerId }: GameBoardProps) {
  const [currentRound, setCurrentRound] = useState(1);
  const [phase, setPhase] = useState<GamePhase>("select");

  // Bot mode: generate decks locally. Multiplayer: start empty, filled from server.
  const [playerHand, setPlayerHand] = useState<Card[]>(
    isBotMode ? generatePlayerDeck(playerNumber) : []
  );
  const [opponentHand, setOpponentHand] = useState<Card[]>(
    isBotMode ? generatePlayerDeck(playerNumber === 1 ? 2 : 1) : []
  );

  // Generate prize deck once for bot mode to avoid initialization bugs
  const initialPrizeDeck = isBotMode ? generatePrizeDeck() : [];
  const [prizeDeck, setPrizeDeck] = useState<Card[]>(initialPrizeDeck);
  const [currentPrize, setCurrentPrize] = useState<Card | null>(isBotMode && initialPrizeDeck.length > 0 ? initialPrizeDeck[0] : null);
  const [carriedOverPrizes, setCarriedOverPrizes] = useState<Card[]>([]);

  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [playerPlayedCard, setPlayerPlayedCard] = useState<Card | null>(null);
  const [opponentPlayedCard, setOpponentPlayedCard] = useState<Card | null>(null);

  const [playerWonCards, setPlayerWonCards] = useState<Card[]>([]);
  const [opponentWonCards, setOpponentWonCards] = useState<Card[]>([]);

  const [lastRound, setLastRound] = useState<{
    playerCard: Card;
    opponentCard: Card;
    prize: Card;
    result: "win" | "lose" | "tie";
  } | null>(null);

  const [gameOver, setGameOver] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  // Multiplayer: track whether the first server fetch has returned valid data
  const [serverReady, setServerReady] = useState(isBotMode);
  const reconciled = useRef(false);
  const botBrainRef = useRef<BotBrain>(new BotBrain());
  const handScrollRef = useRef<HTMLDivElement>(null);

  // ── ON GAME START: seed botBrain with player profile + global priors ───────
  useEffect(() => {
    if (!isBotMode) return; // only bot mode uses botBrain
    (async () => {
      try {
        const profilePromise = playerId
          ? Promise.race<import("../../lib/mlTypes").AggregatedPlayerProfile | null>([
              gameStorage.getPlayerProfile(playerId),
              new Promise<null>(r => setTimeout(() => r(null), 200)),
            ])
          : Promise.resolve(null);
        const [profile, priors] = await Promise.all([
          profilePromise,
          gameStorage.getGlobalPriors(),
        ]);
        botBrainRef.current.reset();
        botBrainRef.current.initializeWithGlobalPriors(priors);
        botBrainRef.current.initializeWithProfile(profile);
      } catch {
        // fail silently — game works without priors
      }
    })();
  }, []); // intentionally runs once on mount
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const scrollHand = (direction: "left" | "right") => {
    handScrollRef.current?.scrollBy({ left: direction === "left" ? -160 : 160, behavior: "smooth" });
  };

  const updateScrollArrows = () => {
    const el = handScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  // Multiplayer: immediate initial fetch on mount to get server state ASAP
  useEffect(() => {
    if (isBotMode || !gameCode) return;

    let cancelled = false;
    const fetchInitial = async () => {
      try {
        const res = await apiFetch(`/game/${gameCode}`, {
          headers: { "Content-Type": "application/json" },
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          applyServerState(data);
          setServerReady(true);
        }
      } catch (e) {
        console.error("Initial fetch error", e);
      }
    };
    fetchInitial();
    return () => { cancelled = true; };
  }, [gameCode, isBotMode]);

  // Helper: apply server state to all local state (multiplayer only)
  const applyServerState = (data: any) => {
    setCurrentRound(data.currentRound);
    setCurrentPrize(data.currentPrize);
    setCarriedOverPrizes(data.carriedOverPrizes || []);

    if (playerNumber === 1) {
      setPlayerHand(data.player1Hand);
      setOpponentHand(data.player2Hand);
      setPlayerPlayedCard(data.player1Card);
      setOpponentPlayedCard(data.player2Card);
      setPlayerWonCards(data.player1WonCards);
      setOpponentWonCards(data.player2WonCards);
    } else {
      setPlayerHand(data.player2Hand);
      setOpponentHand(data.player1Hand);
      setPlayerPlayedCard(data.player2Card);
      setOpponentPlayedCard(data.player1Card);
      setPlayerWonCards(data.player2WonCards);
      setOpponentWonCards(data.player1WonCards);
    }

    setPhase(data.phase);
    if (data.status === "finished") setGameOver(true);

    if (data.lastRoundResult) {
      let result: "win" | "lose" | "tie" = "tie";
      if (data.lastRoundResult.winner === playerNumber) result = "win";
      else if (data.lastRoundResult.winner === 0) result = "tie";
      else result = "lose";

      setLastRound({
        playerCard: playerNumber === 1 ? data.lastRoundResult.player1Card : data.lastRoundResult.player2Card,
        opponentCard: playerNumber === 1 ? data.lastRoundResult.player2Card : data.lastRoundResult.player1Card,
        prize: data.lastRoundResult.prize,
        result,
      });
    } else {
      setLastRound(null);
    }
  };

  // Polling for Multiplayer Mode (unchanged interval, but uses shared helper)
  useEffect(() => {
    if (isBotMode) return;
    if (!gameCode) { console.error("Game code is missing"); return; }

    const interval = setInterval(async () => {
      try {
        const url = `/game/${gameCode}`;
        const res = await apiFetch(url, {
          headers: {
            "Content-Type": "application/json",
          }
        });

        if (res.ok) {
          const data = await res.json();
          applyServerState(data);
          if (!serverReady) setServerReady(true);
        } else {
          console.warn("Polling failed with status:", res.status);
        }
      } catch (e) {
        console.error("Polling error", e);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [gameCode, isBotMode, playerNumber, serverReady]);

  // Reconciliation check: 2 seconds after board mounts, verify prize card matches server
  useEffect(() => {
    if (isBotMode || !serverReady || reconciled.current || !gameCode) return;
    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch(`/game/${gameCode}`, {
          headers: { "Content-Type": "application/json" },
        });
        if (res.ok) {
          const data = await res.json();
          // Silently correct any mismatch
          if (
            data.currentPrize &&
            (data.currentPrize.rank !== currentPrize?.rank ||
              data.currentPrize.suit !== currentPrize?.suit)
          ) {
            console.log("Reconciliation: correcting prize card mismatch");
            applyServerState(data);
          }
          reconciled.current = true;
        }
      } catch (e) {
        console.error("Reconciliation check error", e);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [serverReady, isBotMode, gameCode]);

  // Handle Automatic Next Round Transition in Multiplayer
  useEffect(() => {
    if (!isBotMode && phase === "reveal") {
      const timer = setTimeout(async () => {
        try {
          if (!gameCode) return;
          const url = `/game/next-round`;
          await apiFetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ gameCode })
          });
          setSelectedCard(null);
        } catch (e) {
          console.error("Next round error", e);
        }
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [phase, isBotMode, gameCode]);

  const playerScore = playerWonCards.reduce((sum, card) => sum + card.value, 0);
  const opponentScore = opponentWonCards.reduce((sum, card) => sum + card.value, 0);

  const playerSuit = playerNumber === 1 ? "♠ Spades" : "♣ Clubs";
  const opponentSuit = playerNumber === 1 ? "♣ Clubs" : "♠ Spades";

  // Status message logic
  let statusMessage = "Select a card to play";
  let statusColor = "var(--status-turn)";

  if (phase === "reveal") {
    if (lastRound?.result === "win") {
      statusMessage = "You Win This Round!";
      statusColor = "var(--status-win)";
    } else if (lastRound?.result === "lose") {
      statusMessage = isBotMode ? "Bot Wins!" : "Opponent Wins!";
      statusColor = "var(--status-lose)";
    } else {
      statusMessage = "Tie! Card carried over";
      statusColor = "var(--status-tie)";
    }
  } else if (phase === "select") {
    if (playerPlayedCard) {
      statusMessage = "Waiting for opponent...";
      statusColor = "var(--status-waiting)";
    } else if (selectedCard) {
      statusMessage = `Ready to play ${selectedCard.rank}`;
      statusColor = "var(--status-turn)";
    } else {
      statusMessage = "Select a card to play";
      statusColor = "var(--status-turn)";
    }
  } else if (phase === "waiting") {
    statusMessage = "Opponent is thinking...";
    statusColor = "var(--status-waiting)";
  }

  const handleCardSelect = (card: Card) => {
    if (phase === "select" && !playerPlayedCard) {
      setSelectedCard(card);
    }
  };

  const handlePlayCard = async () => {
    if (!selectedCard || phase !== "select") return;

    if (isBotMode) {
      setPlayerHand((prev) => prev.filter((c) => c.rank !== selectedCard.rank));
      setPlayerPlayedCard(selectedCard);

      const randomOpponentCard = botBrainRef.current.selectCard({
        botHand: opponentHand,
        humanCardsRemaining: playerHand,
        currentPrize,
        carriedOverPrizes,
        botScore: opponentScore,
        humanScore: playerScore,
        roundNumber: currentRound,
      });
      setOpponentHand((prev) => prev.filter((c) => c.rank !== randomOpponentCard.rank));
      setOpponentPlayedCard(randomOpponentCard);

      setPhase("waiting");

      const delay = 1200 + Math.random() * 800;
      setTimeout(() => {
        resolveRoundBot(selectedCard, randomOpponentCard);
      }, delay);
    } else {
      setPlayerPlayedCard(selectedCard);
      try {
        if (!gameCode) return;
        await apiFetch(`/game/play`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ gameCode, playerNumber, card: selectedCard })
        });
      } catch (e) {
        console.error("Play error", e);
        setPlayerPlayedCard(null);
      }
    }
  };

  const resolveRoundBot = (playerCard: Card, opponentCard: Card) => {
    setPhase("reveal");

    const prizesAtStake = [currentPrize!, ...carriedOverPrizes];
    const roundPrizeValue = prizesAtStake.reduce((s, c) => s + c.value, 0);
    let result: "win" | "lose" | "tie";

    if (playerCard.value > opponentCard.value) {
      result = "win";
      setPlayerWonCards((prev) => [...prev, ...prizesAtStake]);
      setCarriedOverPrizes([]);
    } else if (playerCard.value < opponentCard.value) {
      result = "lose";
      setOpponentWonCards((prev) => [...prev, ...prizesAtStake]);
      setCarriedOverPrizes([]);
    } else {
      result = "tie";
      setCarriedOverPrizes(prizesAtStake);
    }

    botBrainRef.current.recordRound({
      round: currentRound,
      prizeValue: roundPrizeValue,
      botBid: opponentCard,
      humanBid: playerCard,
      result: result === "win" ? "human" : result === "lose" ? "bot" : "tie",
    });

    setLastRound({
      playerCard,
      opponentCard,
      prize: currentPrize!,
      result,
    });

    setTimeout(() => {
      if (currentRound >= 13) {
        setGameOver(true);
        // ── ON GAME OVER: export record, save locally, sync in background ───
        // Accumulate scores inline since state update is async
        const finalPlayerScore = playerWonCards.reduce((s, c) => s + c.value, 0)
          + (result === "win" ? prizesAtStake.reduce((s, c) => s + c.value, 0) : 0);
        const finalBotScore = opponentWonCards.reduce((s, c) => s + c.value, 0)
          + (result === "lose" ? prizesAtStake.reduce((s, c) => s + c.value, 0) : 0);
        const outcome =
          result === "win" ? "player_win" as const
          : result === "lose" ? "bot_win" as const
          : "tie" as const;
        const pid = playerId || "anonymous";
        try {
          const record = botBrainRef.current.exportGameRecord(pid, outcome, finalBotScore, finalPlayerScore);
          gameStorage.saveGameRecord(record).catch(() => {}); // local first
          syncGameRecord(record); // background — no await
        } catch {
          // fail silently
        }
      } else {
        nextRoundBot();
      }
    }, 3000);
  };

  const nextRoundBot = () => {
    const newRound = currentRound + 1;
    setCurrentRound(newRound);
    setCurrentPrize(prizeDeck[newRound - 1]);
    setSelectedCard(null);
    setPlayerPlayedCard(null);
    setOpponentPlayedCard(null);
    setPhase("select");
  };

  // Gate the game board render until server data is confirmed (multiplayer only)
  // gameOver must bypass the gate — at game end currentPrize=null and hand is empty
  const readyToRender =
    isBotMode ||
    gameOver ||
    (serverReady && currentPrize !== null && playerHand.length > 0);

  if (!readyToRender) {
    return (
      <div
        className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden"
        style={{ background: "var(--game-bg)" }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative box-border flex flex-col items-center overflow-hidden"
          style={{
            width: "448px",
            padding: "60px 35px",
            gap: "24px",
            background: "var(--game-card-bg)",
            border: "3px solid var(--game-card-border)",
            boxShadow: "var(--elevation-sm)",
            borderRadius: "var(--game-card-radius)",
          }}
        >
          {/* Spinner */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              borderTop: "3px solid var(--status-waiting)",
              borderRight: "3px solid transparent",
              borderBottom: "3px solid var(--status-waiting)",
              borderLeft: "3px solid transparent",
            }}
          />
          <h2
            className="uppercase tracking-wide text-center"
            style={{
              color: "var(--foreground)",
              fontSize: "var(--text-h3)",
              fontFamily: "'Goldman Sans', sans-serif",
              fontWeight: "var(--font-weight-black)" as any,
              textShadow:
                "-1px -1px 0 #3B3B3B, 1px -1px 0 #3B3B3B, -1px 1px 0 #3B3B3B, 1px 1px 0 #3B3B3B, 0px 2px 4px rgba(0,0,0,0.5)",
              margin: 0,
            }}
          >
            Setting Up The Battlefield...
          </h2>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center overflow-hidden game-root-mobile"
      style={{ background: "var(--game-bg)" }}
    >
      {/* Header Bar */}
      <div
        className="w-full px-3 sm:px-4 flex items-center relative z-10"
        style={{
          height: "52px",
          background: "linear-gradient(90deg, var(--titlebar-base-bg) 0%, rgba(53, 42, 145, 0.7) 50%, var(--titlebar-base-bg) 100%)",
          borderBottom: "1px solid var(--game-card-border)",
          backdropFilter: "blur(10px)",
          boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.4)",
        }}
      >
        {/* Left — Round pill */}
        <div
          className="px-3 py-1 shrink-0"
          style={{
            backgroundColor: "rgba(53, 42, 145, 0.8)",
            border: "1px solid var(--game-card-border)",
            borderRadius: "20px",
          }}
        >
          <span
            className="whitespace-nowrap"
            style={{
              fontFamily: "'Goldman Sans', sans-serif",
              fontWeight: "var(--font-weight-medium)" as any,
              fontSize: "14px",
              color: "var(--foreground)",
              textShadow: "-1px -1px 0 #3B3B3B, 1px -1px 0 #3B3B3B, -1px 1px 0 #3B3B3B, 1px 1px 0 #3B3B3B",
            }}
          >
            Round {currentRound} / 13
          </span>
        </div>

        {/* Center — absolutely positioned VS Bot / Status (always centred) */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
          {/* Mobile: VS Bot pill (or Connected) */}
          <div className="sm:hidden">
            {isBotMode ? (
              <div
                className="flex items-center gap-2 px-3 py-1"
                style={{
                  backgroundColor: "rgba(255, 164, 3, 0.1)",
                  border: "1px solid rgba(255, 164, 3, 0.3)",
                  borderRadius: "20px",
                }}
              >
                <span style={{ fontSize: "14px" }}>🤖</span>
                <span
                  className="uppercase"
                  style={{
                    fontFamily: "'Goldman Sans', sans-serif",
                    fontWeight: "var(--font-weight-medium)" as any,
                    fontSize: "12px",
                    color: "var(--status-waiting)",
                  }}
                >
                  vs Bot
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: "var(--status-win)", boxShadow: "0 0 8px rgba(79, 234, 79, 0.5)" }}
                />
                <span
                  className="uppercase opacity-60"
                  style={{ fontFamily: "'Goldman Sans', sans-serif", fontWeight: "var(--font-weight-medium)" as any, fontSize: "12px", color: "var(--foreground)" }}
                >
                  Connected
                </span>
              </div>
            )}
          </div>

          {/* Desktop: Status Banner */}
          <div className="hidden sm:flex items-center">
            <motion.div
              key={statusMessage}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative px-8 py-2 text-center overflow-hidden mobile-status-pill"
              style={{ borderRadius: "var(--radius-button)", border: "1.5px solid var(--border)" }}
            >
              <div className="absolute inset-0" style={{ background: statusColor, borderRadius: "var(--radius-button)" }} />
              <div className="absolute left-[1px] right-[1px] top-[1px] bottom-[3px]" style={{ background: statusColor, borderRadius: "var(--radius-button)", opacity: 0.9 }} />
              <div className="absolute left-[3px] right-[3px] top-[3px] bottom-[5px] blur-[0.25px]" style={{ background: statusColor, borderRadius: "3px", opacity: 0.8 }} />
              <h3
                className="relative z-10 uppercase tracking-wide flex items-center justify-center gap-2 whitespace-nowrap"
                style={{
                  color: "var(--foreground)",
                  fontSize: "var(--text-base)",
                  fontFamily: "'Goldman Sans', sans-serif",
                  fontWeight: "var(--font-weight-black)" as any,
                  textShadow: "-1px -1px 0 #3B3B3B, 1px -1px 0 #3B3B3B, -1px 1px 0 #3B3B3B, 1px 1px 0 #3B3B3B, 0 1px 2px rgba(0,0,0,0.3)",
                }}
              >
                {(phase === "waiting" || (phase === "select" && playerPlayedCard)) && (
                  <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="inline-block">⏳</motion.span>
                )}
                {statusMessage}
              </h3>
            </motion.div>
          </div>
        </div>

        {/* Right — How to Play (desktop) + New Game */}
        <div className="ml-auto flex items-center gap-3 shrink-0">
          <div className="hidden sm:block">
            <FancyButton onClick={() => setShowHowToPlay(true)} variant="secondary" height="32px" width="120px" fontSize="12px">
              How to Play?
            </FancyButton>
          </div>
          <FancyButton onClick={onNewGame} variant="tertiary" height="32px" width="100px" fontSize="10px">
            New Game
          </FancyButton>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 w-full max-w-[1400px] p-2 md:p-4 flex flex-col lg:flex-row gap-3 md:gap-6 overflow-hidden game-main-mobile">
        {/* Left Sidebar - Opponent Info */}
        <div className="hidden sm:flex w-full md:w-[250px] lg:w-[250px] xl:w-[314px] space-y-2 md:space-y-4 flex-col justify-start">
          <CardPile cards={opponentWonCards} label={`${isBotMode ? "Bot" : "Opponent"} (${opponentSuit})`} score={opponentScore} />

          <div
            className="p-4 text-center"
            style={{
              backgroundColor: "rgba(53, 42, 145, 0.3)",
              border: "1px solid var(--game-card-border)",
              borderRadius: "16px",
            }}
          >
            <p
              className="uppercase"
              style={{
                fontFamily: "'Goldman Sans', sans-serif",
                fontWeight: "var(--font-weight-medium)" as any,
                fontSize: "var(--text-label)",
                color: "var(--muted-foreground)",
              }}
            >
              {isBotMode ? "Bot" : "Opponent"} has{" "}
              <strong style={{ color: "var(--foreground)" }}>{opponentHand.length}</strong> cards
            </p>
          </div>
        </div>

        {/* Center - Battle Area */}
        <div className="flex-1 flex flex-col gap-6 game-center-mobile">

          {/* Mobile How to Play — full width, above scores, hidden on sm+ */}
          <div className="sm:hidden w-full shrink-0">
            <FancyButton onClick={() => setShowHowToPlay(true)} variant="secondary" height="36px" width="100%" fontSize="12px">
              How to Play?
            </FancyButton>
          </div>

          {/* Mobile Scores Bar — tug-of-war split (hidden on sm+) */}
          {(() => {
            const total = opponentScore + playerScore;
            const botPct = total > 0
              ? Math.max(10, Math.min(90, (opponentScore / total) * 100))
              : 50;
            return (
              <div
                className="sm:hidden flex shrink-0 overflow-hidden"
                style={{
                  height: "68px",
                  borderRadius: "12px",
                  background: "rgba(8, 6, 28, 0.85)",
                  border: "1px solid var(--game-card-border)",
                }}
              >
                {/* Left — Bot */}
                <div
                  className="flex flex-col justify-center overflow-hidden"
                  style={{
                    width: `${botPct}%`,
                    background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)",
                    padding: "10px 12px",
                    transition: "width 0.4s ease",
                    minWidth: "52px",
                  }}
                >
                  <span style={{ fontFamily: "'Goldman Sans', sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.55)", lineHeight: 1, whiteSpace: "nowrap" }}>
                    {isBotMode ? "Bot" : "Opp"} {playerNumber === 1 ? "♣" : "♠"}
                  </span>
                  <span style={{ fontFamily: "'Goldman Sans', sans-serif", fontSize: "22px", fontWeight: 700, color: "#fff", lineHeight: 1.15 }}>
                    {opponentScore}
                  </span>
                </div>
                {/* Divider */}
                <div style={{ width: "4px", flexShrink: 0, background: "rgba(8, 6, 28, 0.9)" }} />
                {/* Right — You */}
                <div
                  className="flex flex-col justify-center items-end overflow-hidden"
                  style={{
                    flex: 1,
                    background: "linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)",
                    padding: "10px 12px",
                    transition: "width 0.4s ease",
                    minWidth: "52px",
                  }}
                >
                  <span style={{ fontFamily: "'Goldman Sans', sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.55)", lineHeight: 1, whiteSpace: "nowrap" }}>
                    You {playerNumber === 1 ? "♠" : "♣"}
                  </span>
                  <span style={{ fontFamily: "'Goldman Sans', sans-serif", fontSize: "22px", fontWeight: 700, color: "#fff", lineHeight: 1.15 }}>
                    {playerScore}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Battle Cards Area */}
          <div
            className="flex-1 flex flex-col justify-start sm:justify-center items-center relative battle-zone-mobile"
            style={{
              padding: "16px 12px",
              background: "var(--battle-area-bg)",
              border: "3px solid var(--battle-area-border)",
              borderRadius: "24px",
              boxShadow: "inset 0 0 60px rgba(0, 0, 0, 0.5)",
            }}
          >
            {/* Status pill pinned to top of arena — mobile only */}
            <div className="sm:hidden flex justify-center w-full mb-2 shrink-0">
              <div
                className="mobile-status-pill-standalone flex items-center gap-1 px-3"
                style={{
                  height: "26px",
                  borderRadius: "13px",
                  background: statusColor,
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                {(phase === "waiting" || (phase === "select" && playerPlayedCard)) && (
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="inline-block"
                    style={{ fontSize: "11px" }}
                  >
                    ⏳
                  </motion.span>
                )}
                <span
                  className="uppercase"
                  style={{
                    fontFamily: "'Goldman Sans', sans-serif",
                    fontWeight: "var(--font-weight-medium)" as any,
                    fontSize: "12px",
                    color: "var(--foreground)",
                    whiteSpace: "nowrap",
                    letterSpacing: "0.03em",
                    textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                  }}
                >
                  {statusMessage}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 md:gap-8 items-start justify-items-center w-full max-w-[800px] mb-1 sm:mb-4 md:mb-8">
              {/* Opponent's Card */}
              <div className="text-center flex flex-col items-center">
                <label
                  className="block mb-4 uppercase opacity-50 battle-label-side"
                  style={{
                    fontFamily: "'Goldman Sans', sans-serif",
                    fontWeight: "var(--font-weight-medium)" as any,
                    fontSize: "var(--text-label)",
                    color: "var(--foreground)",
                  }}
                >
                  {isBotMode ? "Bot" : "Opponent"}
                </label>
                {phase === "reveal" && opponentPlayedCard ? (
                  <motion.div initial={{ rotateY: 90 }} animate={{ rotateY: 0 }} transition={{ duration: 0.4 }}>
                    <PlayingCard rank={opponentPlayedCard.rank} suit={opponentPlayedCard.suit} size="medium" className="!h-[124px] sm:!h-[130px]" />
                  </motion.div>
                ) : phase === "waiting" || (phase === "select" && opponentPlayedCard) ? (
                  /* Bot/Opponent hidden card — orange/indigo */
                  <div
                    className="w-[90px] h-[124px] sm:h-[130px] flex flex-col items-center justify-center gap-1"
                    style={{
                      background: "linear-gradient(135deg, #1e1b4b, #312e81)",
                      border: "2px solid #F97316",
                      boxShadow: "0px 0px 16px rgba(249,115,22,0.5)",
                      borderRadius: "8px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "32px",
                        color: "#F97316",
                        fontFamily: "'Goldman Sans', sans-serif",
                        fontWeight: "var(--font-weight-black)" as any,
                        lineHeight: 1,
                      }}
                    >
                      ?
                    </span>
                    <span
                      className="uppercase"
                      style={{
                        fontSize: "9px",
                        color: "rgba(255,255,255,0.5)",
                        fontFamily: "'Goldman Sans', sans-serif",
                        fontWeight: "var(--font-weight-medium)" as any,
                      }}
                    >
                      Hidden
                    </span>
                  </div>
                ) : (
                  <PlayingCard rank="" suit="spades" placeholder placeholderText="Waiting" className="!h-[124px] sm:!h-[130px]" />
                )}
              </div>

              {/* Prize Card */}
              <div className="text-center flex flex-col items-center relative z-10">
                <div className="absolute inset-0 blur-[40px] opacity-20 rounded-full" style={{ backgroundColor: "var(--status-waiting)" }} />
                <label
                  className="block mb-4 uppercase tracking-widest battle-label-prize"
                  style={{
                    fontFamily: "'Goldman Sans', sans-serif",
                    fontWeight: "var(--font-weight-black)" as any,
                    fontSize: "14px",
                    color: "var(--status-waiting)",
                  }}
                >
                  <span className="sm:hidden">Prize</span>
                  <span className="hidden sm:inline">Prize Card</span>
                </label>
                <div className="relative" style={{ transform: "scale(0.85)" }}>
                  {/* Carried-over card behind (only when tie carry-over exists) */}
                  {carriedOverPrizes.length > 0 && (
                    <div
                      className="absolute"
                      style={{
                        left: "-8px",
                        top: "-8px",
                        transform: "rotate(-6deg)",
                        opacity: 0.85,
                        zIndex: 0,
                      }}
                    >
                      <PlayingCard
                        rank={carriedOverPrizes[carriedOverPrizes.length - 1].rank}
                        suit={carriedOverPrizes[carriedOverPrizes.length - 1].suit}
                        size="large"
                        className="!h-[124px] sm:!h-[170px]"
                      />
                    </div>
                  )}
                  {/* Current prize card on top */}
                  <div className="relative" style={{ zIndex: 1 }}>
                    {currentPrize && <PlayingCard rank={currentPrize.rank} suit={currentPrize.suit} size="large" selected={true} className="!h-[124px] sm:!h-[170px]" />}
                  </div>
                  {/* Carry-over badge */}
                  {carriedOverPrizes.length > 0 && (
                    <div
                      className="absolute flex items-center justify-center"
                      style={{
                        bottom: "-8px",
                        right: "-8px",
                        zIndex: 2,
                        backgroundColor: "#F97316",
                        borderRadius: "4px",
                        padding: "2px 6px",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'Goldman Sans', sans-serif",
                          fontWeight: "var(--font-weight-medium)" as any,
                          fontSize: "var(--text-micro)",
                          color: "var(--foreground)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {carriedOverPrizes.length + 1} CARDS
                      </span>
                    </div>
                  )}
                </div>
                {/* Prize point value — mobile only */}
                {currentPrize && (
                  <div className="sm:hidden mt-1 text-center">
                    <span style={{ fontFamily: "'Goldman Sans', sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.45)", letterSpacing: "0.04em" }}>
                      {currentPrize.value} {currentPrize.value === 1 ? "pt" : "pts"}
                    </span>
                  </div>
                )}

                {carriedOverPrizes.length > 0 && (
                  <p
                    className="uppercase mt-4"
                    style={{
                      fontFamily: "'Goldman Sans', sans-serif",
                      fontWeight: "var(--font-weight-medium)" as any,
                      fontSize: "13px",
                      color: "var(--status-waiting)",
                    }}
                  >
                    +{carriedOverPrizes.length} carried (Total: {[currentPrize, ...carriedOverPrizes].reduce((sum, c) => sum + c!.value, 0)})
                  </p>
                )}
              </div>

              {/* Player's Card */}
              <div className="text-center flex flex-col items-center">
                <label
                  className="block mb-4 uppercase opacity-50 battle-label-side"
                  style={{
                    fontFamily: "'Goldman Sans', sans-serif",
                    fontWeight: "var(--font-weight-medium)" as any,
                    fontSize: "var(--text-label)",
                    color: "var(--foreground)",
                  }}
                >
                  You
                </label>
                {phase === "reveal" && playerPlayedCard ? (
                  <PlayingCard rank={playerPlayedCard.rank} suit={playerPlayedCard.suit} size="medium" className="!h-[124px] sm:!h-[130px]" />
                ) : playerPlayedCard ? (
                  /* Player locked-in card — green */
                  <div
                    className="w-[90px] h-[124px] sm:h-[130px] flex flex-col items-center justify-center gap-1"
                    style={{
                      background: "linear-gradient(135deg, #1a472a, #22543d)",
                      border: "2px solid #22C55E",
                      boxShadow: "0px 0px 16px rgba(34,197,94,0.6)",
                      borderRadius: "8px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "32px",
                        color: "#22C55E",
                        fontFamily: "'Goldman Sans', sans-serif",
                        fontWeight: "var(--font-weight-black)" as any,
                        lineHeight: 1,
                      }}
                    >
                      ✓
                    </span>
                    <span
                      className="uppercase"
                      style={{
                        fontSize: "9px",
                        color: "rgba(255,255,255,0.5)",
                        fontFamily: "'Goldman Sans', sans-serif",
                        fontWeight: "var(--font-weight-medium)" as any,
                      }}
                    >
                      Locked In
                    </span>
                  </div>
                ) : selectedCard ? (
                  <PlayingCard rank={selectedCard.rank} suit={selectedCard.suit} size="medium" selected className="!h-[124px] sm:!h-[130px]" />
                ) : (
                  <PlayingCard rank="" suit="spades" placeholder placeholderText="Select" className="!h-[124px] sm:!h-[130px]" />
                )}
              </div>
            </div>

            {/* Mobile Last Round — compact bar pinned to bottom of battle zone (sm:hidden) */}
            {lastRound && (
              <div
                className="sm:hidden absolute bottom-0 left-0 right-0 flex items-center justify-between px-4"
                style={{
                  height: "48px",
                  backgroundColor: "rgba(0, 51, 67, 0.75)",
                  borderTop: "1px solid var(--input-game-border)",
                  borderRadius: "0 0 21px 21px",
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="uppercase opacity-50"
                    style={{ fontFamily: "'Goldman Sans', sans-serif", fontSize: "10px", color: "var(--foreground)" }}
                  >
                    Last:
                  </span>
                  <span style={{ fontFamily: "'Goldman Sans', sans-serif", fontSize: "13px", color: "var(--foreground)" }}>
                    {({"hearts":"♥","diamonds":"♦","spades":"♠","clubs":"♣"} as Record<string,string>)[lastRound.opponentCard.suit]}{lastRound.opponentCard.rank}
                  </span>
                  <span style={{ fontFamily: "'Goldman Sans', sans-serif", fontSize: "11px", color: "var(--status-waiting)", fontWeight: "bold" }}>
                    vs
                  </span>
                  <span style={{ fontFamily: "'Goldman Sans', sans-serif", fontSize: "13px", color: "var(--foreground)" }}>
                    {({"hearts":"♥","diamonds":"♦","spades":"♠","clubs":"♣"} as Record<string,string>)[lastRound.playerCard.suit]}{lastRound.playerCard.rank}
                  </span>
                </div>
                <div
                  className="px-3 py-1"
                  style={{
                    backgroundColor:
                      lastRound.result === "win" ? "rgba(79, 234, 79, 0.2)"
                      : lastRound.result === "lose" ? "rgba(255, 70, 70, 0.2)"
                      : "rgba(160, 160, 160, 0.2)",
                    border:
                      lastRound.result === "win" ? "1px solid var(--status-win)"
                      : lastRound.result === "lose" ? "1px solid var(--status-lose)"
                      : "1px solid var(--status-tie)",
                    borderRadius: "20px",
                  }}
                >
                  <span
                    className="uppercase"
                    style={{
                      fontFamily: "'Goldman Sans', sans-serif",
                      fontWeight: "var(--font-weight-medium)" as any,
                      fontSize: "10px",
                      color:
                        lastRound.result === "win" ? "var(--status-win)"
                        : lastRound.result === "lose" ? "var(--status-lose)"
                        : "var(--status-tie)",
                    }}
                  >
                    {lastRound.result === "win" ? "You Won" : lastRound.result === "lose" ? "You Lost" : "Tie"}
                  </span>
                </div>
              </div>
            )}

            {/* Confirm Actions — desktop only; mobile CTA lives below the hand */}
            <div className="h-[60px] hidden sm:flex items-center justify-center">
              {selectedCard && !playerPlayedCard && phase === "select" && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4">
                  <FancyButton onClick={handlePlayCard} variant="primary" width="240px">
                    Play {selectedCard.rank} of {selectedCard.suit}
                  </FancyButton>
                  <FancyButton onClick={() => setSelectedCard(null)} variant="tertiary" width="140px">
                    Change
                  </FancyButton>
                </motion.div>
              )}
              {playerPlayedCard && phase === "select" && (
                <div
                  className="text-center uppercase opacity-60"
                  style={{
                    fontFamily: "'Goldman Sans', sans-serif",
                    fontWeight: "var(--font-weight-medium)" as any,
                    fontSize: "14px",
                    color: "var(--foreground)",
                    textShadow: "-1px -1px 0 #3B3B3B, 1px -1px 0 #3B3B3B, -1px 1px 0 #3B3B3B, 1px 1px 0 #3B3B3B",
                  }}
                >
                  Waiting for opponent...
                </div>
              )}
            </div>
          </div>

          {/* Last Round Display */}
          {lastRound && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 hidden sm:flex justify-center items-center gap-6"
              style={{
                backgroundColor: "rgba(0, 51, 67, 0.5)",
                border: "1px solid var(--input-game-border)",
                borderRadius: "16px",
              }}
            >
              <span
                className="uppercase opacity-60"
                style={{
                  fontFamily: "'Goldman Sans', sans-serif",
                  fontWeight: "var(--font-weight-medium)" as any,
                  fontSize: "var(--text-label)",
                  color: "var(--foreground)",
                }}
              >
                Last Round:
              </span>
              <div className="flex items-center gap-3">
                <span className="text-[12px] opacity-60" style={{ color: "var(--foreground)" }}>Opp</span>
                <PlayingCard rank={lastRound.opponentCard.rank} suit={lastRound.opponentCard.suit} size="small" />
                <span
                  className="text-[16px]"
                  style={{
                    fontFamily: "'Goldman Sans', sans-serif",
                    fontWeight: "var(--font-weight-black)" as any,
                    color: "var(--status-waiting)",
                    textShadow: "-1px -1px 0 #3B3B3B, 1px -1px 0 #3B3B3B, -1px 1px 0 #3B3B3B, 1px 1px 0 #3B3B3B",
                  }}
                >
                  VS
                </span>
                <PlayingCard rank={lastRound.playerCard.rank} suit={lastRound.playerCard.suit} size="small" />
                <span className="text-[12px] opacity-60" style={{ color: "var(--foreground)" }}>You</span>
              </div>
              <div
                className="px-4 py-1"
                style={{
                  backgroundColor:
                    lastRound.result === "win"
                      ? "rgba(79, 234, 79, 0.2)"
                      : lastRound.result === "lose"
                      ? "rgba(255, 70, 70, 0.2)"
                      : "rgba(160, 160, 160, 0.2)",
                  border:
                    lastRound.result === "win"
                      ? "1px solid var(--status-win)"
                      : lastRound.result === "lose"
                      ? "1px solid var(--status-lose)"
                      : "1px solid var(--status-tie)",
                  borderRadius: "20px",
                }}
              >
                <span
                  className="uppercase"
                  style={{
                    fontFamily: "'Goldman Sans', sans-serif",
                    fontWeight: "var(--font-weight-medium)" as any,
                    fontSize: "var(--text-label)",
                    color:
                      lastRound.result === "win"
                        ? "var(--status-win)"
                        : lastRound.result === "lose"
                        ? "var(--status-lose)"
                        : "var(--status-tie)",
                  }}
                >
                  {lastRound.result === "win" ? "You Won" : lastRound.result === "lose" ? "You Lost" : "Tie"}
                </span>
              </div>
            </motion.div>
          )}

          {/* Player Hand */}
          <div
            className="p-3 md:p-6 min-h-[140px] md:min-h-[180px] hand-panel-mobile"
            style={{
              backgroundColor: "rgba(53, 42, 145, 0.2)",
              border: "2px solid var(--game-card-border)",
              borderRadius: "24px",
            }}
          >
            {/* Mobile header: single line "Your hand · N left" */}
            <div className="sm:hidden flex justify-between items-center hand-header-mobile">
              <span style={{ fontFamily: "'Goldman Sans', sans-serif", fontSize: "12px", color: "rgba(255,255,255,0.45)" }}>
                Your hand
              </span>
              <span style={{ fontFamily: "'Goldman Sans', sans-serif", fontSize: "12px", color: "rgba(255,255,255,0.45)" }}>
                {playerHand.length} left
              </span>
            </div>
            {/* Desktop header: original two-element layout */}
            <div className="hidden sm:flex justify-between items-center mb-4">
              <h4
                className="uppercase"
                style={{
                  fontFamily: "'Goldman Sans', sans-serif",
                  fontWeight: "var(--font-weight-medium)" as any,
                  fontSize: "14px",
                  color: "var(--foreground)",
                  textShadow: "-1px -1px 0 #3B3B3B, 1px -1px 0 #3B3B3B, -1px 1px 0 #3B3B3B, 1px 1px 0 #3B3B3B",
                }}
              >
                Your Hand
              </h4>
              <span
                className="uppercase"
                style={{
                  fontFamily: "'Goldman Sans', sans-serif",
                  fontWeight: "var(--font-weight-medium)" as any,
                  fontSize: "var(--text-label)",
                  color: "var(--status-waiting)",
                }}
              >
                {playerHand.length} cards remaining
              </span>
            </div>

            {/* Scroll row with smart chevron buttons */}
            <div className="relative">
              {/* Left chevron — appears when user has scrolled right */}
              {canScrollLeft && (
                <button
                  className="sm:hidden absolute left-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center rounded-full"
                  onClick={() => scrollHand("left")}
                  style={{
                    width: "28px", height: "28px",
                    background: "rgba(53, 42, 145, 0.92)",
                    border: "1px solid var(--game-card-border)",
                    boxShadow: "2px 0 8px rgba(0,0,0,0.5)",
                    color: "var(--foreground)",
                    fontSize: "18px",
                    lineHeight: 1,
                  }}
                >
                  ‹
                </button>
              )}

              <div
                ref={handScrollRef}
                onScroll={updateScrollArrows}
                className="hand-scroll flex flex-wrap gap-1 md:gap-2 justify-center"
              >
                {playerHand.map((card) => (
                  <div key={card.rank} className="relative transition-all duration-200 hover:-translate-y-2 shrink-0">
                    <PlayingCard
                      rank={card.rank}
                      suit={card.suit}
                      size="small"
                      className="hand-card-sm"
                      selected={selectedCard?.rank === card.rank}
                      disabled={phase !== "select" || !!playerPlayedCard}
                      onClick={() => handleCardSelect(card)}
                    />
                  </div>
                ))}
              </div>

              {/* Right chevron — visible until user scrolls to end */}
              {canScrollRight && (
                <button
                  className="sm:hidden absolute right-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center rounded-full"
                  onClick={() => scrollHand("right")}
                  style={{
                    width: "28px", height: "28px",
                    background: "rgba(53, 42, 145, 0.92)",
                    border: "1px solid var(--game-card-border)",
                    boxShadow: "-2px 0 8px rgba(0,0,0,0.5)",
                    color: "var(--foreground)",
                    fontSize: "18px",
                    lineHeight: 1,
                  }}
                >
                  ›
                </button>
              )}
            </div>
          </div>

          {/* Mobile CTA — immediately after hand, hidden on desktop */}
          <div className="sm:hidden mobile-cta-row">
            {selectedCard && !playerPlayedCard && phase === "select" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex w-full" style={{ gap: "3%" }}>
                <FancyButton onClick={handlePlayCard} variant="primary" width="65%">
                  Play {selectedCard.rank} of {selectedCard.suit}
                </FancyButton>
                <FancyButton onClick={() => setSelectedCard(null)} variant="tertiary" width="32%">
                  Change
                </FancyButton>
              </motion.div>
            )}
            {playerPlayedCard && phase === "select" && (
              <div
                className="text-center uppercase opacity-60"
                style={{
                  fontFamily: "'Goldman Sans', sans-serif",
                  fontWeight: "var(--font-weight-medium)" as any,
                  fontSize: "13px",
                  color: "var(--foreground)",
                  textShadow: "-1px -1px 0 #3B3B3B, 1px -1px 0 #3B3B3B, -1px 1px 0 #3B3B3B, 1px 1px 0 #3B3B3B",
                }}
              >
                Waiting for opponent...
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Player Info */}
        <div className="hidden sm:flex w-full md:w-[250px] lg:w-[250px] xl:w-[314px] flex-col justify-start">
          <CardPile cards={playerWonCards} label={`You (${playerSuit})`} score={playerScore} />
        </div>
      </div>

      {/* Game Over Modal */}
      {gameOver && (
        <GameOver
          playerScore={playerScore}
          opponentScore={opponentScore}
          playerNumber={playerNumber}
          onNewGame={onNewGame}
          isBotMode={isBotMode}
          playerName={playerName}
        />
      )}

      {/* How To Play Modal */}
      <HowToPlay isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
    </div>
  );
}