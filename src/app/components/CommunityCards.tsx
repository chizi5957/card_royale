import { GameCard } from "./GameCard";

interface Card {
  rank: string;
  suit: string;
}

interface CommunityCardsProps {
  cards: Card[];
}

export function CommunityCards({ cards }: CommunityCardsProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="px-6 py-2"
        style={{
          backgroundColor: "var(--status-waiting)",
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
          Community Cards
        </h4>
      </div>

      <div className="flex gap-3">
        {Array.from({ length: 5 }).map((_, index) => {
          const card = cards[index];
          return card ? (
            <GameCard key={index} rank={card.rank} suit={card.suit} />
          ) : (
            <div
              key={index}
              className="w-[90px] h-[130px] border-2 border-dashed"
              style={{
                borderColor: "rgba(255, 255, 255, 0.3)",
                backgroundColor: "rgba(0, 0, 0, 0.2)",
                borderRadius: "var(--radius-card)",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
