/**
 * Context Writer
 *
 * Manages the fenced "Godpowers" section in project-level AI instruction
 * files (AGENTS.md, CLAUDE.md, GEMINI.md, .cursor/rules/, .windsurfrules,
 * .github/copilot-instructions.md, .clinerules).
 *
 * Rules:
 *   - AGENTS.md is canonical; the others are 1-line pointers when their
 *     tool's config dir is detected.
 *   - Never blind-overwrite. Use a fenced section the user can recognize
 *     and remove.
 *   - Idempotent. Running twice produces the same file.
 *   - Detect-then-write. Don't litter projects with files for tools the
 *     user isn't using.
 *
 * Fence format:
 *
 *   <!-- godpowers:begin -->
 *   ... managed content ...
 *   <!-- godpowers:end -->
 */

const fs = require('fs');
const path = require('path');

const FENCE_BEGIN = '<!-- godpowers:begin -->';
const FENCE_END = '<!-- godpowers:end -->';

/**
 * Detect which AI tools are configured in the project.
 * Returns an array of platform descriptors.
 */
function detectInstalledTools(projectRoot) {
  const detected = [];

  const checks = [
    { tool: 'claude-code', signal: '.claude', target: 'CLAUDE.md', kind: 'pointer' },
    { tool: 'gemini', signal: '.gemini', target: 'GEMINI.md', kind: 'pointer' },
    { tool: 'gemini', signal: 'GEMINI.md', target: 'GEMINI.md', kind: 'pointer' },
    { tool: 'cursor', signal: '.cursor', target: '.cursor/rules/godpowers.mdc', kind: 'pointer' },
    { tool: 'cursor', signal: '.cursorrules', target: '.cursorrules', kind: 'pointer' },
    { tool: 'windsurf', signal: '.windsurf', target: '.windsurf/rules/godpowers.md', kind: 'pointer' },
    { tool: 'windsurf', signal: '.windsurfrules', target: '.windsurfrules', kind: 'pointer' },
    { tool: 'copilot', signal: '.github/copilot-instructions.md', target: '.github/copilot-instructions.md', kind: 'pointer' },
    { tool: 'cline', signal: '.clinerules', target: '.clinerules', kind: 'pointer' },
    { tool: 'roo', signal: '.roo', target: '.roo/rules/godpowers.md', kind: 'pointer' },
    { tool: 'continue', signal: '.continue', target: '.continue/rules/godpowers.md', kind: 'pointer' },
    // Pi (earendil-works/pi-coding-agent): reads AGENTS.md and CLAUDE.md
    // as context files (already written via canonical AGENTS.md target),
    // but also has its own project-local skills convention at .pi/skills/
    { tool: 'pi', signal: '.pi', target: '.pi/skills/godpowers.md', kind: 'pointer' },
    // .agents/skills/ is the cross-tool Agent Skills standard path used
    // by Pi, Codex, and others; we write a pointer here when detected
    { tool: 'agent-skills', signal: '.agents', target: '.agents/skills/godpowers.md', kind: 'pointer' }
  ];

  const seen = new Set();
  for (const c of checks) {
    if (seen.has(c.tool)) continue;
    if (fs.existsSync(path.join(projectRoot, c.signal))) {
      detected.push({ tool: c.tool, target: c.target, kind: c.kind });
      seen.add(c.tool);
    }
  }
  return detected;
}

/**
 * Build the canonical Godpowers section content from project state.
 * Keeps it short (the file is loaded into every AI prompt for some tools).
 */
function buildCanonicalContent(state, opts = {}) {
  const lines = [];
  lines.push('## Godpowers project');
  lines.push('');
  lines.push('This project uses Godpowers. The on-disk state is the source of truth;');
  lines.push('conversation memory is not.');
  lines.push('');

  const projectName = (state && state.project && state.project.name) || opts.projectName || '(unnamed)';
  const mode = (state && (state.mode || (state.project && state.project.mode))) || opts.mode || 'unknown';
  const scale = (state && (state.scale || (state.project && state.project.scale))) || opts.scale || 'unknown';
  lines.push(`- Project: ${projectName}`);
  lines.push(`- Mode: ${mode}    Scale: ${scale}`);
  lines.push('- State: `.godpowers/state.json` is authority; `.godpowers/PROGRESS.mdx` is generated for humans');
  lines.push('');

  lines.push('### Quarterback rule');
  lines.push('');
  lines.push('There is exactly one orchestrator: `god-orchestrator`. It owns writes to');
  lines.push('`state.json`, `intent.yaml`, and `events.jsonl`; `PROGRESS.mdx` is regenerated from state. Skills like');
  lines.push('`/god`, `/god-next`, `/god-status` read state without writing.');
  lines.push('');

  lines.push('### Useful commands');
  lines.push('');
  lines.push('- `/god-status` - re-derive state from disk');
  lines.push('- `/god-next` - what to run next, with reason');
  lines.push('- `/god-mode` - run the full autonomous project run');
  lines.push('- `/god-sync` - refresh artifacts, context, and source-system sync-back');
  lines.push('- `/god-migrate` - import or sync legacy planning, BMAD, or Superpowers context');
  lines.push('- `/god-context refresh` - refresh AI-tool awareness for this project');
  lines.push('');

  // Pointers to design and product files when present
  const designExists = require('fs').existsSync(require('path').join(opts.projectRoot || process.cwd(), 'DESIGN.md'));
  const productExists = require('fs').existsSync(require('path').join(opts.projectRoot || process.cwd(), 'PRODUCT.md'));
  if (designExists || productExists) {
    lines.push('### Design files');
    lines.push('');
    if (productExists) lines.push('- `PRODUCT.md` - strategic register, brand personality, anti-references');
    if (designExists) lines.push('- `DESIGN.md` - visual tokens (Google Labs design.md format) + rationale');
    lines.push('');
  }

  // Linkage status if known
  if (state && state.linkage) {
    const rawCoverage = Number(state.linkage['coverage-pct']) || 0;
    const cov = rawCoverage > 1 ? rawCoverage : rawCoverage * 100;
    if (cov > 0 || state.linkage['orphan-count'] > 0 || state.linkage['drift-count'] > 0) {
      lines.push('### Linkage status');
      lines.push('');
      lines.push(`- Coverage: ${cov.toFixed(0)}%`);
      if (state.linkage['orphan-count']) lines.push(`- Orphans: ${state.linkage['orphan-count']}`);
      if (state.linkage['drift-count']) lines.push(`- Drift: ${state.linkage['drift-count']}`);
      if (state.linkage['review-required-items']) lines.push(`- Pending reviews: ${state.linkage['review-required-items']}`);
      lines.push('');
    }
  }

  // Optional active artifacts list (filled in as tiers complete)
  if (state && state.tiers) {
    const active = [];
    for (const tierKey of Object.keys(state.tiers)) {
      const tier = state.tiers[tierKey];
      for (const subKey of Object.keys(tier)) {
        const sub = tier[subKey];
        if (sub && sub.status === 'done' && sub.artifact) {
          active.push(`${subKey}: \`${sub.artifact}\``);
        }
      }
    }
    if (active.length > 0) {
      lines.push('### Active artifacts');
      lines.push('');
      for (const a of active) lines.push(`- ${a}`);
      lines.push('');
    }
  }

  lines.push('See `.godpowers/state.json` for authority and `.godpowers/PROGRESS.mdx` for the generated tier table.');
  return lines.join('\n');
}

/**
 * Build the pointer content for non-canonical files (CLAUDE.md, GEMINI.md, etc.).
 * One line that defers to AGENTS.md.
 */
function buildPointerContent(canonicalRelPath = 'AGENTS.md') {
  return `## Godpowers project\n\nThis project uses Godpowers. See \`${canonicalRelPath}\` for the project context.`;
}

/**
 * Read a file, find the fenced section if present, return:
 *   { exists, before, fenced, after }
 *
 * If no file exists, returns { exists: false, before: '', fenced: '', after: '' }.
 * If file exists but has no fence, returns the whole file in `before`.
 */
function readFenced(filePath) {
  if (!fs.existsSync(filePath)) {
    return { exists: false, before: '', fenced: '', after: '' };
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const beginIdx = content.indexOf(FENCE_BEGIN);
  const endIdx = content.indexOf(FENCE_END);
  if (beginIdx === -1 || endIdx === -1 || endIdx < beginIdx) {
    return { exists: true, before: content, fenced: '', after: '' };
  }
  return {
    exists: true,
    before: content.slice(0, beginIdx),
    fenced: content.slice(beginIdx + FENCE_BEGIN.length, endIdx),
    after: content.slice(endIdx + FENCE_END.length)
  };
}

/**
 * Write a fenced section to a file. Idempotent. Preserves user content
 * outside the fence.
 *
 * Args:
 *   filePath - absolute path to target file
 *   sectionContent - markdown body to put inside the fence (no fence markers)
 */
function writeFenced(filePath, sectionContent) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const parsed = readFenced(filePath);
  const fencedBlock = `${FENCE_BEGIN}\n${sectionContent}\n${FENCE_END}`;

  let next;
  if (!parsed.exists) {
    next = `${fencedBlock}\n`;
  } else if (parsed.fenced === '') {
    // No fence yet. Append to end with a blank line separator.
    const sep = parsed.before.endsWith('\n') ? '\n' : '\n\n';
    next = `${parsed.before}${sep}${fencedBlock}\n`;
  } else {
    // Replace existing fence.
    next = `${parsed.before}${fencedBlock}${parsed.after}`;
  }
  fs.writeFileSync(filePath, next);
  return { written: filePath, hadFenceBefore: parsed.fenced !== '' };
}

/**
 * Remove the Godpowers fence from a file. Leaves the rest untouched. If only
 * the fence remained, an auto-generated pointer file is deleted; with
 * { preserveFile: true } the file is emptied instead of deleted (used for the
 * canonical AGENTS.md so the off-switch never removes the user's primary file).
 */
function removeFenced(filePath, opts = {}) {
  if (!fs.existsSync(filePath)) return { removed: false, reason: 'missing' };
  const parsed = readFenced(filePath);
  if (parsed.fenced === '') return { removed: false, reason: 'no-fence' };
  let remaining = `${parsed.before}${parsed.after}`.replace(/\n{3,}/g, '\n\n').trim();
  if (remaining === '') {
    if (opts.preserveFile) {
      fs.writeFileSync(filePath, '');
      return { removed: true, fileDeleted: false, emptied: true };
    }
    fs.unlinkSync(filePath);
    return { removed: true, fileDeleted: true };
  }
  fs.writeFileSync(filePath, remaining + '\n');
  return { removed: true, fileDeleted: false };
}

/**
 * Detect existing fence in a file.
 */
function hasFence(filePath) {
  return readFenced(filePath).fenced !== '';
}

/**
 * Plan what would be written for a given project.
 * Returns:
 *   { canonical: { path, content }, pointers: [{ tool, path, content }] }
 *
 * Always plans AGENTS.md as canonical. Pointers are only planned for tools
 * detected via `detectInstalledTools`.
 */
function plan(projectRoot, state, opts = {}) {
  const canonicalPath = path.join(projectRoot, 'AGENTS.md');
  const canonical = {
    path: canonicalPath,
    content: buildCanonicalContent(state, opts)
  };

  const pointers = [];
  const detected = detectInstalledTools(projectRoot);
  for (const d of detected) {
    pointers.push({
      tool: d.tool,
      path: path.join(projectRoot, d.target),
      content: buildPointerContent('AGENTS.md')
    });
  }
  return { canonical, pointers };
}

/**
 * Apply a plan: write AGENTS.md and any detected-tool pointers.
 * Returns a list of write results.
 */
function apply(projectRoot, state, opts = {}) {
  const p = plan(projectRoot, state, opts);
  const results = [];
  results.push(writeFenced(p.canonical.path, p.canonical.content));
  for (const ptr of p.pointers) {
    results.push({ ...writeFenced(ptr.path, ptr.content), tool: ptr.tool });
  }
  return results;
}

/**
 * Remove all Godpowers fences from canonical + pointers (off-switch).
 */
function clearAll(projectRoot) {
  // The canonical AGENTS.md is the user's primary context file: empty it rather
  // than delete it. The remaining targets are auto-generated pointer files that
  // Godpowers owns outright, so they are deleted when only the fence remains.
  const canonical = path.join(projectRoot, 'AGENTS.md');
  const pointers = [
    path.join(projectRoot, 'CLAUDE.md'),
    path.join(projectRoot, 'GEMINI.md'),
    path.join(projectRoot, '.cursorrules'),
    path.join(projectRoot, '.cursor', 'rules', 'godpowers.mdc'),
    path.join(projectRoot, '.windsurfrules'),
    path.join(projectRoot, '.windsurf', 'rules', 'godpowers.md'),
    path.join(projectRoot, '.github', 'copilot-instructions.md'),
    path.join(projectRoot, '.clinerules'),
    path.join(projectRoot, '.roo', 'rules', 'godpowers.md'),
    path.join(projectRoot, '.continue', 'rules', 'godpowers.md'),
    path.join(projectRoot, '.pi', 'skills', 'godpowers.md'),
    path.join(projectRoot, '.agents', 'skills', 'godpowers.md')
  ];
  const results = [];
  const rc = removeFenced(canonical, { preserveFile: true });
  if (rc.removed) results.push({ path: canonical, ...rc });
  for (const t of pointers) {
    const r = removeFenced(t);
    if (r.removed) results.push({ path: t, ...r });
  }
  return results;
}

/**
 * Status report: which targets have fences, which don't, what tools detected.
 */
function status(projectRoot) {
  const canonicalPath = path.join(projectRoot, 'AGENTS.md');
  const canonical = {
    path: canonicalPath,
    exists: fs.existsSync(canonicalPath),
    hasFence: fs.existsSync(canonicalPath) ? hasFence(canonicalPath) : false
  };
  const detected = detectInstalledTools(projectRoot);
  const pointers = detected.map(d => {
    const p = path.join(projectRoot, d.target);
    return {
      tool: d.tool,
      path: p,
      exists: fs.existsSync(p),
      hasFence: fs.existsSync(p) ? hasFence(p) : false
    };
  });
  return { canonical, pointers, detected };
}

module.exports = {
  FENCE_BEGIN,
  FENCE_END,
  detectInstalledTools,
  buildCanonicalContent,
  buildPointerContent,
  readFenced,
  writeFenced,
  removeFenced,
  hasFence,
  plan,
  apply,
  clearAll,
  status
};
