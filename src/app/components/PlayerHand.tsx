import { GameCard } from "./GameCard";
import { useState } from "react";

interface Card {
  id: string;
  rank: string;
  suit: string;
}

interface PlayerHandProps {
  cards: Card[];
  onCardSelect?: (cardId: string) => void;
  allowSelection?: boolean;
}

export function PlayerHand({ cards, onCardSelect, allowSelection }: PlayerHandProps) {
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());

  const handleCardClick = (cardId: string) => {
    if (!allowSelection) return;

    const newSelected = new Set(selectedCards);
    if (newSelected.has(cardId)) {
      newSelected.delete(cardId);
    } else {
      newSelected.add(cardId);
    }
    setSelectedCards(newSelected);
    onCardSelect?.(cardId);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="px-6 py-2"
        style={{
          backgroundColor: "var(--primary)",
          border: "2px solid var(--border)",
          boxShadow: "var(--elevation-sm)",
          borderRadius: "var(--radius-card)",
        }}
      >
        <h4
          style={{
            color: "var(--foreground)",
            fontFamily: "'Goldman Sans', sans-serif",
            fontWeight: "var(--font-weight-black)" as any,
          }}
        >
          Your Hand
        </h4>
      </div>

      <div className="flex gap-3">
        {cards.length > 0 ? (
          cards.map((card, index) => (
            <GameCard
              key={card.id}
              rank={card.rank}
              suit={card.suit}
              selected={selectedCards.has(card.id)}
              onClick={() => handleCardClick(card.id)}
              style={{ zIndex: cards.length - index }}
            />
          ))
        ) : (
          <>
            <div
              className="w-[90px] h-[130px] border-2 border-dashed"
              style={{
                borderColor: "rgba(255, 255, 255, 0.3)",
                backgroundColor: "rgba(0, 0, 0, 0.2)",
                borderRadius: "var(--radius-card)",
              }}
            />
            <div
              className="w-[90px] h-[130px] border-2 border-dashed"
              style={{
                borderColor: "rgba(255, 255, 255, 0.3)",
                backgroundColor: "rgba(0, 0, 0, 0.2)",
                borderRadius: "var(--radius-card)",
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
