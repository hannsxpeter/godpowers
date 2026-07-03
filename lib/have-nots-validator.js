/**
 * Have-Nots Validator
 *
 * Registry of mechanical checks against the 157 named have-nots from
 * references/HAVE-NOTS.md. Each check returns structured findings:
 *
 *   { code, severity: 'error'|'warning'|'info', line, column, message, suggestion }
 *
 * Universal checks apply to all artifacts. Per-artifact checks apply only
 * when the linter is given a typed artifact (e.g., 'prd', 'arch').
 *
 * Source of truth for which have-nots are mechanical:
 *
 *   U-08 em/en dash             mechanical (regex)
 *   U-09 emoji                  mechanical (unicode regex)
 *   U-02 unlabeled sentence     mechanical (sentence scan + label check)
 *   U-10 phantom reference      mechanical (link scan + filesystem check)
 *   U-11 future-dated timestamp mechanical (date parse vs today)
 *   P-04 metric without timeline  mechanical (metric + time-word scan)
 *   P-05 metric without method     mechanical (metric + measurement-word)
 *   P-07 no-gos empty               mechanical (section presence)
 *   P-08 open-q without owner       mechanical (table column scan)
 *   P-09 open-q without due date    mechanical (table column scan)
 *   A-04 NFR not mapped              mechanical (PRD NFR vs ARCH map)
 *   DG-01 term without avoid aliases mechanical (term block scan)
 *   DG-02 implementation detail      partial mechanical (technical-word scan)
 *   DG-03 ambiguity owner/due        mechanical (section scan)
 *   DG-04 relationship undefined     mechanical (bold term cross-check)
 *   DG-05 behavior definition        partial mechanical (verb scan)
 *
 * Substitution test (U-01) is a partial mechanical check: flags sentences
 * containing only generic nouns ('users', 'developers', 'scalable',
 * 'robust', 'modern', 'intuitive', 'seamless') without specific
 * quantifiers or proper nouns.
 */

const fs = require('fs');
const path = require('path');

const GENERIC_NOUNS = [
  'users', 'developers', 'teams', 'people', 'customers',
  'scalable', 'robust', 'modern', 'intuitive', 'seamless',
  'best-in-class', 'world-class', 'next-generation', 'cutting-edge',
  'simple', 'easy', 'fast', 'powerful'
];

const LABEL_TAGS = ['DECISION', 'HYPOTHESIS', 'OPEN QUESTION', 'OPEN-QUESTION'];

/**
 * Find all line/column positions for a given regex match in content.
 * Returns array of { line, column } objects (1-indexed).
 */
function findPositions(content, regex) {
  const positions = [];
  const lines = content.split('\n');
  // Compile once and reuse across lines (PERF-001); reset lastIndex per line so
  // matching is identical to a fresh per-line regex.
  const flags = regex.flags.includes('g') ? regex.flags : regex.flags + 'g';
  const localRegex = new RegExp(regex.source, flags);
  for (let i = 0; i < lines.length; i++) {
    localRegex.lastIndex = 0;
    let match;
    while ((match = localRegex.exec(lines[i])) !== null) {
      positions.push({ line: i + 1, column: match.index + 1, matched: match[0] });
    }
  }
  return positions;
}

// ============================================================================
// Universal checks (apply to all artifacts)
// ============================================================================

/** U-08: em or en dash present */
function checkEmEnDash(content) {
  const findings = [];
  const positions = findPositions(content, /[\u2013\u2014]/g);
  for (const p of positions) {
    findings.push({
      code: 'U-08',
      severity: 'error',
      line: p.line,
      column: p.column,
      message: `Em or en dash detected ("${p.matched}"). Use comma, colon, semicolon, parentheses, or hyphen instead.`,
      suggestion: 'Replace with appropriate ASCII punctuation.'
    });
  }
  return findings;
}

/** U-09: emoji present */
function checkEmoji(content) {
  const findings = [];
  // Common emoji ranges. Excludes basic punctuation and arrows that have
  // legitimate documentation use.
  const emojiRanges = /[\u{1F300}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  const positions = findPositions(content, emojiRanges);
  for (const p of positions) {
    findings.push({
      code: 'U-09',
      severity: 'error',
      line: p.line,
      column: p.column,
      message: `Decorative emoji "${p.matched}" detected.`,
      suggestion: 'Use words or icon library symbols instead.'
    });
  }
  return findings;
}

/** U-02: unlabeled paragraph (paragraph-aware) */
function checkUnlabeled(content, opts = {}) {
  const findings = [];
  const lines = content.split('\n');
  let inCodeBlock = false;
  let paragraph = [];
  let paragraphStartLine = -1;

  function flushParagraph() {
    if (paragraph.length === 0) return;
    const text = paragraph.join(' ').trim();
    paragraph = [];
    if (!text || text.length < 50) return;
    // Skip intro lines that end with a colon (likely list/section preamble)
    if (text.endsWith(':')) return;
    // If the paragraph contains ANY label tag, accept the whole paragraph
    const hasLabel = LABEL_TAGS.some(tag => text.includes(`[${tag}]`));
    if (hasLabel) return;
    findings.push({
      code: 'U-02',
      severity: 'warning',
      line: paragraphStartLine,
      column: 1,
      message: `Unlabeled paragraph: "${text.slice(0, 80)}${text.length > 80 ? '...' : ''}"`,
      suggestion: 'Tag with [DECISION], [HYPOTHESIS], or [OPEN QUESTION].'
    });
  }

  let inBulletContext = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      flushParagraph();
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    // Bullet starts a bullet context (which absorbs indented continuation)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('- [')) {
      flushParagraph();
      inBulletContext = true;
      continue;
    }

    // Indented continuation under a bullet stays in the bullet
    const isIndented = /^\s+\S/.test(line);
    if (inBulletContext && isIndented) {
      continue;
    }

    // Lines that break paragraphs
    const isBreak =
      !trimmed ||
      trimmed.startsWith('#') ||
      trimmed.startsWith('>') ||
      trimmed.startsWith('|') ||
      trimmed.startsWith('---') ||
      trimmed.startsWith('===') ||
      trimmed.startsWith('<') ||
      /^\d+\.\s/.test(trimmed);

    if (isBreak) {
      flushParagraph();
      inBulletContext = false;
      continue;
    }

    // Non-indented content line ends bullet context
    inBulletContext = false;

    // Continuation or start of a paragraph
    if (paragraph.length === 0) paragraphStartLine = i + 1;
    paragraph.push(trimmed);
  }
  flushParagraph();
  return findings;
}

/** U-10: phantom reference (link to file that does not exist) */
function checkPhantomRef(content, opts = {}) {
  const findings = [];
  const projectRoot = opts.projectRoot || process.cwd();
  const docDir = opts.docDir || projectRoot;
  // Match markdown links: [text](path) where path doesn't start with http
  const linkRegex = /\[[^\]]+\]\(([^)]+)\)/g;
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    let match;
    const localRegex = new RegExp(linkRegex.source, 'g');
    while ((match = localRegex.exec(lines[i])) !== null) {
      const ref = match[1].split('#')[0]; // strip anchor
      if (!ref || ref.startsWith('http') || ref.startsWith('mailto:')) continue;
      const resolved = path.isAbsolute(ref) ? ref : path.resolve(docDir, ref);
      if (!fs.existsSync(resolved)) {
        // Try project root resolution
        const altResolved = path.resolve(projectRoot, ref);
        if (!fs.existsSync(altResolved)) {
          findings.push({
            code: 'U-10',
            severity: 'warning',
            line: i + 1,
            column: match.index + 1,
            message: `Phantom reference: link target "${ref}" does not exist.`,
            suggestion: 'Fix the link or create the referenced file.'
          });
        }
      }
    }
  }
  return findings;
}

/** U-11: future-dated timestamp */
function checkFutureDate(content, opts = {}) {
  const findings = [];
  const today = opts.today ? new Date(opts.today) : new Date();
  // Match ISO-like dates: 2026-05-10, 2026-12-31
  const dateRegex = /\b(20\d{2})-(\d{2})-(\d{2})\b/g;
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    let match;
    while ((match = dateRegex.exec(lines[i])) !== null) {
      const [full, year, month, day] = match;
      const parsed = new Date(`${year}-${month}-${day}`);
      if (isNaN(parsed.getTime())) continue;
      // Allow due-date columns to be future (those are intentional)
      // Heuristic: if the line contains "Due:" or "Owner:" or is in a table, skip
      if (lines[i].includes('Due:') || lines[i].includes('Owner:') || lines[i].trim().startsWith('|')) {
        continue;
      }
      // Future timestamps in body content are suspicious
      const oneYearOut = new Date(today);
      oneYearOut.setFullYear(today.getFullYear() + 1);
      if (parsed > oneYearOut) {
        findings.push({
          code: 'U-11',
          severity: 'warning',
          line: i + 1,
          column: match.index + 1,
          message: `Future-dated timestamp "${full}" (more than a year out) in non-deadline context.`,
          suggestion: 'Verify the date is correct or move to an Open Questions due-date.'
        });
      }
    }
  }
  return findings;
}

/** U-01 (partial): substitution test - flag generic nouns without quantifiers */
function checkSubstitution(content) {
  const findings = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#') || line.startsWith('|') || line.startsWith('- [') || !line) continue;
    // Look for sentences containing only generic nouns and no numbers/proper nouns
    const sentences = line.split(/(?<=[.?!])\s+/);
    for (const s of sentences) {
      if (s.length < 30) continue;
      const lower = s.toLowerCase();
      const hasGeneric = GENERIC_NOUNS.some(g => lower.includes(` ${g} `) || lower.includes(` ${g}.`) || lower.includes(`${g} `));
      const hasNumber = /\d/.test(s);
      const hasProperNoun = /[A-Z][a-z]+ [A-Z]/.test(s); // Two consecutive capitalized words
      if (hasGeneric && !hasNumber && !hasProperNoun) {
        findings.push({
          code: 'U-01',
          severity: 'warning',
          line: i + 1,
          column: 1,
          message: `Possibly generic claim (substitution test risk): "${s.slice(0, 80)}${s.length > 80 ? '...' : ''}"`,
          suggestion: 'Add specific numbers, named users, or proper nouns. Could a competitor say this verbatim?'
        });
      }
    }
  }
  return findings;
}

// ============================================================================
// Per-artifact checks
// ============================================================================

/**
 * Collect bullet items from a section body. Multi-line bullets are joined
 * into a single string. Returns [{ text, startLine }].
 */
function collectBullets(body, sectionStartLine) {
  const lines = body.split('\n');
  const bullets = [];
  let current = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
      if (current) bullets.push(current);
      current = { text: trimmed.replace(/^[-*]\s*/, ''), startLine: sectionStartLine + i };
    } else if (current && trimmed && !/^#/.test(trimmed) && !trimmed.startsWith('|')) {
      // Continuation line (indented or just wrapping)
      current.text += ' ' + trimmed;
    } else if (!trimmed) {
      // Blank line ends the current bullet
      if (current) {
        bullets.push(current);
        current = null;
      }
    } else {
      // Heading or non-list content ends the current bullet
      if (current) {
        bullets.push(current);
        current = null;
      }
    }
  }
  if (current) bullets.push(current);
  return bullets;
}

/** P-04: success metric without timeline */
function checkPrdMetricTimeline(content) {
  const findings = [];
  const successSection = extractSection(content, /^##\s*Success Metrics/im);
  if (!successSection) return findings;

  const timeWords = /(within|by|in|over)\s+\d+\s*(day|days|week|weeks|month|months|year|years)|by\s+(week|day|month|year|Q[1-4])\s*\d+|by\s+\d{4}-\d{2}-\d{2}|by\s+(Q[1-4])/i;
  const bullets = collectBullets(successSection.body, successSection.startLine);
  for (const b of bullets) {
    if (!timeWords.test(b.text)) {
      findings.push({
        code: 'P-04',
        severity: 'error',
        line: b.startLine,
        column: 1,
        message: 'Success metric without timeline (no "within N days/weeks/months" or "by YYYY-MM-DD").',
        suggestion: 'Add a time bound to make the metric measurable.'
      });
    }
  }
  return findings;
}

/** P-05: success metric without measurement method */
function checkPrdMetricMethod(content) {
  const findings = [];
  const successSection = extractSection(content, /^##\s*Success Metrics/im);
  if (!successSection) return findings;

  const methodWords = /(measured|tracked|monitored|via|using)\s+/i;
  const bullets = collectBullets(successSection.body, successSection.startLine);
  for (const b of bullets) {
    if (!methodWords.test(b.text)) {
      findings.push({
        code: 'P-05',
        severity: 'warning',
        line: b.startLine,
        column: 1,
        message: 'Success metric without measurement method.',
        suggestion: 'Specify how it will be measured (e.g., "measured via analytics").'
      });
    }
  }
  return findings;
}

/** P-07: No-Gos section empty */
function checkPrdNoGos(content) {
  const findings = [];
  const noGoSection = extractSection(content, /^##\s*Scope and No-Gos|^##\s*No.?Gos/im);
  if (!noGoSection) {
    findings.push({
      code: 'P-07',
      severity: 'error',
      line: 1,
      column: 1,
      message: 'Missing "Scope and No-Gos" section.',
      suggestion: 'Add a section listing what is explicitly NOT being built.'
    });
    return findings;
  }
  // Check for "explicitly NOT" subsection content. Locate the heading and
  // scan the lines immediately following for at least one bullet item.
  const body = noGoSection.body;
  const lines = body.split('\n');
  let headingIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^###\s.*not\s+in\s+scope/i.test(lines[i])) {
      headingIdx = i;
      break;
    }
  }
  let hasItem = false;
  if (headingIdx !== -1) {
    for (let i = headingIdx + 1; i < lines.length; i++) {
      if (/^###\s/.test(lines[i])) break; // next subsection
      if (/^-\s+\S/.test(lines[i].trim()) || /^\*\s+\S/.test(lines[i].trim())) {
        hasItem = true;
        break;
      }
    }
  } else {
    // No subsection found, accept any list items in body as no-gos
    hasItem = /^[-*]\s+\S/m.test(body);
  }
  if (!hasItem) {
    findings.push({
      code: 'P-07',
      severity: 'error',
      line: noGoSection.startLine,
      column: 1,
      message: 'No-Gos list is empty or missing.',
      suggestion: 'List at least one thing explicitly not being built.'
    });
  }
  return findings;
}

/** P-08, P-09: open questions missing owner or due date */
function checkPrdOpenQuestions(content) {
  const findings = [];
  const oqSection = extractSection(content, /^##\s*Open Questions/im);
  if (!oqSection) return findings;

  const lines = oqSection.body.split('\n');
  // Look for table rows: | Question | Owner | Due Date | Resolution |
  let inTable = false;
  let headerProcessed = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.includes('|')) {
      const cells = line.split('|').map(c => c.trim()).filter(Boolean);
      // Skip header and separator rows
      if (cells.some(c => /^-+$/.test(c))) continue;
      if (!headerProcessed) {
        if (cells.some(c => /question/i.test(c))) {
          headerProcessed = true;
          continue;
        }
      }
      if (headerProcessed && cells.length >= 3) {
        const question = cells[0];
        const owner = cells[1] || '';
        const dueDate = cells[2] || '';
        if (question && /^\[?[A-Z]/.test(question) && question.length > 5) {
          if (!owner || /TBD|^\[/.test(owner)) {
            findings.push({
              code: 'P-08',
              severity: 'error',
              line: oqSection.startLine + i,
              column: 1,
              message: `Open question "${question.slice(0, 50)}" has no named owner.`,
              suggestion: 'Assign a named owner.'
            });
          }
          if (!dueDate || /TBD|^\[/.test(dueDate)) {
            findings.push({
              code: 'P-09',
              severity: 'error',
              line: oqSection.startLine + i,
              column: 1,
              message: `Open question "${question.slice(0, 50)}" has no due date.`,
              suggestion: 'Set a due date. "TBD" is not a date.'
            });
          }
        }
      }
    }
  }
  return findings;
}

/** A-04: NFR not mapped to architectural choice */
function checkArchNfrMap(content, opts = {}) {
  const findings = [];
  const prdContent = opts.prdContent;
  if (!prdContent) return findings; // Cannot cross-check without PRD

  // Find NFR section in PRD
  const prdNfrSection = extractSection(prdContent, /^##\s*Non-Functional Requirements/im);
  if (!prdNfrSection) return findings;

  const archMapSection = extractSection(content, /^##\s*NFR-to-Architecture Map/im);
  if (!archMapSection) {
    findings.push({
      code: 'A-04',
      severity: 'error',
      line: 1,
      column: 1,
      message: 'ARCH missing "NFR-to-Architecture Map" section.',
      suggestion: 'Add a section mapping each PRD NFR to an architectural choice.'
    });
    return findings;
  }

  // Extract category names from PRD NFR table
  const prdLines = prdNfrSection.body.split('\n');
  const nfrCategories = [];
  for (const line of prdLines) {
    if (line.startsWith('|')) {
      const cells = line.split('|').map(c => c.trim()).filter(Boolean);
      if (cells.length >= 2 && !cells.some(c => /^-+$/.test(c)) && !/category/i.test(cells[0])) {
        nfrCategories.push(cells[0]);
      }
    }
  }

  // Check ARCH map mentions each
  const mapBody = archMapSection.body.toLowerCase();
  for (const cat of nfrCategories) {
    if (cat && cat.length > 1 && !mapBody.includes(cat.toLowerCase())) {
      findings.push({
        code: 'A-04',
        severity: 'warning',
        line: archMapSection.startLine,
        column: 1,
        message: `PRD NFR "${cat}" not mapped in ARCH NFR-to-Architecture Map.`,
        suggestion: `Add a row for "${cat}" with the architectural choice that delivers it.`
      });
    }
  }
  return findings;
}

/** DG-01: canonical term without avoided aliases */
function checkDomainAvoidAliases(content) {
  const findings = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = line.match(/^\*\*([^*\]]+)\*\*:\s*(.+)/);
    if (!match) continue;
    const term = match[1].trim();
    if (!term || term.startsWith('[')) continue;
    let hasAvoid = false;
    for (let j = i + 1; j < Math.min(lines.length, i + 5); j++) {
      const next = lines[j].trim();
      if (/^\*\*[^*]+\*\*:/.test(next) || /^#{1,6}\s/.test(next)) break;
      const avoidMatch = next.match(/^_Avoid_:\s*(.+)/i);
      if (avoidMatch && avoidMatch[1].trim() && !avoidMatch[1].includes('[')) {
        hasAvoid = true;
        break;
      }
    }
    if (!hasAvoid) {
      findings.push({
        code: 'DG-01',
        severity: 'warning',
        line: i + 1,
        column: 1,
        message: `Glossary term "${term}" has no avoided aliases listed.`,
        suggestion: 'Add an _Avoid_: line with non-canonical aliases or overloaded words.'
      });
    }
  }
  return findings;
}

/** DG-02: implementation detail in glossary */
function checkDomainImplementationDetails(content) {
  const findings = [];
  const technicalWords = /\b(src\/|lib\/|\.js\b|\.ts\b|\.tsx\b|React|Vue|Svelte|Postgres|MySQL|Redis|Kafka|API endpoint|endpoint|function|class|module|component|database|ORM|queue|HTTP|GraphQL)\b/i;
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (technicalWords.test(line)) {
      findings.push({
        code: 'DG-02',
        severity: 'warning',
        line: i + 1,
        column: 1,
        message: 'Possible implementation detail in domain glossary.',
        suggestion: 'Keep implementation details in PRD, ARCH, STACK, docs, or code-linked artifacts.'
      });
    }
  }
  return findings;
}

/** DG-03: unresolved ambiguity without owner or due date */
function checkDomainAmbiguityOwners(content) {
  const findings = [];
  const section = extractSection(content, /^##\s*Flagged Ambiguities/im);
  if (!section) return findings;
  const lines = section.body.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('-')) continue;
    const lineWithoutLabel = line.replace(/\[OPEN QUESTION\]/g, '');
    if (lineWithoutLabel.includes('[')) continue;
    const isOpen = line.includes('[OPEN QUESTION]') || /\bambigu/i.test(line);
    if (!isOpen) continue;
    if (!/\bOwner:\s*[^.\]]+/i.test(line)) {
      findings.push({
        code: 'DG-03',
        severity: 'error',
        line: section.startLine + i,
        column: 1,
        message: 'Glossary ambiguity has no owner.',
        suggestion: 'Add Owner: [name] to the ambiguity.'
      });
    }
    if (!/\bDue:\s*[^.\]]+/i.test(line)) {
      findings.push({
        code: 'DG-03',
        severity: 'error',
        line: section.startLine + i,
        column: 1,
        message: 'Glossary ambiguity has no due date.',
        suggestion: 'Add Due: [date or command gate] to the ambiguity.'
      });
    }
  }
  return findings;
}

/** DG-04: relationship references undefined canonical term */
function checkDomainRelationshipTerms(content) {
  const findings = [];
  const language = extractSection(content, /^##\s*Language/im);
  const relationships = extractSection(content, /^##\s*Relationships/im);
  if (!language || !relationships) return findings;

  const canonical = new Set();
  const languageLines = language.body.split('\n');
  for (const line of languageLines) {
    const match = line.trim().match(/^\*\*([^*\]]+)\*\*:/);
    if (match && !match[1].startsWith('[')) {
      canonical.add(match[1].trim());
    }
  }

  const relLines = relationships.body.split('\n');
  for (let i = 0; i < relLines.length; i++) {
    const relLineWithoutLabels = relLines[i]
      .replace(/\[DECISION\]/g, '')
      .replace(/\[HYPOTHESIS\]/g, '')
      .replace(/\[OPEN QUESTION\]/g, '');
    if (relLineWithoutLabels.includes('[')) continue;
    const boldTerms = [...relLines[i].matchAll(/\*\*([^*\]]+)\*\*/g)].map(m => m[1].trim());
    for (const term of boldTerms) {
      if (term.startsWith('[')) continue;
      if (!canonical.has(term)) {
        findings.push({
          code: 'DG-04',
          severity: 'warning',
          line: relationships.startLine + i,
          column: 1,
          message: `Relationship references undefined glossary term "${term}".`,
          suggestion: 'Define the term in Language or replace it with a canonical term.'
        });
      }
    }
  }
  return findings;
}

/** DG-05: definition describes behavior instead of identity */
function checkDomainDefinitionBehavior(content) {
  const findings = [];
  const behaviorWords = /\b(handles|processes|manages|stores|renders|calls|sends|receives|creates|updates|deletes|calculates|syncs)\b/i;
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = line.match(/^\*\*([^*\]]+)\*\*:\s*(.+)/);
    if (!match || match[1].startsWith('[')) continue;
    const definition = match[2];
    if (behaviorWords.test(definition)) {
      findings.push({
        code: 'DG-05',
        severity: 'warning',
        line: i + 1,
        column: 1,
        message: `Glossary definition for "${match[1]}" may describe behavior instead of identity.`,
        suggestion: 'Define what the term is in one sentence. Put behavior in PRD, ARCH, or docs.'
      });
    }
  }
  return findings;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extract a markdown section starting at a heading regex.
 * Returns { body, startLine, endLine } or null.
 */
function extractSection(content, headingRegex) {
  const lines = content.split('\n');
  let startIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (headingRegex.test(lines[i])) {
      startIdx = i;
      break;
    }
  }
  if (startIdx === -1) return null;
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) {
      endIdx = i;
      break;
    }
  }
  return {
    body: lines.slice(startIdx + 1, endIdx).join('\n'),
    startLine: startIdx + 1,
    endLine: endIdx
  };
}

// ============================================================================
// Public API
// ============================================================================

const UNIVERSAL_CHECKS = [
  { code: 'U-08', fn: checkEmEnDash },
  { code: 'U-09', fn: checkEmoji },
  { code: 'U-02', fn: checkUnlabeled },
  { code: 'U-10', fn: checkPhantomRef },
  { code: 'U-11', fn: checkFutureDate },
  { code: 'U-01', fn: checkSubstitution }
];

const ARTIFACT_CHECKS = {
  prd: [
    { code: 'P-04', fn: checkPrdMetricTimeline },
    { code: 'P-05', fn: checkPrdMetricMethod },
    { code: 'P-07', fn: checkPrdNoGos },
    { code: 'P-08', fn: checkPrdOpenQuestions },
    { code: 'P-09', fn: checkPrdOpenQuestions }
  ],
  arch: [
    { code: 'A-04', fn: checkArchNfrMap }
  ],
  domain: [
    { code: 'DG-01', fn: checkDomainAvoidAliases },
    { code: 'DG-02', fn: checkDomainImplementationDetails },
    { code: 'DG-03', fn: checkDomainAmbiguityOwners },
    { code: 'DG-04', fn: checkDomainRelationshipTerms },
    { code: 'DG-05', fn: checkDomainDefinitionBehavior }
  ]
};

/**
 * Run all checks for a given artifact.
 * Returns a deduplicated, line-sorted list of findings.
 */
function runChecks(content, artifactType, opts = {}) {
  const findings = [];
  for (const c of UNIVERSAL_CHECKS) {
    findings.push(...c.fn(content, opts));
  }
  if (artifactType && ARTIFACT_CHECKS[artifactType]) {
    const seen = new Set();
    for (const c of ARTIFACT_CHECKS[artifactType]) {
      // Avoid running the same fn twice (P-08 and P-09 share fn)
      if (seen.has(c.fn)) continue;
      seen.add(c.fn);
      findings.push(...c.fn(content, opts));
    }
  }
  // Sort by line number
  findings.sort((a, b) => a.line - b.line);
  // Dedupe identical findings
  const dedup = [];
  const seenKeys = new Set();
  for (const f of findings) {
    const key = `${f.code}:${f.line}:${f.message}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    dedup.push(f);
  }
  return dedup;
}

/**
 * Summary of findings: counts by severity and code.
 */
function summarize(findings) {
  const summary = { errors: 0, warnings: 0, infos: 0, byCode: {} };
  for (const f of findings) {
    summary[f.severity + 's']++;
    summary.byCode[f.code] = (summary.byCode[f.code] || 0) + 1;
  }
  return summary;
}

module.exports = {
  runChecks,
  summarize,
  UNIVERSAL_CHECKS,
  ARTIFACT_CHECKS,
  // Exposed for testing
  checkEmEnDash,
  checkEmoji,
  checkUnlabeled,
  checkPhantomRef,
  checkFutureDate,
  checkSubstitution,
  checkPrdMetricTimeline,
  checkPrdMetricMethod,
  checkPrdNoGos,
  checkPrdOpenQuestions,
  checkArchNfrMap,
  checkDomainAvoidAliases,
  checkDomainImplementationDetails,
  checkDomainAmbiguityOwners,
  checkDomainRelationshipTerms,
  checkDomainDefinitionBehavior,
  extractSection
};
