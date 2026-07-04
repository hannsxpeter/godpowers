/**
 * Voice lint: mechanical detection of sycophancy and gratitude-loop filler.
 *
 * The Voice and Craft contract (references/shared/VOICE.md) forbids gratitude
 * loops and forced engagement, but a prose contract is a Requirement, not a HARD
 * LIMIT: nothing stops the filler from slipping in. This module promotes the
 * objectively-detectable part of that rule to a mechanical gate (have-not U-14).
 * It scans text for a small set of high-precision phrases that are almost always
 * filler in engineering communication, keeping false positives low rather than
 * trying to detect all sycophancy.
 *
 * Used three ways:
 *   - have-not U-14 in lib/have-nots-validator.js (flags generated artifacts),
 *   - a self-dogfood check in scripts/static-check.js (the framework's own
 *     shipped skill and agent prose must not model the filler it forbids),
 *   - a reusable check an agent can run on its own drafted output before sending.
 */

const SYCOPHANCY_PATTERNS = [
  {
    id: 'praise-question',
    // Negative lookahead keeps the compound-noun sense out of the gate: a real
    // doc about a survey app can say "question bank" or "question type" without
    // it reading as praise of the person's question.
    re: /\b(great|good|excellent|fantastic)\s+question(?!\s+(mark|marks|bank|banks|type|types|format|formats|set|sets|pool|pools|paper|papers|generation|difficulty|count|counts|number|numbers|id|ids|text|title))\b/i,
    hint: 'praising the question ("great question")'
  },
  {
    id: 'thanks-for-message',
    re: /\bthank(s| you)\s+(you\s+)?for\s+(reaching out|your (message|question|patience|kind words|time))/i,
    hint: 'thanking the person merely for their message'
  },
  {
    id: 'help-eagerness',
    re: /\b(happy to help|glad to help|glad i could help|more than happy to)\b/i,
    hint: 'help-eagerness filler ("happy to help")'
  },
  {
    id: 'hope-this-helps',
    re: /\bhope (this|that|it) helps\b/i,
    hint: 'hope-this-helps sign-off'
  },
  {
    id: 'forced-engagement',
    re: /\b(let me know if you|feel free to (ask|reach)|do (not|n't) hesitate to|is there anything else (i|you)|reach out if you)\b/i,
    hint: 'soliciting continued engagement'
  }
];

/**
 * Scan text for sycophancy phrases. Pure: text in, findings out. Each finding is
 * { patternId, hint, line, column, phrase }, line and column are 1-indexed.
 */
function scan(text) {
  const findings = [];
  const lines = String(text == null ? '' : text).split('\n');
  for (let i = 0; i < lines.length; i++) {
    for (const pattern of SYCOPHANCY_PATTERNS) {
      // One finding per pattern per line is enough for the gate: repeated filler
      // on a single line is a single offense to fix. Patterns are non-global, so
      // exec starts from 0 every time and scan() stays side-effect-free.
      const match = pattern.re.exec(lines[i]);
      if (match) {
        findings.push({
          patternId: pattern.id,
          hint: pattern.hint,
          line: i + 1,
          column: match.index + 1,
          phrase: match[0]
        });
      }
    }
  }
  return findings;
}

function hasSycophancy(text) {
  return scan(text).length > 0;
}

module.exports = {
  SYCOPHANCY_PATTERNS,
  scan,
  hasSycophancy
};
