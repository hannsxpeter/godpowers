/**
 * Product-form and domain-composition routing.
 *
 * Product form is selected before product archetype, industry, or regulatory
 * overlays. This keeps browser assumptions out of CLI, API, data, mobile, and
 * infrastructure work while preserving one ordered routing contract.
 */

const FORM_DEFINITIONS = Object.freeze([
  {
    id: 'web-application',
    label: 'Web application',
    signals: ['browser ui', 'web app', 'saas app', 'authenticated portal', 'customer portal', 'admin console', 'dashboard'],
    profiles: ['Web App (SaaS)'],
    verticalSlice: 'user action -> permission boundary -> service or API -> real data -> UI states -> tests',
    completionEvidence: [
      'roadmap-grounded job crosses the real data boundary',
      'loading, empty, error, and success states are covered where applicable',
      'permission checks run at the server boundary',
      'accessibility, unit, integration, and browser checks pass'
    ]
  },
  {
    id: 'api-or-service',
    label: 'API or service',
    signals: ['api service', 'public api', 'headless service', 'http service', 'rpc service', 'event consumer', 'microservice', 'worker service'],
    profiles: ['API / Microservice'],
    verticalSlice: 'contract -> validation and authorization -> domain operation -> dependency -> telemetry -> tests',
    completionEvidence: [
      'a real consumer fixture completes one contract path',
      'schema and error responses are tested',
      'retries are bounded and idempotent where required',
      'health, telemetry, contract, and integration checks pass'
    ]
  },
  {
    id: 'cli-or-sdk',
    label: 'CLI or SDK',
    signals: ['command line', 'command-line', 'terminal command', 'cli tool', ' cli ', 'sdk', 'developer library', 'embeddable library', 'npm package'],
    profiles: ['Library / SDK', 'CLI Tool'],
    verticalSlice: 'public command or API -> parsing and validation -> domain operation -> output contract -> consumer fixture -> tests',
    completionEvidence: [
      'a clean consumer fixture installs the release artifact',
      'the primary job completes without repository internals',
      'invalid input returns documented errors and exit behavior',
      'examples, compatibility checks, and reproducible packaging pass'
    ]
  },
  {
    id: 'mobile-or-desktop',
    label: 'Mobile or desktop',
    signals: ['mobile app', 'desktop app', 'app store', 'play store', 'native app', 'offline client', 'electron app', 'tauri app', 'signed installer'],
    profiles: ['Mobile App', 'Desktop App'],
    verticalSlice: 'native interaction -> local state -> sync boundary -> offline and recovery states -> platform tests',
    completionEvidence: [
      'a build runs on every declared platform class',
      'the primary job survives lifecycle and connectivity transitions',
      'secrets use platform storage',
      'accessibility, crash telemetry, device tests, and packaging pass'
    ]
  },
  {
    id: 'data-or-ml',
    label: 'Data or ML',
    signals: ['data pipeline', 'dataset pipeline', 'analytics engineering', 'model training', 'inference service', 'feature pipeline', 'evaluation pipeline', 'machine learning', 'ml system'],
    profiles: ['Data / ML'],
    verticalSlice: 'versioned input -> validated transform or training -> reproducible output -> evaluation -> lineage checks',
    completionEvidence: [
      'a clean environment reproduces one pipeline or model artifact',
      'quality and evaluation thresholds are explicit and pass',
      'lineage identifies code, data, and configuration versions',
      'fixtures contain no unauthorized sensitive data'
    ]
  },
  {
    id: 'infrastructure-or-iac',
    label: 'Infrastructure or IaC',
    signals: ['terraform module', 'opentofu module', 'infrastructure as code', 'iac module', 'kubernetes package', 'ansible automation', 'platform infrastructure'],
    profiles: ['DevOps / IaC'],
    verticalSlice: 'versioned configuration -> static validation -> plan -> policy check -> isolated apply or simulation -> rollback proof',
    completionEvidence: [
      'formatting and static validation pass',
      'an isolated plan and policy result are reviewed',
      'a sandbox apply or faithful simulation proves the main path',
      'destructive behavior, state, secrets, and rollback are verified'
    ]
  }
]);

const ARCHETYPE_STACKS = Object.freeze({
  'saas': 'SaaS / Multi-tenant',
  'multi-tenant': 'SaaS / Multi-tenant',
  'marketplace': 'Marketplace / Two-sided',
  'developer-platform': 'SaaS / Multi-tenant',
  'workflow-automation': 'SaaS / Multi-tenant',
  'internal-tool': 'Internal Tools / Back-office',
  'analytics-bi': 'Analytics / BI / Dashboards',
  'ai-ml-chat': 'AI / ML / LLM products'
});

const INDUSTRY_STACKS = Object.freeze({
  'financial-fintech-accounting': 'Fintech / Financial',
  'healthcare-medical': 'Healthcare / Medical',
  'ecommerce-retail': 'E-commerce / Retail',
  'education-lms': 'Education / LMS',
  'marketing-crm-sales': 'CRM / Sales / Marketing',
  'customer-support': 'Customer Support / Helpdesk',
  'research-lab-lims': 'Internal Tools / Back-office',
  'manufacturing-mes': 'Internal Tools / Back-office',
  'cybersecurity-soc': 'Analytics / BI / Dashboards',
  'data-analytics-bi': 'Analytics / BI / Dashboards'
});

function normalizeText(value) {
  return ` ${String(value || '').toLowerCase().replace(/[^a-z0-9+/-]+/g, ' ').replace(/\s+/g, ' ').trim()} `;
}

function signalPresent(text, signal) {
  const normalizedSignal = normalizeText(signal);
  return text.includes(normalizedSignal);
}

function selectProductForm(input) {
  const text = normalizeText(typeof input === 'string' ? input : input && input.text);
  const explicit = input && typeof input === 'object' ? input.form : null;
  if (explicit) {
    const definition = FORM_DEFINITIONS.find(item => item.id === explicit || item.label.toLowerCase() === String(explicit).toLowerCase());
    if (!definition) return { status: 'invalid', form: null, evidence: [], candidates: [] };
    return { status: 'selected', form: definition.id, evidence: ['explicit product form'], candidates: [{ form: definition.id, score: Number.MAX_SAFE_INTEGER }] };
  }

  const candidates = FORM_DEFINITIONS.map(definition => {
    const evidence = definition.signals.filter(signal => signalPresent(text, signal));
    return { form: definition.id, score: evidence.length, evidence };
  }).filter(candidate => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.form.localeCompare(b.form));

  if (candidates.length === 0) return { status: 'undetermined', form: null, evidence: [], candidates: [] };
  if (candidates.length > 1 && candidates[0].score === candidates[1].score) {
    return { status: 'ambiguous', form: null, evidence: candidates[0].evidence, candidates };
  }
  return { status: 'selected', form: candidates[0].form, evidence: candidates[0].evidence, candidates };
}

function uniqueValues(value) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return [...new Set(values.map(item => String(item).trim()).filter(Boolean))];
}

function formDefinition(form) {
  return FORM_DEFINITIONS.find(item => item.id === form) || null;
}

function composeDomain(input = {}) {
  const form = formDefinition(input.form);
  if (!form) throw new Error(`Unknown or missing product form: ${input.form || '(none)'}`);

  const archetypes = uniqueValues(input.archetype);
  const industries = uniqueValues(input.industry);
  const regulatory = uniqueValues(input.regulatory);
  const primaryStack = archetypes.map(item => ARCHETYPE_STACKS[item]).find(Boolean)
    || industries.map(item => INDUSTRY_STACKS[item]).find(Boolean)
    || null;
  const secondaryStacks = [...new Set([
    ...archetypes.map(item => ARCHETYPE_STACKS[item]),
    ...industries.map(item => INDUSTRY_STACKS[item])
  ].filter(item => item && item !== primaryStack))];

  return {
    axes: {
      form: form.id,
      archetype: archetypes,
      industry: industries,
      regulatory
    },
    profiles: form.profiles,
    verticalSlice: form.verticalSlice,
    completionEvidence: form.completionEvidence,
    stackComposition: {
      primary: primaryStack,
      secondaryConstraints: secondaryStacks,
      rule: 'Score the primary profile first, then add only hard constraints from secondary profiles.'
    },
    loadOrder: [
      'references/building/PRODUCT-FORM-ROUTER.md',
      'references/building/DOMAIN-COMPOSITION-REGISTRY.md'
    ]
  };
}

function renderRoute(route) {
  if (!route || !route.axes) throw new Error('A composed domain route is required.');
  const definition = formDefinition(route.axes.form);
  const lines = [
    `Product form: ${definition ? definition.label : route.axes.form}`,
    `Product archetype: ${route.axes.archetype.join(', ') || 'none evidenced'}`,
    `Industry overlay: ${route.axes.industry.join(', ') || 'none evidenced'}`,
    `Regulatory overlay: ${route.axes.regulatory.join(', ') || 'none evidenced'}`,
    `Vertical slice: ${route.verticalSlice}`,
    'Completion evidence:'
  ];
  for (const item of route.completionEvidence) lines.push(`- ${item}`);
  return lines.join('\n');
}

module.exports = {
  FORM_DEFINITIONS,
  ARCHETYPE_STACKS,
  INDUSTRY_STACKS,
  selectProductForm,
  formDefinition,
  composeDomain,
  renderRoute
};
