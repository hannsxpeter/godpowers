/**
 * Recipes
 *
 * Scenario-based decision support. Maps fuzzy user intent to specific
 * command sequences. Used by /god-next, god-orchestrator, and SessionStart
 * hook to make decisions when the simple routing graph is insufficient.
 */

const fs = require('fs');
const path = require('path');
const { parseSimpleYaml, formatDiagnostic } = require('./intent');
const state = require('./state');

const RECIPES_DIR = path.join(__dirname, '..', 'routing', 'recipes');

let _cache = null;

function warnYamlDiagnostic(diagnostic) {
  console.warn(`[godpowers] YAML warning ${formatDiagnostic(diagnostic)}`);
}

/**
 * Load all recipe definitions.
 */
function loadAll() {
  if (_cache) return _cache;
  const result = [];
  if (!fs.existsSync(RECIPES_DIR)) return result;

  for (const file of fs.readdirSync(RECIPES_DIR)) {
    if (!file.endsWith('.yaml') && !file.endsWith('.yml')) continue;
    const content = fs.readFileSync(path.join(RECIPES_DIR, file), 'utf8');
    const parsed = parseSimpleYaml(content, {
      strict: true,
      source: path.join('routing', 'recipes', file),
      onDiagnostic: warnYamlDiagnostic
    });
    if (parsed.metadata && parsed.metadata.name) {
      result.push(parsed);
    }
  }
  _cache = result;
  return result;
}

/**
 * Get a recipe by name.
 */
function getRecipe(name) {
  return loadAll().find(r => r.metadata && r.metadata.name === name) || null;
}

/**
 * Match user intent text against recipes' keywords.
 * Returns matches sorted by relevance score.
 */
function matchIntent(text, projectRoot) {
  if (!text) return [];
  const lowered = text.toLowerCase();
  const allRecipes = loadAll();
  const matches = [];

  for (const recipe of allRecipes) {
    const keywords = (recipe.triggers && recipe.triggers['intent-keywords']) || [];
    let score = 0;

    for (const kw of keywords) {
      const kwLower = kw.toLowerCase();
      // Exact phrase match: high score
      if (lowered.includes(kwLower)) {
        score += 10;
      } else {
        // All-words match: medium score
        const words = kwLower.split(/\s+/).filter(w => w.length > 2);
        const allMatch = words.every(w => lowered.includes(w));
        if (allMatch && words.length > 0) {
          score += 5;
        }
      }
    }

    // Apply state conditions
    if (score > 0 && projectRoot) {
      const stateConds = (recipe.triggers && recipe.triggers['state-conditions']) || [];
      const stateOk = stateConds.every(c => evaluateStateCondition(c, projectRoot));
      if (!stateOk) {
        // Doesn't match current state: penalize but don't remove (might still be useful)
        score = Math.max(1, score - 5);
      }
    }

    if (score > 0) {
      matches.push({ recipe, score });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

/**
 * Evaluate a state condition predicate.
 */
function evaluateStateCondition(condition, projectRoot) {
  const cond = condition.trim();

  if (cond === 'no-godpowers-dir') {
    return !fs.existsSync(path.join(projectRoot, '.godpowers'));
  }
  if (cond === 'has-package-json') {
    return fs.existsSync(path.join(projectRoot, 'package.json'));
  }
  if (cond.startsWith('file:')) {
    return fs.existsSync(path.join(projectRoot, cond.slice(5).trim()));
  }
  if (cond.startsWith('state:')) {
    const m = cond.slice(6).trim().match(/^([\w.-]+)\s*==\s*(.+)$/);
    if (!m) return true;
    const [, dottedPath, expected] = m;
    const s = state.read(projectRoot);
    const actual = state.valueAtPath(s, dottedPath);
    return actual === expected.trim() || actual === parseValue(expected.trim());
  }
  if (cond.startsWith('lifecycle-phase ==')) {
    const expected = cond.split('==')[1].trim();
    const s = state.read(projectRoot);
    return s && s['lifecycle-phase'] === expected;
  }
  if (cond.startsWith('tier-')) {
    // Format: tier-N.subkey.field == value
    const m = cond.match(/^([\w.-]+)\s*==\s*(.+)$/);
    if (!m) return true;
    const [, dottedPath, expected] = m;
    const s = state.read(projectRoot);
    if (!s) return false;
    const actual = dottedPath.split('.').reduce((acc, k) => (acc ? acc[k] : undefined), s.tiers || s);
    return actual === expected.trim();
  }
  // Unknown condition: assume satisfied (don't block)
  return true;
}

function parseValue(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  return value;
}

/**
 * Suggest top recipes based on current project state alone (no intent text).
 */
function suggestForState(projectRoot) {
  const allRecipes = loadAll();
  const matches = [];

  for (const recipe of allRecipes) {
    const stateConds = (recipe.triggers && recipe.triggers['state-conditions']) || [];
    if (stateConds.length === 0) continue;
    const stateOk = stateConds.every(c => evaluateStateCondition(c, projectRoot));
    if (stateOk) {
      matches.push(recipe);
    }
  }

  return matches;
}

/**
 * Get the default sequence (steps) from a recipe.
 */
function getSequence(recipe, sequenceName) {
  const name = sequenceName || recipe['default-sequence'] || 'default';
  if (!recipe.sequences || !recipe.sequences[name]) return [];
  return recipe.sequences[name].steps || [];
}

/**
 * List recipes by category.
 */
function listByCategory(category) {
  return loadAll().filter(r => r.metadata && r.metadata.category === category);
}

/**
 * Get all categories present.
 */
function categories() {
  const cats = new Set();
  for (const r of loadAll()) {
    if (r.metadata && r.metadata.category) cats.add(r.metadata.category);
  }
  return Array.from(cats).sort();
}

function clearCache() {
  _cache = null;
}

module.exports = {
  loadAll,
  getRecipe,
  matchIntent,
  suggestForState,
  getSequence,
  listByCategory,
  categories,
  evaluateStateCondition,
  clearCache
};
