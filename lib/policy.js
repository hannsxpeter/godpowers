/**
 * Small rules shared by the documentation rule, the risk tiers, STATE.md
 * validation, git, and the printers. It requires nothing, so any module may
 * use it without a require cycle.
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

/** A path for display, with control characters shown as \u escapes. */
function showPath(rel) {
  return String(rel).replace(/[\u0000-\u001f\u007f-\u009f]/g, char => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

/**
 * A glob whose characters other than wildcards are only `/` and `.` (such as
 * `*`, `**`, `**\/*`, or `*.*`) matches nearly every path. Such a glob would
 * make a setting cover the whole project, so it is refused and ignored.
 */
function isBroadGlob(glob) {
  return /^[/.]*$/.test(String(glob).trim().replace(/[*?]/g, ''));
}

/** The globs of a parsed list that are safe to use. */
function usableGlobs(globs) {
  return globs.filter(glob => !isBroadGlob(glob));
}

module.exports = { HIGH_RISK_PATTERNS, hasControlChar, plain, showPath, isBroadGlob, usableGlobs };
