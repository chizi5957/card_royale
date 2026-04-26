import React from "react";

interface FancyButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "tertiary" | "ghost";
  disabled?: boolean;
  className?: string;
  width?: string;
  height?: string;
  fontSize?: string;
}

const STROKE = "-1px -1px 0 #3B3B3B, 1px -1px 0 #3B3B3B, -1px 1px 0 #3B3B3B, 1px 1px 0 #3B3B3B";

export function FancyButton({
  onClick,
  children,
  variant = "primary",
  disabled = false,
  className = "",
  width = "100%",
  height = "48px",
  fontSize = "14px",
}: FancyButtonProps) {
  if (variant === "ghost") {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`bg-transparent border-none cursor-pointer hover:opacity-80 transition-opacity ${className}`}
        style={{
          width: width,
          height: height,
          color: "var(--muted-foreground)",
          fontFamily: "'Goldman Sans', sans-serif",
          fontSize: fontSize,
          fontWeight: "var(--font-weight-medium)" as any,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          textShadow: STROKE,
          opacity: disabled ? 0.4 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        {children}
      </button>
    );
  }

  // CSS variable keys based on variant
  const variantKey = variant as "primary" | "secondary" | "tertiary";
  const baseVar = `var(--btn-${variantKey}-base)`;
  const midVar = `var(--btn-${variantKey}-mid)`;
  const shineVar = `var(--btn-${variantKey}-shine)`;

  const textShadow = `${STROKE}, 0px 1.778px 2.54px rgba(0, 0, 0, 0.8), 0px 1px 0px #000000`;

  return (
    <div
      className={`relative flex-none transition-transform group ${className}`}
      onClick={!disabled ? onClick : undefined}
      style={{
        width: width,
        height: height,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.8 : 1,
      }}
    >
      <div className={`w-full h-full relative transition-transform ${!disabled ? "group-hover:scale-[1.02] group-active:scale-[0.98]" : ""}`}>
        {/* ButtonBase */}
        <div
          className="absolute inset-0"
          style={{ background: baseVar, borderRadius: "var(--radius-button)" }}
        />
        {/* ButtonMid */}
        <div
          className="absolute left-[1px] right-[1px] top-[1px] bottom-[4px]"
          style={{ background: midVar, borderRadius: "var(--radius-button)" }}
        />
        {/* Shine */}
        <div
          className="absolute left-[4px] right-[4px] top-[4px] bottom-[7px] blur-[0.25px]"
          style={{ background: shineVar, borderRadius: "3px" }}
        />
        {/* Border */}
        <div
          className="absolute inset-0 border-[1.5px] pointer-events-none"
          style={{ borderColor: "var(--border)", borderRadius: "var(--radius-button)" }}
        />

        {/* Title */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <span
            className="uppercase text-white"
            style={{
              fontFamily: "'Goldman Sans', sans-serif",
              fontWeight: "var(--font-weight-black)" as any,
              fontSize: fontSize,
              textShadow: textShadow,
              letterSpacing: "-0.02em",
              fontFeatureSettings: "'pnum' on, 'lnum' on",
            }}
          >
            {children}
          </span>
        </div>

        {/* Disabled Scrim */}
        {disabled && (
          <div
            className="absolute inset-0 bg-black opacity-60 z-20"
            style={{ borderRadius: "var(--radius-button)" }}
          />
        )}
      </div>
    </div>
  );
}