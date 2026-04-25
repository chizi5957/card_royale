interface PotDisplayProps {
  amount: number;
  round?: string;
}

export function PotDisplay({ amount, round }: PotDisplayProps) {
  return (
    <div
      className="p-6 text-center min-w-[200px]"
      style={{
        background: "linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%)",
        border: "3px solid var(--status-waiting)",
        boxShadow: "0px 8px 0px 0px rgba(0, 0, 0, 0.4), var(--elevation-sm)",
        borderRadius: "var(--radius-card)",
      }}
    >
      <label
        className="block mb-2"
        style={{
          color: "var(--muted-foreground)",
          fontFamily: "'Goldman Sans', sans-serif",
        }}
      >
        Total Pot
      </label>
      <h2
        style={{
          color: "var(--status-waiting)",
          fontSize: "36px",
          fontFamily: "'Goldman Sans', sans-serif",
          fontWeight: "var(--font-weight-black)" as any,
        }}
      >
        {amount}
      </h2>
      {round && (
        <label
          className="block mt-2"
          style={{
            color: "var(--muted-foreground)",
            fontFamily: "'Goldman Sans', sans-serif",
          }}
        >
          {round}
        </label>
      )}
    </div>
  );
}
