/**
 * Tiny escaping helpers for safely injecting resolved SEO data into HTML/XML.
 * No dependency — the substitution set is small and well understood.
 */

/** Escape text destined for an HTML text node. */
export function escapeHtml(input: string): string {
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Escape a value destined for a double-quoted HTML attribute.
 * Covers the quote + angle brackets + ampersand so the attribute can never
 * break out of its container.
 */
export function escapeAttr(input: string): string {
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Escape text for an XML text node (used by the sitemap). */
export function escapeXml(input: string): string {
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Serialize a JSON-LD object for embedding inside a <script type="application/ld+json">
 * tag. The payload is data (not executed JS), so the only real hazard is a string
 * value containing "</script>" (or "<!--") terminating the element early. We
 * neutralize "<", ">" and "&" as \uXXXX escapes — still valid JSON, but inert as
 * markup.
 */
export function jsonLdScriptBody(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
