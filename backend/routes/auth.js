const express = require("express");
const router = express.Router();
const { authLimiter } = require("../middleware/rateLimit");
const {
  redirectToGoogle,
  getAuthUrl,
  handleCallback,
  handleCallbackPost,
  getStatus,
} = require("../controllers/authController");

// GET /api/auth/google → Redirect to Google consent screen
router.get("/google", redirectToGoogle);

// GET /api/auth/url → Return auth URL as JSON
router.get("/url", getAuthUrl);

// GET /api/auth/callback → Exchange code + redirect to frontend (rate limited)
router.get("/callback", authLimiter, handleCallback);

// POST /api/auth/callback → Exchange code + return tokens as JSON (rate limited)
router.post("/callback", authLimiter, handleCallbackPost);

// GET /api/auth/status → Check if authenticated
router.get("/status", getStatus);

module.exports = router;

