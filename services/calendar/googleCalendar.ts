/**
 * Google Calendar service — event creation on payment success (I-025-v2).
 *
 * Availability is sourced from Calendly (see ../consultation/calendly.ts). This
 * module is the WRITE side — on a paid booking we create the real event in the
 * studio owner's Google Calendar with an auto-generated Meet link:
 *   - insertEvent()  → on payment success, create the booking + auto-generate a
 *                      Google Meet link, and let Google email both attendees
 *   - deleteEvent()  → on refund/cancel, remove the event + cancel the invites
 *
 * AUTH MODEL — important distinction:
 *   - CUSTOMER sign-in uses Google Identity Services (an ID token, identity only).
 *     That grants NO calendar access and yields NO refresh token.
 *   - THIS module acts as the STUDIO OWNER, via a long-lived refresh token she
 *     grants ONCE through /api/admin/google-calendar/authorize (offline access +
 *     calendar.events scope). The token lives in GOOGLE_CALENDAR_REFRESH_TOKEN.
 *   Both flows reuse the same GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (one OAuth
 *   app); the consent screen just needs the calendar.events scope added.
 *
 * All env is read LAZILY (same ESM-vs-dotenv trap fixed in db/pgPool.ts).
 */
import { google } from "googleapis";

/** Scopes the one-time owner authorization requests. */
export const CALENDAR_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.events",
];

export function getCalendarId(): string {
  return (process.env.GOOGLE_CALENDAR_ID || "primary").trim() || "primary";
}

/** Base app URL (no trailing slash) for building the OAuth redirect URI. */
function appBaseUrl(): string {
  const raw = (process.env.APP_URL || "http://localhost:3000").trim();
  return raw.replace(/\/+$/, "");
}

/** The exact redirect URI Google will call back — MUST be registered in the
 *  OAuth client's "Authorized redirect URIs" list in Google Cloud Console. */
export function getRedirectUri(): string {
  return `${appBaseUrl()}/api/admin/google-calendar/callback`;
}

function getClientCreds(): { clientId: string; clientSecret: string } {
  return {
    clientId: (process.env.GOOGLE_CLIENT_ID || "").trim(),
    clientSecret: (process.env.GOOGLE_CLIENT_SECRET || "").trim(),
  };
}

/** True once the owner has completed the one-time authorization. */
export function isCalendarConfigured(): boolean {
  const { clientId, clientSecret } = getClientCreds();
  return !!clientId && !!clientSecret && !!(process.env.GOOGLE_CALENDAR_REFRESH_TOKEN || "").trim();
}

/** A bare OAuth2 client (for the authorize/exchange handshake). */
function makeOAuthClient() {
  const { clientId, clientSecret } = getClientCreds();
  return new google.auth.OAuth2(clientId, clientSecret, getRedirectUri());
}

/** Build the consent-screen URL for the one-time owner authorization. */
export function buildConsentUrl(): string {
  return makeOAuthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // force a refresh_token even on re-authorization
    scope: CALENDAR_SCOPES,
    include_granted_scopes: true,
  });
}

/** Exchange the authorization code for tokens (we want `refresh_token`). */
export async function exchangeCodeForTokens(
  code: string,
): Promise<{ refreshToken: string | null; accessToken: string | null; raw: unknown }> {
  const client = makeOAuthClient();
  const { tokens } = await client.getToken(code);
  return {
    refreshToken: tokens.refresh_token ?? null,
    accessToken: tokens.access_token ?? null,
    raw: tokens,
  };
}

/** An OAuth2 client pre-loaded with the owner's refresh token (auto-refreshes
 *  the access token on each API call). Throws if not yet configured. */
function authedClient() {
  const refreshToken = (process.env.GOOGLE_CALENDAR_REFRESH_TOKEN || "").trim();
  const { clientId, clientSecret } = getClientCreds();
  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error(
      "Google Calendar is not configured — set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, " +
        "and GOOGLE_CALENDAR_REFRESH_TOKEN (run /api/admin/google-calendar/authorize once).",
    );
  }
  const client = new google.auth.OAuth2(clientId, clientSecret);
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

function calendarApi() {
  return google.calendar({ version: "v3", auth: authedClient() });
}

export interface InsertEventArgs {
  /** UTC ISO start of the consultation. */
  startIso: string;
  durationMinutes: number;
  /** Customer's email (attendee). */
  attendeeEmail: string;
  /** Studio host email (second attendee). */
  hostEmail: string;
  /** Stable per-order id → idempotent Meet-link creation. */
  requestId: string;
  summary?: string;
  description?: string;
}

export interface InsertEventResult {
  eventId: string;
  meetLink: string | null;
  htmlLink: string | null;
}

/**
 * Create the booking on the studio calendar with an auto-generated Meet link and
 * both attendees; Google sends the invites (sendUpdates: "all"). Times are sent
 * as UTC (timeZone "UTC") so there's no ambiguity — Google localizes for each
 * attendee's own calendar.
 */
export async function insertEvent(args: InsertEventArgs): Promise<InsertEventResult> {
  const cal = calendarApi();
  const startMs = Date.parse(args.startIso);
  const endIso = new Date(startMs + args.durationMinutes * 60_000).toISOString();

  const res = await cal.events.insert({
    calendarId: getCalendarId(),
    conferenceDataVersion: 1,
    sendUpdates: "all",
    requestBody: {
      summary: args.summary || "Designature Studio — 45-min consultation",
      description:
        args.description ||
        "Your paid virtual consultation with Designature Studio. Join via the Google Meet link on this event.",
      start: { dateTime: new Date(startMs).toISOString(), timeZone: "UTC" },
      end: { dateTime: endIso, timeZone: "UTC" },
      attendees: [{ email: args.attendeeEmail }, { email: args.hostEmail }],
      conferenceData: {
        createRequest: {
          requestId: args.requestId,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
      reminders: { useDefault: true },
    },
  });

  const data = res.data;
  const meetLink =
    data.hangoutLink ||
    data.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ||
    null;
  return {
    eventId: data.id || "",
    meetLink,
    htmlLink: data.htmlLink || null,
  };
}

/**
 * Delete a calendar event (on refund/cancel) and notify attendees the meeting is
 * off. Swallows a 404/410 (already gone) as success; rethrows anything else so
 * the caller can log it without failing the money-movement it follows.
 */
export async function deleteEvent(eventId: string): Promise<void> {
  const cal = calendarApi();
  try {
    await cal.events.delete({
      calendarId: getCalendarId(),
      eventId,
      sendUpdates: "all",
    });
  } catch (err: any) {
    const code = err?.code || err?.response?.status;
    if (code === 404 || code === 410) return; // already deleted — fine
    throw err;
  }
}
