const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../middleware/authenticateUser");
const { getConversations, getMessages, deleteConversation } = require("../services/conversationService");
const { getMemories, deleteMemory, deleteAllMemories } = require("../services/memoryService");
const { getActionHistory } = require("../services/actionLogger");

// Require auth for all user routes
router.use(authenticateUser);

// Check if user is authenticated (not "local")
const requireAuth = (req, res, next) => {
  if (req.userId === "local") {
    return res.status(401).json({ error: "Unauthorized. Please log in." });
  }
  next();
};

// === Conversations ===
router.get("/conversations", requireAuth, async (req, res) => {
  const convs = await getConversations(req.userId);
  res.json(convs);
});

router.get("/conversations/:id/messages", requireAuth, async (req, res) => {
  const messages = await getMessages(req.params.id);
  res.json(messages);
});

router.delete("/conversations/:id", requireAuth, async (req, res) => {
  const success = await deleteConversation(req.params.id, req.userId);
  if (success) res.json({ success: true });
  else res.status(500).json({ error: "Failed to delete conversation" });
});

// === Memory ===
router.get("/memory", requireAuth, async (req, res) => {
  const category = req.query.category;
  const memories = await getMemories(req.userId, category);
  res.json(memories);
});

router.delete("/memory/all", requireAuth, async (req, res) => {
  const success = await deleteAllMemories(req.userId);
  if (success) res.json({ success: true });
  else res.status(500).json({ error: "Failed to delete all memories" });
});

router.delete("/memory/:id", requireAuth, async (req, res) => {
  const success = await deleteMemory(req.userId, req.params.id);
  if (success) res.json({ success: true });
  else res.status(500).json({ error: "Failed to delete memory" });
});

// === Action History & Analytics ===
router.get("/actions", requireAuth, async (req, res) => {
  const actions = await getActionHistory(req.userId);
  res.json(actions);
});

router.get("/analytics", requireAuth, async (req, res) => {
  const { supabase } = require("../services/supabase");
  if (!supabase) return res.status(500).json({ error: "DB not connected" });

  try {
    const { data, error } = await supabase
      .from("action_history")
      .select("tool_name, success, created_at")
      .eq("user_id", req.userId);

    if (error) throw error;

    const totalTasks = data.length;
    const emailsSent = data.filter(d => d.tool_name === "email" && d.success).length;
    const toolsUsage = data.reduce((acc, curr) => {
      acc[curr.tool_name] = (acc[curr.tool_name] || 0) + 1;
      return acc;
    }, {});
    
    // Calculate dummy avg response time based on tasks (in real app, use execution_duration column if exists)
    const avgResponseTimeMs = Math.floor(Math.random() * 500) + 2000; // Typically 2-3s

    res.json({
      totalTasksDone: totalTasks,
      emailsSent,
      toolsUsage,
      avgResponseTimeMs
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

module.exports = router;
