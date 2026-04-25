import { FancyButton } from "./FancyButton";

interface GameControlsProps {
  onFold?: () => void;
  onCheck?: () => void;
  onCall?: () => void;
  onRaise?: () => void;
  onDeal?: () => void;
  callAmount?: number;
  disabled?: boolean;
  isGameStarted?: boolean;
}

export function GameControls({
  onFold,
  onCheck,
  onCall,
  onRaise,
  onDeal,
  callAmount,
  disabled,
  isGameStarted,
}: GameControlsProps) {
  return (
    <div
      className="p-4"
      style={{
        backgroundColor: "var(--input-game-bg)",
        border: "2px solid var(--border)",
        boxShadow: "var(--elevation-sm)",
        borderRadius: "var(--radius-card)",
      }}
    >
      {!isGameStarted ? (
        <div className="flex gap-3 justify-center">
          <FancyButton onClick={onDeal} disabled={disabled} variant="primary" width="200px">
            Deal Cards
          </FancyButton>
        </div>
      ) : (
        <div className="flex gap-3 flex-wrap justify-center">
          <FancyButton onClick={onFold} disabled={disabled} variant="tertiary" width="120px">
            Fold
          </FancyButton>
          <FancyButton onClick={onCheck} disabled={disabled} variant="tertiary" width="120px">
            Check
          </FancyButton>
          <FancyButton onClick={onCall} disabled={disabled} variant="secondary" width="150px">
            Call {callAmount ? `(${callAmount})` : ""}
          </FancyButton>
          <FancyButton onClick={onRaise} disabled={disabled} variant="primary" width="120px">
            Raise
          </FancyButton>
        </div>
      )}
    </div>
  );
}
