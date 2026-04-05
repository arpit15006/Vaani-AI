const { generateJSON, MODEL_INSTANT } = require("../services/llmService");

const CLASSIFIER_PROMPT = `You are the Intent Classifier for VaaniAI.
Your job is to analyze the user's input and categorize their high-level intent.

Available Intents:
- "plan_day": User wants to plan, organize, or summarize their day/schedule today.
- "meeting_prep": User is asking to prepare for an upcoming meeting or summarize recent emails from someone.
- "implicit_weather": User is implicitly asking about weather (e.g., "do I need an umbrella?", "is it cold?").
- "direct_command": Explicit commands to use a specific tool (e.g., "send an email", "delete meeting", "what's the weather in Delhi").
- "confirmation": User is saying YES to a pending action draft (e.g., "Yes, send it", "Looks good").
- "edit_draft": User is asking to modify a pending draft (e.g., "Change the subject to Hello", "Push the meeting to 4pm").
- "cancel_draft": User is saying NO or cancelling a pending draft.
- "casual_query": General conversation, greetings, simple questions not needing specialized tools.

Respond with JSON:
{
  "intent": "plan_day" | "meeting_prep" | "implicit_weather" | "direct_command" | "confirmation" | "edit_draft" | "cancel_draft" | "casual_query"
}`;

async function classifyIntent(userMessage, pendingAction = null) {
  const startTime = Date.now();
  try {
    const pendingContext = pendingAction 
      ? `\n[SYSTEM WARNING: There is currently a PENDING ACTION waiting for confirmation. Action Type: ${pendingAction.tool}. Does the user's message confirm it, edit it, or cancel it?]\n`
      : "";
      
    const prompt = `User's Output: "${userMessage}"${pendingContext}\n\nClassify the intent using the provided categories.`;
    const result = await generateJSON(prompt, CLASSIFIER_PROMPT, MODEL_INSTANT);

    const durationMs = Date.now() - startTime;

    return {
      intent: result?.intent || "casual_query",
      trace: {
        thinking: `Classified user intent as ${result?.intent || "casual_query"}`,
        decision: result?.intent || "casual_query",
        durationMs
      }
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error("[IntentClassifier] Error:", error.message);
    return {
      intent: "casual_query",
      trace: {
        thinking: "Classifier failed, falling back to casual_query",
        decision: "casual_query",
        durationMs
      }
    };
  }
}

module.exports = { classifyIntent };
