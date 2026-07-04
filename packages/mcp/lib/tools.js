const path = require('path');
const z = require('zod/v4');

const runtime = require('./runtime');

const TOOL_NAMES = [
  'status',
  'next',
  'gate_check',
  'lint_artifact',
  'trace_requirement',
  'work_report',
  'change_metrics',
  'route',
  'verification_history'
];

function toolResult(value) {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(value, null, 2)
      }
    ],
    structuredContent: value
  };
}

function toolError(error) {
  return {
    isError: true,
    content: [
      {
        type: 'text',
        text: error && error.message ? error.message : String(error)
      }
    ]
  };
}

async function withErrors(fn) {
  try {
    return toolResult(await fn());
  } catch (error) {
    return toolError(error);
  }
}

function projectRootFor(input, opts) {
  return runtime.resolveProject(input.project || opts.projectRoot || process.cwd());
}

function statusTool(input = {}, opts = {}) {
  const projectRoot = projectRootFor(input, opts);
  const dashboard = runtime.requireRuntime('dashboard', opts);
  const result = dashboard.compute(projectRoot, { git: input.git !== false });
  return {
    project: projectRoot,
    dashboard: result,
    rendered: dashboard.render(result, { brief: Boolean(input.brief) })
  };
}

function nextTool(input = {}, opts = {}) {
  const projectRoot = projectRootFor(input, opts);
  const dashboard = runtime.requireRuntime('dashboard', opts);
  const result = dashboard.compute(projectRoot, { git: input.git !== false });
  return {
    project: projectRoot,
    next: result.next,
    actionBrief: result.actionBrief,
    dashboard: result
  };
}

function gateTool(input = {}, opts = {}) {
  const projectRoot = projectRootFor(input, opts);
  const gate = runtime.requireRuntime('gate', opts);
  return gate.check({
    tier: input.tier,
    projectRoot
  });
}

function lintTool(input = {}, opts = {}) {
  const projectRoot = projectRootFor(input, opts);
  const linter = runtime.requireRuntime('artifact-linter', opts);
  const artifactPath = runtime.resolveProjectFile(projectRoot, input.path);
  const result = linter.lintFile(artifactPath, { projectRoot });
  return {
    project: projectRoot,
    artifact: path.relative(projectRoot, artifactPath).split(path.sep).join('/'),
    lint: {
      type: result.type,
      findings: result.findings,
      summary: result.summary
    }
  };
}

function traceRequirementTool(input = {}, opts = {}) {
  const projectRoot = projectRootFor(input, opts);
  const requirements = runtime.requireRuntime('requirements', opts);
  const derived = requirements.derive(projectRoot);
  const id = String(input.id || '').trim();
  const requirement = derived.requirements.find((item) => item.id === id) || null;
  const increment = requirement && requirement.increment
    ? derived.increments.find((item) => item.id === requirement.increment) || null
    : null;
  return {
    project: projectRoot,
    id,
    found: Boolean(requirement),
    requirement,
    increment,
    summary: derived.summary,
    ledger: requirements.LEDGER_PATH
  };
}

function workReportTool(input = {}, opts = {}) {
  const projectRoot = projectRootFor(input, opts);
  const workReport = runtime.requireRuntime('work-report', opts);
  // Read-only veneer: always peek so the MCP tool never advances the cursor.
  const report = workReport.report({ since: input.since || 'all', peek: true, projectRoot });
  return { project: projectRoot, report };
}

function changeMetricsTool(input = {}, opts = {}) {
  const projectRoot = projectRootFor(input, opts);
  const changeMetrics = runtime.requireRuntime('change-metrics', opts);
  const metric = changeMetrics.compute(projectRoot, { since: input.since || 'all' });
  return { project: projectRoot, metric };
}

function routeTool(input = {}, opts = {}) {
  const projectRoot = projectRootFor(input, opts);
  const quarterback = runtime.requireRuntime('quarterback', opts);
  return { project: projectRoot, play: quarterback.route(input.prompt || '', { projectRoot }) };
}

function verificationHistoryTool(input = {}, opts = {}) {
  const projectRoot = projectRootFor(input, opts);
  const evidence = runtime.requireRuntime('evidence', opts);
  const records = evidence.history({
    substep: input.substep || undefined,
    recent: input.recent,
    projectRoot
  });
  return { project: projectRoot, substep: input.substep || null, records };
}

function registerTools(server, opts = {}) {
  server.registerTool('status', {
    title: 'Godpowers status',
    description: 'Read Godpowers dashboard state from disk.',
    inputSchema: {
      project: z.string().optional().describe('Project root. Defaults to the server project.'),
      brief: z.boolean().optional().describe('Include compact rendered dashboard text.'),
      git: z.boolean().optional().describe('Set false to skip git status checks.')
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true
    }
  }, async (input) => withErrors(() => statusTool(input, opts)));

  server.registerTool('next', {
    title: 'Godpowers next',
    description: 'Read the recommended next Godpowers command from disk state.',
    inputSchema: {
      project: z.string().optional().describe('Project root. Defaults to the server project.'),
      git: z.boolean().optional().describe('Set false to skip git status checks.')
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true
    }
  }, async (input) => withErrors(() => nextTool(input, opts)));

  server.registerTool('gate_check', {
    title: 'Godpowers gate check',
    description: 'Run a read-only executable tier gate check.',
    inputSchema: {
      project: z.string().optional().describe('Project root. Defaults to the server project.'),
      tier: z.enum(['prd', 'design', 'arch', 'roadmap', 'stack', 'repo', 'build', 'harden'])
        .describe('Gate tier to check.')
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true
    }
  }, async (input) => withErrors(() => gateTool(input, opts)));

  server.registerTool('lint_artifact', {
    title: 'Godpowers artifact lint',
    description: 'Lint one artifact path inside the project root.',
    inputSchema: {
      project: z.string().optional().describe('Project root. Defaults to the server project.'),
      path: z.string().describe('Artifact path relative to the project root.')
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true
    }
  }, async (input) => withErrors(() => lintTool(input, opts)));

  server.registerTool('trace_requirement', {
    title: 'Godpowers requirement trace',
    description: 'Trace one PRD requirement id to linkage and roadmap evidence.',
    inputSchema: {
      project: z.string().optional().describe('Project root. Defaults to the server project.'),
      id: z.string().describe('Requirement id such as P-MUST-01.')
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true
    }
  }, async (input) => withErrors(() => traceRequirementTool(input, opts)));

  server.registerTool('work_report', {
    title: 'Godpowers work report',
    description: 'Read the verification play-by-play from the evidence ledger (does not advance the report cursor).',
    inputSchema: {
      project: z.string().optional().describe('Project root. Defaults to the server project.'),
      since: z.enum(['last', 'all']).optional().describe('Window: new records since last report, or all. Defaults to all.')
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true
    }
  }, async (input) => withErrors(() => workReportTool(input, opts)));

  server.registerTool('change_metrics', {
    title: 'Godpowers accepted-change rate',
    description: 'Read the loop accepted-change rate (accepted vs rejected changes) derived from the event ledger.',
    inputSchema: {
      project: z.string().optional().describe('Project root. Defaults to the server project.'),
      since: z.string().optional().describe("Window such as '7d', '30d', an ISO date, or 'all'. Defaults to all.")
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true
    }
  }, async (input) => withErrors(() => changeMetricsTool(input, opts)));

  server.registerTool('route', {
    title: 'Godpowers route',
    description: 'Classify a prompt into an entry play via the quarterback (read-only; never mutates state).',
    inputSchema: {
      project: z.string().optional().describe('Project root. Defaults to the server project.'),
      prompt: z.string().optional().describe('Free-text intent to classify.')
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true
    }
  }, async (input) => withErrors(() => routeTool(input, opts)));

  server.registerTool('verification_history', {
    title: 'Godpowers verification history',
    description: 'Read evidence ledger records, optionally filtered to one substep and limited to the most recent N.',
    inputSchema: {
      project: z.string().optional().describe('Project root. Defaults to the server project.'),
      substep: z.string().optional().describe('Substep id such as tier-2.build.'),
      recent: z.number().optional().describe('Limit to the most recent N records.')
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true
    }
  }, async (input) => withErrors(() => verificationHistoryTool(input, opts)));
}

module.exports = {
  TOOL_NAMES,
  registerTools,
  statusTool,
  nextTool,
  gateTool,
  lintTool,
  traceRequirementTool,
  workReportTool,
  changeMetricsTool,
  routeTool,
  verificationHistoryTool,
  toolResult,
  toolError
};
