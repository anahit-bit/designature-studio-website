/**
 * AC-002 — client-side "already saved" markers so a tool's Save button stays
 * "Saved" across navigation and reloads (the server dedups the DB; this keeps the
 * UI honest without a round-trip). Keyed by a short content fingerprint.
 */

const KEY = 'ds_saved_marks';

/** Tiny stable string hash (djb2) — enough to fingerprint a concept/DNA locally. */
export function fingerprint(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function read(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function isSaved(mark: string): boolean {
  return read().has(mark);
}

export function markSaved(mark: string): void {
  try {
    const set = read();
    set.add(mark);
    // cap so the store can't grow unbounded
    const arr = [...set].slice(-500);
    localStorage.setItem(KEY, JSON.stringify(arr));
  } catch {
    /* ignore (private mode) */
  }
}
