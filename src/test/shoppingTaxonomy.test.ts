import { describe, it, expect } from 'vitest';
import { SHOPPING_TAXONOMY, SHOPPING_TAXONOMY_IDS, categoryToTaxonomyId } from '../data/shoppingTaxonomy';

describe('shoppingTaxonomy — single source of truth', () => {
  it('is the owner-approved ordered set of 8 categories', () => {
    expect(SHOPPING_TAXONOMY_IDS).toEqual([
      'seating', 'tables-desks', 'storage', 'beds', 'lighting', 'rugs', 'textiles', 'art-decor',
    ]);
  });

  it('every entry has id, labelKey, non-empty detects + queryHints', () => {
    for (const c of SHOPPING_TAXONOMY) {
      expect(c.id).toBeTruthy();
      expect(c.labelKey).toMatch(/^ai\.taxonomy\./);
      expect(c.detects.length).toBeGreaterThan(0);
      expect(c.queryHints.length).toBeGreaterThan(0);
    }
  });

  it('maps real Gemini-style detected categories to the right id', () => {
    expect(categoryToTaxonomyId('Sofa')).toBe('seating');
    expect(categoryToTaxonomyId('Accent Chair')).toBe('seating');
    expect(categoryToTaxonomyId('Coffee Table')).toBe('tables-desks');
    expect(categoryToTaxonomyId('Writing Desk')).toBe('tables-desks');
    expect(categoryToTaxonomyId('Sideboard')).toBe('storage');
    expect(categoryToTaxonomyId('King Bed')).toBe('beds');
    expect(categoryToTaxonomyId('Pendant Light')).toBe('lighting');
    expect(categoryToTaxonomyId('Area Rug')).toBe('rugs');
    expect(categoryToTaxonomyId('Curtains')).toBe('textiles');
    expect(categoryToTaxonomyId('Wall Art')).toBe('art-decor');
    expect(categoryToTaxonomyId('Vase')).toBe('art-decor');
  });

  it('returns null for unmappable / empty input', () => {
    expect(categoryToTaxonomyId('')).toBeNull();
    expect(categoryToTaxonomyId(undefined)).toBeNull();
    expect(categoryToTaxonomyId('spaceship')).toBeNull();
  });
});
