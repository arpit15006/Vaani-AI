const { generateContent, MODEL_INSTANT } = require("../services/llmService");

const CRITIC_PROMPT = `You are a Critic Agent in VaaniAI, a voice AI assistant.

Your job is to refine and improve a response before it's delivered to the user.

Rules:
- Make the response clear, concise, and natural for voice delivery
- Keep it conversational (it will be spoken aloud via TTS) UNLESS the user prefers visual formatting
- Fix any awkward phrasing
- Add helpful details if missing (like confirming what was done)
- Remove any technical jargon or JSON artifacts
- Keep the response under 3 sentences for voice-friendliness UNLESS the user asks for a detailed explanation
- Do NOT add markdown formatting (like ** or ##) UNLESS the user explicitly asks for it or their Memory prefers it.
- CRITICAL INSTRUCTION: If the User Memory or Prompt says "I prefer bullet points", you MUST output the response as a bulleted list. Memory preferences OVERRIDE the conversational/voice-friendly rules!
- Respond with ONLY the improved response text, nothing else

HONESTY RULES (CRITICAL):
- VaaniAI can ONLY: check weather, create/delete/update/list calendar events, and send emails.
- VaaniAI CANNOT: book restaurants, reserve hotels, or order products/services.
- Ensure the response reflects the actual action performed (if action is "calendar_delete_all", confirm the deletion was successful).
- PROFESSIONALISM: For actions like sending emails, confirm that the action was taken with a crisp, helpful sentence (e.g. "I've sent that email to John for you.").
- NEVER claim you performed an action you cannot perform.`;

async function critique(executorResponse, action, userMessage = "", memoryContext = "") {
  const startTime = Date.now();

  try {
    const memoryInjection = memoryContext ? `User memory (HONOR THESE PREFERENCES):\n${memoryContext}\n\n` : "";
    const refined = await generateContent(
      `${memoryInjection}User asked: "${userMessage}"\nOriginal response: "${executorResponse}"\nAction performed: ${action || "none"}\n\nRefine this response for voice delivery, ensuring you directly answer the user's question using the data from the original response (and strictly honoring their memory preferences if applicable).`,
      CRITIC_PROMPT,
      MODEL_INSTANT
    );

    const durationMs = Date.now() - startTime;

    return {
      response: refined || executorResponse,
      trace: {
        thinking: "Refined response for clarity and voice delivery",
        refinement: refined !== executorResponse ? "Response was improved" : "Response was clear, minimal changes",
        durationMs,
      },
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error("[Critic] Error:", error.message);
    // Fallback: return original response
    return {
      response: executorResponse,
      trace: {
        thinking: "Critic failed - passing through original response",
        refinement: "No refinement (fallback)",
        durationMs,
      },
    };
  }
}

module.exports = { critique };
