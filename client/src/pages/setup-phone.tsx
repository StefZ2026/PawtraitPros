import { useState, useEffect } from "react";

const APK_URL = "https://yotqqwzghguacylqceoe.supabase.co/storage/v1/object/public/portraits/pawtrait-send-v7.apk";

export default function SetupPhone() {
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<"download" | "token">("download");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) setToken(t);
  }, []);

  const handleCopy = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement("textarea");
      el.value = token;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  if (!token) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>Setup Link Invalid</h1>
          <p style={styles.subtitle}>
            This link is missing a connection token. Please ask your Pawtrait Pros admin to send you a new setup link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Pawtrait Send</h1>
        <p style={styles.subtitle}>Send portrait texts from your own phone number</p>

        {step === "download" ? (
          <>
            <div style={styles.stepBadge}>Step 1 of 2</div>
            <p style={styles.instruction}>
              Tap the button below to download the Pawtrait Send app to your Android phone.
            </p>
            <a href={APK_URL} style={styles.button} download>
              Download Pawtrait Send
            </a>
            <p style={styles.note}>
              After downloading, tap the file in your notifications to install it.
              You may need to allow "Install from unknown sources" in your phone settings.
            </p>
            <button
              onClick={() => setStep("token")}
              style={styles.nextButton}
            >
              I've installed the app — Next
            </button>
          </>
        ) : (
          <>
            <div style={styles.stepBadge}>Step 2 of 2</div>
            <p style={styles.instruction}>
              Open the Pawtrait Send app and paste this connection token:
            </p>
            <div style={styles.tokenBox}>
              <code style={styles.tokenText}>
                {token.substring(0, 8)}...{token.substring(token.length - 8)}
              </code>
              <button onClick={handleCopy} style={styles.copyButton}>
                {copied ? "Copied!" : "Copy Token"}
              </button>
            </div>
            <p style={styles.note}>
              Once connected, portrait texts will automatically send from your phone when queued from the dashboard.
            </p>
            <button
              onClick={() => setStep("download")}
              style={styles.backLink}
            >
              Back to Step 1
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f5f5f0",
    fontFamily: "'Libre Baskerville', serif",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 32,
    maxWidth: 420,
    width: "100%",
    boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
    textAlign: "center" as const,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: "#1a1a1a",
    marginBottom: 4,
    marginTop: 0,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 24,
  },
  stepBadge: {
    display: "inline-block",
    backgroundColor: "#7c5832",
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
    padding: "4px 12px",
    borderRadius: 12,
    marginBottom: 16,
  },
  instruction: {
    fontSize: 16,
    color: "#333",
    lineHeight: 1.5,
    marginBottom: 20,
  },
  button: {
    display: "block",
    backgroundColor: "#7c5832",
    color: "#fff",
    fontSize: 18,
    fontWeight: 700,
    padding: "16px 24px",
    borderRadius: 12,
    textDecoration: "none",
    marginBottom: 16,
  },
  nextButton: {
    display: "block",
    width: "100%",
    backgroundColor: "#22c55e",
    color: "#fff",
    fontSize: 16,
    fontWeight: 600,
    padding: "14px 24px",
    borderRadius: 10,
    border: "none",
    cursor: "pointer",
    marginTop: 12,
  },
  tokenBox: {
    backgroundColor: "#f5f5f0",
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  tokenText: {
    fontSize: 14,
    color: "#333",
    fontFamily: "monospace",
    wordBreak: "break-all" as const,
  },
  copyButton: {
    backgroundColor: "#7c5832",
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    padding: "8px 16px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
    flexShrink: 0,
  },
  note: {
    fontSize: 13,
    color: "#888",
    lineHeight: 1.5,
    marginBottom: 8,
  },
  backLink: {
    background: "none",
    border: "none",
    color: "#7c5832",
    fontSize: 14,
    cursor: "pointer",
    textDecoration: "underline",
    marginTop: 8,
  },
};
