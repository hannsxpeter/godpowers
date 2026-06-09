/**
 * Context Budget - per-agent input budgeting to avoid kitchen-sink
 * context that inflates token spend.
 *
 * The contract:
 *   - Each agent declares `required-context` (must load) and
 *     `optional-context` (load if budget allows) in its frontmatter.
 *   - Project intent.yaml declares `budgets.default-max-tokens` and
 *     optional per-agent overrides under `budgets.agents.<name>`.
 *   - Orchestrator computes the loadout: all required files, then as
 *     many optional files as fit under the budget.
 *   - If required-context exceeds budget, emit `budget.exceeded` event
 *     and proceed (load required anyway; users see the warning).
 *
 * Token estimation: bytes / 4 is a rough heuristic that matches
 * empirical token-counts for typical English text well enough for
 * budgeting. Not for billing.
 *
 * Public API:
 *   estimateTokens(text | bytes) -> number
 *   parseAgentBudget(agentPath) -> { required, optional, maxTokens? }
 *   plan(budget, required, optional, perAgentMax) -> { loadout, dropped, used }
 *   loadoutSize(files) -> { bytes, tokens }
 */

const fs = require('fs');
const path = require('path');
const frontmatter = require('./frontmatter');

const BYTES_PER_TOKEN = 4;            // rough English text heuristic
const DEFAULT_MAX_TOKENS = 80_000;    // per-agent default; ~half of a 200K window

function estimateTokens(input) {
  if (typeof input === 'number') return Math.ceil(input / BYTES_PER_TOKEN);
  if (typeof input === 'string') {
    return Math.ceil(Buffer.byteLength(input, 'utf8') / BYTES_PER_TOKEN);
  }
  return 0;
}

/**
 * Extract budget hints from an agent's frontmatter.
 *
 * Looks for lines like:
 *   required-context: [path1, path2]
 *   optional-context: [path3, path4]
 *   max-tokens: 50000
 *
 * Returns defaults when missing.
 */
function parseAgentBudget(agentPath) {
  if (!fs.existsSync(agentPath)) {
    return { required: [], optional: [], maxTokens: null };
  }
  const raw = fs.readFileSync(agentPath, 'utf8');
  const metadata = frontmatter.parse(raw, { strict: true, source: agentPath });
  const out = { required: [], optional: [], maxTokens: null };
  if (Array.isArray(metadata['required-context'])) out.required = metadata['required-context'];
  if (Array.isArray(metadata['optional-context'])) out.optional = metadata['optional-context'];
  if (Number.isFinite(metadata['max-tokens'])) out.maxTokens = metadata['max-tokens'];
  return out;
}

/**
 * Compute total bytes + estimated tokens for a list of file paths.
 * Missing files contribute 0; not an error.
 */
function loadoutSize(files) {
  let bytes = 0;
  for (const f of files || []) {
    if (!fs.existsSync(f)) continue;
    bytes += fs.statSync(f).size;
  }
  return { bytes, tokens: estimateTokens(bytes) };
}

/**
 * Plan a context loadout.
 *
 * budget: { defaultMaxTokens, perAgent: { agentName: max } }
 * required, optional: arrays of file paths
 * agentName: used to look up per-agent override
 *
 * Returns:
 *   {
 *     loadout: [paths in load order],
 *     dropped: [paths skipped for budget],
 *     used: { bytes, tokens },
 *     budget: { tokens },
 *     exceeded: bool
 *   }
 */
function plan(budget, required, optional, agentName) {
  const cap = (budget && budget.perAgent && budget.perAgent[agentName]) ||
              (budget && budget.defaultMaxTokens) ||
              DEFAULT_MAX_TOKENS;

  const loadout = [];
  let usedBytes = 0;

  // Required first; always loaded regardless of budget.
  let exceeded = false;
  for (const f of required || []) {
    if (!fs.existsSync(f)) continue;
    loadout.push(f);
    usedBytes += fs.statSync(f).size;
  }
  const requiredTokens = estimateTokens(usedBytes);
  if (requiredTokens > cap) exceeded = true;

  // Then optional, fit under cap.
  const dropped = [];
  for (const f of optional || []) {
    if (!fs.existsSync(f)) continue;
    const size = fs.statSync(f).size;
    const projected = estimateTokens(usedBytes + size);
    if (projected > cap) {
      dropped.push(f);
      continue;
    }
    loadout.push(f);
    usedBytes += size;
  }

  return {
    loadout,
    dropped,
    used: { bytes: usedBytes, tokens: estimateTokens(usedBytes) },
    budget: { tokens: cap },
    exceeded
  };
}

module.exports = {
  estimateTokens,
  parseAgentBudget,
  plan,
  loadoutSize,
  BYTES_PER_TOKEN,
  DEFAULT_MAX_TOKENS
};
