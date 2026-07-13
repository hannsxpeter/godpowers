#!/usr/bin/env node

const routing = require('../lib/product-routing');
const { test, assert, report } = require('./test-harness');

console.log('\n  Product routing tests\n');

test('selects CLI or SDK before a secondary public API signal', () => {
  const result = routing.selectProductForm('Build a cross-platform CLI tool and TypeScript SDK for our public API.');
  assert(result.status === 'selected', JSON.stringify(result));
  assert(result.form === 'cli-or-sdk', JSON.stringify(result));
  assert(result.evidence.some(item => /cli|sdk/.test(item)), JSON.stringify(result.evidence));
});

test('does not infer web or infrastructure from generic product language', () => {
  const result = routing.selectProductForm('Build a useful product platform from this tool and its YAML configuration.');
  assert(result.status === 'undetermined', JSON.stringify(result));
  assert(result.form === null, JSON.stringify(result));
});

test('returns ambiguity instead of silently choosing a tied form', () => {
  const result = routing.selectProductForm('The web app calls an API service.');
  assert(result.status === 'ambiguous', JSON.stringify(result));
  assert(result.form === null, JSON.stringify(result));
  assert(result.candidates.length === 2, JSON.stringify(result));
});

test('accepts an explicit form and rejects an unknown explicit form', () => {
  const selected = routing.selectProductForm({ form: 'Data or ML', text: 'pipeline' });
  assert(selected.status === 'selected' && selected.form === 'data-or-ml', JSON.stringify(selected));
  const invalid = routing.selectProductForm({ form: 'dashboard-ish', text: 'dashboard' });
  assert(invalid.status === 'invalid' && invalid.form === null, JSON.stringify(invalid));
});

test('form definitions expose form-specific completion evidence', () => {
  const definition = routing.formDefinition('api-or-service');
  assert(definition.profiles.includes('API / Microservice'), JSON.stringify(definition));
  assert(definition.completionEvidence.some(item => item.includes('consumer fixture')), JSON.stringify(definition));
  assert(routing.formDefinition('missing') === null, 'unknown form should be null');
});

test('composes the four axes in form-first order without averaging stack profiles', () => {
  const result = routing.composeDomain({
    form: 'web-application',
    archetype: ['saas', 'saas'],
    industry: 'research-lab-lims',
    regulatory: ['healthcare-clinical', 'healthcare-clinical']
  });
  assert(Object.keys(result.axes).join(',') === 'form,archetype,industry,regulatory', JSON.stringify(result.axes));
  assert(result.axes.form === 'web-application', JSON.stringify(result.axes));
  assert(result.axes.archetype.length === 1, JSON.stringify(result.axes));
  assert(result.stackComposition.primary === 'SaaS / Multi-tenant', JSON.stringify(result.stackComposition));
  assert(result.stackComposition.secondaryConstraints.includes('Internal Tools / Back-office'), JSON.stringify(result.stackComposition));
  assert(result.stackComposition.rule.includes('hard constraints'), result.stackComposition.rule);
});

test('uses an industry stack when no archetype mapping exists', () => {
  const result = routing.composeDomain({ form: 'api-or-service', industry: 'financial-fintech-accounting' });
  assert(result.stackComposition.primary === 'Fintech / Financial', JSON.stringify(result.stackComposition));
  assert(result.axes.archetype.length === 0 && result.axes.regulatory.length === 0, JSON.stringify(result.axes));
});

test('allows an evidenced route with no mapped stack profile', () => {
  const result = routing.composeDomain({ form: 'mobile-or-desktop', archetype: 'custom', industry: 'custom-sector' });
  assert(result.stackComposition.primary === null, JSON.stringify(result.stackComposition));
  assert(result.stackComposition.secondaryConstraints.length === 0, JSON.stringify(result.stackComposition));
});

test('rejects domain composition before product-form selection', () => {
  let message = '';
  try {
    routing.composeDomain({ archetype: 'saas' });
  } catch (error) {
    message = error.message;
  }
  assert(message.includes('Unknown or missing product form'), message);
});

test('renders an ordered route for specialist handoff', () => {
  const result = routing.composeDomain({ form: 'infrastructure-or-iac', industry: [] });
  const text = routing.renderRoute(result);
  assert(text.startsWith('Product form: Infrastructure or IaC'), text);
  assert(text.includes('Product archetype: none evidenced'), text);
  assert(text.includes('Completion evidence:\n- formatting and static validation pass'), text);
  let threw = false;
  try {
    routing.renderRoute({});
  } catch (_error) {
    threw = true;
  }
  assert(threw, 'render should reject an uncomposed route');
});

test('the catalog defines six distinct product forms', () => {
  assert(routing.FORM_DEFINITIONS.length === 6, JSON.stringify(routing.FORM_DEFINITIONS.map(item => item.id)));
  assert(Object.keys(routing.ARCHETYPE_STACKS).length >= 8, 'archetype stack mappings missing');
  assert(Object.keys(routing.INDUSTRY_STACKS).length >= 10, 'industry stack mappings missing');
});

report('Product routing tests');
