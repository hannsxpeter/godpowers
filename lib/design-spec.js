/**
 * Design Spec
 *
 * Parser and validator for the Google Labs design.md format.
 * (https://github.com/google-labs-code/design.md)
 *
 * A DESIGN.md has YAML frontmatter (tokens) + markdown body (rationale).
 *
 * Public API:
 *   parse(content) -> { frontmatter, body, errors }
 *   validate(parsed) -> { findings }
 *   resolveTokens(parsed) -> { findings }  // checks {colors.x} references
 *   sectionOrder(body) -> { findings }     // verifies canonical order
 *   contrastCheck(parsed) -> { findings }  // basic WCAG contrast on components
 *   lint(content) -> { findings, valid }   // run all checks
 */

const frontmatter = require('./frontmatter');

const VALID_SECTIONS = [
  'Overview', 'Brand & Style',
  'Colors',
  'Typography',
  'Layout', 'Layout & Spacing',
  'Elevation & Depth', 'Elevation',
  'Shapes',
  'Components',
  "Do's and Don'ts", 'Dos and Donts'
];

const SECTION_ORDER = [
  ['Overview', 'Brand & Style'],
  ['Colors'],
  ['Typography'],
  ['Layout', 'Layout & Spacing'],
  ['Elevation & Depth', 'Elevation'],
  ['Shapes'],
  ['Components'],
  ["Do's and Don'ts", 'Dos and Donts']
];

const COMPONENT_PROPS = [
  'backgroundColor', 'textColor', 'typography',
  'rounded', 'padding', 'size', 'height', 'width'
];

/**
 * Parse a DESIGN.md file: separate YAML frontmatter from markdown body.
 */
function parse(content) {
  if (!content.startsWith('---')) {
    return { frontmatter: null, body: content, errors: ['Missing YAML frontmatter (file must start with `---`).'] };
  }
  const parsed = frontmatter.split(content, { strict: true, source: 'DESIGN.md' });
  if (!parsed.frontmatter) {
    return { frontmatter: null, body: content, errors: ['Frontmatter not closed (missing closing `---`).'] };
  }
  const errors = parsed.diagnostics.map((diagnostic) =>
    `Frontmatter YAML warning: ${diagnostic.message} on line ${diagnostic.line}`
  );
  return {
    frontmatter: errors.length > 0 ? null : parsed.frontmatter,
    body: parsed.body.trim(),
    errors
  };
}

/**
 * Validate frontmatter schema: required fields, recognized types.
 */
function validate(parsed) {
  const findings = [];
  if (!parsed.frontmatter) {
    findings.push({ severity: 'error', code: 'D-FRONTMATTER', message: 'No frontmatter parsed.' });
    return { findings };
  }
  const fm = parsed.frontmatter;
  if (!fm.name) {
    findings.push({ severity: 'error', code: 'D-NAME', message: 'Missing required `name` in frontmatter.' });
  }
  if (!fm.description) {
    findings.push({ severity: 'warning', code: 'D-DESCRIPTION', message: 'Missing `description` in frontmatter.' });
  }
  // Color values: must be hex sRGB or oklch() or token reference
  if (fm.colors && typeof fm.colors === 'object') {
    for (const [name, val] of Object.entries(fm.colors)) {
      const v = String(val).trim();
      if (!isValidColor(v) && !isTokenRef(v)) {
        findings.push({
          severity: 'warning',
          code: 'D-COLOR-FORMAT',
          message: `Color "${name}" has unusual format: "${v}". Expected hex sRGB or oklch().`
        });
      }
    }
  }
  // Typography entries should have fontFamily and fontSize
  if (fm.typography && typeof fm.typography === 'object') {
    for (const [name, val] of Object.entries(fm.typography)) {
      if (typeof val !== 'object') {
        findings.push({
          severity: 'error',
          code: 'D-TYPO-OBJECT',
          message: `Typography "${name}" must be an object with fontFamily/fontSize/etc.`
        });
        continue;
      }
      if (!val.fontFamily) {
        findings.push({
          severity: 'warning',
          code: 'D-TYPO-FAMILY',
          message: `Typography "${name}" missing fontFamily.`
        });
      }
      if (!val.fontSize) {
        findings.push({
          severity: 'warning',
          code: 'D-TYPO-SIZE',
          message: `Typography "${name}" missing fontSize.`
        });
      }
    }
  }
  // Component properties: warn on unknown
  if (fm.components && typeof fm.components === 'object') {
    for (const [name, val] of Object.entries(fm.components)) {
      if (typeof val !== 'object') continue;
      for (const propKey of Object.keys(val)) {
        if (!COMPONENT_PROPS.includes(propKey)) {
          findings.push({
            severity: 'info',
            code: 'D-COMP-PROP',
            message: `Component "${name}" has unknown property "${propKey}". Valid: ${COMPONENT_PROPS.join(', ')}.`
          });
        }
      }
    }
  }
  return { findings };
}

/**
 * Resolve token references like {colors.primary}.
 * Returns findings for unresolved references.
 */
function resolveTokens(parsed) {
  const findings = [];
  if (!parsed.frontmatter) return { findings };
  const fm = parsed.frontmatter;
  const refRegex = /\{([\w.-]+)\}/g;
  function get(p) {
    return p.split('.').reduce((acc, k) => (acc ? acc[k] : undefined), fm);
  }
  function scan(obj, contextPath) {
    for (const [k, v] of Object.entries(obj)) {
      const here = `${contextPath}.${k}`;
      if (typeof v === 'string') {
        let m;
        const r = new RegExp(refRegex.source, 'g');
        while ((m = r.exec(v)) !== null) {
          const target = m[1];
          if (get(target) === undefined) {
            findings.push({
              severity: 'error',
              code: 'D-TOKEN-REF',
              message: `Unresolved token reference "${m[0]}" at ${here}.`
            });
          }
        }
      } else if (typeof v === 'object' && v !== null) {
        scan(v, here);
      }
    }
  }
  if (fm.components) scan(fm.components, 'components');
  return { findings };
}

/**
 * Verify section order: sections present must appear in canonical order.
 */
function sectionOrder(body) {
  const findings = [];
  const headings = [];
  for (const line of body.split('\n')) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) headings.push(m[1].trim());
  }
  // Map each heading to its canonical index
  let lastIdx = -1;
  for (const h of headings) {
    let idx = -1;
    for (let i = 0; i < SECTION_ORDER.length; i++) {
      if (SECTION_ORDER[i].some(name => name.toLowerCase() === h.toLowerCase())) {
        idx = i;
        break;
      }
    }
    if (idx === -1) {
      findings.push({
        severity: 'info',
        code: 'D-SECTION-UNKNOWN',
        message: `Unknown section "${h}". Allowed: ${VALID_SECTIONS.join(', ')}.`
      });
      continue;
    }
    if (idx < lastIdx) {
      findings.push({
        severity: 'error',
        code: 'D-SECTION-ORDER',
        message: `Section "${h}" appears out of order.`
      });
    }
    lastIdx = idx;
  }
  // Duplicate sections = error
  const seen = new Set();
  for (const h of headings) {
    if (seen.has(h.toLowerCase())) {
      findings.push({
        severity: 'error',
        code: 'D-SECTION-DUP',
        message: `Duplicate section "${h}".`
      });
    }
    seen.add(h.toLowerCase());
  }
  return { findings };
}

/**
 * Compute WCAG contrast ratio for hex colors (basic implementation).
 * Returns ratio (1-21) or null if color cannot be parsed.
 */
function contrastRatio(fg, bg) {
  function parseHex(c) {
    const m = c.match(/^#([0-9a-f]{6})$/i);
    if (!m) return null;
    return [
      parseInt(m[1].slice(0, 2), 16) / 255,
      parseInt(m[1].slice(2, 4), 16) / 255,
      parseInt(m[1].slice(4, 6), 16) / 255
    ];
  }
  function relLum(rgb) {
    const lin = rgb.map(c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  }
  const fgC = parseHex(fg);
  const bgC = parseHex(bg);
  if (!fgC || !bgC) return null;
  const lFg = relLum(fgC);
  const lBg = relLum(bgC);
  const lighter = Math.max(lFg, lBg);
  const darker = Math.min(lFg, lBg);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Basic WCAG check on text-on-background components.
 * Resolves token refs to hex; OKLCH not supported here (warning).
 */
function contrastCheck(parsed) {
  const findings = [];
  if (!parsed.frontmatter || !parsed.frontmatter.components) return { findings };
  const fm = parsed.frontmatter;
  function resolve(value) {
    if (!value) return null;
    const m = String(value).match(/^\{([\w.-]+)\}$/);
    if (!m) return value;
    return m[1].split('.').reduce((acc, k) => (acc ? acc[k] : undefined), fm);
  }
  for (const [name, props] of Object.entries(fm.components)) {
    if (typeof props !== 'object') continue;
    const fg = resolve(props.textColor);
    const bg = resolve(props.backgroundColor);
    if (!fg || !bg) continue;
    if (typeof fg !== 'string' || typeof bg !== 'string') continue;
    if (!fg.startsWith('#') || !bg.startsWith('#')) {
      // OKLCH or unknown; skip (rendering engine handles)
      continue;
    }
    const ratio = contrastRatio(fg, bg);
    if (ratio === null) continue;
    if (ratio < 4.5) {
      findings.push({
        severity: 'error',
        code: 'D-CONTRAST',
        message: `Component "${name}" contrast ${ratio.toFixed(2)}:1 fails WCAG AA (4.5:1).`
      });
    } else if (ratio < 7) {
      findings.push({
        severity: 'info',
        code: 'D-CONTRAST',
        message: `Component "${name}" contrast ${ratio.toFixed(2)}:1 passes AA but not AAA (7:1).`
      });
    }
  }
  return { findings };
}

/**
 * Convenience: run all checks.
 */
function lint(content) {
  const parsed = parse(content);
  const findings = [
    ...parsed.errors.map(e => ({ severity: 'error', code: 'D-PARSE', message: e })),
    ...validate(parsed).findings,
    ...sectionOrder(parsed.body || '').findings,
    ...resolveTokens(parsed).findings,
    ...contrastCheck(parsed).findings
  ];
  const valid = !findings.some(f => f.severity === 'error');
  return { findings, valid };
}

// ============================================================================
// Helpers
// ============================================================================

function isValidColor(v) {
  if (/^#[0-9a-f]{6}$/i.test(v)) return true;
  if (/^#[0-9a-f]{8}$/i.test(v)) return true;
  if (/^oklch\s*\(/i.test(v)) return true;
  if (/^rgb\s*\(/i.test(v)) return true;
  if (/^hsl\s*\(/i.test(v)) return true;
  return false;
}

function isTokenRef(v) {
  return /^\{[\w.-]+\}$/.test(v);
}

module.exports = {
  parse,
  validate,
  resolveTokens,
  sectionOrder,
  contrastCheck,
  contrastRatio,
  lint,
  VALID_SECTIONS,
  SECTION_ORDER,
  COMPONENT_PROPS
};
