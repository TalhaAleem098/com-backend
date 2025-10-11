const express = require("express");
const app = express();
require("module-alias/register");
require("dotenv").config({ quiet: true });
require("./config/db")();

app.use(require("./middlewares/main.js"));

// app.use(async (req,res,next)=>{
//   await new Promise((resolve)=>setTimeout(resolve,10000));
//   next();
// })

app.use("/api", require("./routes/api.route.js"));

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
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
