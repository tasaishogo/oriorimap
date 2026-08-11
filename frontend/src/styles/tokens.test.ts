import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const cssPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), './tokens.css');
const css = readFileSync(cssPath, 'utf-8');

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function expectToken(name: string, value: string) {
  const pattern = new RegExp(`${escapeRegExp(name)}\\s*:\\s*${escapeRegExp(value)}\\s*;`);
  expect(css).toMatch(pattern);
}

describe('tokens.css design tokens (design §5.2 契約値)', () => {
  it('defines --color-primary as #614C9B', () => {
    expectToken('--color-primary', '#614C9B');
  });

  it('defines --color-primary-dark as #463672', () => {
    expectToken('--color-primary-dark', '#463672');
  });

  it('defines --color-primary-light as #B7A6D9', () => {
    expectToken('--color-primary-light', '#B7A6D9');
  });

  it('defines --color-primary-foreground as #FFFFFF', () => {
    expectToken('--color-primary-foreground', '#FFFFFF');
  });

  it('defines --color-background as #F8F6FB', () => {
    expectToken('--color-background', '#F8F6FB');
  });

  it('defines --color-foreground as #35313F', () => {
    expectToken('--color-foreground', '#35313F');
  });

  it('defines --color-muted-foreground as #6B6577', () => {
    expectToken('--color-muted-foreground', '#6B6577');
  });

  it('defines --color-card as #FFFFFF', () => {
    expectToken('--color-card', '#FFFFFF');
  });

  it('defines --color-card-foreground as #35313F', () => {
    expectToken('--color-card-foreground', '#35313F');
  });

  it("defines --font-sans as 'Noto Sans JP', system-ui, sans-serif", () => {
    expectToken('--font-sans', "'Noto Sans JP', system-ui, sans-serif");
  });

  it("defines --font-display as 'Zen Old Mincho', serif", () => {
    expectToken('--font-display', "'Zen Old Mincho', serif");
  });

  it('defines --radius as 0.5rem', () => {
    expectToken('--radius', '0.5rem');
  });
});
