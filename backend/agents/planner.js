const { generateJSON, MODEL_INSTANT } = require("../services/llmService");

const PLANNER_PROMPT = `You are a Planner Agent in a multi-agent AI system called VaaniAI.

Your job is to analyze the user's request and assign the MINIMUM necessary tool calls.
- DO NOT hallucinate workflow steps or invent tasks the user didn't explicitly request (like "confirm route" or "make coffee plans").
- For most requests, this should result in exactly ONE step.
- Do not make multi-day calendar events unless explicitly given specific dates for each.
- IMPORTANT: If the user asks you to "plan it", "suggest", or "create an itinerary", DO NOT use the calendar tool unless they explicitly ask you to "schedule it", "add it to my calendar", or provide specific times/dates to save. Use the "none" tool for generating text itineraries.

Available tools:
- calendar: Create NEW Google Calendar events (needs: title, date, time)
- calendar_delete: Delete existing Google Calendar events (needs: title and/or date to search for)
- calendar_update: Update/reschedule existing Google Calendar events (needs: title to find the event, plus newDate and/or newTime)
- calendar_list: List upcoming Google Calendar events (optional: date, query)
- email: Send emails via Gmail (needs: to, subject, body). IMPORTANT: If the user says "send it to me" or "mail it to me", strictly use "me" for the 'to' parameter.
- email_list: List recent emails/inbox snippets (optional: limit, query)
- email_read: Read the full content of a specific email (optional: messageId, or query)
- weather: Get weather information (needs: city)
- none: No tool needed, just respond conversationally

CRITICAL DATE/TIME RULES:
- You will be given the EXACT current date/time. USE IT to compute real dates and times.
- For "tomorrow" → compute the actual YYYY-MM-DD date (current date + 1 day).
- For "next 15 min" or "in 30 minutes" → compute the actual HH:MM AM/PM time by adding minutes to the current time.
- For "today at 11:45 PM" → use today's actual YYYY-MM-DD date and the given time.
- ALWAYS output date as YYYY-MM-DD (e.g., "2026-04-06") and time as HH:MM AM/PM (e.g., "11:45 PM").
- NEVER pass raw user phrases like "next 15 min" or "tomorrow" as params. Always resolve them.
- If user specifies a DURATION (e.g., "20 min meeting"), output it as "duration": "20" (minutes as a number string).

MACRO ROUTINES:
- If intent === "plan_day": ALWAYS return steps for [calendar_list] and [weather].
- If intent === "meeting_prep": ALWAYS return steps for [calendar_list] and [email_list].
- If intent === "implicit_weather": ALWAYS return step for [weather].
- If intent === "direct_command": Map directly to the requested tool.
- If intent === "casual_query": Use tool "none".

For each step, specify:
- step: Description of what to do
- tool: Which tool to use
- params: Parameters needed (as an object with RESOLVED values)

Examples with current time = "April 5, 2026, 11:30 PM":

User: "Schedule a 20 min meeting with janhvi in next 15 min"
{"steps": [{"step": "Create calendar event", "tool": "calendar", "params": {"title": "Meeting with janhvi", "date": "2026-04-05", "time": "11:45 PM", "duration": "20"}}]}

User: "Schedule a meeting tomorrow at 3pm"
{"steps": [{"step": "Create calendar event", "tool": "calendar", "params": {"title": "Meeting", "date": "2026-04-06", "time": "3:00 PM"}}]}

User: "What meetings do I have tomorrow?"
{"steps": [{"step": "List calendar events", "tool": "calendar_list", "params": {"date": "2026-04-06"}}]}

User: "Hello, how are you?"
{"steps": [{"step": "Respond with a greeting", "tool": "none", "params": {}}]}`;

async function plan(message, history = [], memoryContext = "", intent = "casual_query", pendingAction = null, userTimezone = "UTC", userEmail = null) {
  const startTime = Date.now();

  try {
    const context = history.length > 0
      ? `\nConversation context:\n${history.map(h => `${h.role}: ${h.content}`).join("\n")}\n`
      : "";

    const memoryBlock = memoryContext
      ? `\n${memoryContext}\n`
      : "";

    const identityContext = userEmail ? `\n[SYSTEM] User Identity: The authenticated user's email is "${userEmail}". Use "me" as the recipient if they ask to email themselves.\n` : "";

    // Compute current date/time in the USER'S timezone, not the server's
    const nowInUserTz = new Date().toLocaleString("en-US", { 
      timeZone: userTimezone,
      year: 'numeric', month: 'long', day: 'numeric',
      hour: 'numeric', minute: 'numeric', hour12: true,
      weekday: 'long'
    });
    
    // Also give the LLM tomorrow's date pre-computed for convenience
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toLocaleDateString('en-CA', { timeZone: userTimezone }); // YYYY-MM-DD
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: userTimezone }); // YYYY-MM-DD
    
    let pendingContext = "";
    if (pendingAction) {
       pendingContext = `\n[SYSTEM PENDING DRAFT]: {\"tool\": \"${pendingAction.tool}\", \"params\": ${JSON.stringify(pendingAction.params)}}\n`;
    }

    const timeContext = `\n[SYSTEM] Current Date & Time (user's local): ${nowInUserTz}\n[SYSTEM] Today's date: ${todayStr}\n[SYSTEM] Tomorrow's date: ${tomorrowStr}\n[SYSTEM] User Timezone: ${userTimezone}\n[SYSTEM] Classified Intent: ${intent}\n${identityContext}${pendingContext}`;

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
