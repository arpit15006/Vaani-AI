require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { globalLimiter } = require("./middleware/rateLimit");
const chatRoutes = require("./routes/chat");
const authRoutes = require("./routes/auth");
const testRoutes = require("./routes/test");
const userRoutes = require("./routes/user");

const app = express();
const PORT = process.env.PORT || 5000;

// === CORS (Production-ready: supports multiple origins) ===
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, health checks)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      return callback(null, true);
    }
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-user-email"],
}));

app.use(express.json({ limit: "50kb" }));
app.use(globalLimiter);

// Disable response buffering for SSE/NDJSON streaming on Render
app.use((req, res, next) => {
  res.setHeader("X-Accel-Buffering", "no");
  next();
});

// Routes
app.use("/api/chat", chatRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);
app.use("/api/user", userRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), env: process.env.NODE_ENV || "development" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("[Server Error]", err.message);
  if (!res.headersSent) {
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "production" ? "Something went wrong" : err.message,
    });
  }
});

// Start server
async function start() {
  try {
    await app.listen(PORT);
    console.log(`🚀 VaaniAI Backend running on port ${PORT}`);
    console.log(`📡 Allowed Origins: ${allowedOrigins.join(", ")}`);
    console.log(`🔒 Environment: ${process.env.NODE_ENV || "development"}`);
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
}

start();
