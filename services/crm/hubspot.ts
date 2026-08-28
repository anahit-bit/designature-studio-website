/**
 * HubSpot CRM sync (Calendly booking → contact).
 *
 * When someone books a call we upsert them as a HubSpot contact and stamp a
 * custom property `booking_type` so the studio can tell free-call leads from
 * paid-consultation customers. HubSpot has no literal "tags"; a single-line-text
 * contact property is the cleanest filterable equivalent (chosen by the owner).
 *
 * Auth (read lazily — same ESM-vs-dotenv trap as db/pgPool.ts):
 *   HUBSPOT_ACCESS_TOKEN — a Private App token with scopes:
 *                          crm.objects.contacts.write, crm.schemas.contacts.write
 *
 * Everything degrades gracefully: with no token the functions no-op and report
 * `configured:false`, so the rest of the server (and the booking flow) is unaffected.
 */

const API = "https://api.hubapi.com";
const REQUEST_TIMEOUT_MS = 15_000;

/** Internal property name (lowercase, no spaces — HubSpot requirement). */
export const BOOKING_PROPERTY = "booking_type";
export const BOOKING_LABELS = {
  free: "Free call",
  paid: "Paid consultation",
} as const;

export function getHubspotToken(): string {
  return (process.env.HUBSPOT_ACCESS_TOKEN || "").trim();
}
export function isHubspotConfigured(): boolean {
  return !!getHubspotToken();
}

// ── Pure helpers (unit-tested) ───────────────────────────────────────────────

/** Split a display name into HubSpot firstname / lastname (best effort). */
export function splitName(name: string | undefined): { firstname?: string; lastname?: string } {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { firstname: parts[0] };
  return { firstname: parts[0], lastname: parts.slice(1).join(" ") };
}

/** Build the HubSpot contact `properties` object for a booking. */
export function contactProperties(email: string, name: string | undefined, kind: "free" | "paid"): Record<string, string> {
  const props: Record<string, string> = {
    email: email.trim().toLowerCase(),
    [BOOKING_PROPERTY]: BOOKING_LABELS[kind],
  };
  const { firstname, lastname } = splitName(name);
  if (firstname) props.firstname = firstname;
  if (lastname) props.lastname = lastname;
  return props;
}

// ── Network ──────────────────────────────────────────────────────────────────

async function hubspot(token: string, method: string, path: string, body?: unknown): Promise<{ status: number; json: any; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
    return { status: res.status, json, text };
  } finally {
    clearTimeout(timer);
  }
}

// Ensure the custom property exists — once per process, best-effort.
let _propEnsured = false;
async function ensureBookingProperty(token: string): Promise<void> {
  if (_propEnsured) return;
  const r = await hubspot(token, "POST", "/crm/v3/properties/contacts", {
    name: BOOKING_PROPERTY,
    label: "Booking type",
    type: "string",
    fieldType: "text",
    groupName: "contactinformation",
    description: "How this contact last engaged: Free call or Paid consultation (set from Calendly bookings).",
  });
  // 201 created, or 409 already exists → both fine.
  if (r.status === 201 || r.status === 409) {
    _propEnsured = true;
    return;
  }
  // Some portals return 400 "already has a property" — treat as present.
  if (r.status === 400 && /already/i.test(r.text)) {
    _propEnsured = true;
    return;
  }
  console.error("[hubspot] ensure property failed:", r.status, r.text.slice(0, 200));
}

export interface UpsertResult {
  configured: boolean;
  ok: boolean;
  contactId?: string;
  error?: string;
}

/**
 * Upsert a contact by email and set booking_type. Uses the batch upsert endpoint
 * (create-or-update keyed on the email idProperty) so it's a single idempotent call.
 */
export async function upsertContactBooking(params: {
  email: string;
  name?: string;
  kind: "free" | "paid";
}): Promise<UpsertResult> {
  const token = getHubspotToken();
  if (!token) return { configured: false, ok: false, error: "HUBSPOT_ACCESS_TOKEN not set" };
  const email = params.email.trim().toLowerCase();
  if (!email) return { configured: true, ok: false, error: "missing email" };

  try {
    await ensureBookingProperty(token);
    const r = await hubspot(token, "POST", "/crm/v3/objects/contacts/batch/upsert", {
      inputs: [
        {
          idProperty: "email",
          id: email,
          properties: contactProperties(email, params.name, params.kind),
        },
      ],
    });
    if (r.status >= 200 && r.status < 300) {
      const contactId = r.json?.results?.[0]?.id;
      return { configured: true, ok: true, contactId };
    }
    return { configured: true, ok: false, error: `HubSpot HTTP ${r.status}: ${r.text.slice(0, 200)}` };
  } catch (err) {
    return { configured: true, ok: false, error: (err as Error)?.message || "HubSpot request failed" };
  }
}
