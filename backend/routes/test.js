const express = require("express");
const router = express.Router();
const { getStoredAccessToken } = require("../controllers/authController");
const { createCalendarEvent } = require("../tools/calendar");
const { sendEmail } = require("../tools/email");
const { getWeather } = require("../tools/weather");
const { google } = require("googleapis");
const { createOAuth2Client } = require("../controllers/authController");
const { runSystemTest } = require("../services/systemTest");

// GET /api/test/calendar → Create a test event for tomorrow 5PM
router.get("/calendar", async (req, res) => {
  try {
    const accessToken = req.query.token || getStoredAccessToken();

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: "Not authenticated. Please login via /api/auth/google first.",
      });
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await createCalendarEvent({
      title: "VaaniAI Test Event",
      date: "tomorrow",
      time: "5:00 PM",
      accessToken,
    });

    res.json(result);
  } catch (error) {
    console.error("[Test:Calendar] Error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/test/email → Send test email to logged-in user
router.get("/email", async (req, res) => {
  try {
    const accessToken = req.query.token || getStoredAccessToken();

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: "Not authenticated. Please login via /api/auth/google first.",
      });
    }

    // Get the user's email address
    let userEmail;
    try {
      const oauth2Client = createOAuth2Client();
      oauth2Client.setCredentials({ access_token: accessToken });
      const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
      const { data } = await oauth2.userinfo.get();
      userEmail = data.email;
    } catch (e) {
      return res.status(400).json({
        success: false,
        error: "Could not fetch user email. Token may be expired.",
      });
    }

    const result = await sendEmail({
      to: userEmail,
      subject: "VaaniAI Test Email ✅",
      body: `Hello from VaaniAI!\n\nThis is a test email sent via the Gmail API integration.\nIf you're reading this, email integration is working perfectly.\n\nTimestamp: ${new Date().toISOString()}\n\n— VaaniAI`,
      accessToken,
    });

    res.json(result);
  } catch (error) {
    console.error("[Test:Email] Error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/test/weather → Return weather for Delhi
router.get("/weather", async (req, res) => {
  try {
    const city = req.query.city || "Delhi";
    const result = await getWeather({ city });
    res.json(result);
  } catch (error) {
    console.error("[Test:Weather] Error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/test/status → Show system status
router.get("/status", async (req, res) => {
  const accessToken = getStoredAccessToken();
  res.json({
    system: "VaaniAI",
    geminiKey: !!process.env.GEMINI_API_KEY,
    weatherKey: !!process.env.OPENWEATHER_API_KEY,
    googleClientId: !!process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    hasStoredToken: !!accessToken,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/test/run-all → Run the full system evaluation suite
router.get("/run-all", async (req, res) => {
  try {
    // We pass req and res to runSystemTest so it can handle its own response format
    // mimicking the instruction mode behavior from chatController
    req.accessToken = req.query.token || getStoredAccessToken();
    await runSystemTest(req, res);
  } catch (error) {
    console.error("[Test:RunAll] Error:", error.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

module.exports = router;
