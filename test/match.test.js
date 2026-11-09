const test = require('node:test');
const assert = require('node:assert/strict');

const match = require('../lib/match');

const { matches, parseList } = match;

test('** spans path segments, including none', () => {
  const globs = ['**/x/**'];
  for (const rel of ['x/a', 'a/x/b', 'a/b/x/c/d']) assert.equal(matches(globs, rel), true, rel);
  for (const rel of ['x', 'xx/a', 'a/xx/b', 'a/b']) assert.equal(matches(globs, rel), false, rel);
  assert.equal(matches(['docs/**'], 'docs/a/b.md'), true);
  assert.equal(matches(['docs/**'], 'docs'), false);
  assert.equal(matches(['docs/**'], 'other/docs/a.md'), false, 'a glob with a slash is anchored');
  assert.equal(matches(['a/**/b'], 'a/b'), true);
  assert.equal(matches(['a/**/b'], 'a/x/y/b'), true);
  assert.equal(matches(['a/**/b'], 'ab'), false);
  assert.equal(matches(['**/*.sql'], 'a.sql'), true);
  assert.equal(matches(['**/*.sql'], 'db/a.sql'), true);
  assert.equal(matches(['**'], 'any/path/at/all'), true);
});

test('* and ? stay within one segment', () => {
  assert.equal(matches(['src/*.js'], 'src/a.js'), true);
  assert.equal(matches(['src/*.js'], 'src/deep/a.js'), false);
  assert.equal(matches(['src/a?.js'], 'src/ab.js'), true);
  assert.equal(matches(['src/a?.js'], 'src/a/.js'), false);
  assert.equal(matches(['src/a?.js'], 'src/a.js'), false);
});

test('a glob without a slash matches the base name anywhere', () => {
  assert.equal(matches(['*.sql'], 'db/a.sql'), true);
  assert.equal(matches(['*.sql'], 'a.sql'), true);
  assert.equal(matches(['*.sql'], 'db/a.sql.bak'), false);
  assert.equal(matches(['Makefile'], 'sub/dir/Makefile'), true);
  assert.equal(matches(['Makefile'], 'sub/Makefile.am'), false);
  assert.equal(matches(['migrations'], 'migrations'), true);
});

test('a leading slash or ./ is ignored, and a trailing slash means the directory', () => {
  assert.equal(matches(['/src/*.js'], 'src/a.js'), true);
  assert.equal(matches(['./src/*.js'], 'src/a.js'), true);
  assert.equal(matches(['src/*.js'], './src/a.js'), true);
  assert.equal(matches(['docs/'], 'docs/a/b.md'), true);
  assert.equal(matches(['docs/'], 'x/docs/a.md'), false);
});

test('regex metacharacters in names are literal', () => {
  assert.equal(matches(['a+b(1).js'], 'dir/a+b(1).js'), true);
  assert.equal(matches(['a+b(1).js'], 'aab(1)xjs'), false);
  assert.equal(matches(['[x]/f$.txt'], '[x]/f$.txt'), true);
  assert.equal(matches(['[x]/f$.txt'], 'x/f$.txt'), false);
  assert.equal(matches(['a.b'], 'axb'), false);
  assert.equal(matches(['a|b'], 'a'), false);
  assert.equal(matches(['a|b'], 'a|b'), true);
  assert.equal(matches(['{a,b}.js'], 'a.js'), false);
  assert.equal(matches(['a\\b.js'], 'a/b.js'), false, 'a backslash is an ordinary character');
  assert.equal(matches(['a\\b.js'], 'a\\b.js'), true);
});

test('matching is case-insensitive', () => {
  assert.equal(matches(['SRC/*.JS'], 'src/App.js'), true);
  assert.equal(matches(['readme.MD'], 'Docs/ReadMe.md'), true);
  assert.equal(matches(['A'], 'dir/a'), true);
  assert.equal(matches(['dir/A?C'], 'DIR/abc'), true);
});

test('a hostile glob finishes quickly instead of backtracking', () => {
  const hostile = '*a*a*a*a*a*a*a*a*a*a*a*b';
  const long = `${'a'.repeat(200)}`;
  const started = Date.now();
  assert.equal(matches([hostile], long), false);
  assert.equal(matches([hostile], `dir/${long}`), false);
  assert.equal(matches([`src/${hostile}/**/${hostile}.js`], `src/${long}/${long}/${long}`), false);
  assert.equal(matches(['**/**/**/**/**/**/**/**/**/**/**/x'], `${'a/'.repeat(100)}y`), false);
  const stars = '*a**a*a**a*a**a*b'; // 2^3 = 8 alternatives
  const wide = `${'a/'.repeat(100)}${long}`;
  assert.equal(matches([stars, `**${stars}**${stars}`, `${stars}/**/${stars}`], wide), false);
  assert.equal(matches([hostile], `${long}b`), true, 'the same pattern still matches when it should');
  assert.ok(Date.now() - started < 500, `took ${Date.now() - started} ms`);
});

test('globs longer than 512 characters never match, and the cutoff is exact', () => {
  const at = `${'a'.repeat(509)}.js`;
  assert.equal(at.length, 512);
  assert.equal(matches([at.replace(/^a/, '*')], at), true);
  assert.equal(matches([`${at}x`], `${at}x`), false);
  assert.equal(matches(['*'.repeat(600)], 'a.js'), false);
});

test('wildcards treat literal stars and question marks in names as ordinary characters', () => {
  assert.equal(matches(['a*c'], 'a*c'), true);
  assert.equal(matches(['a?c'], 'a?c'), true);
  assert.equal(matches(['a*c'], 'abbbc'), true);
  assert.equal(matches(['*b*'], 'abc'), true);
  assert.equal(matches(['a*b*c'], 'acb'), false);
  assert.equal(matches(['*'], 'x/y'), true, 'a glob without a slash matches the base name');
  assert.equal(matches(['x/*'], 'x/y/z'), false);
  assert.equal(matches(['a**b'], 'a/b'), true, '** inside a name can span segments');
  assert.equal(matches(['a**b'], 'axxb'), true);
});

test('** inside a name spans segments too, as it did before the matcher stopped using regular expressions', () => {
  assert.equal(matches(['src/**.js'], 'src/check.js'), true);
  assert.equal(matches(['src/**.js'], 'src/private/check.js'), true);
  assert.equal(matches(['src/**.js'], 'src/a/b/c/check.js'), true);
  assert.equal(matches(['src/**.js'], 'src/check.ts'), false);
  assert.equal(matches(['src/**.js'], 'lib/src/check.js'), false, 'still anchored');
  assert.equal(matches(['a**b'], 'a1/x/2b'), true);
  assert.equal(matches(['a**b'], 'a1/x/2c'), false);
  assert.equal(matches(['a**'], 'a1/x/y'), true);
  assert.equal(matches(['a**'], 'b/x'), false);
  assert.equal(matches(['x**y**z'], 'xyz'), true);
  assert.equal(matches(['x**y**z'], 'x/y/z'), true);
  assert.equal(matches(['x**y**z'], 'x/a/b/y/c/z'), true);
  assert.equal(matches(['x**y**z'], 'x/a/b/c/z'), false, 'the middle y is required');
  assert.equal(matches(['x**y**z'], 'q/x/y/z'), true, 'no slash in the glob: the name may sit anywhere');
  assert.equal(matches(['x**y**z'], 'q/x/y/zq'), false);
});

test('a glob that would expand to more than 64 alternatives never matches', () => {
  const six = 'a**b**c**d**e**f**g'; // 2^6 = 64 alternatives: allowed
  const seven = 'a**b**c**d**e**f**g**h'; // 2^7 = 128: refused
  assert.equal(matches([six], 'a/b/c/d/e/f/g'), true);
  assert.equal(matches([six], 'abcdefg'), true);
  assert.equal(matches([seven], 'a/b/c/d/e/f/g/h'), false);
  assert.equal(matches([seven], 'abcdefgh'), false);
  assert.equal(matches(['a**b/c**d/e**f/g**h'], 'a/b/c/d/e/f/g/h'), true, '2^4 = 16 alternatives across segments');
  assert.equal(matches(['a**b/c**d/e**f/g**h/i**j/k**l/m**n'], 'a/b/c/d/e/f/g/h/i/j/k/l/m/n'), false, '2^7 across segments');
});

test('no globs match nothing, and any glob may match', () => {
  assert.equal(matches([], 'a.js'), false);
  assert.equal(matches(['*.md', 'src/**'], 'src/a.js'), true);
  assert.equal(matches(['*.md', 'src/**'], 'lib/a.js'), false);
});

test('parseList splits comma-separated values and arrays', () => {
  assert.deepEqual(parseList(' *.md , docs/** ,, '), ['*.md', 'docs/**']);
  assert.deepEqual(parseList(['a', ' b ', '']), ['a', 'b']);
  assert.deepEqual(parseList(null), []);
  assert.deepEqual(parseList(undefined), []);
  assert.deepEqual(parseList(''), []);
  assert.deepEqual(parseList(5), ['5']);
});

test('usable refuses globs that are too long, need too many alternatives, or are wildcard-only', () => {
  for (const glob of ['src/**', '*.md', 'a**b.js', 'src/a**b**c.js', 'none', 'db/migrations/', 'x'.repeat(512)]) assert.equal(match.usable(glob), true, glob);
  for (const glob of ['x'.repeat(513), 'src/a**b**c**d**e**f**g**h.js', '*', '**', '**/*', '*.*', '?', '*/', './**']) {
    assert.equal(match.usable(glob), false, glob.slice(0, 40));
  }
  assert.equal(match.usable(7), false, 'not a string');
});
