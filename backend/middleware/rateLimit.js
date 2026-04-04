const rateLimit = require("express-rate-limit");

const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: "Too many requests",
      message: "Please slow down and try again later.",
      retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000) / 1000),
    });
  },
});

const chatLimiter = rateLimit({
  windowMs: parseInt(process.env.CHAT_RATE_LIMIT_WINDOW_MS) || 60 * 1000,
  max: parseInt(process.env.CHAT_RATE_LIMIT_MAX) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: "Too many requests",
      message: "You're sending messages too fast. Please wait a moment.",
      retryAfter: Math.ceil((parseInt(process.env.CHAT_RATE_LIMIT_WINDOW_MS) || 60000) / 1000),
    });
  },
});

const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Only 10 auth attempts per 5 min
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: "Too many authentication attempts",
      message: "Please wait before trying to authenticate again.",
      retryAfter: 300,
    });
  },
});

module.exports = { globalLimiter, chatLimiter, authLimiter };

