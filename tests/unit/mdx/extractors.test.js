const {
  extractHeadings,
  extractPlainText,
  extractMarkdownSummary,
} = require('../../../packages/app/lib/build/mdx');

describe('extractHeadings', () => {
  it('finds headings outside of code blocks and assigns deterministic ids', () => {
    const source = [
      '---',
      'title: Sample',
      '---',
      '',
      '# Alpha',
      '',
      '## Beta {#custom-id}',
      '',
      '### Beta',
      '',
      '```',
      '# should not appear',
      '```',
      '',
      '# Alpha',
      '',
      '## Gamma',
      '## Gamma',
      '## Gamma',
    ].join('\n');

    expect(extractHeadings(source)).toEqual([
      { id: 'alpha', title: 'Alpha', depth: 1 },
      { id: 'custom-id', title: 'Beta', depth: 2 },
      { id: 'beta', title: 'Beta', depth: 3 },
      { id: 'alpha-2', title: 'Alpha', depth: 1 },
      { id: 'gamma', title: 'Gamma', depth: 2 },
      { id: 'gamma-2', title: 'Gamma', depth: 2 },
      { id: 'gamma-3', title: 'Gamma', depth: 2 },
    ]);
  });
});

describe('extractPlainText', () => {
  it('reduces markdown, html, and component syntax into readable text', () => {
    const source = [
      '---',
      'title: Example',
      '---',
      '',
      '# Title',
      '',
      'Paragraph <strong>Bold</strong> {Component foo="bar"} `inline`',
      '',
      '```',
      '# not heading',
      '```',
      '',
      'Another line.',
    ].join('\n');

    expect(extractPlainText(source)).toBe('Title Paragraph Bold inline Another line.');
  });

  it('returns an empty string when source is missing', () => {
    expect(extractPlainText(null)).toBe('');
  });
});

describe('extractMarkdownSummary', () => {
  it('strips imports, exports, html, and fenced code blocks', () => {
    const source = [
      '---',
      'title: Example',
      '---',
      '',
      "import Foo from './foo';",
      'export const bar = 1;',
      '',
      '# Heading',
      '',
      'Paragraph with `inline` code.',
      '',
      '```',
      'const hidden = true;',
      '```',
      '',
      '<Fade>drop me</Fade>',
      '',
      'Another line.',
    ].join('\n');

    expect(extractMarkdownSummary(source)).toBe('Paragraph with `inline` code. Another line.');
  });
});
