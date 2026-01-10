const { Server } = require("socket.io");

const connectedClients = [];
const connectedAdmins = [];

function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    const chatId = socket.handshake.query.chatId;
    if (!chatId) {
      return socket.disconnect();
    }
    console.log("New client connected:", socket.id, "with chatId:", chatId);

    socket.on("sendMessage", async (data) => {
      console.log("Message received from chatId", chatId, ":", data);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      socket.emit("receiveMessage", {
        from: "server",
        message: `Message received: ${data.message}`,
      });
      console.log("Acknowledgment sent to chatId:", chatId);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id, "with chatId:", chatId);
    });
  });
}

module.exports = { createSocketServer };