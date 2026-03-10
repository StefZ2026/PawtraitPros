import React, { useState, useEffect } from "react";
import { View, ActivityIndicator, StyleSheet, Linking } from "react-native";
import PhoneConnectScreen from "./src/screens/PhoneConnectScreen";
import LoginScreen from "./src/screens/LoginScreen";
import SendQueueScreen from "./src/screens/SendQueueScreen";
import { getSession } from "./src/services/auth";
import { getSendToken, setSendToken } from "./src/services/api";

const API_URL = __DEV__
  ? "http://localhost:5000"
  : "https://pawtraitpros.com";

type Screen = "loading" | "phone" | "token" | "queue";

export default function App() {
  const [screen, setScreen] = useState<Screen>("loading");

  useEffect(() => {
    (async () => {
      try {
        // 1. Check if app was opened via deep link with a token
        try {
          const initialUrl = await Linking.getInitialURL();
          if (initialUrl) {
            const match = initialUrl.match(/[?&]token=([a-f0-9]+)/i);
            if (match && match[1].length >= 32) {
              const token = match[1];
              const res = await fetch(`${API_URL}/api/sms-queue/fetch`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                await setSendToken(token);
                setScreen("queue");
                return;
              }
            }
          }
        } catch {}

        // 2. Check for existing stored sendToken
        const sendToken = await getSendToken();
        if (sendToken) {
          setScreen("queue");
          return;
        }

        // 3. Check for Supabase session
        try {
          const session = await getSession();
          if (session) {
            setScreen("queue");
            return;
          }
        } catch {}

        // 4. First launch — show phone connect screen
        setScreen("phone");
      } catch {
        // If anything goes wrong, show the phone connect screen
        setScreen("phone");
      }
    })();

    // Listen for deep links while app is running
    const sub = Linking.addEventListener("url", async ({ url }) => {
      if (url) {
        const match = url.match(/[?&]token=([a-f0-9]+)/i);
        if (match && match[1].length >= 32) {
          const token = match[1];
          try {
            const res = await fetch(`${API_URL}/api/sms-queue/fetch`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              await setSendToken(token);
              setScreen("queue");
            }
          } catch {}
        }
      }
    });

    return () => sub.remove();
  }, []);

  if (screen === "loading") {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#7c5832" />
      </View>
    );
  }

  if (screen === "phone") {
    return (
      <PhoneConnectScreen
        onConnected={() => setScreen("queue")}
        onUseToken={() => setScreen("token")}
      />
    );
  }

  if (screen === "token") {
    return <LoginScreen onLoginSuccess={() => setScreen("queue")} />;
  }

  return <SendQueueScreen onLogout={() => setScreen("phone")} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f0",
  },
});
