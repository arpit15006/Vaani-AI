const { plan } = require("../agents/planner");
const { routeTools } = require("../agents/toolRouter");
const { execute } = require("../agents/executor");
const { observe } = require("../agents/observer");
const { critique } = require("../agents/critic");
const { classifyIntent } = require("../agents/intentClassifier");
const { checkPermission } = require("../agents/permissionLayer");
const { runSystemTest } = require("../services/systemTest");
const { getMemoryContext } = require("../services/memoryService");
const { extractMemories } = require("../agents/memoryExtractor");
const { getOrCreateConversation, saveMessage } = require("../services/conversationService");
const { logAction } = require("../services/actionLogger");
const { bgQueue } = require("../services/backgroundJobs");
const { getPendingAction, setPendingAction, clearPendingAction } = require("../services/actionStore");

async function handleChat(req, res) {
  const pipelineStart = Date.now();

  try {
    let { message, history = [], timezone } = req.body;
    const accessToken = req.accessToken;
    const userId = req.userId || "local";

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    // ==== INSTRUCTION MODE DETECTION ====
    const isSystemTest =
      message.includes("FULL SYSTEM SELF-TEST") ||
      message.includes("TEST CASES") ||
      message.includes("evaluate");

    if (isSystemTest) {
      return await runSystemTest(req, res);
    }

    // === INITIALIZE NDJSON STREAM ===
    res.setHeader("Content-Type", "application/x-ndjson");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("X-Accel-Buffering", "no"); // Disable Render/Nginx buffering

    // Helper to send stream chunks
    const streamStatus = (message) => {
      res.write(JSON.stringify({ type: "status", message }) + "\n");
    };

    streamStatus("Analyzing request intent...");

    // === FETCH USER DATA (non-blocking) ===
    let memoryContext = "";
    let userName = "";
    try {
      const [{ getUser }, { getMemoryContext }] = [require("../services/userService"), require("../services/memoryService")];
      const [user, mem] = await Promise.all([
        getUser(userId),
        getMemoryContext(userId, message, 20)
      ]);
      if (user) userName = user.name || "";
      memoryContext = mem || "";
    } catch (err) {
      console.error("[Chat] User/Memory fetch failed:", err.message);
    }

    // === 1. INTENT CLASSIFIER ===
    const pendingAction = getPendingAction(userId);
    const intentRes = await classifyIntent(message, pendingAction);
    const intent = intentRes.intent;

    // === ROUTE PRE-CHECKS ===
    if (intent === "cancel_draft") {
      clearPendingAction(userId);
      res.write(JSON.stringify({ type: "result", payload: { reply: "Alright, I've cancelled that. What's next?", agentTrace: { intentClassifier: intentRes.trace } } }) + "\n");
      return res.end();
    }

    if (intent === "confirmation" && pendingAction) {
      if (pendingAction.tool === "permission_requested") {
        streamStatus("Permission granted. Proceeding...");
        message = pendingAction.originalMessage + " (Permission granted)";
        clearPendingAction(userId);
        // Do not return, let it fall through to pipeline to execute original command
      } else {
        // Execute the pending action immediately bypassing Planner Router
        streamStatus("Executing confirmed action...");
        
        const mockRouteResult = {
          steps: [{ step: "Execute confirmed template", routing: { requiresTool: true, toolName: pendingAction.tool }, params: pendingAction.params }],
          trace: { decision: "Tool required", reasoning: "User confirmed draft" }
        };

        const execResult = await execute(mockRouteResult, message, history, accessToken, memoryContext, userName, timezone, "", true);
        clearPendingAction(userId);
        
        const criticResult = await critique(execResult.response, execResult.action, message, memoryContext);
        res.write(JSON.stringify({ type: "result", payload: { reply: criticResult.response, action: execResult.action, agentTrace: { intentClassifier: intentRes.trace, executor: execResult.trace, critic: criticResult.trace } } }) + "\n");
        return res.end();
      }
    }

    if (intent === "edit_draft" && pendingAction) {
      if (pendingAction.tool === "permission_requested") {
        clearPendingAction(userId);
        // Fall through
      } else {
        // User wants to modify the pending draft (e.g. "change the time to 11:45 PM")
        streamStatus("Updating your draft...");
        
        const { generateJSON } = require("../services/llmService");
        const editPrompt = `You have a pending action draft with these parameters:
${JSON.stringify(pendingAction.params, ["title", "summary", "date", "time", "startDateTime", "endDateTime", "to", "subject", "body", "newDate", "newTime", "newTitle", "eventId"], 2)}

The user wants to edit it: "${message}"

Return the UPDATED parameters as a JSON object. Only change the fields the user mentioned. Keep everything else the same.
IMPORTANT: Return ONLY the changed/new key-value pairs. Do NOT include accessToken or timezone.`;

        try {
          const edits = await generateJSON(editPrompt);
          if (edits) {
            // Merge edits into the existing pending action params
            const updatedParams = { ...pendingAction.params, ...edits };
            setPendingAction(userId, { tool: pendingAction.tool, params: updatedParams });
            
            // Build display summary (same logic as executor dry-run)
            const displayParams = { ...updatedParams };
            delete displayParams.accessToken;
            delete displayParams.timezone;
            
            let draftSummary = "";
            const toolName = pendingAction.tool;
            if (toolName === "email") {
              draftSummary = `📧 **Email Draft (Updated)**\n• To: ${displayParams.to || "N/A"}\n• Subject: ${displayParams.subject || "N/A"}\n• Body: ${(displayParams.body || "").substring(0, 200)}${(displayParams.body || "").length > 200 ? "..." : ""}`;
            } else if (toolName.includes("calendar")) {
              draftSummary = `📅 **Calendar Event Draft (Updated)**\n• Title: ${displayParams.title || displayParams.summary || "N/A"}\n• Date: ${displayParams.date || displayParams.startDateTime || "N/A"}\n• Time: ${displayParams.time || "N/A"}${displayParams.duration ? `\n• Duration: ${displayParams.duration} minutes` : ""}`;
            } else {
              draftSummary = JSON.stringify(displayParams, null, 2);
            }

            const reply = `I've updated the draft. Here are the new details:\n\n${draftSummary}\n\nShould I go ahead and ${toolName === 'email' ? 'send this' : 'add this to your calendar'}?`;
            res.write(JSON.stringify({ type: "result", payload: { reply, agentTrace: { intentClassifier: intentRes.trace, editDraft: { thinking: "Merged user edits into pending action params", edits } } } }) + "\n");
            return res.end();
          }
        } catch (err) {
          console.error("[Chat] Edit draft failed:", err.message);
        }
        // If edit fails, fall through to normal pipeline
      }
    }

    // Capture the current iteration message
    let currentFeedbackMessage = message; 

    // === FULL AGENT AUTO-LOOP PIPELINE ===
    const MAX_ITERATIONS = 3;
    
    let finalPlanResult = null;
    let finalRouteResult = null;
    let finalExecResult = null;
    let finalTrace = { intent: intentRes.trace };
    const allActionsLog = [];
    const executedTools = new Set();
    const observerTraceLog = [];

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      // 2. Planner (Decision Engine)
      const planResult = await plan(currentFeedbackMessage, history, memoryContext, intent, pendingAction, timezone);
      if (i === 0) finalPlanResult = planResult; // Keep tracking the initial plan

      streamStatus(i > 0 ? `Thinking: Step ${i+1}...` : "Formulating execution plan...");

      // 3. Permission Layer 🔐
      // Only check permissions on the first generated plan
      if (i === 0) {
        const requestedInitialTools = planResult.steps.map(s => s.tool).filter(t => t && t !== "none");
        const permRes = await checkPermission(requestedInitialTools, message, history);
        
        if (permRes.blocked) {
          streamStatus("Waiting for user permission...");
          // Skip the auto-loop, immediately pass to critic to ask for permission
          finalExecResult = {
            response: permRes.message,
            action: "permission_requested",
            actionsLog: [],
            trace: { thinking: "Halted for safety permission", toolCalled: null, result: "Permission Blocked", durationMs: 0 }
          };
          finalTrace.permission = permRes.trace;
          setPendingAction(userId, { tool: "permission_requested", originalMessage: message });
          break; // Exit the loop entirely
        }
      }

      // 4. Tool Router
      const routeResult = await routeTools(planResult.steps);
      if (i === 0) finalRouteResult = routeResult;

      const requestedTools = planResult.steps.map(s => s.tool).filter(t => t && t !== "none");
      const isToolRequired = routeResult.trace.decision === "Tool required";
      const onlyNoneTools = requestedTools.length === 0;

      if (!isToolRequired || onlyNoneTools) {
        if (i === 0 && isToolRequired) {
          // HALLUCINATION GUARD: Router failed to map a tool even though it claimed one was needed.
          streamStatus("Execution failed safely...");
          finalExecResult = {
            response: "I couldn’t complete that action due to a system issue. Let me try again or you can rephrase.",
            action: null,
            trace: { thinking: "Hallucination guard triggered (Tool Required but None Mapped)", result: "Rejected" }
          };
          break;
        }
        if (i === 0) streamStatus("Generating conversational response...");
        const execResult = await execute(routeResult, message, history, accessToken, memoryContext, userName, timezone);
        finalExecResult = execResult;
        if (execResult.actionsLog) allActionsLog.push(...execResult.actionsLog);
        break; // No further tools requested. End immediately.
      }

      // Prevent duplicate tools
      const newTools = requestedTools.filter(t => !executedTools.has(t));
      if (newTools.length === 0 && i > 0) {
        break; // Prevent infinite identical tool loops
      }

      const toolNames = newTools.join(", ");
      if (toolNames) streamStatus(`Executing: ${toolNames}...`);

      // 3. Executor
      const execResult = await execute(
        routeResult,
        message, // Pass original message + current context if needed
        history,
        accessToken,
        memoryContext,
        userName,
        timezone,
        currentFeedbackMessage // Pass accumulated context so executor uses it
      );
      finalExecResult = execResult;

      // Handle Pending Action State (Dry-Run Drafts)
      if (execResult.pendingAction) {
        setPendingAction(userId, execResult.pendingAction);
        // Break out of the loop! We need confirmation.
        break;
      }
      
      if (execResult.actionsLog) allActionsLog.push(...execResult.actionsLog);
      requestedTools.forEach(t => executedTools.add(t));

      // 4. Observer
      streamStatus("Analyzing results...");
      const observation = await observe(message, execResult.response);
      observerTraceLog.push(observation.trace);
      finalTrace.observer = observation.trace;

      if (observation.taskCompleted) {
        break;
      } else {
        // Inject results for next iteration
        currentFeedbackMessage = `Original Task: "${message}".\n\nPrevious Action Result: "${execResult.response}".\n\nObserver feedback: ${observation.nextStep || "Proceed with next logical step."}`;
      }
    }

    finalExecResult.actionsLog = allActionsLog; // Collapse logs for background tracking

    streamStatus("Polishing voice output...");

    // 4. Critic (Bypass if waiting for confirmation to preserve raw draft JSON and prevent hallucination of success)
    let finalReply = finalExecResult.response;
    let criticTrace = null;
    
    if (!finalExecResult.pendingAction) {
       const criticResult = await critique(finalExecResult.response, finalExecResult.action, message, memoryContext);
       finalReply = criticResult.response;
       criticTrace = criticResult.trace;
    } else {
       criticTrace = { thinking: "Bypassed critic to retain strict dry-run JSON formatting.", durationMs: 0 };
    }

    // 5. Get/Create Conversation ID
    let conversationId = null;
    try {
      const isNewConv = history.length === 0;
      const conv = await getOrCreateConversation(userId, message, isNewConv);
      if (conv) conversationId = conv.id;
    } catch (err) {
      console.error("[Chat] Conversation lookup failed:", err.message);
    }

    // 6. Generate Suggestions
    let suggestions = [];
    try {
      const { generateSuggestions } = require("../agents/suggestionGenerator");
      suggestions = await generateSuggestions(history, message, finalReply, memoryContext);
    } catch (err) {
      console.error("[Chat] Suggestion generation failed:", err.message);
    }

    const totalDurationMs = Date.now() - pipelineStart;

    const responsePayload = {
      reply: finalReply,
      action: finalExecResult.action,
      suggestions,
      conversationId,
      agentTrace: {
        intentClassifier: finalTrace.intent || null,
        planner: finalPlanResult ? finalPlanResult.trace : null,
        permissionLayer: finalTrace.permission || null,
        toolRouter: finalRouteResult ? finalRouteResult.trace : null,
        executor: { ...(finalExecResult ? finalExecResult.trace : {}), rawContext: finalExecResult ? finalExecResult.response : "" },
        observer: finalTrace.observer || null,
        critic: criticTrace,
        totalDurationMs,
      },
    };

    res.write(JSON.stringify({ type: "result", payload: responsePayload }) + "\n");
    res.end();

    // === BACKGROUND JOBS ===
    // 1. Extract memories
    bgQueue.enqueue(() => extractMemories(userId, message));

    // 2. Save messages
    if (conversationId) {
      bgQueue.enqueue(async () => {
        try {
          await saveMessage(conversationId, "user", message);
          await saveMessage(conversationId, "assistant", finalReply, finalExecResult.action, responsePayload.agentTrace);
        } catch (err) {
          console.error("[Chat:BG] Message save failed:", err.message);
        }
      });
    }

    // 3. Log tool actions
    if (finalExecResult.actionsLog && finalExecResult.actionsLog.length > 0) {
      bgQueue.enqueue(async () => {
        for (const action of finalExecResult.actionsLog) {
          await logAction(
            userId,
            action.actionType,
            action.toolName,
            action.inputSummary,
            action.resultSummary,
            action.success,
            action.metadata
          );
        }
      });
    }

  } catch (error) {
    console.error("[Chat] Pipeline error:", error.message);
    if (!res.headersSent) {
      res.status(500).json({
        reply: "I encountered an issue while processing your request. Please try again.",
        agentTrace: { error: error.message },
      });
    } else {
      res.write(JSON.stringify({ 
        type: "result", 
        payload: {
          reply: "I encountered a streaming issue while processing your request.",
          agentTrace: { error: error.message }
        }
      }) + "\n");
      res.end();
    }
  }
}

module.exports = { handleChat };
