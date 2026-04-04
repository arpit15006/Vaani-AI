const { supabase } = require("./supabase");
const { encrypt, decrypt } = require("./encryption");

async function findOrCreateUser(email, name = null) {
  if (!supabase) return { id: "local", email, name };

  try {
    // Check if user exists
    const { data: existing } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (existing) return existing;

    // Create new user
    const { data: newUser, error } = await supabase
      .from("users")
      .insert({ email, name })
      .select()
      .single();

    if (error) throw error;
    console.log(`[UserService] ✅ New user created: ${email}`);
    return newUser;
  } catch (err) {
    console.error("[UserService] Error:", err.message);
    return { id: "local", email, name };
  }
}

async function updateTokens(userId, accessToken, refreshToken) {
  if (!supabase || userId === "local") return;

  try {
    const { error } = await supabase
      .from("users")
      .update({
        google_access_token: encrypt(accessToken),
        google_refresh_token: refreshToken ? encrypt(refreshToken) : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) throw error;
    console.log(`[UserService] ✅ Tokens encrypted & stored for user ${userId}`);
  } catch (err) {
    console.error("[UserService] Token update error:", err.message);
  }
}

async function getDecryptedTokens(userId) {
  if (!supabase || userId === "local") return null;

  try {
    const { data, error } = await supabase
      .from("users")
      .select("google_access_token, google_refresh_token")
      .eq("id", userId)
      .single();

    if (error || !data) return null;

    return {
      access_token: data.google_access_token ? decrypt(data.google_access_token) : null,
      refresh_token: data.google_refresh_token ? decrypt(data.google_refresh_token) : null,
    };
  } catch (err) {
    console.error("[UserService] Token retrieval error:", err.message);
    return null;
  }
}

async function getUser(userId) {
  if (!supabase || userId === "local") return null;

  try {
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();
    return data;
  } catch (err) {
    console.error("[UserService] getUser error:", err.message);
    return null;
  }
}

async function getUserByEmail(email) {
  if (!supabase) return null;

  try {
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();
    return data;
  } catch (err) {
    return null;
  }
}

module.exports = { findOrCreateUser, updateTokens, getDecryptedTokens, getUser, getUserByEmail };
