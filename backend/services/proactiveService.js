const { getValidAccessToken } = require("./tokenService");
const { sendNotification } = require("./notificationService");
const { generateContent } = require("./llmService");
const fetch = require("node-fetch"); // Used to hit calendar safely
const { getWeather } = require("../tools/weather");

// { userId: { intervalId, alertedEvents: Set, timezone } }
const activeWatchers = new Map();

async function checkProactiveTriggers(userId, timezone) {
  // 1. Get a valid token natively (handles refresh internally)
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return; // Cannot check without token

  try {
    // 2. Fetch Calendar Next 60 Mins
    const now = new Date();
    const timeMin = now.toISOString();
    const timeMax = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // +1 Hr

    const calRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await calRes.json();
    if (!calRes.ok || !data.items) return;

    const events = data.items;
    if (events.length === 0) return;

    const watcherState = activeWatchers.get(userId);
    if (!watcherState) return; // User disconnected midway

    // 3. Scan for target events (starting in <= ~35 mins)
    for (const event of events) {
      if (!event.start || !event.start.dateTime) continue; // Skip all-day for now
      
      const eventId = event.id;
      if (watcherState.alertedEvents.has(eventId)) continue; // Already alerted! Deduplication ✅

      const eventStart = new Date(event.start.dateTime);
      const diffMins = (eventStart.getTime() - now.getTime()) / (1000 * 60);

      if (diffMins > 0 && diffMins <= 35) {
        // MATCH! Event starting soon.
        watcherState.alertedEvents.add(eventId);

        // 4. Gather Context (Location / Weather)
        let weatherContext = "";
        if (event.location) {
           const weather = await getWeather({ location: event.location, accessToken, timezone });
           if (weather.success && weather.data) {
              weatherContext = `The event is located at ${event.location}. The current weather there is ${weather.data.temperature}°C, ${weather.data.conditions}.`;
           }
        }

        // 5. Generate Proactive Alert (Context-Aware)
        const prompt = `You are VaaniAI, an elite proactive personal AI. The user has an upcoming meeting.
Event: "${event.summary}"
Time remaining: ${Math.round(diffMins)} minutes
${weatherContext}

CRITICAL:
- Write exactly what you should say out loud to interrupt the user.
- Start politely (e.g. "Pardon the interruption", "Excuse me sir/madam").
- Inform them about the meeting, time remaining, and any relevant weather/traffic context naturally.
- Keep it under 2 sentences. Professional Jarvis-like tone.`;

        const alertMessage = await generateContent(prompt);
        
        // 6. Push via SSE
        sendNotification(userId, {
          type: "proactive_alert",
          message: alertMessage,
          event: { summary: event.summary, start: event.start.dateTime }
        });
      }
    }
  } catch (err) {
    console.error(`[ProactiveService] Watcher crash for ${userId}:`, err.message);
  }
}

function startWatcher(userId, timezone = "UTC") {
  if (activeWatchers.has(userId)) return;

  console.log(`[ProactiveService] 🤖 Starting background intelligence for ${userId}`);

  // Run Immediately (non-blocking)
  checkProactiveTriggers(userId, timezone);

  // Run every 5 minutes (User-scoped cron ✅)
  const intervalId = setInterval(() => {
    checkProactiveTriggers(userId, timezone);
  }, 5 * 60 * 1000);

  activeWatchers.set(userId, {
    intervalId,
    alertedEvents: new Set(),
    timezone
  });
}

function stopWatcher(userId) {
  const watcher = activeWatchers.get(userId);
  if (watcher) {
    clearInterval(watcher.intervalId);
    activeWatchers.delete(userId);
    console.log(`[ProactiveService] 🛑 Stopped background intelligence for ${userId}`);
  }
}

module.exports = { startWatcher, stopWatcher };
