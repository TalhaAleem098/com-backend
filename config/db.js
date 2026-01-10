const mongoose = require("mongoose");

const mainDB = process.env.MONGODB_URI || "mongodb://localhost:27017/shopping";
const chatDB = process.env.CHAT_MONGODB_URI || "mongodb://localhost:27017/chat";

let chatConnection;

const connectDB = async () => {
  try {
    await mongoose.connect(mainDB, {
      bufferTimeoutMS: 5000
    });
    console.log("Main MongoDB connected");

    chatConnection = mongoose.createConnection(chatDB, {
      bufferTimeoutMS: 5000
    });

    // Wait for chat connection
    await new Promise((resolve, reject) => {
      chatConnection.once('connected', () => {
        console.log("Chat MongoDB connected");
        resolve();
      });
      chatConnection.once('error', reject);
    });

  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

const getChatConnection = () => {
  return chatConnection;
};

module.exports = { connectDB, getChatConnection };
