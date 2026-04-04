const { google } = require("googleapis");
const { findOrCreateUser, updateTokens } = require("../services/userService");

// In-memory token store (fallback for test routes / legacy)
const tokenStore = new Map();

function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

// GET /api/auth/google → Redirect user to Google consent screen
const redirectToGoogle = (req, res) => {
  try {
    const oauth2Client = createOAuth2Client();
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [
        "openid",
        "profile",
        "email",
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.readonly",
      ],
    });
    res.redirect(url);
  } catch (error) {
    console.error("[Auth] Error redirecting to Google:", error.message);
    res.status(500).json({ error: "Failed to start OAuth flow" });
  }
};

// GET /api/auth/url → Return the URL as JSON (for frontend fetch)
const getAuthUrl = (req, res) => {
  try {
    const oauth2Client = createOAuth2Client();
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [
        "openid",
        "profile",
        "email",
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.readonly",
      ],
    });
    res.json({ url });
  } catch (error) {
    console.error("[Auth] Error generating auth URL:", error.message);
    res.status(500).json({ error: "Failed to generate auth URL" });
  }
};

// GET /api/auth/callback → Exchange code, store tokens, redirect to frontend
const handleCallback = async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) {
      return res.status(400).json({ error: "Authorization code missing" });
    }

    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    // Get user info from Google
    oauth2Client.setCredentials(tokens);
    let userEmail = "default";
    let userName = "User";
    try {
      const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
      const { data } = await oauth2.userinfo.get();
      userEmail = data.email || "default";
      userName = data.name || "User";
    } catch (e) {
      console.error("[Auth] Could not fetch user info:", e.message);
    }

    // New Flow: Persist User & Tokens in Supabase
    if (userEmail !== "default") {
      const user = await findOrCreateUser(userEmail, userName);
      if (user && user.id) {
        await updateTokens(user.id, tokens.access_token, tokens.refresh_token);
      }
    }

    // Keep latest in memory as fallback
    tokenStore.set("latest", tokens);

    console.log(`[Auth] ✅ Authenticated: ${userEmail}`);

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    res.redirect(
      `${frontendUrl}/dashboard?access_token=${tokens.access_token}&email=${encodeURIComponent(userEmail)}`
    );
  } catch (error) {
    console.error("[Auth] Error exchanging code:", error.message);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    res.redirect(`${frontendUrl}/dashboard?auth_error=true`);
  }
};

// POST /api/auth/callback → Exchange code and return tokens as JSON (for SPA flow)
const handleCallbackPost = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: "Authorization code is required" });
    }

    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    tokenStore.set("latest", tokens);

    res.json({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
    });
  } catch (error) {
    console.error("[Auth] Error exchanging code:", error.message);
    res.status(500).json({ error: "Failed to exchange authorization code" });
  }
};

// GET /api/auth/status → Check if we have stored tokens
const getStatus = (req, res) => {
  const latest = tokenStore.get("latest");
  if (latest && latest.access_token) {
    res.json({ authenticated: true, hasToken: true });
  } else {
    res.json({ authenticated: false, hasToken: false });
  }
};

// Helper: get stored access token (for test routes)
function getStoredAccessToken() {
  const latest = tokenStore.get("latest");
  return latest ? latest.access_token : null;
}

module.exports = {
  redirectToGoogle,
  getAuthUrl,
  handleCallback,
  handleCallbackPost,
  getStatus,
  createOAuth2Client,
  getStoredAccessToken,
};
