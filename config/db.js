const mongoose = require("mongoose");

const db = process.env.MONGODB_URI || "mongodb://localhost:27017/shopping";

const connectDB = async () => {
  try {
    await mongoose.connect(db,{
      bufferTimeoutMS: 5000
    });
    console.log("MongoDB connected");
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
