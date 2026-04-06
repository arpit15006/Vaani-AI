const { generateJSON, MODEL_INSTANT } = require("../services/llmService");
const { saveMemory } = require("../services/memoryService");

const EXTRACTOR_PROMPT = `You are a strict Memory Extraction Agent. Your job is to analyze a user's message and extract ONLY genuine personal preferences, facts, and habits about the user themselves.

6. USER IDENTITY: You MAY extract the user's own email address or personal contact info IF they explicitly state it about themselves (e.g., "my email is...", "remember my mail").
7. DO NOT store emails of other people, even if given in the same sentence.

Categories:
- "preference": Things they explicitly say they like/dislike (food, music, style, etc.)
- "fact": Personal facts about THEMSELVES (their city, job, name, birthday, personal email)
- "habit": Regular repeated behaviors they describe (wake time, gym schedule)

Respond with: {"memories": [...]}
Each memory: {"category": "preference|fact|habit", "key": "short_label", "value": "the_value"}

GOOD examples:
User: "I love Japanese sushi and I live in Mumbai"
{"memories": [{"category": "preference", "key": "favorite_cuisine", "value": "Japanese sushi"}, {"category": "fact", "key": "home_city", "value": "Mumbai"}]}

User: "Remember my work email: arpit@company.com"
{"memories": [{"category": "fact", "key": "work_email", "value": "arpit@company.com"}]}

User: "I usually wake up at 7 AM"
{"memories": [{"category": "habit", "key": "wake_time", "value": "7:00 AM"}]}

BAD examples (return empty):
User: "Send an email to john@example.com about the meeting"
{"memories": []}

User: "Schedule a meeting with John at 5pm tomorrow"
{"memories": []}

User: "What's the weather in Delhi?"
{"memories": []}

User: "Read my email from John"
{"memories": []}

If the message is a question, command, greeting, or task request with no personal self-description, return {"memories": []}
`;

// Keys that should NEVER be stored as memories
const BLOCKED_KEYS = new Set([
  "email", "email_contact", "email_address", "contact_email",
  "recipient", "recipient_email", "send_to",
  "contact_name", "meeting_contact", "person_name",
  "meeting_time", "meeting_date", "appointment_time", "appointment_date",
  "event_time", "event_date", "schedule_time",
]);

// Patterns that indicate transient data, not personal facts
const BLOCKED_VALUE_PATTERNS = [
  /@.*\.com$/i,      // Email addresses
  /@.*\.org$/i,
  /@.*\.net$/i,
  /^\d{1,2}:\d{2}/,  // Time patterns like "5:00 PM"
  /^tomorrow$/i,
  /^today$/i,
  /^next\s/i,        // "next Monday", "next week"
];

function isBlockedMemory(key, value, userMessage = "") {
  const lowerKey = key.toLowerCase();
  const lowerMsg = userMessage.toLowerCase();
  
  // Allow the user to store their OWN email if they explicitly mentioned it as theirs
  const isPersonalEmailRequest = lowerMsg.includes("my email") || lowerMsg.includes("my mail") || lowerMsg.includes("remember my");
  if (isPersonalEmailRequest && /@.*\.com|org|net$/i.test(value)) {
    console.log(`[MemoryExtractor] 🔓 Allowing personal email memory: ${key} = "${value}"`);
    return false;
  }

  // Block known transient keys
  if (BLOCKED_KEYS.has(lowerKey)) return true;

  // Block values that look like email addresses or times
  for (const pattern of BLOCKED_VALUE_PATTERNS) {
    if (pattern.test(value)) return true;
  }

  return false;
}

async function extractMemories(userId, userMessage) {
  if (!userMessage || userId === "local") return;

  try {
    const result = await generateJSON(
      `User message: "${userMessage}"`,
      EXTRACTOR_PROMPT,
      MODEL_INSTANT
    );

    if (!result || !result.memories || !Array.isArray(result.memories)) return;
    if (result.memories.length === 0) return;

    let savedCount = 0;
    for (const mem of result.memories) {
      if (mem.category && mem.key && mem.value) {
        // Hard filter: skip blocked keys/values even if LLM extracted them
        if (isBlockedMemory(mem.key, mem.value, userMessage)) {
          console.log(`[MemoryExtractor] ⛔ Blocked transient memory: ${mem.key} = "${mem.value}"`);
          continue;
        }
        await saveMemory(userId, mem.category, mem.key, mem.value);
        savedCount++;
      }
    }

    if (savedCount > 0) {
      console.log(`[MemoryExtractor] ✅ Saved ${savedCount} memories (filtered ${result.memories.length - savedCount})`);
    }
  } catch (err) {
    console.error("[MemoryExtractor] Error:", err.message);
  }
}

module.exports = { extractMemories };
