import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from "react";
import { View, Text, ActivityIndicator, StyleSheet, Linking, ScrollView } from "react-native";
import PhoneConnectScreen from "./src/screens/PhoneConnectScreen";
import LoginScreen from "./src/screens/LoginScreen";
import SendQueueScreen from "./src/screens/SendQueueScreen";
import { getSession } from "./src/services/auth";
import { getSendToken, setSendToken } from "./src/services/api";

const API_URL = __DEV__
  ? "http://localhost:5000"
  : "https://pawtraitpros.com";

// Error boundary to catch and display crashes instead of silently dying
class ErrorBoundary extends Component<{children: ReactNode}, {error: Error | null}> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App crash:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <ScrollView style={{flex:1,backgroundColor:'#fff',padding:20,paddingTop:60}}>
          <Text style={{fontSize:20,fontWeight:'700',color:'#ef4444',marginBottom:12}}>
            App Error
          </Text>
          <Text style={{fontSize:14,color:'#333',marginBottom:8}}>
            {this.state.error.message}
          </Text>
          <Text style={{fontSize:11,color:'#999',fontFamily:'monospace'}}>
            {this.state.error.stack}
          </Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

type Screen = "loading" | "phone" | "token" | "queue" | "error";

function AppInner() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [errorMsg, setErrorMsg] = useState("");

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
      } catch (err: any) {
        setErrorMsg(err?.message || String(err));
        setScreen("error");
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

  if (screen === "error") {
    return (
      <ScrollView style={{flex:1,backgroundColor:'#fff',padding:20,paddingTop:60}}>
        <Text style={{fontSize:20,fontWeight:'700',color:'#ef4444',marginBottom:12}}>
          Startup Error
        </Text>
        <Text style={{fontSize:14,color:'#333'}}>{errorMsg}</Text>
      </ScrollView>
    );
  }

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

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f0",
  },
});
