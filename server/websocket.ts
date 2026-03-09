// WebSocket server for real-time communication between dashboard and companion app
import { Server as HttpServer } from "http";
// @ts-ignore — socket.io types available after npm install
import { Server as SocketServer } from "socket.io";
import { createClient } from "@supabase/supabase-js";
import { storage } from "./storage";
import { pool } from "./db";

let io: any = null;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export function getIo(): any {
  return io;
}

export function setupWebSocket(httpServer: HttpServer): any {
  io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === "production"
        ? ["https://pawtraitpros.com"]
        : ["http://localhost:5000", "http://localhost:5173"],
      credentials: true,
    },
    path: "/ws",
  });

  // Auth middleware — verify Supabase JWT on connection
  io.use(async (socket: any, next: any) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Authentication required"));
      }

      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseKey) {
        return next(new Error("Server configuration error"));
      }

      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        // Try sendToken auth (for companion devices)
        try {
          const tokenResult = await pool.query(
            'SELECT id FROM organizations WHERE send_token = $1 AND is_active = true',
            [token]
          );
          if (tokenResult.rows.length > 0) {
            (socket as any).orgId = tokenResult.rows[0].id;
            (socket as any).isDevice = true;
            return next();
          }
        } catch (dbErr) {
          console.error("[websocket] sendToken lookup failed:", dbErr);
        }
        return next(new Error("Invalid token"));
      }

      // Attach user info to socket
      (socket as any).userId = user.id;
      (socket as any).userEmail = user.email;
      next();
    } catch (err) {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", async (socket: any) => {
    // Handle device connections (sendToken auth)
    if ((socket as any).isDevice) {
      const orgId = (socket as any).orgId;
      socket.join(`org:${orgId}`);
      io?.to(`org:${orgId}`).emit("phone:status", { online: true });
      socket.emit("connected", { orgId, role: "device" });

      socket.on("disconnect", () => {
        io?.to(`org:${orgId}`).emit("phone:status", { online: false });
      });
      return;
    }

    const userId = (socket as any).userId;
    const userEmail = (socket as any).userEmail;

    // Resolve user's org and join its room
    try {
      const isAdmin = userEmail === ADMIN_EMAIL;

      // Find org by owner
      const org = await storage.getOrganizationByOwner(userId);
      if (org) {
        socket.join(`org:${org.id}`);
        socket.emit("connected", { orgId: org.id, role: "owner" });
      } else if (isAdmin) {
        // Admin can join any org room — they'll specify which via event
        socket.emit("connected", { role: "admin" });
      } else {
        socket.emit("connected", { role: "none" });
      }

      // Admin can join specific org rooms
      socket.on("join:org", async (orgId: number) => {
        if (!isAdmin) {
          socket.emit("error", { message: "Not authorized" });
          return;
        }
        socket.join(`org:${orgId}`);
        socket.emit("joined", { orgId });
      });

      // Companion app pings to confirm it's online
      socket.on("phone:online", () => {
        if (org) {
          io?.to(`org:${org.id}`).emit("phone:status", { online: true });
        }
      });

      socket.on("disconnect", () => {
        if (org) {
          io?.to(`org:${org.id}`).emit("phone:status", { online: false });
        }
      });
    } catch (err) {
      console.error("[websocket] Error on connection:", err);
    }
  });

  console.log("[websocket] Socket.IO server initialized on /ws");
  return io;
}
