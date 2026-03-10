import { useState, useEffect } from "react";

const APK_URL = "https://yotqqwzghguacylqceoe.supabase.co/storage/v1/object/public/portraits/pawtrait-send-v10.apk";

function getOS(): "android" | "ios" | "other" {
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return "android";
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  return "other";
}

export default function SetupPhone() {
  const [os] = useState(getOS);
  const [downloading, setDownloading] = useState(false);

  // Auto-start download on Android
  useEffect(() => {
    if (os === "android") {
      const timer = setTimeout(() => {
        const a = document.createElement("a");
        a.href = APK_URL;
        a.download = "PawtraitSend.apk";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setDownloading(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [os]);

  if (os === "ios") {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>Pawtrait Send</h1>
          <p style={styles.subtitle}>
            iPhone version is coming soon! In the meantime, portrait texts will send from the Pawtrait Pros number.
          </p>
        </div>
      </div>
    );
  }

  if (os === "other") {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>Pawtrait Send</h1>
          <p style={styles.subtitle}>
            Open this link on your Android phone to download the app.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Pawtrait Send</h1>

        {!downloading ? (
          <p style={styles.subtitle}>Starting download...</p>
        ) : (
          <>
            <p style={styles.subtitle}>
              Your download has started!
            </p>

            <div style={styles.steps}>
              <p style={styles.step}>
                <strong>1.</strong> Tap the downloaded file to install
              </p>
              <p style={styles.hint}>
                Look for it at the bottom of your screen or swipe down from the top
              </p>
              <p style={styles.step}>
                <strong>2.</strong> If asked to allow the install, tap <strong>Allow</strong> or <strong>Install anyway</strong>
              </p>
              <p style={styles.step}>
                <strong>3.</strong> After installing, tap <strong>Open</strong> and enter your phone number
              </p>
            </div>

            <a href={APK_URL} download="PawtraitSend.apk" style={styles.retryLink}>
              Download didn't start? Tap here.
            </a>
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
    marginBottom: 8,
    marginTop: 0,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    lineHeight: 1.5,
    marginBottom: 20,
  },
  steps: {
    textAlign: "left" as const,
    marginBottom: 20,
  },
  step: {
    fontSize: 15,
    color: "#333",
    lineHeight: 1.6,
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    color: "#999",
    marginTop: -4,
    marginBottom: 12,
    paddingLeft: 20,
  },
  retryLink: {
    display: "block",
    fontSize: 14,
    color: "#7c5832",
    textDecoration: "underline",
  },
};
