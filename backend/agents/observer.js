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
- If the execution just retrieved data (e.g., weather or calendar data), taskCompleted is FALSE because you must summarize it for the user! 
  - nextStep: "Summarize the gathered data and respond to the user's original request cohesively."
- If the final execution output is already a natural language summarization/response to the user, taskCompleted is TRUE.
- Example 1: User asked: "Plan my day". Current Output has raw JSON calendar events. -> taskCompleted: FALSE. nextStep: "Summarize the events to plan the user's day."
- Example 2: User asked: "Plan my day". Current Output says "Here is your plan for the day..." -> taskCompleted: TRUE.
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
