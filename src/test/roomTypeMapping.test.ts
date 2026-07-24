import { describe, it, expect } from 'vitest';
import { ROOM_NAME_TO_TYPE, ROOM_TYPE_LABELS } from '../../services/aiVision/stylePresets';
// The LIVE room-picker chips. If someone renames/adds a chip, this import keeps
// the contract test honest — every label the UI can send must resolve server-side.
import { ROOM_TYPES_FULL } from '../components/VisionExperience';

const VALID_ROOM_TYPES = new Set(Object.keys(ROOM_TYPE_LABELS));

describe('ROOM_NAME_TO_TYPE · every live room-picker label resolves', () => {
  it.each([...ROOM_TYPES_FULL])(
    'live chip "%s" maps to a valid RoomType (not an undefined → living_room fallback)',
    (label) => {
      const resolved = ROOM_NAME_TO_TYPE[label];
      expect(
        resolved,
        `"${label}" does not resolve — the server would silently fall back to living_room`,
      ).toBeDefined();
      expect(VALID_ROOM_TYPES.has(resolved)).toBe(true);
    },
  );

  it('the two short forms that regressed in production both resolve correctly', () => {
    // "Dining" (not "Dining Room") is what the live chip sends; this was the bug.
    expect(ROOM_NAME_TO_TYPE['Dining']).toBe('dining_room');
    expect(ROOM_NAME_TO_TYPE['Living']).toBe('living_room');
  });

  it('legacy full-form labels still resolve (AIConceptsPage path)', () => {
    expect(ROOM_NAME_TO_TYPE['Dining Room']).toBe('dining_room');
    expect(ROOM_NAME_TO_TYPE['Living Room']).toBe('living_room');
  });
});
