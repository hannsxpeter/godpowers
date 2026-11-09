/**
 * Path globs for STATE.md settings (`docs:`, `risk:`).
 *
 * Matching is case-insensitive and works on slash-separated paths relative to
 * the project. `**` spans any number of path segments, including none; `*`
 * and `?` stay inside one segment; every other character is literal. A glob
 * without a slash matches the file name anywhere, as in .gitignore, and a
 * trailing slash means everything under that directory.
 */

const cache = new Map();

function escape(char) {
  return /[\\^$.*+?()[\]{}|/-]/.test(char) ? `\\${char}` : char;
}

/** Compile one glob to a case-insensitive RegExp over a relative path. */
function toRegExp(glob) {
  let text = String(glob).trim().replace(/^(?:\.?\/)+/, '');
  if (text.endsWith('/')) text += '**';
  const anywhere = !text.includes('/');
  let source = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '*') {
      let end = i;
      while (text[end + 1] === '*') end++;
      const atSegmentStart = i === 0 || text[i - 1] === '/';
      if (end > i && atSegmentStart && text[end + 1] === '/') {
        source += '(?:.*/)?';
        i = end + 1;
      } else {
        source += end > i ? '.*' : '[^/]*';
        i = end;
      }
    } else if (char === '?') {
      source += '[^/]';
    } else {
      source += escape(char);
    }
  }
  return new RegExp(`^${anywhere ? '(?:.*/)?' : ''}${source}$`, 'i');
}

function compiled(glob) {
  let regex = cache.get(glob);
  if (!regex) {
    regex = toRegExp(glob);
    cache.set(glob, regex);
  }
  return regex;
}

/** True when any glob matches the slash-separated relative path. */
function matches(globs, rel) {
  const path = String(rel).replace(/^(?:\.\/)+/, '');
  return globs.some(glob => compiled(glob).test(path));
}

/** A comma-separated frontmatter value (or an array) as a trimmed list without blanks. */
function parseList(value) {
  if (value === null || value === undefined) return [];
  const items = Array.isArray(value) ? value : String(value).split(',');
  return items.map(item => String(item).trim()).filter(Boolean);
}

module.exports = { toRegExp, matches, parseList };
