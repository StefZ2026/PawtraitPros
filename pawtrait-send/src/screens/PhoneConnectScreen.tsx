import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { setSendToken } from "../services/api";

const API_URL = __DEV__
  ? "http://localhost:5000"
  : "https://pawtraitpros.com";

interface Props {
  onConnected: () => void;
  onUseToken: () => void;
}

function formatPhoneDisplay(digits: string): string {
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

export default function PhoneConnectScreen({ onConnected, onUseToken }: Props) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const digits = phone.replace(/\D/g, "");

  const handleConnect = async () => {
    if (digits.length < 10) {
      setError("Please enter your 10-digit phone number.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/sms-queue/connect-by-phone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: digits }),
      });

      const data = await res.json();

      if (data.token) {
        await setSendToken(data.token);
        setSuccess(`Connected to ${data.orgName}!`);
        setTimeout(() => onConnected(), 1500);
      } else {
        setError(data.error || "We couldn't find a business with that number. Double-check and try again.");
      }
    } catch (err: any) {
      setError("Couldn't connect. Check your internet and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneChange = (text: string) => {
    // Only keep digits, max 10
    const cleaned = text.replace(/\D/g, "").slice(0, 10);
    setPhone(cleaned);
    setError("");
  };

  if (success) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.checkmark}>✓</Text>
          <Text style={styles.successText}>{success}</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Pawtrait Send</Text>
        <Text style={styles.subtitle}>Enter your phone number to connect</Text>

        <TextInput
          style={styles.input}
          placeholder="(555) 555-1234"
          value={formatPhoneDisplay(digits)}
          onChangeText={handlePhoneChange}
          keyboardType="phone-pad"
          autoFocus
          maxLength={14}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, (loading || digits.length < 10) && styles.buttonDisabled]}
          onPress={handleConnect}
          disabled={loading || digits.length < 10}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Connect</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.tokenLink} onPress={onUseToken}>
          <Text style={styles.tokenLinkText}>Connect with token instead</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f0",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  input: {
    borderWidth: 2,
    borderColor: "#7c5832",
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    textAlign: "center",
    letterSpacing: 1,
    marginBottom: 12,
    backgroundColor: "#fafafa",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#22c55e",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  checkmark: {
    fontSize: 64,
    textAlign: "center",
    color: "#22c55e",
    marginBottom: 16,
  },
  successText: {
    fontSize: 22,
    fontWeight: "600",
    textAlign: "center",
    color: "#1a1a1a",
  },
  tokenLink: {
    marginTop: 20,
    alignItems: "center",
  },
  tokenLinkText: {
    color: "#999",
    fontSize: 13,
  },
});
