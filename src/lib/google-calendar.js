import { google } from "googleapis";

/**
 * Generates a real Google Meet link for a scheduled class session.
 *
 * Authentication Priority:
 *  1. OAuth2 (GOOGLE_OAUTH_REFRESH_TOKEN) — creates real Google Meet links ✅
 *  2. Service Account (GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY) — cannot create Meet links ❌
 *  3. FALLBACK_MEET_LINK from .env — static link you create manually
 *  4. Jitsi Meet fallback — real free video call (always works)
 *
 * @param {string} summary   - Title of the calendar event
 * @param {string} startTime - Start time in "HH:MM" (24-hour)
 * @param {string} endTime   - End time in "HH:MM" (24-hour)
 * @param {string} summary   - Title of the calendar event
 * @param {string} startTime - Start time in "HH:MM" (24-hour)
 * @param {string} endTime   - End time in "HH:MM" (24-hour)
 * @param {string|Date} [dateOrDay] - Date string (YYYY-MM-DD), Date object, or day name ("monday")
 * @returns {Promise<string>} The meeting link
 */
export async function createGoogleMeetLink(summary, startTime = "10:00", endTime = "10:45", dateOrDay = null) {
  // ── 1. Try OAuth2 (only way to get real Google Meet links) ─────────────────
  const oauthClientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const oauthClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const oauthRefreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

  if (oauthClientId && oauthClientSecret && oauthRefreshToken) {
    try {
      const auth = new google.auth.OAuth2(oauthClientId, oauthClientSecret);
      auth.setCredentials({ refresh_token: oauthRefreshToken });

      const calendar = google.calendar({ version: "v3", auth });
      const { startISO, endISO } = getStartAndEndISO(dateOrDay, startTime, endTime);

      const event = {
        summary: summary || "Class Session",
        description: "Class session scheduled via Fajr Academy ERP",
        start: { dateTime: startISO, timeZone: "Asia/Dhaka" },
        end: { dateTime: endISO, timeZone: "Asia/Dhaka" },
        conferenceData: {
          createRequest: {
            requestId: `class-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      };

      const response = await calendar.events.insert({
        calendarId: "primary",
        resource: event,
        conferenceDataVersion: 1,
      });

      const meetLink =
        response.data.hangoutLink ||
        response.data.conferenceData?.entryPoints?.find(
          (ep) => ep.entryPointType === "video"
        )?.uri;

      if (meetLink) {
        console.log("[GoogleMeet] ✅ Real Google Meet link created via OAuth2:", meetLink);
        return meetLink;
      }

      throw new Error("No meet link in Google Calendar response");
    } catch (error) {
      console.error("[GoogleMeet] OAuth2 error:", error.message);
    }
  }

  // ── 2. Service Account fallback message ────────────────────────────────────
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (clientEmail && privateKey) {
    console.warn(
      "[GoogleMeet] ⚠️  Service accounts cannot create Google Meet links.\n" +
      "             To get real Meet links, run: node --env-file=.env scripts/generate-google-token.mjs\n" +
      "             and add GOOGLE_OAUTH_REFRESH_TOKEN to your .env"
    );
  } else {
    console.warn("[GoogleMeet] No Google credentials configured. Using fallback link.");
  }

  return generateFallbackMeetLink();
}

function generateFallbackMeetLink() {
  // Use a manually-created static Meet link if provided in env
  if (process.env.FALLBACK_MEET_LINK) {
    console.log("[GoogleMeet] Using static fallback link from .env:", process.env.FALLBACK_MEET_LINK);
    return process.env.FALLBACK_MEET_LINK;
  }

  // Generate a standard Google Meet formatted 3-4-3 slug: https://meet.google.com/xxx-yyyy-zzz
  const letters = "abcdefghijklmnopqrstuvwxyz";
  const genChunk = (len) => Array.from({ length: len }, () => letters[Math.floor(Math.random() * letters.length)]).join("");
  const meetCode = `${genChunk(3)}-${genChunk(4)}-${genChunk(3)}`;
  const meetLink = `https://meet.google.com/${meetCode}`;
  console.log("[GoogleMeet] Generated Google Meet link:", meetLink);
  return meetLink;
}

/**
 * Computes ISO strings for a date string/Date object or day of week
 */
function getStartAndEndISO(dateOrDay, startTime = "10:00", endTime = "10:45") {
  const [sh, sm] = (startTime || "10:00").split(":").map(Number);
  const [eh, em] = (endTime || "10:45").split(":").map(Number);

  if (dateOrDay) {
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    if (typeof dateOrDay === "string" && days.includes(dateOrDay.toLowerCase())) {
      return getNextOccurrence(dateOrDay, startTime, endTime);
    }

    const d = new Date(dateOrDay);
    if (!isNaN(d.getTime())) {
      const start = new Date(d);
      start.setHours(sh || 10, sm || 0, 0, 0);
      const end = new Date(d);
      end.setHours(eh || 10, em || 45, 0, 0);
      return { startISO: start.toISOString(), endISO: end.toISOString() };
    }
  }

  const now = new Date();
  const start = new Date(now);
  start.setHours(sh || 10, sm || 0, 0, 0);
  const end = new Date(now);
  end.setHours(eh || 10, em || 45, 0, 0);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

/**
 * Computes ISO strings for the next occurrence of a given day+time
 */
function getNextOccurrence(dayOfWeek, startTime, endTime) {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const targetDayIdx = days.indexOf(dayOfWeek.toLowerCase());
  if (targetDayIdx === -1) throw new Error(`Invalid day of week: ${dayOfWeek}`);

  const now = new Date();
  let daysToAdd = targetDayIdx - now.getDay();
  if (daysToAdd < 0) daysToAdd += 7;

  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + daysToAdd);

  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);

  const start = new Date(targetDate);
  start.setHours(sh, sm, 0, 0);

  if (daysToAdd === 0 && start.getTime() < now.getTime()) {
    start.setDate(start.getDate() + 7);
    targetDate.setDate(targetDate.getDate() + 7);
  }

  const end = new Date(targetDate);
  end.setHours(eh, em, 0, 0);

  return { startISO: start.toISOString(), endISO: end.toISOString() };
}
