const { plan } = require("../agents/planner");
const { routeTools } = require("../agents/toolRouter");
const { execute } = require("../agents/executor");
const { critique } = require("../agents/critic");
const { runSystemTest } = require("../services/systemTest");
const { getMemoryContext } = require("../services/memoryService");
const { extractMemories } = require("../agents/memoryExtractor");
const { getOrCreateConversation, saveMessage } = require("../services/conversationService");
const { logAction } = require("../services/actionLogger");
const { bgQueue } = require("../services/backgroundJobs");

async function handleChat(req, res) {
  const pipelineStart = Date.now();

  try {
    const { message, history = [] } = req.body;
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

    // === FULL AGENT AUTO-LOOP PIPELINE ===
    let loopCount = 0;
    const MAX_LOOPS = 3;
    let currentFeedbackMessage = message;
    
    let finalPlanResult = null;
    let finalRouteResult = null;
    let finalExecResult = null;
    const allActionsLog = [];
    const executedTools = new Set(); // Track tools to prevent duplicate calls

    while (loopCount < MAX_LOOPS) {
      loopCount++;

      // 1. Planner
      const planResult = await plan(currentFeedbackMessage, history, memoryContext);
      finalPlanResult = planResult;

      streamStatus(loopCount > 1 ? "Evaluating next execution step..." : "Formulating execution plan...");

      // 2. Tool Router
      const routeResult = await routeTools(planResult.steps);
      finalRouteResult = routeResult;

      // Break early: if planner says no tools needed, we're done
      const requestedTools = planResult.steps.map(s => s.tool).filter(t => t && t !== "none");
      const isToolRequired = routeResult.trace.decision === "Tool required";
      const onlyNoneTools = requestedTools.length === 0;

      if (!isToolRequired || onlyNoneTools) {
        if (loopCount === 1) streamStatus("Generating conversational response...");
        // Still execute to get the LLM's conversational response
        const execResult = await execute(routeResult, message, history, accessToken, memoryContext, userName);
        finalExecResult = execResult;
        if (execResult.actionsLog) allActionsLog.push(...execResult.actionsLog);
        break;
      }

      // Prevent duplicate tool calls (e.g., sending same email 3x)
      const newTools = requestedTools.filter(t => !executedTools.has(t));
      if (newTools.length === 0 && loopCount > 1) {
        break; // All requested tools already executed — stop looping
      }

      const toolNames = newTools.join(", ");
      if (toolNames) streamStatus(`Executing tools: ${toolNames}...`);

      // 3. Executor
      const execResult = await execute(
        routeResult,
        message,
        history,
        accessToken,
        memoryContext,
        userName
      );
      finalExecResult = execResult;

      if (execResult.actionsLog) allActionsLog.push(...execResult.actionsLog);
      requestedTools.forEach(t => executedTools.add(t));

      // Single-tool tasks: break after first successful execution
      if (requestedTools.length <= 1) {
        break;
      }

      // Multi-step: feed result back to planner for next step
      currentFeedbackMessage = `Original Request: "${message}". Previous tool output: "${execResult.response}". If the task is fully complete, use tool "none". If another step is required to fulfill the user's Original Request, output the exact tool needed.`;
    }

    finalExecResult.actionsLog = allActionsLog; // Collapse logs for background tracking

    streamStatus("Polishing voice output...");

    // 4. Critic
    const criticResult = await critique(finalExecResult.response, finalExecResult.action, message, memoryContext);

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
      suggestions = await generateSuggestions(history, message, criticResult.response, memoryContext);
    } catch (err) {
      console.error("[Chat] Suggestion generation failed:", err.message);
    }

    const totalDurationMs = Date.now() - pipelineStart;

    // === SEND FINAL RESPONSE ===
    const responsePayload = {
      reply: criticResult.response,
      action: finalExecResult.action,
      suggestions,
      conversationId,
      agentTrace: {
        planner: finalPlanResult.trace,
        toolRouter: finalRouteResult.trace,
        executor: finalExecResult.trace,
        critic: criticResult.trace,
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
          await saveMessage(conversationId, "assistant", criticResult.response, finalExecResult.action, responsePayload.agentTrace);
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
