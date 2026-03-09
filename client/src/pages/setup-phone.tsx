import { useState, useEffect } from "react";

const APK_URL = "https://yotqqwzghguacylqceoe.supabase.co/storage/v1/object/public/portraits/pawtrait-send-v8.apk";

export default function SetupPhone() {
  const [token, setToken] = useState<string | null>(null);
  const [step, setStep] = useState<"download" | "open">("download");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) setToken(t);
  }, []);

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

  const deepLink = `pawtraitsend://connect?token=${token}`;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Pawtrait Send</h1>
        <p style={styles.subtitle}>Send portrait texts from your own phone number</p>

        {step === "download" ? (
          <>
            <div style={styles.stepBadge}>Step 1 of 2</div>
            <p style={styles.instruction}>
              Tap the button below to download the Pawtrait Send app.
            </p>
            <a href={APK_URL} style={styles.button} download>
              Download Pawtrait Send
            </a>
            <p style={styles.note}>
              After the download finishes, tap the file in your notifications to install it.
              If prompted, allow "Install from unknown sources."
            </p>
            <button
              onClick={() => setStep("open")}
              style={styles.nextButton}
            >
              I've installed the app — Next
            </button>
          </>
        ) : (
          <>
            <div style={styles.stepBadge}>Step 2 of 2</div>
            <p style={styles.instruction}>
              Tap the button below to open the app. It will connect automatically — no typing or pasting needed.
            </p>
            <a href={deepLink} style={styles.button}>
              Open Pawtrait Send
            </a>
            <p style={styles.note}>
              Once connected, portrait texts will send from your phone automatically when queued from the dashboard.
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
