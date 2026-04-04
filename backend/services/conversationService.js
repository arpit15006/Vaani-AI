const { supabase } = require("./supabase");

async function getOrCreateConversation(userId, firstMessage = "", isNew = false) {
  if (!supabase || userId === "local") return null;

  try {
    if (!isNew) {
      // Check for recent active conversation (within last 30 min)
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

      const { data: recent } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", userId)
        .gte("updated_at", thirtyMinAgo)
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (recent) {
        // Update timestamp
        await supabase
          .from("conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", recent.id);
        return recent;
      }
    }

    // Create new conversation
    const title = firstMessage.length > 50
      ? firstMessage.substring(0, 50) + "..."
      : firstMessage || "New Conversation";

    const { data: newConv, error } = await supabase
      .from("conversations")
      .insert({ user_id: userId, title })
      .select()
      .single();

    if (error) throw error;
    console.log(`[Conversation] ✅ New conversation: "${title}"`);
    return newConv;
  } catch (err) {
    console.error("[Conversation] Error:", err.message);
    return null;
  }
}

async function saveMessage(conversationId, role, content, action = null, agentTrace = null) {
  if (!supabase || !conversationId) return;

  try {
    const { error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        role,
        content,
        action,
        agent_trace: agentTrace,
      });

    if (error) throw error;
  } catch (err) {
    console.error("[Conversation] Save message error:", err.message);
  }
}

async function getConversations(userId, limit = 20) {
  if (!supabase || userId === "local") return [];

  try {
    const { data, error } = await supabase
      .from("conversations")
      .select("id, title, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("[Conversation] List error:", err.message);
    return [];
  }
}

async function getMessages(conversationId, limit = 50) {
  if (!supabase || !conversationId) return [];

  try {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("[Conversation] Messages error:", err.message);
    return [];
  }
}

async function deleteConversation(conversationId, userId) {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", conversationId)
      .eq("user_id", userId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("[Conversation] Delete error:", err.message);
    return false;
  }
}

module.exports = {
  getOrCreateConversation,
  saveMessage,
  getConversations,
  getMessages,
  deleteConversation,
};
