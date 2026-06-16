/**
 * Price parsing + normalization for the Shopping List — pure, shared by the
 * client (Est. total math, ShoppingExperience / ShoppingListShowcase) and the
 * server (normalize the Serper price string before it goes out).
 *
 * THE BUG THIS FIXES ($179,900): the old parser did
 *   parseInt(s.replace(/[^0-9]/g,''), 10)
 * which strips the decimal point too, so "$1,799.00" → "179900" → 179900.
 * parsePrice() instead reads the real numeric value and drops the cents,
 * yielding whole dollars ("$1,799.00" → 1799).
 */

/**
 * Parse a price string to a whole-dollar number. Handles "$1,799.00",
 * thousands separators, "from $2,200", currency symbols, EU "1.799,00", and
 * ranges like "$300–900" (returns the LOW bound). Cents are dropped (truncated,
 * per owner: "take the integer part"). Non-numeric input → 0.
 */
export function parsePrice(input?: string | number | null): number {
  if (input == null) return 0;
  if (typeof input === 'number') return Number.isFinite(input) ? Math.trunc(input) : 0;
  const s = String(input).trim();
  if (!s) return 0;

  // First numeric run only → for ranges ("300–900") this is the low bound,
  // and for "from $2,200" it's the price.
  const m = s.match(/\d[\d.,]*/);
  if (!m) return 0;
  const token = m[0];
  const hasComma = token.includes(',');
  const hasDot = token.includes('.');

  let normalized: string;
  if (hasComma && hasDot) {
    // Both present → the LAST one is the decimal separator, the other is thousands.
    if (token.lastIndexOf(',') > token.lastIndexOf('.')) {
      normalized = token.replace(/\./g, '').replace(',', '.'); // EU: 1.799,00 → 1799.00
    } else {
      normalized = token.replace(/,/g, ''); // US: 1,799.00 → 1799.00
    }
  } else if (hasComma) {
    // Only commas: "1,799" = thousands; "799,00" (1–2 trailing) = decimal.
    normalized = /,\d{1,2}$/.test(token) ? token.replace(',', '.') : token.replace(/,/g, '');
  } else if (hasDot) {
    const dots = (token.match(/\./g) || []).length;
    // Multiple dots, or a single dot with exactly 3 trailing digits ("1.799"),
    // is a thousands separator; otherwise it's a real decimal ("1799.00", "19.99").
    normalized = dots > 1 || /\.\d{3}$/.test(token) ? token.replace(/\./g, '') : token;
  } else {
    normalized = token;
  }

  const val = parseFloat(normalized);
  return Number.isFinite(val) ? Math.trunc(val) : 0;
}

/**
 * Normalize a price string for display: a clean, consistent "$1,799" (no cents,
 * thousands-comma-grouped), preserving a leading currency symbol when present.
 * Non-price strings (e.g. "View") and unparseable values pass through unchanged.
 */
export function normalizePrice(input?: string | number | null): string | null {
  if (input == null) return null;
  const s = String(input).trim();
  if (!s) return null;
  const dollars = parsePrice(s);
  if (dollars <= 0) return s; // not a parseable price — leave it as-is
  const symMatch = s.match(/[$€£₽]/);
  const symbol = symMatch ? symMatch[0] : '$';
  return `${symbol}${dollars.toLocaleString('en-US')}`;
}
