import React, { useState, useEffect } from "react";
import { View, ActivityIndicator, StyleSheet, Linking } from "react-native";
import LoginScreen from "./src/screens/LoginScreen";
import SendQueueScreen from "./src/screens/SendQueueScreen";
import { getSession } from "./src/services/auth";
import { getSendToken, setSendToken } from "./src/services/api";

const API_URL = __DEV__
  ? "http://localhost:5000"
  : "https://pawtraitpros.com";

async function handleDeepLinkToken(url: string): Promise<boolean> {
  try {
    // Parse pawtraitsend://connect?token=xxx
    const match = url.match(/[?&]token=([a-f0-9]+)/i);
    if (!match) return false;

    const token = match[1];
    if (token.length < 32) return false;

    // Verify the token works
    const res = await fetch(`${API_URL}/api/sms-queue/fetch`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return false;

    // Token is valid — save it
    await setSendToken(token);
    return true;
  } catch {
    return false;
  }
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null); // null = loading

  useEffect(() => {
    (async () => {
      // 1. Check if app was opened via deep link with a token
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl && initialUrl.includes("token=")) {
        const connected = await handleDeepLinkToken(initialUrl);
        if (connected) {
          setIsLoggedIn(true);
          return;
        }
      }

      // 2. Check for existing stored sendToken
      const sendToken = await getSendToken();
      if (sendToken) {
        setIsLoggedIn(true);
        return;
      }

      // 3. Check for Supabase session
      const session = await getSession();
      setIsLoggedIn(!!session);
    })();

    // Listen for deep links while app is running
    const sub = Linking.addEventListener("url", async ({ url }) => {
      if (url && url.includes("token=")) {
        const connected = await handleDeepLinkToken(url);
        if (connected) {
          setIsLoggedIn(true);
        }
      }
    });

    return () => sub.remove();
  }, []);

  if (isLoggedIn === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#7c5832" />
      </View>
    );
  }

  if (!isLoggedIn) {
    return <LoginScreen onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  return <SendQueueScreen onLogout={() => setIsLoggedIn(false)} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f0",
  },
});
