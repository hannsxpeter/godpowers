/**
 * Small shared string helpers (QUAL-002).
 *
 * slugify is the canonical home for the "lowercase, collapse non-alphanumerics
 * to '-', strip edge '-', truncate to 40 chars" contract. lib/evidence.js keeps
 * its own copy on purpose: that module is vendored from the upstream engine and
 * its helpers are provenance-tracked, so it must not import first-party code.
 */

function slugify(text, fallback = '') {
  const slug = String(text == null ? '' : text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return slug || fallback;
}

module.exports = { slugify };
