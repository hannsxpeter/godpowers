#!/usr/bin/env node
/**
 * Tests for lib/recipes.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const recipes = require('../lib/recipes');
const state = require('../lib/state');
const { test, report } = require('./test-harness');


console.log('\n  Recipes tests\n');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-recipes-test-'));

test('loadAll returns 30+ recipes', () => {
  recipes.clearCache();
  const all = recipes.loadAll();
  if (all.length < 30) throw new Error(`expected 30+, got ${all.length}`);
});

test('getRecipe finds named recipe', () => {
  recipes.clearCache();
  const r = recipes.getRecipe('greenfield-fast');
  if (!r) throw new Error('not found');
  if (r.metadata.name !== 'greenfield-fast') throw new Error('wrong name');
});

test('getRecipe returns null for unknown', () => {
  recipes.clearCache();
  const r = recipes.getRecipe('nonexistent-recipe');
  if (r !== null) throw new Error('should be null');
});

test('matchIntent matches "production down" to hotfix recipe', () => {
  recipes.clearCache();
  const matches = recipes.matchIntent('production down urgent', tmp);
  if (matches.length === 0) throw new Error('no matches');
  if (matches[0].recipe.metadata.name !== 'production-broken') {
    throw new Error(`expected production-broken, got ${matches[0].recipe.metadata.name}`);
  }
});

test('matchIntent matches "add a new feature" to feature recipes', () => {
  recipes.clearCache();
  const matches = recipes.matchIntent('add a new feature', tmp);
  if (matches.length === 0) throw new Error('no matches');
  // Should match feature-addition category recipes
  const featureMatches = matches.filter(m => m.recipe.metadata.category === 'feature-addition');
  if (featureMatches.length === 0) throw new Error('no feature-addition matches');
});

test('matchIntent matches "update dependencies" to deps recipe', () => {
  recipes.clearCache();
  const matches = recipes.matchIntent('update dependencies', tmp);
  if (matches.length === 0) throw new Error('no matches');
  const top = matches[0].recipe.metadata.name;
  if (top !== 'monthly-deps') throw new Error(`expected monthly-deps, got ${top}`);
});

test('matchIntent matches public front-door examples', () => {
  const cases = [
    ['start a product', 'greenfield-fast'],
    ['add a feature', 'add-feature-mid-arc-pause'],
    ['fix production', 'production-broken'],
    ['production is broken', 'production-broken'],
    ['add a feature without breaking the current project run', 'add-feature-mid-arc-pause'],
    ["I'm coming back after a week", 'returning-after-break'],
    ['audit an existing repo', 'brownfield-onboarding'],
    ['ship a release', 'release-maintenance'],
    ['maintain project health', 'weekly-health-check'],
    ['maintain health', 'weekly-health-check'],
    ['create an extension pack', 'extension-authoring'],
    ['extend godpowers', 'extension-authoring']
  ];

  for (const [text, expected] of cases) {
    recipes.clearCache();
    const matches = recipes.matchIntent(text);
    if (matches.length === 0) throw new Error(`no matches for ${text}`);
    const top = matches[0].recipe.metadata.name;
    if (top !== expected) throw new Error(`expected ${expected} for ${text}, got ${top}`);
  }
});

test('matchIntent covers high-traffic bare verbs (IA-001)', () => {
  // The router's promise is "just describe what you want"; the most common
  // verbs must return a topical match, not fall through to the classifier.
  const cases = [
    ['fix a bug', 'bug-no-urgency'],
    ['ship it', 'release-maintenance'],
    ['deploy this', 'release-maintenance'],
    ['release', 'release-maintenance'],
    ['check progress', 'whats-done']
  ];
  for (const [text, expected] of cases) {
    recipes.clearCache();
    const matches = recipes.matchIntent(text);
    if (matches.length === 0) throw new Error(`no matches for "${text}"`);
    if (matches[0].score < 5) throw new Error(`"${text}" scored ${matches[0].score}, want >= 5`);
    const top = matches[0].recipe.metadata.name;
    if (top !== expected) throw new Error(`expected ${expected} for "${text}", got ${top}`);
  }
});

test('public starter recipes keep their command order', () => {
  recipes.clearCache();
  const brownfield = recipes.getSequence(recipes.getRecipe('brownfield-onboarding'))
    .map((step) => step.command);
  const release = recipes.getSequence(recipes.getRecipe('release-maintenance'))
    .map((step) => step.command);

  for (const command of ['/god-preflight', '/god-archaeology', '/god-reconstruct', '/god-audit', '/god-tech-debt']) {
    if (!brownfield.includes(command)) throw new Error(`brownfield missing ${command}`);
  }
  if (brownfield.indexOf('/god-audit') > brownfield.indexOf('/god-tech-debt')) {
    throw new Error('brownfield should audit reconstructed artifacts before tech debt');
  }
  for (const command of ['/god-sync', '/god-docs', '/god-version', '/god-automation-setup']) {
    if (!release.includes(command)) throw new Error(`release maintenance missing ${command}`);
  }

  const extension = recipes.getSequence(recipes.getRecipe('extension-authoring'))
    .map((step) => step.command);
  for (const command of ['/god-extension-scaffold --name=@godpowers/my-pack --output=.', '/god-test-extension <pack-dir>', '/god-extension-add <pack-dir>', '/god-extension-list']) {
    if (!extension.includes(command)) throw new Error(`extension authoring missing ${command}`);
  }
});

test('matchIntent ranks exact phrase match high (10+)', () => {
  recipes.clearCache();
  const exact = recipes.matchIntent('production down urgent', tmp);
  if (exact.length === 0) throw new Error('no matches');
  if (exact[0].score < 10) {
    throw new Error(`exact phrase should score 10+, got ${exact[0].score}`);
  }
});

test('matchIntent returns empty for unrelated text', () => {
  recipes.clearCache();
  const matches = recipes.matchIntent('the quick brown fox', tmp);
  if (matches.length > 0) {
    // Some might match due to partial words; that's OK if scores are low
    if (matches[0].score > 5) {
      throw new Error('should not match high for unrelated text');
    }
  }
});

test('suggestForState returns recipes matching state', () => {
  recipes.clearCache();
  // tmp is empty (no .godpowers/), should match no-godpowers-dir recipes
  const suggestions = recipes.suggestForState(tmp);
  const greenfields = suggestions.filter(r => r.metadata.category === 'starting');
  if (greenfields.length === 0) throw new Error('should suggest starting recipes for empty dir');
});

test('evaluateStateCondition: state initialized predicate uses state.json', () => {
  recipes.clearCache();
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'recipes-initialized-test-'));
  state.init(proj, 'recipes-initialized-test');
  fs.rmSync(path.join(proj, '.godpowers', 'PROGRESS.md'), { force: true });
  if (recipes.evaluateStateCondition('state:initialized == true', proj) !== true) {
    throw new Error('initialized state should satisfy recipe condition');
  }
  fs.rmSync(proj, { recursive: true, force: true });
});

test('suggestForState changes when state changes', () => {
  recipes.clearCache();
  // Init the project
  state.init(tmp, 'recipes-test');
  const s = state.read(tmp);
  s['lifecycle-phase'] = 'steady-state-active';
  state.write(tmp, s);

  const suggestions = recipes.suggestForState(tmp);
  // Now should match steady-state recipes (production-broken, weekly-health-check, etc.)
  const steadyState = suggestions.filter(r => {
    const conds = (r.triggers && r.triggers['state-conditions']) || [];
    return conds.some(c => c.includes('steady-state'));
  });
  if (steadyState.length === 0) throw new Error('should suggest steady-state recipes');
});

test('getSequence returns the default sequence steps', () => {
  recipes.clearCache();
  const r = recipes.getRecipe('greenfield-fast');
  const steps = recipes.getSequence(r);
  if (steps.length === 0) throw new Error('no steps');
  if (steps[0].command !== '/god-mode') throw new Error('first step should be /god-mode');
});

test('listByCategory returns recipes in that category', () => {
  recipes.clearCache();
  const featureRecipes = recipes.listByCategory('feature-addition');
  if (featureRecipes.length < 5) throw new Error(`expected 5+ feature recipes, got ${featureRecipes.length}`);
});

test('categories includes all expected', () => {
  recipes.clearCache();
  const cats = recipes.categories();
  for (const expected of ['starting', 'feature-addition', 'production', 'maintaining', 'recovering', 'collaborating', 'knowledge', 'meta']) {
    if (!cats.includes(expected)) throw new Error(`missing category: ${expected}`);
  }
});

test('all recipes have apiVersion: godpowers/v1', () => {
  recipes.clearCache();
  const all = recipes.loadAll();
  for (const r of all) {
    if (r.apiVersion !== 'godpowers/v1') {
      throw new Error(`${r.metadata && r.metadata.name} has wrong apiVersion`);
    }
  }
});

test('all recipes have at least one keyword', () => {
  recipes.clearCache();
  const all = recipes.loadAll();
  for (const r of all) {
    const kws = (r.triggers && r.triggers['intent-keywords']) || [];
    if (kws.length === 0) throw new Error(`${r.metadata && r.metadata.name} has no keywords`);
  }
});

test('all recipes have at least one sequence step', () => {
  recipes.clearCache();
  const all = recipes.loadAll();
  for (const r of all) {
    const steps = recipes.getSequence(r);
    if (steps.length === 0) throw new Error(`${r.metadata && r.metadata.name} has no sequence steps`);
  }
});

// Cleanup
fs.rmSync(tmp, { recursive: true, force: true });

report();
