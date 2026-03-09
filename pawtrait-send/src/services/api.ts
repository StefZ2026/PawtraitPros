// API calls to Pawtrait Pros server
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAccessToken } from "./auth";

const API_URL = __DEV__
  ? "http://localhost:5000"
  : "https://pawtraitpros.com";

const SEND_TOKEN_KEY = "pawtrait_send_token";

/** Store a send token for token-based auth */
export async function setSendToken(token: string): Promise<void> {
  await AsyncStorage.setItem(SEND_TOKEN_KEY, token);
}

/** Get stored send token */
export async function getSendToken(): Promise<string | null> {
  return AsyncStorage.getItem(SEND_TOKEN_KEY);
}

/** Clear send token */
export async function clearSendToken(): Promise<void> {
  await AsyncStorage.removeItem(SEND_TOKEN_KEY);
}

async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  // Try sendToken first (simpler, no Supabase needed)
  const sendToken = await getSendToken();
  if (sendToken) {
    return fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${sendToken}`,
        "Content-Type": "application/json",
      },
    });
  }

  // Fall back to Supabase JWT
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}

export interface QueueMessage {
  id: number;
  dog_id: number;
  recipient_phone: string;
  message_body: string;
  image_url: string | null;
  pawfile_url: string | null;
}

/** Fetch and claim pending messages (uses token-auth /fetch endpoint) */
export async function fetchQueue(): Promise<QueueMessage[]> {
  const res = await authFetch("/api/sms-queue/fetch");
  if (!res.ok) throw new Error("Failed to fetch queue");
  const data = await res.json();
  return data.messages || [];
}

/** Report send results in batch */
export async function reportResults(
  results: Array<{ id: number; status: "sent" | "failed"; error?: string }>,
): Promise<void> {
  const res = await authFetch("/api/sms-queue/report", {
    method: "POST",
    body: JSON.stringify({ results }),
  });
  if (!res.ok) {
    console.error("Failed to report results");
  }
}

/** Report a single message status */
export async function reportStatus(
  queueId: number,
  status: "sent" | "failed",
  error?: string,
): Promise<void> {
  await reportResults([{ id: queueId, status, error }]);
}
