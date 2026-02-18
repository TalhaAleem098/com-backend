const { Server } = require("socket.io");
const { verifyToken, generateToken } = require("@/utils/jwt");
const { registerClientHandlers } = require("./client.socket");
const { registerAdminHandlers } = require("./admin.socket");
const { registerChatHandlers } = require("./chat.socket");

/**
 * Authenticate admin socket — try access token first, fall back to refresh token
 * Returns { decoded, newAccessToken? } or null
 */
function authenticateAdmin(token, refreshToken) {
  // Try access token first
  if (token) {
    try {
      const decoded = verifyToken(token);
      if (decoded.id && decoded.role && (decoded.role === "admin" || decoded.role === "coadmin")) {
        return { decoded, newAccessToken: null };
      }
    } catch (err) {
      // If not expired, and no refresh token — fail
      if (err.name !== "TokenExpiredError" && !refreshToken) {
        return null;
      }
      console.log("[Socket] Access token expired, trying refresh token...");
    }
  }

  // Try refresh token
  if (refreshToken) {
    try {
      const decodedRefresh = verifyToken(refreshToken);
      if (!decodedRefresh.id || !decodedRefresh.role || (decodedRefresh.role !== "admin" && decodedRefresh.role !== "coadmin")) {
        return null;
      }
      // Generate new access token
      const newAccessToken = generateToken(
        decodedRefresh,
        decodedRefresh.rememberMe || false,
        60 * 60 * 1000 // 1 hour
      );
      console.log(`[Socket] New access token generated for admin ${decodedRefresh.name || decodedRefresh.id}`);
      return { decoded: decodedRefresh, newAccessToken };
    } catch (err) {
      console.log("[Socket] Refresh token also invalid:", err.message);
      return null;
    }
  }

  return null;
}

/**
 * Create and configure the Socket.IO server
 * Routes connections to appropriate handlers based on role
 */
function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    const { chatId, role, token, refreshToken } = socket.handshake.query;

    // ─── Admin connection (requires JWT auth) ───
    if (role === "admin") {
      if (!token && !refreshToken) {
        console.log("[Socket] Admin connection rejected: no tokens");
        return socket.disconnect();
      }

      const auth = authenticateAdmin(token, refreshToken);
      if (!auth) {
        console.log("[Socket] Admin connection rejected: authentication failed");
        socket.emit("authError", { message: "Authentication failed. Please login again." });
        return socket.disconnect();
      }

      const { decoded, newAccessToken } = auth;

      // If a new access token was generated, send it to the frontend
      if (newAccessToken) {
        socket.emit("tokenRefreshed", { accessToken: newAccessToken });
      }

      console.log(`[Socket] Admin connected: ${decoded.name || decoded.id} (${socket.id})`);

      // Register shared chat handlers
      registerChatHandlers(io, socket);

      // Register admin-specific handlers
      registerAdminHandlers(io, socket, decoded);
      return;
    }

    // ─── Client connection (requires chatId) ───
    if (!chatId) {
      console.log("[Socket] Client connection rejected: no chatId");
      return socket.disconnect();
    }

    console.log(`[Socket] Client connected: ${chatId} (${socket.id})`);

    // Register shared chat handlers
    registerChatHandlers(io, socket);

    // Register client-specific handlers
    registerClientHandlers(io, socket, chatId);
  });

  return io;
}

module.exports = { createSocketServer };
