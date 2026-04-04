const { generateContent, MODEL_INSTANT } = require("../services/llmService");

const SUGGESTION_PROMPT = `You are a follow-up action generator for an AI assistant.
Based on the conversation history, the user's last message, and the AI's response, suggest 3 highly relevant follow-up actions the user might want to take.

These suggestions should be concise (max 5-6 words) and actionable.

Format your response strictly as a JSON array of strings:
["Check tomorrow's weather", "Email me this itinerary", "Add this to my calendar"]

CRITICAL: ONLY OUTPUT VALID PARSABLE JSON. NO MARKDOWN BLOCK (\`\`\`json). NO OTHER TEXT.`;

async function generateSuggestions(history, userMessage, aiResponse, memoryContext = "") {
  try {
    const context = history.length > 0
      ? `\nRecent context:\n${history.slice(-3).map(h => `${h.role}: ${h.content}`).join("\n")}\n`
      : "";

    const fullPrompt = `${memoryContext ? `\nUser memory:\n${memoryContext}\n` : ""}${context}
User: "${userMessage}"
AI Response: "${aiResponse}"

Generate 3 concise follow-up actions as JSON.`;

    const result = await generateContent(fullPrompt, SUGGESTION_PROMPT, MODEL_INSTANT);
    
    // Attempt to parse JSON safely
    const cleanResult = result.replace(/```json/g, '').replace(/```/g, '').trim();
    const suggestions = JSON.parse(cleanResult);

    if (Array.isArray(suggestions) && suggestions.length > 0) {
      // Ensure max 3 string elements
      return suggestions.filter(s => typeof s === "string").slice(0, 3);
    }
    
    return [];
  } catch (error) {
    console.error("[SuggestionGen] Failed to generate suggestions:", error.message);
    return [];
  }
}

module.exports = { generateSuggestions };
