const test = require('node:test');
const assert = require('node:assert/strict');

const frontmatter = require('../lib/frontmatter');

test('parses flat scalars and the body start line', () => {
  const doc = frontmatter.parse('---\ngodpowers: 7\nproject: demo app\nflag: true\noff: false\nnothing: null\nquoted: "a: b"\nsingle: \'it\'\'s\'\n---\n# Title\n');
  assert.equal(doc.hasFrontmatter, true);
  assert.deepEqual(doc.data, { godpowers: 7, project: 'demo app', flag: true, off: false, nothing: null, quoted: 'a: b', single: "it's" });
  assert.equal(doc.body, '# Title\n');
  assert.equal(doc.bodyLine, 10);
  assert.deepEqual(doc.diagnostics, []);
});

test('reports unsupported lines, duplicates, and unclosed fences', () => {
  const doc = frontmatter.parse('---\na: 1\n  nested: x\n- item\na: 2\n---\nbody');
  assert.equal(doc.data.a, 2);
  const messages = doc.diagnostics.map(d => d.message).join('\n');
  assert.match(messages, /unsupported frontmatter line: nested: x/);
  assert.match(messages, /unsupported frontmatter line: - item/);
  assert.match(messages, /duplicate frontmatter key: a/);
  assert.equal(frontmatter.parse('---\na: 1\nno end').diagnostics[0].message, 'frontmatter is not closed with ---');
  assert.equal(frontmatter.parse('# no frontmatter').hasFrontmatter, false);
});

test('ignores comments and blank lines, and handles CRLF input', () => {
  const doc = frontmatter.parse('---\r\n# comment\r\n\r\nkey: value\r\n---\r\nbody');
  assert.deepEqual(doc.data, { key: 'value' });
});

test('stringify round-trips values that need quoting', () => {
  const data = { project: 'x', verify: 'npm run test:unit', tricky: 'a: b # c', num: 7, yes: true, looksNumeric: '42', empty: '' };
  const text = frontmatter.stringify(data, '# Body\n');
  const back = frontmatter.parse(text);
  assert.deepEqual(back.data, data);
  assert.equal(back.body, '# Body\n');
  assert.equal(frontmatter.formatScalar(null), '');
  assert.equal(frontmatter.formatScalar('say "hi"'), 'say "hi"');
  assert.equal(frontmatter.parseScalar('"say \\"hi\\""'), 'say "hi"');
});
