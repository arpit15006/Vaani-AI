const { generateContent } = require("../services/llmService");
const { createCalendarEvent, listCalendarEvents, deleteCalendarEvent, updateCalendarEvent } = require("../tools/calendar");
const { sendEmail, listEmails, readEmail } = require("../tools/email");
const { getWeather } = require("../tools/weather");

const toolFunctions = {
  calendar: createCalendarEvent,
  calendar_create: createCalendarEvent,
  calendar_list: listCalendarEvents,
  calendar_delete: deleteCalendarEvent,
  calendar_update: updateCalendarEvent,
  email: sendEmail,
  email_list: listEmails,
  email_read: readEmail,
  weather: getWeather,
};

async function execute(routeResult, message, history = [], accessToken = null, memoryContext = "", userName = "", timezone = "UTC", previousContext = "", isConfirmed = false) {
  const startTime = Date.now();
  const routedSteps = routeResult.steps;
  const routerDecision = routeResult.trace.decision;
  const stepResults = []; // Accumulates results for chaining
  let toolCalled = null;
  let actionPerformed = null;
  const actionsLog = []; // For action history logging
  const destructiveTools = ["email", "calendar", "calendar_create", "calendar_delete", "calendar_update"];
  let pendingActionPayload = null;

  try {
    for (let i = 0; i < routedSteps.length; i++) {
      const step = routedSteps[i];

      // Build context from previous step results (TOOL CHAINING)
      const previousStepContext = stepResults.length > 0
        ? `\nPrevious step results:\n${stepResults.map(r => `- ${r.step}: ${r.summary}`).join("\n")}\n`
        : "";

      if (routerDecision === "Tool required" && step.routing?.requiresTool && step.routing?.toolName) {
        const toolFn = toolFunctions[step.routing.toolName];

        if (toolFn) {
          try {
            let paramsToPass = { ...step.params, accessToken, timezone };

            // Auto-draft email bodies with full context injection
            if (step.routing.toolName === "email") {
              const historyContext = history.length > 0
                ? `\nConversation history:\n${history.slice(-10).map(h => `${h.role}: ${h.content}`).join("\n")}\n`
                : "";

              const draftedBody = await generateContent(
                `${memoryContext ? `\nUser memory:\n${memoryContext}\n` : ""}${historyContext}${previousStepContext}\nThe user requested to send an email: "${message}".

CRITICAL INSTRUCTIONS:
- You are drafting the ACTUAL body of the email.
- IDENTITY: Act as the USER (the person sending the email). Use first-person ("I", "me", "my").
- NEVER mention "VaaniAI", "Assistant", or your AI nature in the body.
- RECIPIENT: Speak directly to the recipient (e.g. "Hi Zorvyn, ...").
- TONE: Professional, efficient, and clear.
- CONTENT: Focus only on the core request (scheduling, sharing info, etc.).
- NO META-TALK: Do not include phrases like "I suggest you...", "Here is the plan...", or "I recommend...".
- DATA: If weather or calendar data is provided in context, use it naturally (e.g., "The weather looks clear for tomorrow's 5 PM slot...").
- SIGNATURE: Use a professional closing. If the sender's name is provided below, use it. Otherwise, use "Best regards," followed by "[Your Name]".
- SENDER NAME: ${userName || "Not specified"}

FORMAT:
- Provide ONLY the raw email body text.
- No subject lines, no markdown blocks.`
              );
              paramsToPass.body = draftedBody;
            }

            const toolName = step.routing.toolName;
            const isDestructive = destructiveTools.includes(toolName);

            // === DRY RUN MODE (Safety Confirmation) ===
            if (isDestructive && !isConfirmed) {
               // Store as pending action without invoking the real tool
               pendingActionPayload = { tool: toolName, params: paramsToPass };
               stepResults.push({
                 step: step.step,
                 tool: toolName,
                 summary: "Drafted successfully. Waiting for confirmation.",
                 success: true,
                 isDryRun: true,
                 toolResult: {
                    success: true,
                    message: `I have drafted the ${toolName === 'email' ? 'email' : 'action'}. Here are the details:\n${JSON.stringify(paramsToPass, null, 2)}\n\nWould you like me to execute this, or do you want to edit anything?`
                 }
               });
               toolCalled = toolName;
               continue; // SKIP ACTUAL EXECUTION
            }

            // === ACTUAL EXECUTION ===
            const toolResult = await toolFn(paramsToPass);

            // Build step result for chaining
            const summary = toolResult.success
              ? (toolResult.message || `Successfully completed: ${step.step}`)
              : (toolResult.error || "Failed");

            stepResults.push({
              step: step.step,
              tool: toolName,
              summary,
              data: toolResult.data || null,
              success: toolResult.success,
              toolResult,
            });

            toolCalled = toolName;

            if (toolResult.success) {
              if (toolName.includes("delete")) actionPerformed = `${toolName}_deleted`;
              else if (toolName.includes("update")) actionPerformed = `${toolName}_updated`;
              else if (toolName.includes("list")) actionPerformed = `${toolName}_listed`;
              else if (toolName.includes("send") || step.step.toLowerCase().includes("send")) actionPerformed = `${toolName}_sent`;
              else actionPerformed = `${toolName}_created`;
            }

            // Log action for history
            actionsLog.push({
              actionType: actionPerformed || `${toolName}_executed`,
              toolName,
              inputSummary: step.step,
              resultSummary: summary,
              success: toolResult.success,
              metadata: { params: step.params, result: toolResult.data },
            });

          } catch (error) {
            console.error(`[Executor] Tool ${step.routing.toolName} failed:`, error.message);
            stepResults.push({
              step: step.step,
              tool: step.routing.toolName,
              summary: `Error: ${error.message}`,
              success: false,
              toolResult: {
                success: false,
                error: error.message,
                fallback: `I couldn't complete that action right now. ${error.message}`,
              },
            });
          }
        }
      } else {
        // No tool needed — generate conversational response with chaining context
        const context = history.length > 0
          ? `\nRecent conversation:\n${history.slice(-5).map(h => `${h.role}: ${h.content}`).join("\n")}\n`
          : "";

        const response = await generateContent(
          `${memoryContext ? `\nUser memory:\n${memoryContext}\n` : ""}${context}${previousStepContext}\nUser: ${message}\n\nRespond helpfully, naturally, and concisely. You are VaaniAI, a voice AI assistant.`
        );
        stepResults.push({ step: step.step, summary: response, response });
      }
    }

    const durationMs = Date.now() - startTime;

    // Build combined response
    let combinedResponse = "";
    for (const r of stepResults) {
      if (r.response) {
        combinedResponse += r.response;
      } else if (r.toolResult) {
        if (r.toolResult.success) {
          combinedResponse += r.toolResult.message || `Successfully completed: ${r.step}`;
          if (r.toolResult.data) {
             combinedResponse += `\n[Data Context]: ${JSON.stringify(r.toolResult.data)}\n`;
          }
        } else {
          combinedResponse += r.toolResult.fallback || r.toolResult.error || `Failed to execute: ${r.step}`;
        }
      }
    }

    return {
      response: combinedResponse || "Task processed.",
      action: actionPerformed,
      pendingAction: pendingActionPayload,
      actionsLog, // Expose for actionLogger
      trace: {
        thinking: routerDecision !== "Tool required"
          ? "No tool execution needed"
          : (toolCalled ? `Executed ${toolCalled} tool for pending steps` : `No valid tools matched execution`),
        toolCalled: routerDecision !== "Tool required" ? null : toolCalled,
        result: routerDecision !== "Tool required" ? "Skipped" : (toolCalled ? "Tool execution completed" : "Response generated"),
        durationMs,
      },
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error("[Executor] Error:", error.message);
    return {
      response: "I encountered an issue while processing your request. Please try again.",
      action: null,
      actionsLog: [],
      trace: {
        thinking: "Execution failed - returning fallback",
        toolCalled: null,
        result: "Error: " + error.message,
        durationMs,
      },
    };
  }
}

module.exports = { execute };
