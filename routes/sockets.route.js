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

      const message = data.message.toLowerCase().trim();
      let reply = "";

      if (message.includes("hi") || message.includes("hello") || message.includes("hey")) {
        reply = "Hi! I'm Aleem Talha, the owner of this website. It's for sale! What can I help you with?";
      } else if (message.includes("sale") || message.includes("buy") || message.includes("price")) {
        reply = "Yes, this website is for sale! The price is negotiable. Contact me for details: WhatsApp +923270445135 or Email aleemtalha098@gmail.com.";
      } else if (message.includes("contact") || message.includes("whatsapp") || message.includes("email") || message.includes("phone")) {
        reply = "You can reach me at WhatsApp: +923270445135 or Email: aleemtalha098@gmail.com. Feel free to ask anything!";
      } else if (message.includes("features") || message.includes("what") && message.includes("website")) {
        reply = "This is a commerce website built with Node.js, Express, MongoDB. It includes product management, user authentication, branches, and more. Interested in buying? Contact me!";
      } else if (message.includes("technology") || message.includes("tech") || message.includes("stack")) {
        reply = "The website uses Node.js, Express.js, MongoDB, Socket.io for chat, and more. It's fully functional. For sale! Reach out: WhatsApp +923270445135.";
      } else if (message.includes("thank") || message.includes("thanks")) {
        reply = "You're welcome! If you have more questions, just ask. Contact: WhatsApp +923270445135 or Email aleemtalha098@gmail.com.";
      } else if (message.includes("bye") || message.includes("goodbye")) {
        reply = "Goodbye! Have a great day. Don't forget, the website is for sale. Contact me anytime: WhatsApp +923270445135.";
      } else if (message.includes("how") && message.includes("work")) {
        reply = "The website is an e-commerce platform for managing products, branches, orders, and users. It's ready to use. For sale! WhatsApp +923270445135.";
      } else if (message.includes("demo") || message.includes("see")) {
        reply = "You can explore the website yourself. For a demo or questions, contact me: WhatsApp +923270445135 or Email aleemtalha098@gmail.com.";
      } else {
        reply = "I'm not sure about that, but this website is for sale! Feel free to ask about it. Contact: WhatsApp +923270445135 or Email aleemtalha098@gmail.com.";
      }

      // Simulate typing delay
      await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000));

      socket.emit("receiveMessage", {
        from: "ai",
        message: reply,
      });
      console.log("Custom reply sent to chatId:", chatId);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id, "with chatId:", chatId);
    });
  });
}

module.exports = { createSocketServer };