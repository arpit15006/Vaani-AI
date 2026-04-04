const { generateJSON, MODEL_INSTANT } = require("../services/llmService");
const { saveMemory } = require("../services/memoryService");

const EXTRACTOR_PROMPT = `You are a Memory Extraction Agent. Your job is to analyze a user's message and extract personal facts, preferences, and habits.

ONLY extract facts that the user explicitly states about themselves. Do NOT infer or guess.

Categories:
- "preference": Things they like or dislike (food, music, travel, etc.)
- "fact": Personal facts (city, job, name, birthday, etc.)
- "habit": Regular behaviors (wake time, gym schedule, etc.)

Respond with a JSON object: {"memories": [...]}
Each memory: {"category": "preference|fact|habit", "key": "short_label", "value": "the_value"}

Examples:
User: "I love Japanese sushi and I live in Mumbai"
{"memories": [{"category": "preference", "key": "favorite_cuisine", "value": "Japanese sushi"}, {"category": "fact", "key": "home_city", "value": "Mumbai"}]}

User: "I usually wake up at 7 AM"
{"memories": [{"category": "habit", "key": "wake_time", "value": "7:00 AM"}]}

User: "What's the weather in Delhi?"
{"memories": []}

Rules:
- If the message is a question, command, or greeting with no personal info, return {"memories": []}
- Keep keys short and snake_case (e.g., "favorite_color", "home_city")
- Keep values concise but complete
- Do NOT extract tool requests as memories`;

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

    for (const mem of result.memories) {
      if (mem.category && mem.key && mem.value) {
        await saveMemory(userId, mem.category, mem.key, mem.value);
      }
    }

    console.log(`[MemoryExtractor] ✅ Extracted ${result.memories.length} memories from message`);
  } catch (err) {
    console.error("[MemoryExtractor] Error:", err.message);
  }
}

module.exports = { extractMemories };
