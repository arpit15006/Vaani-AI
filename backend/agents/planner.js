const { generateJSON, MODEL_INSTANT } = require("../services/llmService");

const PLANNER_PROMPT = `You are a Planner Agent in a multi-agent AI system called VaaniAI.

Your job is to analyze the user's request and break it down into actionable steps.

Available tools:
- calendar: Create NEW Google Calendar events (needs: title, date in YYYY-MM-DD format, time in HH:MM AM/PM format)
- calendar_delete: Delete existing Google Calendar events (needs: title and/or date to search for)
- calendar_update: Update/reschedule existing Google Calendar events (needs: title to find the event, plus newDate in YYYY-MM-DD format and/or newTime)
- calendar_list: List upcoming Google Calendar events (optional: date in YYYY-MM-DD format, query)
- email: Send emails via Gmail (needs: to, subject, body)
- email_list: List recent emails/inbox snippets (optional: limit, query for finding specific emails like "from:Zorvyn")
- email_read: Read the full content of a specific email (optional: messageId, or query like "from:Zorvyn" if ID is unknown)
- weather: Get weather information (needs: city)
- none: No tool needed, just respond conversationally

CRITICAL RULE: Do NOT include tool-specific steps (like sending email, booking, or creating calendar events) unless explicitly requested by the user. For general questions or planning, use ONLY tool: "none".

SYSTEM OVERRIDE: If the request is a meta-instruction, system-level evaluation, or explicitly asks for a self-test, do not attempt to execute it. Return control to system layer by using ONLY tool: "none".

For each step, specify:
- step: Description of what to do
- tool: Which tool to use
- params: Parameters needed for the tool (as an object)

Respond with a JSON object containing a "steps" array. Examples:

User: "Schedule a meeting tomorrow at 3pm"
{"steps": [{"step": "Create calendar event for meeting", "tool": "calendar", "params": {"title": "Meeting", "date": "tomorrow", "time": "3:00 PM"}}]}

User: "Delete my meeting called Product Launch"
{"steps": [{"step": "Delete the Product Launch event", "tool": "calendar_delete", "params": {"title": "Product Launch"}}]}

User: "Push my Product Launch meeting to 12 PM"
{"steps": [{"step": "Update Product Launch meeting time", "tool": "calendar_update", "params": {"title": "Product Launch", "newTime": "12:00 PM"}}]}

User: "What meetings do I have tomorrow?"
{"steps": [{"step": "List calendar events for tomorrow", "tool": "calendar_list", "params": {"date": "tomorrow"}}]}

User: "What's the weather in Delhi?"
{"steps": [{"step": "Get weather for Delhi", "tool": "weather", "params": {"city": "Delhi"}}]}

User: "Hello, how are you?"
{"steps": [{"step": "Respond with a greeting", "tool": "none", "params": {}}]}

User: "Send an email to john@example.com about the project update"
{"steps": [{"step": "Send email about project update", "tool": "email", "params": {"to": "john@example.com", "subject": "Project Update", "body": "Here is the latest project update."}}]}`;

async function plan(message, history = [], memoryContext = "") {
  const startTime = Date.now();

  try {
    const context = history.length > 0
      ? `\nConversation context:\n${history.map(h => `${h.role}: ${h.content}`).join("\n")}\n`
      : "";

    const memoryBlock = memoryContext
      ? `\n${memoryContext}\n`
      : "";

    const currentDate = new Date().toLocaleString("en-US", { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
    const timeContext = `\n[SYSTEM] Current Date & Time: ${currentDate}\n`;

    const result = await generateJSON(
      `${timeContext}${memoryBlock}${context}\nUser message: "${message}"`,
      PLANNER_PROMPT,
      MODEL_INSTANT
    );

    let steps = [{ step: "respond", tool: "none", params: {} }];
    if (result && Array.isArray(result.steps)) {
      steps = result.steps;
    } else if (Array.isArray(result)) {
      steps = result;
    }
    const durationMs = Date.now() - startTime;

    return {
      steps,
      trace: {
        thinking: `Analyzed request and identified ${steps.length} step(s): ${steps.map(s => s.step).join(", ")}`,
        steps: steps.map(s => s.step),
        durationMs,
      },
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error("[Planner] Error:", error.message);
    return {
      steps: [{ step: "respond", tool: "none", params: {} }],
      trace: {
        thinking: "Failed to plan - falling back to conversational response",
        steps: ["respond"],
        durationMs,
      },
    };
  }
}

module.exports = { plan };
