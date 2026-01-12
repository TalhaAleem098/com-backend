const express = require("express");
const app = express();
require("module-alias/register");
require("dotenv").config({ quiet: true });
const { connectDB } = require("./config/db");
connectDB();
const { initializeCronJobs } = require("./utils/cron");
const { createSocketServer } = require("./routes/sockets.route");
const http = require("http");
const { getRegisteredRoutes } = require("./utils/register.routes");

const httpServer = http.createServer(app);
createSocketServer(httpServer);

initializeCronJobs();

app.use(require("./middlewares/main.js"));

// app.use(async (req,res,next)=>{
//   await new Promise((resolve)=>setTimeout(resolve,10000));
//   next();
// })

const apiRoutes = require("./routes/api.routes.js");

const registeredRoutes = getRegisteredRoutes().map(route => {
  const normalizedPath = route.path.replace(/\/$/, '');
  const pattern = normalizedPath.replace(/:\w+/g, '[^/]+');
  return { method: route.method.toUpperCase(), pattern: new RegExp(`^${pattern}$`), original: normalizedPath };
});

app.use((req, res, next) => {
  const fullPath = req.originalUrl.split('?')[0]; 
  const method = req.method;
  const matched = registeredRoutes.find(r => r.method === method && r.pattern.test(fullPath));
  if (matched) {
    console.log(`Request: ${method} ${fullPath} -> Matched: ${matched.method} ${matched.original}`);
  } else {
    console.log(`Request: ${method} ${fullPath} -> Not registered`);
  }
  next();
});

app.use("/api", apiRoutes);

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

// console.log("Registered Routes:");
// const routes = getRegisteredRoutes();
// const grouped = {};

// routes.forEach((route) => {
//   const parts = route.path.split('/').filter(p => p);
//   const category = parts[1] || 'other';
//   const subCategory = parts[2] || 'general';

//   if (!grouped[category]) grouped[category] = {};
//   if (!grouped[category][subCategory]) grouped[category][subCategory] = [];
//   grouped[category][subCategory].push(route);
// });

// Object.keys(grouped).sort().forEach((category) => {
//   console.log(`\n${category.toUpperCase()}:`);
//   Object.keys(grouped[category]).sort().forEach((sub) => {
//     console.log(`  ${sub.charAt(0).toUpperCase() + sub.slice(1)}:`);
//     grouped[category][sub].forEach((route) => {
//       const normalizedPath = route.path.replace(/\/$/, '');
//       console.log(`    ${route.method.toUpperCase()} ${normalizedPath}`);
//     });
//   });
// });

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});