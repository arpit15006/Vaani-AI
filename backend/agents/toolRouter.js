const { generateJSON, MODEL_INSTANT } = require("../services/llmService");

const TOOL_ROUTER_PROMPT = `You are a Tool Router in a multi-agent AI system called VaaniAI.

Your job is to determine if a planned step ACTUALLY requires a real tool call or if it can be handled with a conversational response.

Available tools: calendar, calendar_delete, calendar_update, calendar_list, email, email_list, email_read, weather

For the given step, respond with JSON:
{
  "requiresTool": true/false,
  "toolName": "calendar" | "calendar_delete" | "calendar_update" | "calendar_list" | "email" | "email_list" | "email_read" | "weather" | null,
  "confidence": 0.0 to 1.0,
  "reason": "Brief explanation"
}

Rules:
- If the step mentions creating events, scheduling, reminders → calendar (requiresTool: true)
- If the step mentions deleting, removing, canceling events → calendar_delete (requiresTool: true)
- If the step mentions updating, rescheduling, pushing back, changing time → calendar_update (requiresTool: true)
- If the step mentions listing, showing, viewing upcoming events → calendar_list (requiresTool: true)
- If the step mentions sending email, mailing → email (requiresTool: true)
- If the step mentions checking inbox, listing emails, showing messages → email_list (requiresTool: true)
- If the step mentions reading a specific email, opening a message → email_read (requiresTool: true)
- If the step mentions weather, temperature, forecast → weather (requiresTool: true)
- If the step is a greeting, question, conversation → requiresTool: false
- If confidence < 0.5, set requiresTool to false (safer to just respond)
- Be conservative: only route to tool if clearly needed`;

async function routeTools(steps) {
  const startTime = Date.now();

  try {
    const routedSteps = [];

    for (const step of steps) {
      // If planner already said "none", skip routing
      if (step.tool === "none") {
        routedSteps.push({
          ...step,
          routing: { requiresTool: false, toolName: null, confidence: 1.0, reason: "Planner marked as no tool needed" },
        });
        continue;
      }

      try {
        const result = await generateJSON(
          `Step: "${step.step}"\nSuggested tool: "${step.tool}"\nParams: ${JSON.stringify(step.params)}`,
          TOOL_ROUTER_PROMPT,
          MODEL_INSTANT
        );

        if (result && typeof result.requiresTool === "boolean") {
          routedSteps.push({ ...step, routing: result });
        } else {
          // Fallback: trust planner
          routedSteps.push({
            ...step,
            routing: { requiresTool: true, toolName: step.tool, confidence: 0.7, reason: "Router fallback - trusting planner" },
          });
        }
      } catch {
        // On error, default to no tool (safe)
        routedSteps.push({
          ...step,
          routing: { requiresTool: false, toolName: null, confidence: 0.5, reason: "Router error - defaulting to conversational" },
        });
      }
    }

    const durationMs = Date.now() - startTime;
    const mainRouting = routedSteps.find(s => s.routing && s.routing.requiresTool)?.routing 
      || routedSteps[0]?.routing 
      || { requiresTool: false, toolName: null, confidence: 0, reason: "No steps" };

    return {
      steps: routedSteps,
      trace: {
        decision: mainRouting.requiresTool ? "Tool required" : "No tool needed",
        toolName: mainRouting.toolName,
        confidence: mainRouting.confidence,
        reason: mainRouting.reason,
        durationMs,
      },
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error("[ToolRouter] Error:", error.message);
    return {
      steps: steps.map((s) => ({
        ...s,
        routing: { requiresTool: false, toolName: null, confidence: 0, reason: "Router failed" },
      })),
      trace: {
        decision: "No tool needed",
        toolName: null,
        confidence: 0,
        reason: "Tool Router failed - defaulting to conversational",
        durationMs,
      },
    };
  }
}

module.exports = { routeTools };
