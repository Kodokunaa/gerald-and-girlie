import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');

test('all invitation media and responsive image references exist', () => {
  const references = [...html.matchAll(/(?:src|href|data-photo)="(\/(?:images|audio|fonts)\/[^" ]+)"/g)].map(match => match[1]);
  references.push(...[...html.matchAll(/(\/images\/[^" ,]+) \d+w/g)].map(match => match[1]));
  assert.ok(references.length > 30);
  for (const reference of new Set(references)) assert.ok(fs.existsSync(`public${reference}`), reference);
  assert.equal(new Set(references.filter(reference => reference.endsWith('.webp') && !reference.includes('-640'))).size, 14);
});

test('social preview points to the production site and a real thumbnail', () => {
  assert.ok(html.includes('property="og:image" content="https://gerald-and-girlie.vercel.app/og-wedding.jpg"'));
  assert.ok(fs.statSync('public/og-wedding.jpg').size > 10000);
  assert.ok(html.includes('name="twitter:card" content="summary_large_image"'));
});
