/**
 * Advisory prose scanner used by `godpowers lint` on PLAN.md and DECISIONS.md.
 * Input is inert text; output is an ordered list of findings. The rules match
 * sentence patterns, not standalone words, and never block anything.
 */

const RULES = [
  {
    id: 'filler',
    re: /\b(?:it is important to note that|it should be noted that|it is worth noting that|needless to say|at the end of the day|in today'?s fast-paced world)\b/gi,
    message: 'Filler pattern delays the claim without adding evidence or a decision.',
    suggestion: 'Remove the setup and state the concrete claim directly.'
  },
  {
    id: 'vague-attribution',
    re: /\b(?:experts agree|studies show|research suggests|industry observers say|many believe|it is widely believed|according to (?:some|many|various) (?:reports|experts|observers|sources))\b/gi,
    message: 'Vague-attribution pattern makes a claim without naming the source or evidence.',
    suggestion: 'Name the source and result, or state the claim as a hypothesis.'
  },
  {
    id: 'stacked-hedging',
    match: matchStackedHedging,
    message: 'Stacked-hedging pattern obscures whether the sentence is a claim or an open question.',
    suggestion: 'Keep one necessary uncertainty marker and name the evidence that would settle it.'
  },
  {
    id: 'stock-framing',
    re: /\b(?:game-changing|revolutionary|cutting-edge|world-class|best-in-class|next-generation)\s+(?:solution|platform|experience|capabilit(?:y|ies)|technology|tool|system|approach|workflow|product)\b/gi,
    message: 'Stock-framing pattern praises a generic offering without an observable differentiator.',
    suggestion: 'Replace the promotional frame with a named mechanism and verified effect.'
  },
  {
    id: 'inflated-phrasing',
    match: matchInflatedPhrasing,
    message: 'Inflated-phrasing pattern uses an indirect construction where a direct verb would be clearer.',
    suggestion: 'Use the direct verb and keep the same factual commitment.'
  },
  {
    id: 'empty-conclusion',
    re: /\b(?:this (?:highlights the importance of|underscores the need for|demonstrates the (?:power|value|importance) of)|overall,\s+this is a significant step forward|ultimately,\s+this paves the way for)\b/gi,
    message: 'Empty-conclusion pattern announces significance without naming a result or next action.',
    suggestion: 'State the observed result, decision, or next action instead.'
  },
  {
    id: 'dense-sentence',
    match: matchDenseSentence,
    message: 'Dense-sentence pattern combines many clauses with vague referents, making the action unclear.',
    suggestion: 'Split the sentence and name the actor, mechanism, and observable result.'
  }
];

function matchStackedHedging(line) {
  const hedge = /\b(?:may|might|could|perhaps|possibly|likely|seems?|appears?|potentially|maybe)\b/gi;
  const matches = [...line.matchAll(hedge)];
  return matches.length >= 3 ? matches[0] : null;
}

function matchDenseSentence(line) {
  const words = line.match(/[A-Za-z0-9][A-Za-z0-9'-]*/g) || [];
  if (words.length < 45) return null;
  const connectors = line.match(/\b(?:which|while|although|because|whereas|despite|thereby|that|when|how)\b/gi) || [];
  if (connectors.length < 4) return null;
  if (!/\b(?:this|it|they|thing|things|outcome|outcomes|way|ways)\b/i.test(line)) return null;
  const index = line.search(/\S/);
  return index === -1 ? null : { 0: line.slice(index), index };
}

function matchInflatedPhrasing(line) {
  const indirect = /\b(?:is able to|has the ability to|serves to|in order to|functions as a way to)\b/i.exec(line);
  if (indirect) return indirect;
  return /^\s*(?:[-*]\s*)?(?:\[[^\]]+\]\s*)?(the fact that\b.*\b(?:is|was|remains)\s+(?:important|meaningful|significant|notable)\b)/i.exec(line);
}

function spaces(text) {
  return ' '.repeat(text.length);
}

function leadingIndent(line) {
  let index = 0;
  let columns = 0;
  while (index < line.length) {
    if (line[index] === ' ') {
      columns++;
      index++;
      continue;
    }
    if (line[index] === '\t') {
      columns += 4 - (columns % 4);
      index++;
      continue;
    }
    break;
  }
  return { columns, index };
}

function maskInlineCode(line) {
  const masked = line.split('');
  const runs = [];
  let cursor = 0;
  while (cursor < line.length) {
    if (line[cursor] !== '`') {
      cursor++;
      continue;
    }
    const start = cursor;
    while (cursor < line.length && line[cursor] === '`') cursor++;
    runs.push({ start, end: cursor, length: cursor - start });
  }

  const nextSameLength = new Array(runs.length).fill(-1);
  const nextByLength = new Map();
  for (let index = runs.length - 1; index >= 0; index--) {
    const run = runs[index];
    if (nextByLength.has(run.length)) nextSameLength[index] = nextByLength.get(run.length);
    nextByLength.set(run.length, index);
  }

  let runIndex = 0;
  while (runIndex < runs.length) {
    const closerIndex = nextSameLength[runIndex];
    if (closerIndex === -1) {
      runIndex++;
      continue;
    }
    const opener = runs[runIndex];
    const closer = runs[closerIndex];
    for (let index = opener.start; index < closer.end; index++) masked[index] = ' ';
    runIndex = closerIndex + 1;
  }
  return masked.join('');
}

function maskLinkDestinations(line) {
  return line.replace(/\]\((?:[^()\\]|\\.)*\)/g, (destination) => {
    return ']' + spaces(destination.slice(1));
  });
}

function maskedLines(text) {
  const lines = text.split('\n');
  const masked = [];
  const frontmatterEnd = lines[0] && /^\uFEFF?---[ \t]*\r?$/.test(lines[0])
    ? lines.findIndex((line, index) => index > 0 && /^---[ \t]*\r?$/.test(line))
    : -1;
  let inFrontmatter = frontmatterEnd > 0;
  let fence = null;
  let badExampleIndent = null;

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const parseLine = line.endsWith('\r') ? line.slice(0, -1) : line;
    const trimmed = parseLine.trim();

    if (inFrontmatter) {
      masked.push(spaces(line));
      if (index === frontmatterEnd) {
        inFrontmatter = false;
      }
      continue;
    }

    const indentation = leadingIndent(parseLine);
    const content = parseLine.slice(indentation.index);

    if (fence !== null) {
      const closingFenceMatch = indentation.columns <= 3
        ? content.match(/^(`{3,}|~{3,})[ \t]*$/)
        : null;
      if (closingFenceMatch && closingFenceMatch[1][0] === fence.character &&
        closingFenceMatch[1].length >= fence.length) {
        fence = null;
      }
      masked.push(spaces(line));
      continue;
    }

    if (indentation.columns >= 4 && /^(?:`{3,}|~{3,})/.test(content)) {
      masked.push(spaces(line));
      continue;
    }

    const fenceMatch = indentation.columns <= 3
      ? content.match(/^(`{3,}|~{3,})(.*)$/)
      : null;
    if (fenceMatch && !(fenceMatch[1][0] === '`' && fenceMatch[2].includes('`'))) {
      fence = { character: fenceMatch[1][0], length: fenceMatch[1].length };
      masked.push(spaces(line));
      continue;
    }

    const indent = (line.match(/^\s*/) || [''])[0].length;
    const badMarker = /^\s*(?:[-*>]\s*)?\*{0,2}(?:bad|avoid|wrong)(?:\s+example)?\*{0,2}(?:\s*\([^)]*\))?\s*:/i.test(line);
    if (badMarker) {
      badExampleIndent = indent;
      masked.push(spaces(line));
      continue;
    }
    if (badExampleIndent !== null) {
      if (!trimmed) {
        badExampleIndent = null;
      } else if (indent > badExampleIndent) {
        masked.push(spaces(line));
        continue;
      } else {
        badExampleIndent = null;
      }
    }

    masked.push(maskLinkDestinations(maskInlineCode(line)));
  }

  return masked;
}

function firstMatch(rule, line) {
  if (rule.match) return rule.match(line);
  rule.re.lastIndex = 0;
  return rule.re.exec(line);
}

function excerpt(line) {
  const safe = line.replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ');
  const compact = safe.trim().replace(/\s+/g, ' ');
  return compact.length <= 160 ? compact : compact.slice(0, 157) + '...';
}

function scan(text) {
  const source = String(text == null ? '' : text);
  if (!source) return [];
  const original = source.split('\n');
  const masked = maskedLines(source);
  const findings = [];

  for (let lineIndex = 0; lineIndex < masked.length; lineIndex++) {
    const line = masked[lineIndex];
    for (let ruleIndex = 0; ruleIndex < RULES.length; ruleIndex++) {
      const rule = RULES[ruleIndex];
      const match = firstMatch(rule, line);
      if (!match) continue;
      findings.push({
        ruleId: rule.id,
        line: lineIndex + 1,
        column: match.index + 1,
        excerpt: excerpt(original[lineIndex]),
        message: rule.message,
        suggestion: rule.suggestion,
        _ruleIndex: ruleIndex
      });
    }
  }

  findings.sort((left, right) => {
    return left.line - right.line || left.column - right.column || left._ruleIndex - right._ruleIndex;
  });
  return findings.map(({ _ruleIndex, ...finding }) => finding);
}

module.exports = {
  RULES,
  scan
};
