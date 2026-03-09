import React, { useState, useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import LoginScreen from "./src/screens/LoginScreen";
import SendQueueScreen from "./src/screens/SendQueueScreen";
import { getSession } from "./src/services/auth";
import { getSendToken } from "./src/services/api";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null); // null = loading

  useEffect(() => {
    // Check for sendToken first (token-based auth), then Supabase session
    (async () => {
      const sendToken = await getSendToken();
      if (sendToken) {
        setIsLoggedIn(true);
        return;
      }
      const session = await getSession();
      setIsLoggedIn(!!session);
    })();
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
