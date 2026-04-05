const { getUserByEmail, findOrCreateUser } = require("../services/userService");
const { getStoredAccessToken } = require("../controllers/authController");
const { google } = require("googleapis");

/**
 * Middleware: Extracts user identity from the request.
 * Supports two flows:
 *   1. Bearer token in Authorization header (from frontend localStorage)
 *   2. Fallback to in-memory token store (for debug panel / legacy)
 * 
 * Attaches: req.userId, req.userEmail, req.accessToken
 */
async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    let accessToken = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      accessToken = authHeader.split(" ")[1];
    } else if (req.query && req.query.token) {
      accessToken = req.query.token;
    }

    if (accessToken) {
      req.accessToken = accessToken;

      // Try to find user by stored email
      let email = req.headers["x-user-email"] || null;
      if (!email && req.query && req.query.email) {
        email = req.query.email;
      }
      
      let user = null;

      if (email) {
        user = await getUserByEmail(email);
      }

      // Self-heal: If no email in headers or user not in DB, fetch from Google
      if (!user) {
        try {
          const auth = new google.auth.OAuth2();
          auth.setCredentials({ access_token: accessToken });
          const oauth2 = google.oauth2({ version: "v2", auth });
          const { data } = await oauth2.userinfo.get();
          email = data.email;
          if (email) {
             user = await findOrCreateUser(email, data.name);
          }
        } catch (e) {
          console.error("[Auth] Failed to verify token with Google:", e.message);
        }
      }

      if (user) {
        req.userId = user.id;
        req.userEmail = user.email;
        return next();
      }

      // Fallback: userId = "local" (not persisted yet)
      req.userId = "local";
      return next();
    }

    // Fallback: check in-memory token store (for debug panel)
    const storedToken = getStoredAccessToken();
    if (storedToken) {
      req.accessToken = storedToken;
      req.userId = "local";
      return next();
    }

    // No auth — still allow request (tools that don't need auth will work)
    req.accessToken = null;
    req.userId = "local";
    next();
  } catch (err) {
    console.error("[Auth Middleware] Error:", err.message);
    req.accessToken = null;
    req.userId = "local";
    next();
  }
}

module.exports = { authenticateUser };
