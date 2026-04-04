const { supabase } = require("./supabase");

async function logAction(userId, actionType, toolName, inputSummary, resultSummary, success = true, metadata = null) {
  if (!supabase || userId === "local") return;

  try {
    const { error } = await supabase
      .from("action_history")
      .insert({
        user_id: userId,
        action_type: actionType,
        tool_name: toolName,
        input_summary: inputSummary,
        result_summary: resultSummary,
        success,
        metadata,
      });

    if (error) throw error;
    console.log(`[ActionLogger] ✅ Logged: ${actionType} (${toolName})`);
  } catch (err) {
    console.error("[ActionLogger] Error:", err.message);
  }
}

async function getActionHistory(userId, limit = 20) {
  if (!supabase || userId === "local") return [];

  try {
    const { data, error } = await supabase
      .from("action_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("[ActionLogger] Fetch error:", err.message);
    return [];
  }
}

module.exports = { logAction, getActionHistory };
