import { describe, it, expect } from 'vitest';
import { parseStudioBlocks } from '../components/JournalArticlePage';

describe('parseStudioBlocks', () => {
  it('returns a single md block when there are no markers', () => {
    expect(parseStudioBlocks('just some body text')).toEqual([
      { type: 'md', content: 'just some body text' },
    ]);
  });

  it('splits a body with one [studio] block into md · studio · md', () => {
    const body = 'intro para\n\n[studio]my note[/studio]\n\n## Heading\n\nmore text';
    const blocks = parseStudioBlocks(body);
    expect(blocks.map((b) => b.type)).toEqual(['md', 'studio', 'md']);
    expect(blocks[1].content.trim()).toBe('my note');
    expect(blocks[0].content).toContain('intro para');
    expect(blocks[2].content).toContain('## Heading');
  });

  it('handles multiple [studio] blocks', () => {
    const body = 'a[studio]one[/studio]b[studio]two[/studio]c';
    const blocks = parseStudioBlocks(body);
    expect(blocks.map((b) => b.type)).toEqual(['md', 'studio', 'md', 'studio', 'md']);
    expect(blocks.filter((b) => b.type === 'studio').map((b) => b.content)).toEqual(['one', 'two']);
  });

  it('drops empty chunks (e.g. a marker at the very start)', () => {
    const blocks = parseStudioBlocks('[studio]lead note[/studio]\n\nbody');
    expect(blocks.map((b) => b.type)).toEqual(['studio', 'md']);
    expect(blocks[0].content).toBe('lead note');
  });

  it('captures multi-line studio content', () => {
    const body = 'x\n\n[studio]line one\nline two[/studio]\n\ny';
    const studio = parseStudioBlocks(body).find((b) => b.type === 'studio');
    expect(studio?.content.trim()).toBe('line one\nline two');
  });
});
