/**
 * Host capability detection.
 *
 * Reports what the current AI coding host can actually guarantee at runtime.
 * This keeps Godpowers honest when true fresh-context spawning or release
 * tools depend on the host environment.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const cp = require('child_process');
const codeIntelligence = require('./code-intelligence');
const connectors = require('./connectors');

function exists(filePath) {
  return fs.existsSync(filePath);
}

function commandVersion(command, args, opts = {}) {
  try {
    const out = cp.execFileSync(command, args, {
      cwd: opts.cwd || process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: opts.timeout || 1500
    }).trim();
    return out.split(/\r?\n/)[0] || 'installed';
  } catch (err) {
    return null;
  }
}

function hostName(env) {
  if (env.CODEX_HOME || env.CODEX_SANDBOX || env.CODEX_ENV_PWD) return 'codex';
  if (env.CLAUDECODE || env.CLAUDE_CODE || env.CLAUDE_CONFIG_DIR) return 'claude';
  if (env.CURSOR_TRACE_ID || env.CURSOR_AGENT) return 'cursor';
  if (env.WINDSURF) return 'windsurf';
  return 'unknown';
}

function installedAgentSurfaces(homeDir) {
  const codexAgents = path.join(homeDir, '.codex', 'agents');
  const claudeAgents = path.join(homeDir, '.claude', 'agents');
  return {
    codex: exists(path.join(codexAgents, 'god-orchestrator.toml'))
      || exists(path.join(codexAgents, 'god-orchestrator.md')),
    claude: exists(path.join(claudeAgents, 'god-orchestrator.md'))
  };
}

function detectMcpAvailability(projectRoot, opts = {}) {
  if (opts.mcp) return opts.mcp;
  if (Object.prototype.hasOwnProperty.call(opts, 'mcpAvailable')) {
    return {
      available: Boolean(opts.mcpAvailable),
      source: opts.mcpAvailable ? (opts.mcpSource || 'override') : 'override'
    };
  }

  const env = opts.env || process.env;
  if (env.GODPOWERS_MCP === '1' || env.GODPOWERS_MCP === 'true') {
    return { available: true, source: 'environment' };
  }

  const root = projectRoot || process.cwd();
  if (exists(path.join(root, 'packages', 'mcp', 'package.json'))) {
    return { available: true, source: 'workspace package' };
  }

  try {
    require.resolve('@godpowers/mcp/package.json', { paths: [root, __dirname] });
    return { available: true, source: 'installed package' };
  } catch (error) {
    // Continue to host registration detection.
  }

  const homeDir = opts.homeDir || os.homedir();
  const codexConfig = path.join(homeDir, '.codex', 'config.toml');
  if (exists(codexConfig)) {
    try {
      const text = fs.readFileSync(codexConfig, 'utf8');
      if (/\[mcp_servers\.godpowers\]/.test(text)) {
        return { available: true, source: 'codex registration' };
      }
    } catch (error) {
      return { available: false, source: 'codex registration unreadable' };
    }
  }

  return { available: false, source: 'not configured' };
}

function detect(projectRoot, opts = {}) {
  const env = opts.env || process.env;
  const homeDir = opts.homeDir || os.homedir();
  const root = projectRoot || process.cwd();
  const installedAgents = opts.installedAgents || installedAgentSurfaces(homeDir);
  const git = commandVersion('git', ['--version'], { cwd: root });
  const npm = commandVersion('npm', ['--version'], { cwd: root });
  const gh = commandVersion('gh', ['--version'], { cwd: root });
  const codeIntel = opts.codeIntelligence || codeIntelligence.detect(root, opts.codeIntelligenceOpts || {});
  const shell = Boolean(env.SHELL || env.ComSpec);
  const detectedHost = opts.host || hostName(env);
  const installedAgentSpawn = Boolean(installedAgents.codex || installedAgents.claude);
  const activeAgentSpawn = opts.agentSpawn === true || Boolean(
    opts.activeSession && opts.activeSession.agentSpawnConfirmed === true
  );
  const extensionAuthoring = exists(path.join(root, 'lib', 'extension-authoring.js'))
    && exists(path.join(root, 'schema', 'extension-manifest.v1.json'));
  const suiteReleaseDryRun = exists(path.join(root, 'lib', 'suite-state.js'));
  const mcp = detectMcpAvailability(root, opts);
  const connectorReport = opts.connectors || connectors.detect(root, {
    home: homeDir,
    env,
    mcpServers: opts.connectorMcpServers || null,
    config: opts.connectorConfig
  });

  const gaps = [];
  if (!shell) gaps.push('shell unavailable');
  if (!git) gaps.push('git unavailable');
  if (!npm) gaps.push('npm unavailable');
  if (detectedHost === 'unknown') gaps.push('active host not identified');
  if (!activeAgentSpawn) gaps.push('fresh-context agent spawn not confirmed for active session');
  if (!extensionAuthoring) gaps.push('extension authoring scaffold unavailable');
  if (!suiteReleaseDryRun) gaps.push('suite release dry-run unavailable');

  let level = 'unknown';
  if (detectedHost !== 'unknown' && shell && git && npm && activeAgentSpawn) level = 'full';
  else if (shell && git && npm) level = 'degraded';

  return {
    host: detectedHost,
    level,
    activeSession: {
      hostIdentified: detectedHost !== 'unknown',
      agentSpawnConfirmed: activeAgentSpawn,
      agentSpawnEvidence: opts.agentSpawnEvidence
        || (opts.activeSession && opts.activeSession.agentSpawnEvidence)
        || null
    },
    installedCapabilities: {
      agentSpawn: installedAgentSpawn,
      agentSurfaces: installedAgents
    },
    guarantees: {
      shell,
      fileEdit: true,
      node: process.version,
      git,
      npm,
      gh,
      agentSpawn: activeAgentSpawn,
      mcp,
      connectors: {
        available: connectorReport.availableCount,
        total: connectorReport.connectors.length,
        summary: connectorReport.summary
      },
      codeIntelligence: codeIntel,
      extensionAuthoring,
      suiteReleaseDryRun
    },
    installedAgents,
    gaps
  };
}

function summary(report) {
  if (!report) return 'unknown';
  const mcp = report.guarantees && report.guarantees.mcp;
  const mcpText = mcp && mcp.available
    ? `; MCP available via ${mcp.source}`
    : '; MCP not configured';
  if (report.level === 'full') return `full on ${report.host}${mcpText}`;
  const gap = report.gaps && report.gaps.length > 0 ? `, ${report.gaps[0]}` : '';
  return `${report.level} on ${report.host}${gap}${mcpText}`;
}

function render(report) {
  const lines = [];
  lines.push('Host capabilities:');
  lines.push(`  Host: ${report.host}`);
  lines.push(`  Guarantee level: ${report.level}`);
  lines.push(`  Active-session agent spawn: ${report.guarantees.agentSpawn ? 'confirmed' : 'not confirmed'}`);
  const installedSpawn = report.installedCapabilities
    ? report.installedCapabilities.agentSpawn
    : Boolean(report.installedAgents && (report.installedAgents.codex || report.installedAgents.claude));
  lines.push(`  Installed agent metadata: ${installedSpawn ? 'detected' : 'not detected'}`);
  lines.push(`  Shell: ${report.guarantees.shell ? 'detected' : 'not detected'}`);
  lines.push(`  Git: ${report.guarantees.git || 'not detected'}`);
  lines.push(`  npm: ${report.guarantees.npm || 'not detected'}`);
  lines.push(`  GitHub CLI: ${report.guarantees.gh || 'not detected'}`);
  lines.push(`  MCP: ${report.guarantees.mcp.available ? `available via ${report.guarantees.mcp.source}` : 'not configured'}`);
  lines.push(`  Connectors: ${report.guarantees.connectors.summary}`);
  lines.push(`  Code intelligence: ${codeIntelligence.summary(report.guarantees.codeIntelligence)}`);
  lines.push(`  Gaps: ${report.gaps.length > 0 ? report.gaps.join('; ') : 'none'}`);
  return lines.join('\n');
}

module.exports = {
  detect,
  summary,
  render,
  _private: {
    commandVersion,
    hostName,
    installedAgentSurfaces,
    detectMcpAvailability
  }
};
