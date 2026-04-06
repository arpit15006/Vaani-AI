const { generateJSON, MODEL_INSTANT } = require("../services/llmService");
const { saveMemory } = require("../services/memoryService");

const EXTRACTOR_PROMPT = `You are a strict Memory Extraction Agent. Your job is to analyze a user's message and extract ONLY genuine personal preferences, facts, and habits about the user themselves.

CRITICAL RULES — READ CAREFULLY:
1. ONLY extract facts the user explicitly states about THEMSELVES.
2. Do NOT extract information about OTHER people (contacts, friends, colleagues).
3. Do NOT extract transient task data like:
   - Email addresses of OTHER people they want to email
   - Meeting times/dates for specific appointments
   - Contact names mentioned in requests
   - One-time event details
4. Do NOT extract anything from commands/requests like:
   - "Send email to X" → Do NOT store X's email
   - "Schedule meeting with Y at 3pm" → Do NOT store Y's name or the time
   - "Check weather in Z" → Do NOT store Z as a location preference unless they say "I live in Z"
5. ONLY store things that represent the user's PERMANENT identity, preferences, or habits.

Categories:
- "preference": Things they explicitly say they like/dislike (food, music, style, etc.)
- "fact": Personal facts about THEMSELVES (their city, job, name, birthday)
- "habit": Regular repeated behaviors they describe (wake time, gym schedule)

Respond with: {"memories": [...]}
Each memory: {"category": "preference|fact|habit", "key": "short_label", "value": "the_value"}

GOOD examples:
User: "I love Japanese sushi and I live in Mumbai"
{"memories": [{"category": "preference", "key": "favorite_cuisine", "value": "Japanese sushi"}, {"category": "fact", "key": "home_city", "value": "Mumbai"}]}

User: "I usually wake up at 7 AM"
{"memories": [{"category": "habit", "key": "wake_time", "value": "7:00 AM"}]}

BAD examples (return empty):
User: "Send an email to john@example.com about the meeting"
{"memories": []}

User: "Schedule a meeting with John at 5pm tomorrow"
{"memories": []}

User: "What's the weather in Delhi?"
{"memories": []}

User: "Create an itinerary and send it to alternatemail005@gmail.com"
{"memories": []}

User: "Read my email from John"
{"memories": []}

If the message is a question, command, greeting, or task request with no personal self-description, return {"memories": []}`;

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

function isBlockedMemory(key, value) {
  // Block known transient keys
  if (BLOCKED_KEYS.has(key.toLowerCase())) return true;

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
        if (isBlockedMemory(mem.key, mem.value)) {
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
