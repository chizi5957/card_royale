interface TitleBarProps {
  title: string;
  fontSize?: string;
  className?: string;
}

export function TitleBar({ title, fontSize = "30px", className = "" }: TitleBarProps) {
  return (
    /* UI-SectionTitle-Primary-FullWidth: 449×85px */
    <div
      className={`relative flex-none ${className}`}
      style={{ width: "449px", height: "85px" }}
    >
      {/* CardTitle-Base: 449×70px at top:1px */}
      <div
        className="absolute"
        style={{ width: "449px", height: "70px", left: "0px", top: "1px" }}
      >
        {/* TitleBar-Base: top:1.18% bottom:16.47% */}
        <div
          className="absolute"
          style={{
            left: "0%",
            right: "0%",
            top: "1.18%",
            bottom: "16.47%",
            background: "var(--titlebar-base-bg)",
            border: "1px solid var(--border)",
            boxShadow: "var(--titlebar-base-shadow)",
          }}
        />

        {/* TitleBar-Mid: top:2.35% bottom:21.18% */}
        <div
          className="absolute"
          style={{
            left: "0%",
            right: "0%",
            top: "2.35%",
            bottom: "21.18%",
            background: "var(--titlebar-mid-bg)",
            border: "1px solid var(--titlebar-mid-border)",
          }}
        />

        {/* TitleBar-Shine: top:2.35% bottom:65.88% */}
        <div
          className="absolute"
          style={{
            left: "0%",
            right: "0%",
            top: "2.35%",
            bottom: "65.88%",
            background: "var(--titlebar-shine-bg)",
            backgroundBlendMode: "hard-light",
          }}
        />

        {/* Mask: top:2.35% bottom:21.18% — clips the Shine child */}
        <div
          className="absolute overflow-hidden"
          style={{
            left: "0%",
            right: "0%",
            top: "2.35%",
            bottom: "21.18%",
            boxSizing: "border-box",
            background: "var(--titlebar-mask-bg)",
            border: "1px solid var(--titlebar-mask-border)",
          }}
        >
          {/* Shine (mask child): extends beyond mask bounds, clipped by overflow:hidden */}
          <div
            className="absolute"
            style={{
              left: "-7.21%",
              right: "-7.21%",
              top: "-15.29%",
              bottom: "65.88%",
              background: "var(--titlebar-mask-shine-bg)",
            }}
          />
        </div>
      </div>

      {/* Card Title: positioned at top:11px, left:10px right:10px, height:40px */}
      <div
        className="absolute flex items-center justify-center"
        style={{
          height: "40px",
          left: "10px",
          right: "10px",
          top: "11px",
        }}
      >
        <span
          className="uppercase text-center"
          style={{
            fontFamily: "'Goldman Sans', sans-serif",
            fontStyle: "normal",
            fontWeight: "var(--font-weight-black)" as any,
            fontSize: fontSize,
            lineHeight: "36px",
            letterSpacing: "-0.02em",
            textTransform: "uppercase",
            fontFeatureSettings: "'pnum' on, 'lnum' on",
            color: "var(--foreground)",
            textShadow: "var(--titlebar-text-shadow)",
            WebkitTextStroke: "1.016px #3B3B3B",
          }}
        >
          {title}
        </span>
      </div>
    </div>
  );
}
