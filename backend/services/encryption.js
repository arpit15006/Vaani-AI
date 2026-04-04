const crypto = require("crypto");

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY
  ? Buffer.from(process.env.ENCRYPTION_KEY, "hex")
  : null;
const IV_LENGTH = 12; // GCM standard

function encrypt(text) {
  if (!ENCRYPTION_KEY) {
    console.warn("[Encryption] No ENCRYPTION_KEY set. Storing plaintext.");
    return text;
  }
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

function decrypt(encryptedText) {
  if (!ENCRYPTION_KEY) return encryptedText;
  try {
    const parts = encryptedText.split(":");
    if (parts.length !== 3) return encryptedText; // Not encrypted, return as-is
    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("[Encryption] Decryption failed:", err.message);
    return encryptedText; // Return as-is on failure
  }
}

module.exports = { encrypt, decrypt };
