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

// Hardcoded keyword safety net — LLM was misclassifying these as direct_command
const CONFIRM_KEYWORDS = ["yes", "yeah", "yep", "yup", "sure", "ok", "okay", "do it", "send it", "go ahead", "confirm", "execute", "proceed", "looks good", "ship it", "fire", "haan", "kar do", "bhej do", "approved", "add it", "add to calendar", "add to my calendar", "schedule it"];
const CANCEL_KEYWORDS = ["no", "nah", "cancel", "discard", "nevermind", "never mind", "forget it", "nahi", "mat karo", "ruko", "stop"];
const EDIT_KEYWORDS = ["change", "update", "modify", "edit", "switch", "make it", "set it to", "set to", "push to", "move to", "move it", "reschedule", "shift", "instead", "actually", "badal do", "change kar"];

async function classifyIntent(userMessage, pendingAction = null) {
  const startTime = Date.now();
  try {
    // === FAST PATH: If there is a pending action, check keywords first before burning an LLM call ===
    if (pendingAction) {
      const lower = userMessage.toLowerCase().trim();
      
      // 1. EDIT takes highest priority — user wants to modify the draft
      if (EDIT_KEYWORDS.some(kw => lower.includes(kw))) {
        const durationMs = Date.now() - startTime;
        return {
          intent: "edit_draft",
          trace: { thinking: `Fast-path keyword match: "${lower}" detected as edit_draft`, decision: "edit_draft", durationMs }
        };
      }

      // 2. CANCEL — user wants to discard
      if (CANCEL_KEYWORDS.some(kw => lower === kw || lower.startsWith(kw + " ") || lower.endsWith(" " + kw))) {
        const durationMs = Date.now() - startTime;
        return {
          intent: "cancel_draft",
          trace: { thinking: `Fast-path keyword match: "${lower}" detected as cancel_draft`, decision: "cancel_draft", durationMs }
        };
      }

      // 3. CONFIRM — user wants to execute. Use .includes() for phrases like "add it to calendar"
      if (CONFIRM_KEYWORDS.some(kw => lower === kw || lower.startsWith(kw + " ") || lower.endsWith(" " + kw) || lower.includes(kw))) {
        const durationMs = Date.now() - startTime;
        return {
          intent: "confirmation",
          trace: { thinking: `Fast-path keyword match: "${lower}" detected as confirmation`, decision: "confirmation", durationMs }
        };
      }

      // 4. If none matched but pending action exists, let LLM decide (fallthrough)
    }

    const pendingContext = pendingAction 
      ? `\n[SYSTEM CRITICAL: There is a PENDING ACTION of type "${pendingAction.tool}" waiting for the user's response. If the user says ANYTHING that means "yes", "go ahead", "send it", "execute", "confirm", "do it" — classify as "confirmation". If the user modifies details — classify as "edit_draft". If the user says "no" or "cancel" — classify as "cancel_draft". Do NOT classify confirmation words as "direct_command".]\n`
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
