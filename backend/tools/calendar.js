const { google } = require("googleapis");

function getCalendarClient(accessToken) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.calendar({ version: "v3", auth: oauth2Client });
}

// ==================== CREATE ====================
async function createCalendarEvent({ title, date, time, duration, summary, startDateTime, endDateTime, accessToken, timezone }) {
  const userTimezone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  try {
    if (!accessToken) {
      return { success: false, error: "Not authenticated", fallback: "I need access to your Google Calendar. Please connect your Google account first." };
    }

    const calendar = getCalendarClient(accessToken);
    const eventTitle = title || summary || "Meeting";
    const now = getNowInTimezone(userTimezone);

    let start, end;
    let durationMs = 60 * 60 * 1000; // default 1 hour

    // 1. Check explicit duration param from planner (e.g. duration: "20")
    if (duration) {
      const dVal = parseInt(duration);
      if (!isNaN(dVal) && dVal > 0) {
        durationMs = dVal * 60 * 1000;
      }
    }
    // 2. Fallback: Detect if 'time' is actually a duration string (e.g. "20 minutes")
    else {
      const durationMatch = (time || "").match(/(\d+)\s*(min|minute|minutes|hr|hour|hours)/i);
      if (durationMatch) {
        const durationVal = parseInt(durationMatch[1]);
        const durationUnit = durationMatch[2].toLowerCase();
        if (durationUnit.startsWith("min")) {
          durationMs = durationVal * 60 * 1000;
        } else {
          durationMs = durationVal * 60 * 60 * 1000;
        }
        time = null;
      }
    }

    if (startDateTime) {
      start = new Date(startDateTime);
      end = endDateTime ? new Date(endDateTime) : new Date(start.getTime() + durationMs);
    } else {
      start = parseDateTime(date, time, now);
      end = new Date(start.getTime() + durationMs);
    }

    const event = {
      summary: eventTitle,
      start: { 
        dateTime: toLocalISO(start), 
        timeZone: userTimezone 
      },
      end: { 
        dateTime: toLocalISO(end), 
        timeZone: userTimezone 
      },
    };

    const response = await calendar.events.insert({ calendarId: "primary", resource: event });

    return {
      success: true,
      message: `Your event "${eventTitle}" has been scheduled for ${toLocalISO(start).replace('T', ' ')}. You can view it in Google Calendar.`,
      data: { eventId: response.data.id, htmlLink: response.data.htmlLink, start: toLocalISO(start), end: toLocalISO(end) },
    };
  } catch (error) {
    console.error("[Tool:Calendar:Create] Error:", error.message);
    return { success: false, error: error.message, fallback: "I couldn't create the calendar event. Please check your Google account is connected and try again." };
  }
}

// ==================== LIST ====================
async function listCalendarEvents({ date, query, maxResults = 10, accessToken, timezone }) {
  const userTimezone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  try {
    if (!accessToken) {
      return { success: false, error: "Not authenticated", fallback: "I need access to your Google Calendar. Please connect your Google account first." };
    }

    const calendar = getCalendarClient(accessToken);
    const now = getNowInTimezone(userTimezone);

    // Build time range
    let timeMin, timeMax;
    if (date) {
      const parsed = parseDateOnly(date, now).date;
      timeMin = new Date(parsed);
      timeMin.setHours(0, 0, 0, 0);
      timeMax = new Date(parsed);
      timeMax.setHours(23, 59, 59, 999);
    } else {
      timeMin = now;
      timeMax = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Next 7 days
    }

    const params = {
      calendarId: "primary",
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: "startTime",
    };
    if (query) params.q = query;

    const response = await calendar.events.list(params);
    const events = response.data.items || [];

    if (events.length === 0) {
      return { success: true, message: "You have no events scheduled for that time period.", data: { events: [] } };
    }

    const eventList = events.map(e => ({
      id: e.id,
      title: e.summary || "(No title)",
      start: e.start.dateTime || e.start.date,
      end: e.end.dateTime || e.end.date,
    }));

    const readable = eventList.map(e => `• "${e.title}" at ${new Date(e.start).toLocaleString("en-US", { timeZone: userTimezone })}`).join("\n");

    return {
      success: true,
      message: `Here are your upcoming events:\n${readable}`,
      data: { events: eventList },
    };
  } catch (error) {
    console.error("[Tool:Calendar:List] Error:", error.message);
    return { success: false, error: error.message, fallback: "I couldn't fetch your calendar events." };
  }
}

// ==================== DELETE ====================
async function deleteCalendarEvent({ eventId, title, date, accessToken, timezone }) {
  try {
    if (!accessToken) {
      return { success: false, error: "Not authenticated", fallback: "I need access to your Google Calendar. Please connect your Google account first." };
    }

    const calendar = getCalendarClient(accessToken);

    // If no eventId, search by title and/or date
    if (!eventId && (title || date)) {
      const searchResult = await listCalendarEvents({ date, query: title, maxResults: 10, accessToken, timezone });
      if (searchResult.success && searchResult.data.events.length > 0) {
        // Delete all matching events
        let deletedCount = 0;
        for (const event of searchResult.data.events) {
          try {
            await calendar.events.delete({ calendarId: "primary", eventId: event.id });
            deletedCount++;
          } catch (e) {
            console.error(`[Tool:Calendar:Delete] Failed to delete event ${event.id}:`, e.message);
          }
        }
        return {
          success: true,
          message: `Successfully deleted ${deletedCount} event(s) ${title ? `matching "${title}" ` : ""}${date ? `on ${date}` : ""} from your calendar.`,
          data: { deletedCount },
        };
      } else {
        return { success: true, message: `I couldn't find any events ${title ? `matching "${title}" ` : ""}${date ? `on ${date}` : ""} in your calendar.`, data: { deletedCount: 0 } };
      }
    }

    if (eventId) {
      await calendar.events.delete({ calendarId: "primary", eventId });
      return { success: true, message: "The event has been deleted from your calendar.", data: { deletedEventId: eventId } };
    }

    return { success: false, error: "No event ID or title provided", fallback: "I need either an event title or ID to delete an event." };
  } catch (error) {
    console.error("[Tool:Calendar:Delete] Error:", error.message);
    return { success: false, error: error.message, fallback: "I couldn't delete the calendar event." };
  }
}

// ==================== UPDATE ====================
async function updateCalendarEvent({ eventId, title, newTitle, newDate, newTime, accessToken, timezone }) {
  const userTimezone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  try {
    if (!accessToken) {
      return { success: false, error: "Not authenticated", fallback: "I need access to your Google Calendar. Please connect your Google account first." };
    }

    const calendar = getCalendarClient(accessToken);

    // If no eventId, search by title
    if (!eventId && title) {
      const searchResult = await listCalendarEvents({ query: title, maxResults: 1, accessToken, timezone });
      if (searchResult.success && searchResult.data.events.length > 0) {
        eventId = searchResult.data.events[0].id;
      } else {
        return { success: false, error: "Event not found", fallback: `I couldn't find an event called "${title}" in your calendar.` };
      }
    }

    if (!eventId) {
      return { success: false, error: "No event ID or title provided", fallback: "I need either an event title or ID to update an event." };
    }

    // Fetch existing event
    const existing = await calendar.events.get({ calendarId: "primary", eventId });
    const patch = {};

    if (newTitle) {
      patch.summary = newTitle;
    }

    if (newDate || newTime) {
      const currentStart = new Date(existing.data.start.dateTime || existing.data.start.date);
      const updatedStart = parseDateTime(newDate, newTime, currentStart);
      const duration = new Date(existing.data.end.dateTime || existing.data.end.date).getTime() - currentStart.getTime();
      const updatedEnd = new Date(updatedStart.getTime() + duration);

      patch.start = { dateTime: updatedStart.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
      patch.end = { dateTime: updatedEnd.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
    }

    const response = await calendar.events.patch({ calendarId: "primary", eventId, resource: patch });

    return {
      success: true,
      message: `Your event "${response.data.summary}" has been updated. ${patch.start ? `New time: ${new Date(patch.start.dateTime).toLocaleString()}.` : ""} ${patch.summary ? `New title: "${patch.summary}".` : ""}`,
      data: { eventId, updated: Object.keys(patch) },
    };
  } catch (error) {
    console.error("[Tool:Calendar:Update] Error:", error.message);
    return { success: false, error: error.message, fallback: "I couldn't update the calendar event." };
  }
}

// ==================== HELPERS ====================
function parseDateOnly(dateStr, now) {
  if (!dateStr) return { date: now, isRelativeTime: false };
  const result = new Date(now);
  const lower = dateStr.toLowerCase();

  // 1. Try native Date parsing first if string contains a number (e.g., "Oct 15", "2026-10-15")
  const cleanedStr = dateStr.replace(/\s+at\s+/i, ' ');
  if (/\d/.test(cleanedStr)) {
    // But skip if it looks like a relative expression ("in 15 min", "next 15 min")
    if (!/(?:in|next|after)\s+\d+\s*(min|minute|minutes|hr|hour|hours)/i.test(lower)) {
      const parsed = new Date(cleanedStr);
      if (!isNaN(parsed.getTime())) {
        return { date: parsed, isRelativeTime: false };
      }
    }
  }

  // 2. Relative time matching ("in 15 min", "next 15 min", "after 2 hours")
  const relativeMatch = lower.match(/(?:in|next|after)\s+(\d+)\s*(min|minute|minutes|hr|hour|hours)/i);
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1]);
    const unit = relativeMatch[2].toLowerCase();
    if (unit.startsWith("min")) {
      result.setMinutes(result.getMinutes() + amount);
    } else {
      result.setHours(result.getHours() + amount);
    }
    return { date: result, isRelativeTime: true };
  }

  // 3. Relative date matching
  if (lower.includes("tomorrow")) {
    result.setDate(result.getDate() + 1);
    return { date: result, isRelativeTime: false };
  }
  if (lower.includes("today")) {
    return { date: result, isRelativeTime: false };
  }
  if (lower.includes("next week")) {
    result.setDate(result.getDate() + 7);
    return { date: result, isRelativeTime: false };
  }

  // 4. Day name matching
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const dayIndex = days.findIndex(day => lower.includes(day));

  if (dayIndex !== -1) {
    const currentDay = result.getDay();
    let daysToAdd = dayIndex - currentDay;
    if (daysToAdd <= 0) daysToAdd += 7;
    result.setDate(result.getDate() + daysToAdd);
    return { date: result, isRelativeTime: false };
  }

  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return { date: parsed, isRelativeTime: false };
  }

  return { date: result, isRelativeTime: false };
}

function parseDateTime(dateStr, timeStr, now) {
  const parsed = parseDateOnly(dateStr, now);
  let result = parsed.date;

  // If parseDateOnly already computed a precise relative time ("in 15 min"),
  // do NOT override with hour-rounding. The time is already exact.
  if (parsed.isRelativeTime && !timeStr) {
    return result;
  }

  if (timeStr) {
    const timeLower = timeStr.toLowerCase();
    const timeMatch = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/i);
    
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2] || "0");
      const period = (timeMatch[3] || "").toLowerCase();

      if (period === "pm" && hours < 12) hours += 12;
      if (period === "am" && hours === 12) hours = 0;

      result.setHours(hours, minutes, 0, 0);
    } else if (timeLower.includes("noon")) {
      result.setHours(12, 0, 0, 0);
    } else if (timeLower.includes("midnight")) {
      result.setHours(0, 0, 0, 0);
    } else if (timeLower.includes("afternoon")) {
      result.setHours(14, 0, 0, 0);
    } else if (timeLower.includes("morning")) {
      result.setHours(9, 0, 0, 0);
    } else if (timeLower.includes("evening")) {
      result.setHours(18, 0, 0, 0);
    } else {
      if (result.getMinutes() > 0) {
        result.setHours(result.getHours() + 1, 0, 0, 0);
      } else {
        result.setSeconds(0, 0);
      }
    }
  } else {
    // No time provided and not a relative offset — round to next whole hour
    if (result.getMinutes() > 0) {
      result.setHours(result.getHours() + 1, 0, 0, 0);
    } else {
      result.setSeconds(0, 0);
    }
  }

  return result;
}

function toLocalISO(date) {
  const pad = (n) => n.toString().padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  return `${y}-${m}-${d}T${h}:${mm}:${s}`;
}

function getNowInTimezone(timezone) {
  const now = new Date();
  if (!timezone) return now;
  
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    });
    
    const parts = formatter.formatToParts(now);
    const d = {};
    parts.forEach(p => { if(p.type !== 'literal') d[p.type] = p.value; });
    
    // Handle 24h wrap-around if formatter returns 24 instead of 00
    let hour = parseInt(d.hour);
    if (hour === 24) hour = 0;

    const localNow = new Date();
    localNow.setFullYear(parseInt(d.year), parseInt(d.month) - 1, parseInt(d.day));
    localNow.setHours(hour, parseInt(d.minute), parseInt(d.second), 0);
    return localNow;
  } catch (e) {
    return now;
  }
}

module.exports = { createCalendarEvent, listCalendarEvents, deleteCalendarEvent, updateCalendarEvent };
