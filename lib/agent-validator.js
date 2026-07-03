/**
 * Agent Validator
 *
 * Parses each `agents/*.md` and validates contract structure.
 *
 * Backward-compatible by design: most issues surface as `warning` so
 * existing agents pass on day one. Only structural breakage (broken
 * hand-off targets, dual-ownership of output paths) escalates to
 * `error`.
 *
 * Public API:
 *   parseAgentFile(filePath) -> { name, frontmatter, sections, raw }
 *   validateAgent(agent, opts) -> [findings]
 *   findHandoffTargets(agent) -> [...names]
 *   findOutputPaths(agent) -> [...paths]
 *   auditAll(projectRoot, opts) -> { results, summary }
 */

const fs = require('fs');
const path = require('path');
const frontmatter = require('./frontmatter');

const REQUIRED_FRONTMATTER = ['name', 'description'];
const RECOMMENDED_FRONTMATTER = ['tools'];
const STRUCTURED_CONTRACT_FRONTMATTER = ['inputs', 'outputs', 'gates', 'handoff'];
const RECOMMENDED_SECTIONS = ['Have-Nots', 'Inputs', 'Outputs', 'Handoff'];

/**
 * Parse a single agent .md file. Extract YAML frontmatter and section
 * headings (# / ## / ###).
 */
function parseAgentFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const result = {
    path: filePath,
    name: path.basename(filePath, '.md'),
    frontmatter: {},
    sections: {},  // heading -> body string
    raw
  };

  result.frontmatter = frontmatter.parse(raw, { strict: true, source: filePath });

  // Sections: lines starting with # / ## / ###
  const lines = raw.split('\n');
  let currentHeading = null;
  let currentBody = [];
  for (const line of lines) {
    const m = line.match(/^(#{1,4})\s+(.+?)\s*$/);
    if (m) {
      if (currentHeading) {
        result.sections[currentHeading] = currentBody.join('\n').trim();
      }
      currentHeading = m[2].trim();
      currentBody = [];
    } else if (currentHeading) {
      currentBody.push(line);
    }
  }
  if (currentHeading) {
    result.sections[currentHeading] = currentBody.join('\n').trim();
  }

  return result;
}

/**
 * Validate one parsed agent. Returns findings.
 */
function validateAgent(agent, opts = {}) {
  const findings = [];
  const contractSeverity = opts.contractSeverity || 'info';

  // Required frontmatter
  for (const field of REQUIRED_FRONTMATTER) {
    if (!agent.frontmatter[field]) {
      findings.push({
        severity: 'error',
        kind: 'missing-required-frontmatter',
        agent: agent.name,
        message: `Missing required frontmatter field: \`${field}\``
      });
    }
  }

  // Recommended frontmatter
  for (const field of RECOMMENDED_FRONTMATTER) {
    if (!agent.frontmatter[field]) {
      findings.push({
        severity: 'warning',
        kind: 'missing-recommended-frontmatter',
        agent: agent.name,
        message: `Missing recommended frontmatter field: \`${field}\``
      });
    }
  }

  // Structured contract frontmatter
  for (const field of STRUCTURED_CONTRACT_FRONTMATTER) {
    const value = agent.frontmatter[field];
    if (!value) {
      findings.push({
        severity: contractSeverity,
        kind: 'missing-contract-frontmatter',
        agent: agent.name,
        field,
        message: `Missing contract frontmatter field: \`${field}\``
      });
      continue;
    }
    if (!Array.isArray(value) || value.length === 0 || value.some(item => typeof item !== 'string' || !item.trim())) {
      findings.push({
        severity: contractSeverity,
        kind: 'invalid-contract-frontmatter',
        agent: agent.name,
        field,
        message: `Contract frontmatter field \`${field}\` must be a non-empty string array.`
      });
    }
  }

  // Recommended sections (case-insensitive substring match)
  const sectionTitles = Object.keys(agent.sections).map(s => s.toLowerCase());
  for (const section of RECOMMENDED_SECTIONS) {
    const lower = section.toLowerCase();
    const found = sectionTitles.some(t =>
      t === lower || t.includes(lower) || (lower === 'handoff' && t.includes('hand'))
    );
    if (!found) {
      findings.push({
        severity: 'info',
        kind: 'missing-recommended-section',
        agent: agent.name,
        message: `Missing recommended section: \`## ${section}\``,
        suggestion: `Add a "${section}" section documenting the contract.`
      });
    }
  }

  return findings;
}

function hasStructuredContract(agent) {
  return STRUCTURED_CONTRACT_FRONTMATTER.every(field => {
    const value = agent.frontmatter[field];
    return Array.isArray(value) &&
      value.length > 0 &&
      value.every(item => typeof item === 'string' && item.trim());
  });
}

/**
 * Extract claimed hand-off targets (other agents this agent spawns).
 */
function findHandoffTargets(agent) {
  const targets = new Set();
  // Look for "spawn god-x", "Spawned by:", "spawns: [god-y, god-z]"
  const text = agent.raw;

  // "Spawned by:" indicates UPSTREAM (who spawns me); skip
  // We want DOWNSTREAM: who do I spawn?

  const spawnRegex = /spawn(?:s|ed|ing)?\s+(?:a\s+)?(?:fresh\s+)?`?(god-[\w-]+)`?/gi;
  let m;
  while ((m = spawnRegex.exec(text)) !== null) {
    targets.add(m[1]);
  }
  return [...targets];
}

function extractPathClaims(text) {
  const paths = new Set();
  // mdx before md in the alternation: greedy backtracking would otherwise stop
  // a .mdx claim at .md and drop the trailing x.
  const dotPathRegex = /\.godpowers\/[\w\/.-]+(?:\.(?:mdx|md|json|jsonl|yaml))?/g;
  let m;
  while ((m = dotPathRegex.exec(text)) !== null) {
    paths.add(m[0]);
  }
  const rootRegex = /\b[A-Z-]+\.(?:mdx|md)\b/g;
  while ((m = rootRegex.exec(text)) !== null) {
    paths.add(m[0]);
  }
  return [...paths];
}

/**
 * Extract output paths the agent claims to write.
 */
function findOutputPaths(agent) {
  const paths = new Set();
  if (Array.isArray(agent.frontmatter.outputs)) {
    for (const output of agent.frontmatter.outputs) {
      if (typeof output !== 'string') continue;
      for (const out of extractPathClaims(output)) paths.add(out);
    }
    return [...paths];
  }

  const text = agent.raw;

  // .godpowers/*.mdx or .godpowers/*.json
  const dotPathRegex = /(?:writes?|appends?|updates?)[\s\S]{0,80}?(\.godpowers\/[\w\/.-]+\.(?:mdx|md|json|jsonl|yaml))/gi;
  let m;
  while ((m = dotPathRegex.exec(text)) !== null) {
    paths.add(m[1]);
  }

  // Project-root files (DESIGN.md, PRODUCT.md, AGENTS.md, etc.)
  const rootRegex = /(?:writes?|appends?|updates?)[\s\S]{0,80}?\b([A-Z-]+\.(?:mdx|md))\b/g;
  while ((m = rootRegex.exec(text)) !== null) {
    paths.add(m[1]);
  }

  return [...paths];
}

/**
 * Cross-agent validation: dual-ownership of output paths, unresolved
 * hand-off targets.
 */
function crossValidate(agents, opts = {}) {
  const findings = [];
  const validAgentNames = new Set(agents.map(a => a.name));
  const outputOwners = {};  // path -> [agent.name, ...]

  for (const agent of agents) {
    // Hand-off targets must exist
    for (const target of findHandoffTargets(agent)) {
      if (!validAgentNames.has(target)) {
        findings.push({
          severity: 'warning',
          kind: 'unresolved-handoff',
          agent: agent.name,
          message: `Agent claims to spawn \`${target}\` but no such agent file exists.`
        });
      }
    }

    // Track output paths
    for (const out of findOutputPaths(agent)) {
      if (!outputOwners[out]) outputOwners[out] = [];
      if (!outputOwners[out].includes(agent.name)) {
        outputOwners[out].push(agent.name);
      }
    }
  }

  // Dual-ownership check (warn for paths claimed by 3+ agents; the
  // orchestrator + reconciler + author triumvirate is normal pattern)
  for (const [outPath, owners] of Object.entries(outputOwners)) {
    if (owners.length >= 4) {
      findings.push({
        severity: 'warning',
        kind: 'multi-ownership',
        path: outPath,
        owners,
        message: `Output \`${outPath}\` is claimed by ${owners.length} agents: ${owners.join(', ')}. Verify the boundaries are clean.`
      });
    }
  }

  return findings;
}

/**
 * Walk agents/ and audit all shipped specialist agents.
 *
 * Godpowers projects may also have Pillars files under agents/ (for example
 * agents/context.md and agents/repo.md). Those are project context, not
 * specialist agent specs, so they are intentionally excluded here.
 */
function auditAll(projectRoot, opts = {}) {
  const agentsDir = path.join(projectRoot, 'agents');
  if (!fs.existsSync(agentsDir)) {
    return { results: [], summary: { errors: 0, warnings: 0, infos: 0 } };
  }
  const files = fs.readdirSync(agentsDir).filter(f => /^god-.*\.md$/.test(f));
  const agents = files.map(f => parseAgentFile(path.join(agentsDir, f)));
  const structuredContractCount = agents.filter(hasStructuredContract).length;
  const contractWarningThreshold = opts.contractWarningThreshold || 20;
  const contractSeverity = opts.contractSeverity ||
    (structuredContractCount >= contractWarningThreshold ? 'warning' : 'info');

  const allFindings = [];
  const results = [];
  for (const agent of agents) {
    const f = validateAgent(agent, { ...opts, contractSeverity });
    results.push({ agent: agent.name, findings: f });
    allFindings.push(...f);
  }
  // Cross-agent
  const crossFindings = crossValidate(agents, opts);
  allFindings.push(...crossFindings);

  const summary = {
    errors: allFindings.filter(f => f.severity === 'error').length,
    warnings: allFindings.filter(f => f.severity === 'warning').length,
    infos: allFindings.filter(f => f.severity === 'info').length,
    crossFindings,
    agentCount: agents.length,
    structuredContractCount,
    contractWarningThreshold
  };

  return { results, summary, allFindings };
}

module.exports = {
  parseAgentFile,
  validateAgent,
  findHandoffTargets,
  findOutputPaths,
  crossValidate,
  auditAll,
  hasStructuredContract,
  REQUIRED_FRONTMATTER,
  RECOMMENDED_FRONTMATTER,
  STRUCTURED_CONTRACT_FRONTMATTER,
  RECOMMENDED_SECTIONS
};
