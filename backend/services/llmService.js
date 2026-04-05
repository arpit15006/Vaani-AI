const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Models
const MODEL_POWER = "llama-3.3-70b-versatile";
const MODEL_INSTANT = "llama-3.1-8b-instant";

async function generateContent(prompt, systemPrompt = "", model = MODEL_POWER) {
  try {
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const completion = await groq.chat.completions.create({
      messages: messages,
      model: model,
      temperature: 0.7,
      max_completion_tokens: 1024,
    });

    return completion.choices[0]?.message?.content || "";
  } catch (error) {
    // AUTO-FALLBACK: Improved check for 429 Rate Limit (various SDK formats)
    const isRateLimit = error.status === 429 || 
                       error.name === "RateLimitError" || 
                       error.message?.toLowerCase().includes("rate limit") || 
                       error.code === "rate_limit_exceeded" ||
                       error?.error?.code === "rate_limit_exceeded";

    if (isRateLimit && model === MODEL_POWER) {
      console.warn(`[Groq] 🚨 Rate Limit hit on ${model}. Falling back to ${MODEL_INSTANT}...`);
      return await generateContent(prompt, systemPrompt, MODEL_INSTANT);
    }

    console.error("[Groq] Error generating content:", error.message);
    throw new Error("I'm having trouble thinking right now. Please try again.");
  }
}

async function generateJSON(prompt, systemPrompt = "", model = MODEL_POWER) {
  try {
    // For Groq's JSON mode, it's REQUIRED to explicitly ask for JSON in the prompt
    const enhancedSystemPrompt = systemPrompt
      ? `${systemPrompt}\n\nIMPORTANT: You must return the output in valid JSON format. Respond with ONLY the requested JSON object and nothing else.`
      : `IMPORTANT: You must return the output in valid JSON format. Respond with ONLY the requested JSON object and nothing else.`;

    const messages = [
      { role: "system", content: enhancedSystemPrompt },
      { role: "user", content: prompt }
    ];

    const completion = await groq.chat.completions.create({
      messages: messages,
      model: model,
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const text = completion.choices[0]?.message?.content || "{}";
    
    // Robustly parse JSON with trailing comma correction
    function robustJSONParse(str) {
      try {
        return JSON.parse(str);
      } catch (err) {
        try {
          const fixed = str.replace(/,\s*([}\]])/g, '$1');
          return JSON.parse(fixed);
        } catch (err2) {
          const match = str.match(/\{[\s\S]*\}/);
          if (match) {
            try {
               return JSON.parse(match[0].replace(/,\s*([}\]])/g, '$1'));
            } catch(e) { throw err; }
          }
          throw err;
        }
      }
    }

    return robustJSONParse(text);
  } catch (error) {
    // AUTO-FALLBACK: Improved check for 429 Rate Limit (various SDK formats)
    const isRateLimit = error.status === 429 || 
                       error.name === "RateLimitError" || 
                       error.message?.toLowerCase().includes("rate limit") || 
                       error.code === "rate_limit_exceeded" ||
                       error?.error?.code === "rate_limit_exceeded";

    if (isRateLimit && model === MODEL_POWER) {
      console.warn(`[Groq] 🚨 Rate Limit hit on ${model}. Falling back to ${MODEL_INSTANT}...`);
      return await generateJSON(prompt, systemPrompt, MODEL_INSTANT);
    }

    if (error instanceof SyntaxError) {
      console.error("[Groq] JSON parse error:", error.message);
      return null;
    }
    console.error("[Groq] Error generating JSON:", error.message);
    throw new Error("I'm having trouble thinking right now. Please try again.");
  }
}

module.exports = { 
  generateContent, 
  generateJSON,
  MODEL_POWER,
  MODEL_INSTANT
};
