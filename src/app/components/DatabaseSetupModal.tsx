import { motion, AnimatePresence } from "motion/react";
import { X, Copy, ExternalLink, Check } from "lucide-react";
import { useState } from "react";
import { FancyButton } from "./FancyButton";

interface DatabaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  error?: string;
}

const SQL_SETUP = `CREATE TABLE IF NOT EXISTS kv_store_01880f2a (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_kv_store_key_prefix
  ON kv_store_01880f2a (key text_pattern_ops);

GRANT ALL ON TABLE kv_store_01880f2a TO postgres;
GRANT ALL ON TABLE kv_store_01880f2a TO service_role;`;

export function DatabaseSetupModal({ isOpen, onClose, error }: DatabaseSetupModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(SQL_SETUP).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleOpenSQL = () => {
    window.open(
      "https://supabase.com/dashboard/project/rfdehdikogvisujmduuo/sql/new",
      "_blank"
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="setup-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.8)" }}
          onClick={onClose}
        >
          <motion.div
            key="setup-card"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative box-border flex flex-col"
            style={{
              width: "540px",
              maxWidth: "90vw",
              padding: "32px 28px",
              gap: "20px",
              background: "var(--game-card-bg)",
              border: "3px solid var(--game-card-border)",
              boxShadow: "var(--popup-card-shadow)",
              borderRadius: "var(--game-card-radius)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute z-10 flex items-center justify-center cursor-pointer border-none"
              style={{
                top: "16px",
                right: "16px",
                width: "32px",
                height: "32px",
                background: "rgba(0, 0, 0, 0.3)",
                borderRadius: "9999px",
              }}
            >
              <X size={18} color="var(--foreground)" strokeWidth={2.5} />
            </button>

            {/* Header */}
            <div className="flex flex-col gap-2 items-center">
              <span style={{ fontSize: "40px" }}>⚙️</span>
              <h2
                className="uppercase text-center"
                style={{
                  fontFamily: "'Goldman Sans', sans-serif",
                  fontWeight: "var(--font-weight-black)" as any,
                  fontSize: "24px",
                  color: "var(--foreground)",
                  textShadow: "var(--text-stroke-shadow)",
                  margin: 0,
                }}
              >
                Database Setup Required
              </h2>
              <p
                className="text-center"
                style={{
                  fontFamily: "'Goldman Sans', sans-serif",
                  fontWeight: "var(--font-weight-normal)" as any,
                  fontSize: "14px",
                  color: "rgba(255,255,255,0.7)",
                  margin: 0,
                  maxWidth: "400px",
                }}
              >
                Your game needs a database table. This is a one-time setup that takes 30 seconds!
              </p>
            </div>

            {/* Steps */}
            <div className="flex flex-col gap-3">
              {/* Step 1 */}
              <div
                className="flex items-start gap-3 p-3"
                style={{
                  background: "rgba(0,51,67,0.3)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                }}
              >
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: "24px",
                    height: "24px",
                    background: "var(--accent)",
                    borderRadius: "50%",
                    fontFamily: "'Goldman Sans', sans-serif",
                    fontWeight: "var(--font-weight-black)" as any,
                    fontSize: "12px",
                    color: "#000",
                  }}
                >
                  1
                </div>
                <div className="flex-1">
                  <p
                    style={{
                      fontFamily: "'Goldman Sans', sans-serif",
                      fontWeight: "var(--font-weight-medium)" as any,
                      fontSize: "12px",
                      color: "var(--foreground)",
                      margin: "0 0 6px 0",
                      textTransform: "uppercase",
                    }}
                  >
                    Copy the SQL below
                  </p>
                  <div
                    className="relative p-3 font-mono text-xs overflow-x-auto"
                    style={{
                      background: "rgba(0,0,0,0.4)",
                      borderRadius: "6px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      maxHeight: "140px",
                      overflowY: "auto",
                    }}
                  >
                    <pre
                      style={{
                        margin: 0,
                        color: "rgba(255,255,255,0.9)",
                        fontSize: "11px",
                        lineHeight: "1.4",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all",
                      }}
                    >
                      {SQL_SETUP}
                    </pre>
                    <button
                      onClick={handleCopy}
                      className="absolute top-2 right-2 p-2 flex items-center gap-1"
                      style={{
                        background: copied ? "rgba(79, 234, 79, 0.2)" : "rgba(255,164,3,0.2)",
                        border: `1px solid ${copied ? "var(--status-win)" : "var(--accent)"}`,
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "10px",
                        fontFamily: "'Goldman Sans', sans-serif",
                        fontWeight: "var(--font-weight-medium)" as any,
                        color: copied ? "var(--status-win)" : "var(--accent)",
                        textTransform: "uppercase",
                      }}
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div
                className="flex items-start gap-3 p-3"
                style={{
                  background: "rgba(0,51,67,0.3)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                }}
              >
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: "24px",
                    height: "24px",
                    background: "var(--accent)",
                    borderRadius: "50%",
                    fontFamily: "'Goldman Sans', sans-serif",
                    fontWeight: "var(--font-weight-black)" as any,
                    fontSize: "12px",
                    color: "#000",
                  }}
                >
                  2
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <p
                    style={{
                      fontFamily: "'Goldman Sans', sans-serif",
                      fontWeight: "var(--font-weight-medium)" as any,
                      fontSize: "12px",
                      color: "var(--foreground)",
                      margin: 0,
                      textTransform: "uppercase",
                    }}
                  >
                    Open SQL Editor & Paste
                  </p>
                  <button
                    onClick={handleOpenSQL}
                    className="flex items-center justify-center gap-2 p-2"
                    style={{
                      background: "var(--btn-secondary-base)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontFamily: "'Goldman Sans', sans-serif",
                      fontWeight: "var(--font-weight-medium)" as any,
                      fontSize: "11px",
                      color: "var(--foreground)",
                      textTransform: "uppercase",
                    }}
                  >
                    <ExternalLink size={14} />
                    Open Supabase SQL Editor
                  </button>
                </div>
              </div>

              {/* Step 3 */}
              <div
                className="flex items-start gap-3 p-3"
                style={{
                  background: "rgba(0,51,67,0.3)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                }}
              >
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: "24px",
                    height: "24px",
                    background: "var(--accent)",
                    borderRadius: "50%",
                    fontFamily: "'Goldman Sans', sans-serif",
                    fontWeight: "var(--font-weight-black)" as any,
                    fontSize: "12px",
                    color: "#000",
                  }}
                >
                  3
                </div>
                <p
                  style={{
                    fontFamily: "'Goldman Sans', sans-serif",
                    fontWeight: "var(--font-weight-medium)" as any,
                    fontSize: "12px",
                    color: "var(--foreground)",
                    margin: 0,
                    textTransform: "uppercase",
                  }}
                >
                  Click "Run" then refresh this page
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col gap-2 pt-2">
              <FancyButton onClick={onClose} variant="primary" width="100%" height="48px">
                Got it!
              </FancyButton>
              <p
                className="text-center"
                style={{
                  fontFamily: "'Goldman Sans', sans-serif",
                  fontWeight: "var(--font-weight-normal)" as any,
                  fontSize: "10px",
                  color: "rgba(255,255,255,0.5)",
                  margin: 0,
                }}
              >
                This is a one-time setup. Once complete, you'll never see this again.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
