// WebSocket connection to Pawtrait Pros server
import { io, Socket } from "socket.io-client";
import { getAccessToken } from "./auth";
import { getSendToken } from "./api";

const API_URL = __DEV__
  ? "http://localhost:5000"
  : "https://pawtraitpros.com";

let socket: Socket | null = null;

export async function connectSocket(
  onQueueReady: (data: { count: number; orgId: number }) => void,
): Promise<Socket | null> {
  // Try sendToken first, then Supabase JWT
  const sendToken = await getSendToken();
  const token = sendToken || (await getAccessToken());
  if (!token) return null;

  // Disconnect existing
  if (socket?.connected) {
    socket.disconnect();
  }

  socket = io(API_URL, {
    path: "/ws",
    auth: { token },
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: 3000,
    reconnectionAttempts: 10,
  });

  socket.on("connect", () => {
    console.log("[socket] Connected");
    socket?.emit("phone:online");
  });

  socket.on("queue:ready", onQueueReady);

  socket.on("disconnect", (reason) => {
    console.log("[socket] Disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.error("[socket] Connection error:", err.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}
