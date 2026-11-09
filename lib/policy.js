/**
 * Small rules shared by the documentation rule, the risk tiers, git, and the
 * printers. It requires nothing, so any module may use it without a require
 * cycle.
 */

const HIGH_RISK_PATTERNS = [
  '**/auth/**', '**/authn/**', '**/authz/**', '**/oauth/**', '**/login/**', '**/session/**', '**/sessions/**',
  '**/permissions/**', '**/security/**', '**/crypto/**', '*auth.*', '*login.*', '*password*', '*secret*',
  '*credential*', '**/secrets/**', '.env*', '**/migrations/**', '**/migrate/**', '*.sql', 'schema.prisma',
  '**/payments/**', '**/payment/**', '**/billing/**', '**/checkout/**', '.github/workflows/**', '.gitlab-ci.yml',
  '.circleci/**', 'Dockerfile', 'docker-compose*.yml', 'docker-compose*.yaml', 'compose*.yml', 'compose*.yaml',
  '**/deploy/**', '**/infra/**', '*.tf', '**/k8s/**', '**/helm/**'
];

// C0 controls (including newline), DEL, and C1 controls.
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;
const PRINT_UNSAFE = /[\u0000-\u0008\u000a-\u001f\u007f-\u009f]/g;

/** True when a path has a control character (a newline, an escape, a NUL). */
function hasControlChar(text) {
  return CONTROL.test(String(text));
}

/** Text safe to print: control characters other than tab are removed. */
function plain(text) {
  return String(text == null ? '' : text).replace(PRINT_UNSAFE, '');
}

/**
 * Any ledger field as safe text: strings as they are, numbers and booleans
 * with String, anything else as JSON, and `[unprintable]` when that fails
 * (an object whose own `toString` is not a function would throw otherwise).
 * Control characters are removed as in `plain`.
 */
function ledgerText(value) {
  let text;
  if (typeof value === 'string') text = value;
  else if (value == null) text = '';
  else if (typeof value === 'number' || typeof value === 'boolean') text = String(value);
  else {
    try {
      text = JSON.stringify(value);
    } catch (_) {
      text = undefined;
    }
    if (typeof text !== 'string') text = '[unprintable]';
  }
  return plain(text);
}

/** A path for display, with control characters shown as \u escapes. */
function showPath(rel) {
  return String(rel).replace(/[\u0000-\u001f\u007f-\u009f]/g, char => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

module.exports = { HIGH_RISK_PATTERNS, hasControlChar, plain, ledgerText, showPath };
