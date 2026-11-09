/**
 * Path globs for STATE.md settings (`docs:`, `risk:`).
 *
 * Matching is case-insensitive and works on slash-separated paths relative to
 * the project. A segment that is only `**` spans any number of path segments
 * (none, when more of the glob follows it; at least one, when it is last);
 * `*` and `?` inside a segment stay inside that segment; every other character
 * is literal. A `**` inside a longer segment (`src/**.js`) can span segments
 * too: `a**b` is the union of the one segment `a*b` and the three segments
 * `a*`, `**`, `*b`, so each such `**` doubles the alternatives, and a glob
 * that would need more than MAX_ALTERNATIVES (64) never matches. A glob
 * without a slash matches the file name anywhere, as in .gitignore, and a
 * trailing slash means everything under that directory.
 *
 * Matching runs in time proportional to the glob length times the path
 * length: no regular expressions are compiled from the glob, because a hostile
 * pattern such as `*a*a*a*a*a*b` can make a backtracking engine run for
 * minutes. Globs longer than MAX_GLOB characters never match.
 */

const MAX_GLOB = 512;
const MAX_ALTERNATIVES = 64;
const GLOBSTAR = Symbol('globstar');
const ANY_SEGMENT = '*';

const cache = new Map();

/**
 * The alternatives for one glob segment, each a list of segments. A segment
 * without an embedded `**` is its own single alternative; `a**b` becomes
 * [`a*b`] and [`a*`, GLOBSTAR, `*b`]. Null when there would be too many.
 */
function expandSegment(segment) {
  const pieces = segment.split(/\*{2,}/);
  let alternatives = [[pieces[0]]];
  for (let i = 1; i < pieces.length; i++) {
    if (alternatives.length * 2 > MAX_ALTERNATIVES) return null;
    alternatives = alternatives.flatMap(alt => {
      const head = alt.slice(0, -1);
      const last = alt[alt.length - 1];
      return [[...head, `${last}*${pieces[i]}`], [...head, `${last}*`, GLOBSTAR, `*${pieces[i]}`]];
    });
  }
  return alternatives;
}

/**
 * Split a glob into alternatives, each a list of segments: strings, or
 * GLOBSTAR for a `**` segment. Null when the glob is unusable.
 */
function compile(glob) {
  let text = String(glob).trim();
  if (text.length > MAX_GLOB) return null;
  text = text.replace(/^(?:\.?\/)+/, '');
  if (text.endsWith('/')) text += '**';
  if (!text.includes('/')) text = `**/${text}`;
  let alternatives = [[]];
  for (const segment of text.toLowerCase().split('/')) {
    const options = /^\*{2,}$/.test(segment) ? [[GLOBSTAR]] : expandSegment(segment);
    if (options === null || alternatives.length * options.length > MAX_ALTERNATIVES) return null;
    alternatives = alternatives.flatMap(alt => options.map(option => [...alt, ...option]));
  }
  // A trailing `**` needs at least one segment to match, so `docs/**` does not match `docs`.
  for (const alt of alternatives) {
    if (alt[alt.length - 1] === GLOBSTAR) alt.splice(-1, 1, ANY_SEGMENT, GLOBSTAR);
  }
  return alternatives;
}

/** Match one segment: `*` is any run of characters, `?` is one character, the rest is literal. */
function segmentMatches(pattern, text) {
  let p = 0;
  let t = 0;
  let star = -1;
  let mark = 0;
  while (t < text.length) {
    if (pattern[p] === '*') {
      star = p++;
      mark = t;
    } else if (p < pattern.length && (pattern[p] === '?' || pattern[p] === text[t])) {
      p++;
      t++;
    } else if (star >= 0) {
      p = star + 1;
      t = ++mark;
    } else {
      return false;
    }
  }
  while (pattern[p] === '*') p++;
  return p === pattern.length;
}

/** Match the glob's segments against the path's, with the same greedy walk as segmentMatches. */
function pathMatches(glob, parts) {
  let g = 0;
  let s = 0;
  let star = -1;
  let mark = 0;
  while (s < parts.length) {
    if (glob[g] === GLOBSTAR) {
      star = g++;
      mark = s;
    } else if (g < glob.length && segmentMatches(glob[g], parts[s])) {
      g++;
      s++;
    } else if (star >= 0) {
      g = star + 1;
      s = ++mark;
    } else {
      return false;
    }
  }
  while (glob[g] === GLOBSTAR) g++;
  return g === glob.length;
}

function compiled(glob) {
  if (!cache.has(glob)) cache.set(glob, compile(glob));
  return cache.get(glob);
}

/** True when any glob matches the slash-separated relative path. */
function matches(globs, rel) {
  const parts = String(rel).replace(/^(?:\.\/)+/, '').toLowerCase().split('/');
  return globs.some(glob => {
    const alternatives = compiled(glob);
    return alternatives !== null && alternatives.some(segments => pathMatches(segments, parts));
  });
}

/** A comma-separated frontmatter value (or an array) as a trimmed list without blanks. */
function parseList(value) {
  if (value === null || value === undefined) return [];
  const items = Array.isArray(value) ? value : String(value).split(',');
  return items.map(item => String(item).trim()).filter(Boolean);
}

module.exports = { matches, parseList };
