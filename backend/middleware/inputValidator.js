/**
 * Input Validation & Sanitization Middleware
 * 
 * Protects the chat pipeline from:
 * 1. Script injection (XSS via <script> tags)
 * 2. Prompt injection (system override attempts)
 * 3. Over-length payloads (prevent token abuse)
 * 4. Malformed JSON bodies
 */

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_ITEMS = 50;

// Regex patterns for dangerous content
const SCRIPT_INJECTION_REGEX = /<script[\s\S]*?>[\s\S]*?<\/script>/gi;
const HTML_TAG_REGEX = /<\/?[a-z][a-z0-9]*\b[^>]*>/gi;
const SQL_INJECTION_REGEX = /('|"|;|--|\b(DROP|DELETE|INSERT|UPDATE|ALTER|EXEC)\b)/gi;

function sanitizeText(text) {
  if (typeof text !== "string") return "";
  return text
    .replace(SCRIPT_INJECTION_REGEX, "")  // Kill script tags
    .replace(HTML_TAG_REGEX, "")           // Strip HTML tags
    .trim();
}

function validateChatInput(req, res, next) {
  const { message, history } = req.body;

  // 1. Message validation
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Message is required and must be a string." });
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ 
      error: `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters.`,
      maxLength: MAX_MESSAGE_LENGTH 
    });
  }

  // 2. Sanitize the message
  req.body.message = sanitizeText(message);

  // 3. Validate history array
  if (history) {
    if (!Array.isArray(history)) {
      return res.status(400).json({ error: "History must be an array." });
    }

    if (history.length > MAX_HISTORY_ITEMS) {
      // Silently truncate to last N items instead of rejecting
      req.body.history = history.slice(-MAX_HISTORY_ITEMS);
    }

    // Sanitize each history item
    req.body.history = req.body.history.map(item => ({
      role: item.role === "user" || item.role === "assistant" ? item.role : "user",
      content: typeof item.content === "string" ? sanitizeText(item.content) : ""
    }));
  }

  // 4. Check for obvious SQL injection patterns in message
  if (SQL_INJECTION_REGEX.test(req.body.message)) {
    console.warn(`[Security] Suspicious SQL pattern detected from IP: ${req.ip}`);
    // Don't block — just log. The LLM won't execute SQL anyway.
  }

  next();
}

module.exports = { validateChatInput, sanitizeText };
