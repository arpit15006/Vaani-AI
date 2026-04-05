const { generateJSON, MODEL_INSTANT } = require("../services/llmService");

const OBSERVER_PROMPT = `You are an Observer Agent in VaaniAI.
Your role is to evaluate whether a user's original request has been fullfilled based on the latest tool execution results.

Respond with JSON:
{
  "taskCompleted": true/false,
  "nextStep": "Provide a clear instruction of what next tool/action is needed, or null if completed",
  "reasoning": "Brief explanation of why you made this decision"
}

RULES:
- If the tool execution failed, taskCompleted is FALSE. Provide a logical fallback in nextStep.
- If the tool execution succeeded, check if the data retrieved fullfills the WHOLE user request.
- Example 1: User asked: "Do I have meetings tomorrow and at what time?". Tool 'calendar_list' returned 2 meetings. -> taskCompleted: TRUE.
- Example 2: User asked: "Check my schedule and email Zorvyn if I have free time". Tool 'calendar_list' returned no meetings. The email hasn't been sent yet! -> taskCompleted: FALSE. nextStep: "Send email to Zorvyn saying I am free".
- If you are unsure, set taskCompleted to FALSE and suggest a next step.`;

async function observe(userRequest, executionOutput) {
  const startTime = Date.now();
  try {
    const prompt = `User's Original Request: "${userRequest}"\nLatest Execution Output: "${executionOutput}"\n\nAnalyze this output. Is the user's task completely finished?`;
    const result = await generateJSON(prompt, OBSERVER_PROMPT, MODEL_INSTANT);

    const durationMs = Date.now() - startTime;

    return {
      taskCompleted: result?.taskCompleted || false,
      nextStep: result?.nextStep || null,
      reasoning: result?.reasoning || "Could not determine",
      trace: {
        thinking: result?.reasoning || "Failed to observe properly",
        decision: result?.taskCompleted ? "Goal Met" : "Requires more steps",
        durationMs
      }
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error("[Observer] Error:", error.message);
    return {
      taskCompleted: true, // Fail-safe to avoid infinite loops if observer crashes
      nextStep: null,
      reasoning: "Observer crashed. Halting loop for safety.",
      trace: {
        thinking: "Observer error",
        decision: "Halted",
        durationMs
      }
    };
  }
}

module.exports = { observe };
