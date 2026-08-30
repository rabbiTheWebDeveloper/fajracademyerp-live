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
 * @param {string} dayOfWeek - e.g. "monday", "tuesday"
 * @returns {Promise<string>} The meeting link
 */
export async function createGoogleMeetLink(summary, startTime, endTime, dayOfWeek) {
  // ── 1. Try OAuth2 (only way to get real Google Meet links) ─────────────────
  const oauthClientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const oauthClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const oauthRefreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

  if (oauthClientId && oauthClientSecret && oauthRefreshToken) {
    try {
      const auth = new google.auth.OAuth2(oauthClientId, oauthClientSecret);
      auth.setCredentials({ refresh_token: oauthRefreshToken });

      const calendar = google.calendar({ version: "v3", auth });
      const { startISO, endISO } = getNextOccurrence(dayOfWeek, startTime, endTime);

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
  // Use a manually-created static Meet link if provided
  if (process.env.FALLBACK_MEET_LINK) {
    console.log("[GoogleMeet] Using static fallback link from .env:", process.env.FALLBACK_MEET_LINK);
    return process.env.FALLBACK_MEET_LINK;
  }

  // Generate a real, free Jitsi Meet room that actually works
  const part1 = Math.random().toString(36).substring(2, 5);
  const part2 = Math.random().toString(36).substring(2, 6);
  const part3 = Math.random().toString(36).substring(2, 5);
  const jitsiLink = `https://meet.jit.si/fajr-class-${part1}-${part2}-${part3}`;
  console.log("[GoogleMeet] Jitsi Meet fallback (real working call):", jitsiLink);
  return jitsiLink;
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
