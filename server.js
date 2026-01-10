const express = require("express");
const app = express();
require("module-alias/register");
require("dotenv").config({ quiet: true });
const { connectDB } = require("./config/db");
connectDB();
const { initializeCronJobs } = require("./utils/cron");
const { createSocketServer } = require("./routes/sockets.route");
const http = require("http");

const httpServer = http.createServer(app);
createSocketServer(httpServer);

initializeCronJobs();

app.use(require("./middlewares/main.js"));

// app.use(async (req,res,next)=>{
//   await new Promise((resolve)=>setTimeout(resolve,10000));
//   next();
// })

app.use("/api", require("./routes/api.routes.js"));

app.use((req, res, next) => {
  const userIp = req.ip || req.connection.remoteAddress;
  req.userIp = userIp;
  next();
});

app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

app.use((err, req, res, next) => {
  console.error("Error:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  })
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});