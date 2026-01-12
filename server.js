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

// Import API router separately for traversal
const apiRouter = require("./routes/api.routes.js");
app.use("/api", apiRouter);

app.get("/", (req, res) => {
  res.send("Server is running...");
});

// Recursive function to log all routes including nested routers
function logAllRoutes(router, basePath = "") {
  if (!router || !router.stack) return;

  router.stack.forEach(layer => {
    if (layer.route && layer.route.path) {
      // Direct route
      const fullPath = basePath + layer.route.path;
      const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase());
      methods.forEach(method => {
        console.log(`${method}  ${fullPath}`);
      });
    } else if (layer.name === "router" && layer.handle) {
      // Nested router
      let nestedBasePath = basePath;

      if (layer.regexp && layer.regexp.source) {
        // Convert regex to readable path
        let match = layer.regexp.source
          .replace("\\/?(?=\\/|$)", "")
          .replace("^", "")
          .replace("$", "")
          .replace(/\(\?:\(\[\^\\\/]\+\?\)\)/g, ":id") // dynamic params
          .replace(/\(\?:\(\[\^\\\/]\+\?\)\)/g, ":param")
          .replace(/\\\//g, "/");

        nestedBasePath += match;
      }

      if (layer.handle.stack) {
        logAllRoutes(layer.handle, nestedBasePath);
      }
    }
  });
}

// After all routes are mounted
console.log("📌 All registered routes including nested:");
logAllRoutes(app._router);       // top-level routes
logAllRoutes(apiRouter, "/api"); // /api router and nested routers

// app.use((req, res, next) => {
//   const userIp = req.ip || req.connection.remoteAddress;
//   req.userIp = userIp;
//   next();
// });

// app.use((req, res, next) => {
//   res.status(404).json({
//     success: false,
//     message: "Route not found",
//     path: req.originalUrl,
//   });
// });

// app.use((err, req, res, next) => {
//   console.error("Error:", err.stack);
//   res.status(err.status || 500).json({
//     success: false,
//     message: err.message || "Internal Server Error",
//   })
// });

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
