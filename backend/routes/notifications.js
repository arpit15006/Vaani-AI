const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../middleware/authenticateUser");
const { addClient, removeClient } = require("../services/notificationService");
const { startWatcher, stopWatcher } = require("../services/proactiveService");

router.get("/stream", authenticateUser, (req, res) => {
  if (!req.userId || req.userId === "local") {
    // Only real DB users can receive background proactive alerts safely
    return res.status(401).json({ error: "Requires connected account" });
  }

  // Set SSE Headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const userId = req.userId;
  const timezone = req.query.tz || "UTC";

  // Register the client connection
  addClient(userId, res);
  
  // Start the background intelligence tracker scoped ONLY to this active user
  startWatcher(userId, timezone);

  // Keep connection alive with pongs every 30s
  const keepAlive = setInterval(() => {
    res.write(":\n\n"); // SSE comment to keep socket open
  }, 30000);

  // On Disconnect
  req.on("close", () => {
    clearInterval(keepAlive);
    removeClient(userId);
    stopWatcher(userId); // Stop wasting Google API quota!
  });
});

module.exports = router;
