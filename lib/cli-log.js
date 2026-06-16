/**
 * Shared ANSI console logger for the installer binary and CLI dispatch (QUAL-002).
 *
 * bin/install.js and lib/cli-dispatch.js previously defined these four helpers
 * verbatim. They now share one copy so the prefix/colour convention lives once.
 */

function log(msg) {
  console.log(`  ${msg}`);
}

function success(msg) {
  console.log(`  \x1b[32m+\x1b[0m ${msg}`);
}

function warn(msg) {
  console.log(`  \x1b[33m!\x1b[0m ${msg}`);
}

function error(msg) {
  console.error(`  \x1b[31mx\x1b[0m ${msg}`);
}

module.exports = { log, success, warn, error };
