/**
 * Story Validator
 *
 * Parses and validates STORY.md files (story-file workflow).
 * Backward-compatible: doesn't replace /god-feature; complements it
 * with finer-grained slices.
 *
 * STORY.md schema:
 *   ---
 *   id: STORY-{slug}-NNN
 *   title: "Short noun phrase"
 *   status: pending | in-progress | blocked | done
 *   owner: name
 *   deps: [STORY-other-001]
 *   created: ISO date
 *   ---
 *
 *   ## User Story
 *   As a [persona], I want [capability] so that [outcome].
 *
 *   ## Acceptance Criteria
 *   - [DECISION] User can do X. Acceptance: clicks Y, sees Z.
 *
 *   ## Slice Plan
 *   1. Step 1
 *   2. Step 2
 *
 *   ## Notes
 *
 * Public API:
 *   parseStory(filePath) -> { id, title, status, owner, deps, body, sections, errors }
 *   validateStory(story) -> findings
 *   findStoryFiles(projectRoot) -> [paths]
 *   listStories(projectRoot) -> [{ id, status, ... }]
 *   listByStatus(projectRoot, status) -> [...]
 *   isValidId(id) -> bool
 */

const fs = require('fs');
const path = require('path');

const VALID_STATUSES = ['pending', 'in-progress', 'blocked', 'done'];
const ID_PATTERN = /^STORY-[\w-]+-\d+$/;
const USER_STORY_PATTERN = /as\s+a[n]?\s+.+,\s+i\s+want\s+.+\s+so\s+that\s+/i;

function isValidId(id) {
  return ID_PATTERN.test(id);
}

function storiesDir(projectRoot) {
  return path.join(projectRoot, '.godpowers', 'stories');
}

/**
 * Find all STORY-* story files under .godpowers/stories/. New stories are
 * written as .mdx; legacy .md stories remain readable.
 */
function findStoryFiles(projectRoot) {
  const dir = storiesDir(projectRoot);
  const found = [];
  if (!fs.existsSync(dir)) return found;

  function walk(d) {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); }
    catch (e) { return; }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && /^STORY-/.test(e.name)
        && (e.name.endsWith('.mdx') || e.name.endsWith('.md'))) {
        found.push(full);
      }
    }
  }
  walk(dir);
  return found;
}

/**
 * Parse a STORY.md. Returns object with frontmatter, parsed sections, errors.
 */
function parseStory(filePath) {
  const errors = [];
  if (!fs.existsSync(filePath)) {
    return { errors: ['file-not-found'] };
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  if (!raw.startsWith('---')) {
    return { errors: ['missing-frontmatter'], raw };
  }
  const fmEnd = raw.indexOf('\n---', 3);
  if (fmEnd === -1) {
    return { errors: ['unclosed-frontmatter'], raw };
  }
  const fmText = raw.slice(3, fmEnd).trim();
  const body = raw.slice(fmEnd + 4).trim();

  const fm = {};
  for (const line of fmText.split('\n')) {
    const m = line.match(/^([\w-]+):\s*(.*)$/);
    if (m) {
      let value = m[2].trim();
      // Parse arrays: [a, b] or ["a", "b"]
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value.slice(1, -1).split(',').map(s => {
          let t = s.trim();
          // Strip surrounding quotes if present
          if ((t.startsWith('"') && t.endsWith('"')) ||
              (t.startsWith("'") && t.endsWith("'"))) {
            t = t.slice(1, -1);
          }
          return t;
        }).filter(Boolean);
      } else if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      fm[m[1]] = value;
    }
  }

  // Parse sections
  const sections = {};
  let currentHeading = null;
  let currentLines = [];
  for (const line of body.split('\n')) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) {
      if (currentHeading) {
        sections[currentHeading] = currentLines.join('\n').trim();
      }
      currentHeading = m[1].trim();
      currentLines = [];
    } else if (currentHeading) {
      currentLines.push(line);
    }
  }
  if (currentHeading) {
    sections[currentHeading] = currentLines.join('\n').trim();
  }

  return {
    path: filePath,
    id: fm.id,
    title: fm.title,
    status: fm.status,
    owner: fm.owner,
    deps: Array.isArray(fm.deps) ? fm.deps : (fm.deps ? [fm.deps] : []),
    created: fm.created,
    frontmatter: fm,
    body,
    sections,
    errors
  };
}

/**
 * Validate a parsed story. Returns findings.
 */
function validateStory(story) {
  const findings = [];

  if (story.errors && story.errors.length > 0) {
    for (const e of story.errors) {
      findings.push({ severity: 'error', kind: e, message: e });
    }
    return findings;
  }

  if (!story.id) {
    findings.push({ severity: 'error', kind: 'missing-id', message: 'STORY missing `id` in frontmatter' });
  } else if (!isValidId(story.id)) {
    findings.push({
      severity: 'error',
      kind: 'invalid-id-format',
      message: `STORY id "${story.id}" does not match STORY-{slug}-NNN pattern`
    });
  }
  if (!story.title) {
    findings.push({ severity: 'error', kind: 'missing-title', message: 'STORY missing `title`' });
  }
  if (!story.status) {
    findings.push({ severity: 'error', kind: 'missing-status', message: 'STORY missing `status`' });
  } else if (!VALID_STATUSES.includes(story.status)) {
    findings.push({
      severity: 'error',
      kind: 'invalid-status',
      message: `Status "${story.status}" not one of ${VALID_STATUSES.join(', ')}`
    });
  }
  if (!story.owner) {
    findings.push({ severity: 'warning', kind: 'missing-owner', message: 'STORY missing `owner` field' });
  }

  // User Story section format
  if (!story.sections || !story.sections['User Story']) {
    findings.push({
      severity: 'warning',
      kind: 'missing-user-story',
      message: 'STORY missing `## User Story` section'
    });
  } else {
    const us = story.sections['User Story'];
    if (!USER_STORY_PATTERN.test(us)) {
      findings.push({
        severity: 'warning',
        kind: 'user-story-format',
        message: 'User Story does not match "As a X, I want Y so that Z" format'
      });
    }
  }

  // Acceptance Criteria
  if (!story.sections || !story.sections['Acceptance Criteria']) {
    findings.push({
      severity: 'warning',
      kind: 'missing-acceptance',
      message: 'STORY missing `## Acceptance Criteria` section'
    });
  }

  return findings;
}

/**
 * List all stories with summary fields.
 */
function listStories(projectRoot) {
  const files = findStoryFiles(projectRoot);
  return files.map(f => {
    const story = parseStory(f);
    return {
      id: story.id,
      title: story.title,
      status: story.status,
      owner: story.owner,
      deps: story.deps || [],
      path: f
    };
  });
}

function listByStatus(projectRoot, status) {
  return listStories(projectRoot).filter(s => s.status === status);
}

/**
 * Detect dep cycles.
 */
function detectDepCycles(projectRoot) {
  const stories = listStories(projectRoot);
  const byId = {};
  for (const s of stories) byId[s.id] = s;
  const visited = new Set();
  const stack = new Set();
  const cycles = [];
  function dfs(id, path) {
    if (stack.has(id)) {
      cycles.push([...path, id]);
      return;
    }
    if (visited.has(id)) return;
    visited.add(id);
    stack.add(id);
    const s = byId[id];
    if (s && s.deps) {
      for (const dep of s.deps) {
        if (byId[dep]) dfs(dep, [...path, id]);
      }
    }
    stack.delete(id);
  }
  for (const s of stories) dfs(s.id, []);
  return cycles;
}

/**
 * Update story status (writes back to file).
 */
function setStatus(filePath, newStatus) {
  if (!VALID_STATUSES.includes(newStatus)) {
    throw new Error(`invalid status: ${newStatus}`);
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  const updated = raw.replace(/^status:\s*\w+/m, `status: ${newStatus}`);
  fs.writeFileSync(filePath, updated);
  return { path: filePath, newStatus };
}

module.exports = {
  parseStory,
  validateStory,
  findStoryFiles,
  listStories,
  listByStatus,
  detectDepCycles,
  setStatus,
  isValidId,
  storiesDir,
  VALID_STATUSES,
  ID_PATTERN,
  USER_STORY_PATTERN
};
