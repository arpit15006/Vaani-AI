const { generateJSON, MODEL_INSTANT } = require("../services/llmService");

const PERMISSION_PROMPT = `You are a Safety Permission Layer for an autonomous AI named VaaniAI.
Your role is to protect the user's privacy. The AI's Planner wants to use specific tools, some of which require reading the user's private data (emails, calendar).

If the tools array includes sensitive data readers (like 'calendar_list', 'email_list', 'email_read'), you MUST verify if the user explicitly commanded those actions OR recently granted permission OR the request obviously implies reading personal data directly. 

Wait! Rule Clarification:
If the user asks a macro goal like "Plan my day", they didn't explicitly ask you to read their calendar. In this case, you MUST block the action and ask for permission, e.g., "I can check your calendar and weather to plan your day. Shall I proceed?".
However, if the user explicitly says "What's on my schedule today?", they ARE asking you to read their calendar. You do NOT block this.
If the user's recent history contains "Yes" to a permission request, do not block it.

Respond with JSON:
{
  "requiresPermission": true/false,
  "permissionMessage": "If true, provide a polite, concise voice-friendly message asking for permission to access their private data. Otherwise, null."
}`;

async function checkPermission(requestedTools, userMessage, history, accessToken = null) {
  const startTime = Date.now();
  try {
    const sensitiveTools = ["calendar_list", "email_list", "email_read"];
    const toolsUsed = requestedTools || [];
    const containsSensitive = toolsUsed.some(t => sensitiveTools.includes(t));

    if (!containsSensitive) {
      return {
        blocked: false,
        message: null,
        trace: { thinking: "No sensitive tools requested", decision: "Allowed", durationMs: Date.now() - startTime }
      };
    }

    // Proactive Auth Check: If sensitive tools are used, we MUST have a token
    if (!accessToken) {
      const durationMs = Date.now() - startTime;
      return {
        blocked: true,
        message: "I'd love to help with that, but I'll need you to connect your Google account first so I can safely access your data. You can do this by clicking the 'Connect Google' button in the top right.",
        trace: {
          thinking: "Blocking sensitive tools due to missing accessToken",
          decision: "Blocked - No Auth",
          durationMs
        }
      };
    }

    const historySummary = history.slice(-4).map(h => `${h.role}: ${h.content}`).join("\n");
    const prompt = `Requested Tools: ${JSON.stringify(toolsUsed)}
Recent Conversation History:
${historySummary}
User's Current Input: "${userMessage}"

Evaluate if we need explicit permission to proceed.`;

    const result = await generateJSON(prompt, PERMISSION_PROMPT, MODEL_INSTANT);
    const durationMs = Date.now() - startTime;

    return {
      blocked: result?.requiresPermission || false,
      message: result?.permissionMessage || null,
      trace: {
        thinking: "Evaluated privacy requirements for data access",
        decision: result?.requiresPermission ? "Blocked - Pending Permission" : "Allowed",
        durationMs
      }
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error("[PermissionLayer] Error:", error.message);
    return {
      blocked: false, // Fail safe to allowed if LLM crashes (or we could fail secure, but this avoids breaking UI)
      message: null,
      trace: {
        thinking: "Error evaluating permissions",
        decision: "Allowed (Fail-open)",
        durationMs
      }
    };
  }
}

module.exports = { checkPermission };
