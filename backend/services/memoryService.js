const { supabase } = require("./supabase");

const MAX_MEMORIES_PER_USER = 50;
const DEFAULT_CONTEXT_LIMIT = 20;

async function saveMemory(userId, category, key, value) {
  if (!supabase || userId === "local") return;

  try {
    // UPSERT: update if exists, create if not
    const { error } = await supabase
      .from("user_memory")
      .upsert(
        {
          user_id: userId,
          category,
          key,
          value,
          relevance_score: 1.0,
          last_accessed: new Date().toISOString(),
        },
        { onConflict: "user_id,category,key" }
      );

    if (error) throw error;

    // Prune if too many memories
    await pruneMemories(userId);

    console.log(`[Memory] ✅ Saved: ${category}/${key} = "${value}"`);
  } catch (err) {
    console.error("[Memory] Save error:", err.message);
  }
}

async function getMemories(userId, category = null) {
  if (!supabase || userId === "local") return [];

  try {
    let query = supabase
      .from("user_memory")
      .select("*")
      .eq("user_id", userId)
      .order("relevance_score", { ascending: false })
      .order("last_accessed", { ascending: false });

    if (category) query = query.eq("category", category);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("[Memory] Fetch error:", err.message);
    return [];
  }
}

async function getMemoryContext(userId, message = "", limit = DEFAULT_CONTEXT_LIMIT) {
  if (!supabase || userId === "local") return "";

  try {
    const { data, error } = await supabase
      .from("user_memory")
      .select("category, key, value")
      .eq("user_id", userId)
      .order("relevance_score", { ascending: false })
      .order("last_accessed", { ascending: false })
      .limit(limit);

    if (error || !data || data.length === 0) return "";

    // Update last_accessed for used memories
    const ids = data.map((m) => `'${m.key}'`).join(",");
    supabase
      .from("user_memory")
      .update({ last_accessed: new Date().toISOString() })
      .eq("user_id", userId)
      .in("key", data.map((m) => m.key))
      .then(() => {})
      .catch(() => {});

    let relevantData = data;
    if (message && message.length > 3) {
      // Very basic keyword heuristic instead of full vector search
      const words = message.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      if (words.length > 0) {
        relevantData = data.filter(m => {
           const memStr = `${m.category} ${m.key} ${m.value}`.toLowerCase();
           return words.some(w => memStr.includes(w)) || m.relevance_score > 1.5;
        });
        // Always keep some core preferences as baseline if we filtered everything
        if (relevantData.length === 0) {
           relevantData = data.filter(m => m.category === "preference").slice(0, 3);
        }
      }
    }

    // Build formatted context string
    const preferences = relevantData.filter((m) => m.category === "preference");
    const facts = relevantData.filter((m) => m.category === "fact");
    const habits = relevantData.filter((m) => m.category === "habit");

    let context = "Known facts about this user:\n";
    if (preferences.length > 0) {
      context += `Preferences: ${preferences.map((p) => `${p.key}: ${p.value}`).join(", ")}\n`;
    }
    if (facts.length > 0) {
      context += `Facts: ${facts.map((f) => `${f.key}: ${f.value}`).join(", ")}\n`;
    }
    if (habits.length > 0) {
      context += `Habits: ${habits.map((h) => `${h.key}: ${h.value}`).join(", ")}\n`;
    }

    return context.trim();
  } catch (err) {
    console.error("[Memory] Context build error:", err.message);
    return "";
  }
}

async function deleteMemory(userId, memoryId) {
  if (!supabase || userId === "local") return false;

  try {
    const { error } = await supabase
      .from("user_memory")
      .delete()
      .eq("id", memoryId)
      .eq("user_id", userId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("[Memory] Delete error:", err.message);
    return false;
  }
}

async function pruneMemories(userId) {
  try {
    const { data } = await supabase
      .from("user_memory")
      .select("id")
      .eq("user_id", userId)
      .order("relevance_score", { ascending: true })
      .order("last_accessed", { ascending: true });

    if (data && data.length > MAX_MEMORIES_PER_USER) {
      const toDelete = data.slice(0, data.length - MAX_MEMORIES_PER_USER);
      await supabase
        .from("user_memory")
        .delete()
        .in("id", toDelete.map((m) => m.id));

      console.log(`[Memory] Pruned ${toDelete.length} old memories for user ${userId}`);
    }
  } catch (err) {
    console.error("[Memory] Prune error:", err.message);
  }
}

module.exports = { saveMemory, getMemories, getMemoryContext, deleteMemory };
