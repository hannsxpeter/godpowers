/**
 * External connector registry (detect-and-delegate).
 *
 * A loop that only reads its own state cannot act on the outside world. The
 * loop-engineering answer is connectors: let the loop open a GitHub issue, move
 * a Linear ticket, post to Slack, or triage a Sentry error. Godpowers stays
 * dependency-free and never vendors an API client. Instead it DETECTS the
 * connectors the host already exposes over MCP and DELEGATES the action to the
 * host connector, exactly the way lib/automation-providers.js delegates
 * scheduling to host-native schedulers.
 *
 * Every action passes a policy gate first. Reads are allowed by default; writes
 * (the ones that change an external system) are denied unless the project
 * explicitly opts the connector into write scope in .godpowers/connectors.json.
 * This keeps an unattended loop from mutating GitHub or Linear on its own until
 * a human has widened the scope on purpose.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_PATH = '.godpowers/connectors.json';

const CONNECTORS = [
  {
    id: 'github',
    label: 'GitHub',
    category: 'code-host',
    mcpServer: 'github',
    actions: {
      read: ['list_issues', 'read_pr', 'read_checks', 'read_file'],
      write: ['open_issue', 'comment', 'open_pr', 'apply_label', 'merge_pr']
    }
  },
  {
    id: 'linear',
    label: 'Linear',
    category: 'issue-tracker',
    mcpServer: 'linear',
    actions: {
      read: ['list_issues', 'read_issue', 'list_cycles'],
      write: ['create_issue', 'update_issue', 'move_issue', 'comment']
    }
  },
  {
    id: 'slack',
    label: 'Slack',
    category: 'chat',
    mcpServer: 'slack',
    actions: {
      read: ['read_channel', 'read_thread'],
      write: ['post_message', 'reply_thread']
    }
  },
  {
    id: 'sentry',
    label: 'Sentry',
    category: 'errors',
    mcpServer: 'sentry',
    actions: {
      read: ['list_issues', 'read_event', 'read_trace'],
      write: ['assign_issue', 'resolve_issue']
    }
  },
  {
    id: 'notion',
    label: 'Notion',
    category: 'docs',
    mcpServer: 'notion',
    actions: {
      read: ['search', 'read_page'],
      write: ['create_page', 'update_page']
    }
  }
];

const CATEGORY_ORDER = ['code-host', 'issue-tracker', 'errors', 'chat', 'docs'];

// Capability ladders: when more than one connector can serve a task, try them in
// priority order and stop at the first available, enabled one (the loop-
// engineering tool-priority pattern). Prefer a purpose-built connector over a
// general one (a dedicated tracker over the code host for issue work).
const CAPABILITY_LADDER = {
  'track-work': ['linear', 'github'],
  'open-pr': ['github'],
  notify: ['slack'],
  'triage-errors': ['sentry'],
  document: ['notion', 'github']
};

function connectorById(id) {
  return CONNECTORS.find((connector) => connector.id === String(id)) || null;
}

function modeOfAction(connector, action) {
  if (connector.actions.read.includes(action)) return 'read';
  if (connector.actions.write.includes(action)) return 'write';
  return null;
}

function readConfig(projectRoot) {
  const file = path.join(projectRoot || process.cwd(), CONFIG_PATH);
  if (!fs.existsSync(file)) return { connectors: {} };
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { connectors: parsed && typeof parsed.connectors === 'object' && parsed.connectors ? parsed.connectors : {} };
  } catch (e) {
    return { connectors: {} };
  }
}

/**
 * Resolve the effective policy for one connector from project config. Reads are
 * always allowed. Writes need an explicit opt-in, and may be narrowed to a
 * specific action allowlist.
 */
function policyFor(connectorId, config = { connectors: {} }) {
  const entry = (config.connectors && config.connectors[connectorId]) || {};
  const allowWrite = entry.allowWrite === true;
  const allowedActions = Array.isArray(entry.allowedActions) ? entry.allowedActions.slice() : null;
  // Honor an intent to disable even if the config stringified the flag
  // (a hand-edited or externally-generated connectors.json may write "false").
  const disabled = entry.enabled === false || String(entry.enabled).toLowerCase() === 'false';
  return { allowWrite, allowedActions, enabled: !disabled };
}

/**
 * Decide whether a loop may perform one connector action. Pure over injected
 * config, so the security gate is fully unit-testable.
 */
function evaluateAction(connectorId, action, opts = {}) {
  const connector = connectorById(connectorId);
  if (!connector) {
    return { allowed: false, reason: `unknown connector: ${connectorId}`, mode: null };
  }
  const mode = modeOfAction(connector, action);
  if (!mode) {
    return { allowed: false, reason: `unknown action for ${connectorId}: ${action}`, mode: null };
  }
  const policy = policyFor(connectorId, opts.config || readConfig(opts.projectRoot));
  if (!policy.enabled) {
    return { allowed: false, reason: `${connector.label} connector is disabled in ${CONFIG_PATH}`, mode };
  }
  if (mode === 'read') {
    return { allowed: true, reason: 'read actions are allowed by default', mode, delegateTo: connector.mcpServer };
  }
  if (!policy.allowWrite) {
    return {
      allowed: false,
      mode,
      reason: `write scope for ${connector.label} is off; set connectors.${connectorId}.allowWrite=true in ${CONFIG_PATH} to enable`
    };
  }
  if (policy.allowedActions && !policy.allowedActions.includes(action)) {
    return {
      allowed: false,
      mode,
      reason: `${action} is not in the ${connector.label} allowedActions allowlist`
    };
  }
  return { allowed: true, reason: `write scope enabled for ${connector.label}`, mode, delegateTo: connector.mcpServer };
}

/**
 * Produce a delegation instruction for an allowed action. Godpowers never calls
 * the external API itself; it tells the host which MCP connector to drive.
 */
function plan(connectorId, action, opts = {}) {
  const verdict = evaluateAction(connectorId, action, opts);
  const connector = connectorById(connectorId);
  if (!verdict.allowed) {
    return { ...verdict, instruction: null };
  }
  return {
    ...verdict,
    instruction: `Delegate to the host ${connector.label} MCP connector (server: ${connector.mcpServer}) to ${action}. Godpowers does not vendor a ${connector.label} client; it drives the host connector so credentials never leave the host.`
  };
}

function hasMcpServer(ctx, server) {
  if (ctx.mcpServers) return ctx.mcpServers.includes(server);
  const files = [
    path.join(ctx.home, '.codex', 'config.toml'),
    path.join(ctx.home, '.claude.json'),
    path.join(ctx.projectRoot, '.mcp.json')
  ];
  for (const file of files) {
    try {
      if (fs.existsSync(file) && new RegExp(`${server}`).test(fs.readFileSync(file, 'utf8'))) return true;
    } catch (e) {
      // best-effort; unreadable host config is treated as "not present"
    }
  }
  return false;
}

function envConnectors(ctx) {
  const raw = ctx.env && ctx.env.GODPOWERS_CONNECTORS;
  if (!raw) return [];
  return String(raw).split(',').map((part) => part.trim().toLowerCase()).filter(Boolean);
}

/**
 * Detect which connectors are available to the host and how each is scoped.
 */
function detect(projectRoot = process.cwd(), opts = {}) {
  const ctx = {
    projectRoot,
    home: opts.home || os.homedir(),
    env: opts.env || process.env,
    mcpServers: opts.mcpServers || null
  };
  const config = opts.config || readConfig(projectRoot);
  const declared = envConnectors(ctx);

  const connectors = CONNECTORS.map((connector) => {
    const available = Boolean(
      (ctx.mcpServers && ctx.mcpServers.includes(connector.mcpServer)) ||
      declared.includes(connector.id) ||
      (ctx.mcpServers === null && hasMcpServer(ctx, connector.mcpServer))
    );
    const policy = policyFor(connector.id, config);
    return {
      id: connector.id,
      label: connector.label,
      category: connector.category,
      mcpServer: connector.mcpServer,
      available,
      scope: policy.allowWrite ? 'read-write' : 'read-only',
      enabled: policy.enabled,
      actions: connector.actions
    };
  });

  connectors.sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));

  const availableCount = connectors.filter((connector) => connector.available).length;
  return {
    configPath: path.join(projectRoot, CONFIG_PATH),
    connectors,
    availableCount,
    summary: availableCount > 0
      ? `${availableCount} of ${connectors.length} connectors available`
      : 'no external connectors detected',
    safety: [
      'Reads are allowed by default; writes require an explicit allowWrite opt-in per connector.',
      'Godpowers delegates to host MCP connectors and never vendors an external API client.',
      'Credentials stay on the host; Godpowers only names the connector and action.'
    ]
  };
}

/**
 * Pick the connector to use for a capability. Walks the capability ladder in
 * priority order and returns the first connector that is both available on the
 * host and enabled in config, stopping at the first match. Returns a null
 * connector with a reason when nothing qualifies.
 */
function pickConnector(capability, opts = {}) {
  const order = CAPABILITY_LADDER[capability];
  if (!order) {
    return { capability, connector: null, reason: `unknown capability: ${capability}`, candidates: [] };
  }
  const report = opts.report || detect(opts.projectRoot || process.cwd(), opts);
  const byId = new Map(report.connectors.map((connector) => [connector.id, connector]));
  for (const id of order) {
    const connector = byId.get(id);
    if (connector && connector.available && connector.enabled) {
      return {
        capability,
        connector: id,
        mcpServer: connector.mcpServer,
        scope: connector.scope,
        reason: `${connector.label} is the highest-priority available connector for ${capability}`,
        candidates: order.slice()
      };
    }
  }
  return {
    capability,
    connector: null,
    reason: `no available, enabled connector for ${capability} (tried ${order.join(', ')})`,
    candidates: order.slice()
  };
}

function render(report) {
  const rows = report.connectors.map((connector) => {
    const state = connector.available ? 'available' : 'not detected';
    return `  - ${connector.label} (${connector.category}): ${state}, ${connector.scope}`;
  });
  return [
    'Godpowers External Connectors',
    '',
    `Config: ${report.configPath}`,
    `Detected: ${report.summary}`,
    '',
    'Connectors:',
    ...rows,
    '',
    'Safety rules:',
    ...report.safety.map((rule) => `  - ${rule}`)
  ].join('\n');
}

module.exports = {
  CONFIG_PATH,
  CONNECTORS,
  CAPABILITY_LADDER,
  connectorById,
  modeOfAction,
  readConfig,
  policyFor,
  evaluateAction,
  plan,
  pickConnector,
  detect,
  render
};
