const helmet = require("helmet");
const express = require("express");
const debug = require("debug")("development:server");
const sanitizeHtml = require("sanitize-html");
const expressMongoSanitize = require("express-mongo-sanitize");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const lusca = require("lusca");
const cors = require("cors");
const morgan = require("morgan");
const session = require("express-session");
const compression = require("compression");
const hpp = require("hpp");
const bodyParser = require("body-parser");

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "default",
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  },
});

module.exports = [
  rateLimit({
    windowMs:  60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message: "Too many requests, please try again later.",
      });
    },
  }),
  express.json(),
  express.urlencoded({ extended: true }),
  helmet(),
  compression(),
  hpp(),
  bodyParser.json(),
  bodyParser.urlencoded({ extended: true }),
  cors({
  origin: [
    process.env.FRONTEND_URI || "http://localhost:3000",
    "http://localhost:3000",
    "http://localhost:3001"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  credentials: true,
  optionsSuccessStatus: 200,
}),
  morgan("dev"),
  sessionMiddleware,
  cookieParser(),
];