const { getDecryptedTokens, updateTokens } = require("./userService");
const fetch = require("node-fetch"); // Or use global fetch if Node 18+

async function refreshGoogleAccessToken(userId, refreshToken) {
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error_description || "Failed to refresh token");
    }

    // Update in Supabase securely
    await updateTokens(userId, data.access_token, refreshToken);
    return data.access_token;
  } catch (err) {
    console.error(`[TokenService] Refresh failed for ${userId}:`, err.message);
    return null;
  }
}

async function isTokenValid(accessToken) {
  try {
    // Simple fast check: call TokenInfo endpoint
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`);
    const data = await res.json();
    // If it has expires_in > 0, it's valid
    if (!res.ok || Number(data.expires_in) < 60) return false;
    return true;
  } catch {
    return false;
  }
}

async function getValidAccessToken(userId) {
  if (userId === "local") return null;

  const tokens = await getDecryptedTokens(userId);
  if (!tokens || !tokens.access_token) return null;

  const valid = await isTokenValid(tokens.access_token);
  if (valid) return tokens.access_token;

  if (tokens.refresh_token) {
    console.log(`[TokenService] Access token expired for ${userId}, refreshing...`);
    return await refreshGoogleAccessToken(userId, tokens.refresh_token);
  }

  return null;
}

module.exports = { getValidAccessToken };
