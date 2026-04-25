import { PlayingCard } from "./PlayingCard";

interface Card {
  rank: string;
  suit: "hearts" | "diamonds" | "spades" | "clubs";
  value: number;
}

interface CardPileProps {
  cards: Card[];
  label: string;
  score: number;
  maxDisplay?: number;
}

export function CardPile({ cards, label, score, maxDisplay = 5 }: CardPileProps) {
  const displayCards = cards.slice(-maxDisplay);

  return (
    <div
      className="p-4 flex flex-col h-full"
      style={{
        background: "var(--pile-bg)",
        border: "2px solid var(--pile-border)",
        borderRadius: "20px",
        boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.3)",
      }}
    >
      <div className="flex justify-between items-center mb-4">
        <label
          className="uppercase tracking-wide"
          style={{
            color: "var(--muted-foreground)",
            fontSize: "var(--text-label)",
            fontFamily: "'Goldman Sans', sans-serif",
            fontWeight: "var(--font-weight-medium)" as any,
          }}
        >
          {label}
        </label>
        <div
          className="px-3 py-1 flex items-center justify-center"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "20px",
          }}
        >
          <span
            style={{
              color: "var(--status-waiting)",
              fontSize: "var(--text-base)",
              fontFamily: "'Goldman Sans', sans-serif",
              fontWeight: "var(--font-weight-black)" as any,
              textShadow: "-1px -1px 0 #3B3B3B, 1px -1px 0 #3B3B3B, -1px 1px 0 #3B3B3B, 1px 1px 0 #3B3B3B",
            }}
          >
            {score}
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center relative min-h-[120px]">
        {displayCards.length > 0 ? (
          <div className="relative" style={{ width: `${58 + (displayCards.length - 1) * 8}px`, height: `${84 + (displayCards.length - 1) * 4}px` }}>
            {displayCards.map((card, index) => (
              <div
                key={`${card.rank}-${card.suit}`}
                className="absolute"
                style={{
                  left: `${index * 8}px`,
                  top: `${index * 4}px`,
                  zIndex: index,
                }}
              >
                <PlayingCard rank={card.rank} suit={card.suit} size="small" />
              </div>
            ))}
          </div>
        ) : (
          <div
            className="border-2 border-dashed flex items-center justify-center opacity-30"
            style={{
              borderColor: "var(--foreground)",
              borderRadius: "8px",
              width: "58px",
              height: "84px",
            }}
          >
            <p
              className="text-center uppercase"
              style={{
                color: "var(--foreground)",
                fontSize: "var(--text-micro)",
                fontFamily: "'Goldman Sans', sans-serif",
                fontWeight: "var(--font-weight-medium)" as any,
              }}
            >
              Empty
            </p>
          </div>
        )}
      </div>

      {cards.length > maxDisplay && (
        <p
          className="text-center mt-2 uppercase"
          style={{
            color: "rgba(255, 255, 255, 0.5)",
            fontSize: "var(--text-micro)",
            fontFamily: "'Goldman Sans', sans-serif",
            fontWeight: "var(--font-weight-medium)" as any,
          }}
        >
          +{cards.length - maxDisplay} more
        </p>
      )}
    </div>
  );
}