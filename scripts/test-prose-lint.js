#!/usr/bin/env node
// Implements: P-MUST-30, P-MUST-31, P-MUST-32, P-MUST-33, P-MUST-34, P-MUST-35

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const proseLint = require('../lib/prose-lint');
const validator = require('../lib/have-nots-validator');
const artifactLinter = require('../lib/artifact-linter');
const { test, assert, report } = require('./test-harness');

const ROOT = path.resolve(__dirname, '..');

function releaseTruthExpectations(sourceVersion, publishedVersion) {
  const mode = sourceVersion === publishedVersion ? 'published' : 'candidate';
  const sourceMinor = `${sourceVersion.split('.').slice(0, 2).join('.')}.x`;
  const publishedMinor = `${publishedVersion.split('.').slice(0, 2).join('.')}.x`;
  const securityRows = [[publishedMinor, 'Yes']];
  if (sourceMinor !== publishedMinor) securityRows.push([sourceMinor, 'Release candidate']);
  return {
    mode,
    usersMarker: `current source version is v${sourceVersion}, and the latest published release is v${publishedVersion}`,
    roadmapMarker: `Current source: v${sourceVersion}. Latest published: v${publishedVersion}.`,
    architectureStatus: `STABLE v${sourceVersion} ${mode === 'published' ? 'published release' : 'release candidate'}`,
    releaseHeading: `# Godpowers ${sourceVersion} Release`,
    releaseStatus: `Status: ${mode === 'published' ? 'Published and verified' : 'Release candidate'}`,
    securityRows
  };
}

const EXPECTED_RULE_IDS = [
  'filler',
  'vague-attribution',
  'stacked-hedging',
  'stock-framing',
  'inflated-phrasing',
  'empty-conclusion',
  'dense-sentence'
];

const POSITIVE_FIXTURES = [
  'It is important to note that the workflow provides value.',
  'It should be noted that this approach improves the process.',
  'It is worth noting that the system offers useful capabilities.',
  'Needless to say, this change matters for the future.',
  'At the end of the day, this solution is what teams need.',
  "In today's fast-paced world, teams need better tools.",

  'Experts agree that this platform will transform delivery.',
  'Studies show that the new workflow improves outcomes.',
  'Research suggests that this approach is more effective.',
  'Industry observers say that this capability will become essential.',
  'Many believe that this change will reshape engineering.',
  'It is widely believed that the system improves productivity.',

  'The command may perhaps possibly improve the result.',
  'It seems likely that the workflow could perhaps help.',
  'The service might possibly perhaps become more reliable.',
  'We could perhaps maybe see better outcomes.',
  'It appears to potentially perhaps reduce risk.',
  'This likely may perhaps lead to improvement.',

  'Godpowers provides a game-changing solution for modern teams.',
  'This revolutionary platform unlocks a new era of productivity.',
  'The release delivers a cutting-edge experience for developers.',
  'The product offers world-class capabilities for every workflow.',
  'This best-in-class solution changes how work gets done.',
  'Our next-generation platform creates unparalleled value.',

  'The scanner is able to identify unclear prose.',
  'The workflow has the ability to improve delivery.',
  'The command serves to simplify the overall process.',
  'In order to improve quality, teams should review the output.',
  'The fact that the test passes is meaningful.',
  'The system functions as a way to enable better outcomes.',

  'This highlights the importance of thoughtful engineering.',
  'This underscores the need for continued innovation.',
  'This demonstrates the power of a modern workflow.',
  'Overall, this is a significant step forward.',
  'Ultimately, this paves the way for future success.',

  'This process, which teams may use when priorities change, while the system continues to operate across several environments, although the exact owner remains unclear, creates a range of outcomes that can affect delivery because it changes how things work and how they are understood by everyone involved.',
  'The approach, which brings together planning and review, while also supporting delivery and reporting, although it does not name who approves the result, creates an experience that changes many parts of the process because it connects them in ways that are difficult to follow for readers who need a decision.',
  'This mechanism, which is intended to improve the workflow, while preserving several existing behaviors, although the exact effect is not stated, changes how it operates because it introduces multiple layers that interact with one another and that may influence outcomes for different people in different contexts.',
  'The update, which affects the router and the validator, while keeping the old path available, although the migration owner is not named, changes the system because it adds a compatibility layer that callers use when they move between versions and when they encounter conditions that are not described.',
  'This strategy, which covers planning and delivery, while remaining flexible across projects, although no measurable result is included, creates value because it combines several capabilities that teams can use when they need to work through different situations that may arise over time in complex environments.'
];

const NEGATIVE_FIXTURES = [
  'The router loads 124 command definitions from routing/*.yaml.',
  'The installer supports Node.js 18, 20, and 22.',
  'The release gate runs npm audit before package verification.',
  'The scanner returns findings in source order.',
  'The cache key includes the project root and file hash.',
  'The state lock expires after the configured timeout.',
  'The dashboard reads .godpowers/state.json.',
  'The validator reports line 12 for the missing owner.',
  'The test runner stops after the first failed child process.',
  'The package contains no production dependencies.',
  'The API surface exports scan and summarize.',
  'The command writes the approved plan to BUILD-PLAN.mdx.',
  'The hook blocks npm publish until approval is recorded.',
  'The retry loop makes three attempts before escalation.',
  'The artifact linter preserves the existing error count.',
  'The workflow records a user.resolve event with the plan hash.',
  'The docs name package.json as the source of the test command.',
  'The launch runbook assigns an owner and date to each channel.',
  'The PRD measures recall across 40 reviewed fixtures.',
  'The scanner bounds each excerpt at 160 characters.',
  'The surface contains 124 slash commands and 41 specialists.',
  'The harness invokes every scripts/test-*.js file on disk.',
  'The primitive returns null when the state file is absent.',
  'The security review calls the parser robust after 10,000 malformed inputs produce no crash.',
  'The matrix primitive multiplies two 4 by 4 arrays.',
  'The product uses leverage as the ratio of debt to equity.',
  'The route surface maps /god-build to god-orchestrator.',
  'The test harness creates an isolated temporary project.',
  'The robust mutex recovers when its owner process exits.',
  'The scanner treats input as inert UTF-8 text.',
  'The command can fail when state.json is malformed.',
  'The service may return 503 during the documented maintenance window.',
  'The parser might reject a token if its checksum does not match.',
  'The deployment could take 10 minutes when the registry is delayed.',
  'The audit appears in RELEASE.md after the release check passes.',
  'The result seems correct because the expected and actual hashes match.',
  'The validator tends to finish in 12 milliseconds on the fixture.',
  'The report is likely stale when its recorded hash differs from disk.',
  'The plan perhaps needs review if the approval event is absent.',
  'The command possibly exits with code 2 for invalid arguments.',
  'The 2026 maintainer survey of 40 users found a 15 percent reduction in retries.',
  'Research in docs/benchmark.md records 20 runs and their raw durations.',
  'Three security reviewers approved the threat model in FINDINGS.mdx.',
  'The named OWASP 2025 control blocks the unsafe redirect.',
  'The release notes cite workflow run 32097275283.',
  'The world-class chess title is awarded under FIDE rules.',
  'The revolutionary period in the history chapter spans 1775-1783.',
  'The cutting-edge algorithm stores boundary edges in a sorted array.',
  'The next-generation protocol field is named next_generation_id.',
  'The best-in-class label is quoted from the approved customer transcript.',
  'The function can identify unclear prose in 14 tested patterns.',
  'The scanner identifies unclear prose and returns its exact source location.',
  'To improve quality, run node scripts/test-prose-lint.js.',
  'The passing test proves that the expected rule emitted one finding.',
  'The state lock is a boundary between concurrent writers.',
  'This highlights the exact byte that changed at offset 42.',
  'This underscores the heading at line 18 in the generated report.',
  'This demonstrates the SHA-256 check against the approved plan hash.',
  'Overall, 39 of 40 positive fixtures emitted a warning.',
  'Ultimately, the maintainer must choose option A or option B by 2026-11-30.'
];

function scanOne(text, options) {
  return proseLint.scan(text, options);
}

console.log('\n  Prose lint behavioral tests\n');

test('P-MUST-31: scan accepts null, empty, and multiline input', () => {
  assert(Array.isArray(scanOne(null)), 'null input must return an array');
  assert(scanOne(null).length === 0, 'null input must be clean');
  assert(scanOne('').length === 0, 'empty input must be clean');
  assert(Array.isArray(scanOne('First line.\nSecond line.')), 'multiline input must return an array');
});

test('P-MUST-31: every rule identifier emits an explanatory structured finding', () => {
  const seen = new Set();
  for (const fixture of POSITIVE_FIXTURES) {
    for (const finding of scanOne(fixture)) {
      seen.add(finding.ruleId);
      for (const field of ['ruleId', 'line', 'column', 'excerpt', 'message', 'suggestion']) {
        assert(Object.prototype.hasOwnProperty.call(finding, field), `${finding.ruleId} missing ${field}`);
      }
      assert(finding.line >= 1 && finding.column >= 1, 'locations must be one-indexed');
      assert(finding.excerpt.length <= 160, 'excerpt exceeded 160 characters');
      assert(finding.message.includes('pattern'), `${finding.ruleId} message must explain a pattern`);
      assert(!/\bban(?:ned|s)?\b/i.test(finding.message), 'message must not describe a word ban');
    }
  }
  assert(JSON.stringify([...seen].sort()) === JSON.stringify([...EXPECTED_RULE_IDS].sort()),
    `expected ${EXPECTED_RULE_IDS.join(', ')}, got ${[...seen].join(', ')}`);
});

test('P-MUST-31: findings report exact lines, columns, and source order', () => {
  const text = [
    'Concrete opening.',
    '  It is important to note that the workflow provides value.',
    'Research suggests that the release improves outcomes.',
    'Overall, this is a significant step forward.'
  ].join('\n');
  const findings = scanOne(text);
  assert(findings.length === 3, `expected 3 findings, got ${findings.length}`);
  assert(findings[0].line === 2 && findings[0].column === 3,
    `first location was ${findings[0].line}:${findings[0].column}`);
  assert(findings[1].line === 3 && findings[1].column === 1, 'second finding location is wrong');
  assert(findings[2].line === 4 && findings[2].column === 1, 'third finding location is wrong');
});

test('P-MUST-31: inert Markdown regions and clearly quoted bad examples are masked', () => {
  const text = [
    '---',
    'description: It is important to note that this is filler.',
    '---',
    '```md',
    'Studies show that this code example is vague.',
    '```',
    'Use `It is worth noting that this inline example is filler.` as a fixture.',
    '[destination](https://example.com/It-is-important-to-note-that)',
    '- **Bad** (artifact decision): "Overall, this is a significant step forward."',
    '  This continuation explains why the quoted example is bad.',
    '',
    'It should be noted that this live sentence is vague.'
  ].join('\n');
  const findings = scanOne(text);
  assert(findings.length === 1, `expected one live finding, got ${JSON.stringify(findings)}`);
  assert(findings[0].line === 12, `expected line 12, got ${findings[0].line}`);
});

test('P-MUST-31: double-backtick inline code may contain a single backtick', () => {
  const text = 'Use ``It is important to note that `x` stays inside code.``';
  const findings = scanOne(text);
  assert(findings.length === 0, `inline code leaked prose findings: ${JSON.stringify(findings)}`);
});

test('P-MUST-31: a shorter matching fence does not close an outer fence', () => {
  const text = [
    '````md',
    '```',
    'It is important to note that this remains fenced code.',
    '````',
    'It should be noted that this sentence is live prose.'
  ].join('\n');
  const findings = scanOne(text);
  assert(findings.length === 1, `expected one live finding, got ${JSON.stringify(findings)}`);
  assert(findings[0].line === 5, `expected live prose on line 5, got ${findings[0].line}`);
});

test('P-MUST-31: a matching fence with trailing text is code, not a closer', () => {
  const text = [
    '````md',
    '```` this is code content, not a closing fence',
    'It is important to note that this remains fenced code.',
    '  ````   ',
    'It should be noted that this sentence is live prose.'
  ].join('\n');
  const findings = scanOne(text);
  assert(findings.length === 1, `expected one live finding, got ${JSON.stringify(findings)}`);
  assert(findings[0].line === 5, `expected live prose on line 5, got ${findings[0].line}`);
});

test('P-MUST-31: a four-space-indented fence cannot close an active fence', () => {
  const text = [
    '```md',
    '    ```',
    'It is important to note that this remains fenced code.',
    '```',
    'It should be noted that this sentence is live prose.'
  ].join('\n');
  const findings = scanOne(text);
  assert(findings.length === 1, `expected one live finding, got ${JSON.stringify(findings)}`);
  assert(findings[0].line === 5, `expected live prose on line 5, got ${findings[0].line}`);
});

test('P-MUST-31: a tab-prefixed fence cannot close an active fence', () => {
  const text = [
    '~~~md',
    '\t~~~',
    'It is important to note that this remains fenced code.',
    '~~~',
    'It should be noted that this sentence is live prose.'
  ].join('\n');
  const findings = scanOne(text);
  assert(findings.length === 1, `expected one live finding, got ${JSON.stringify(findings)}`);
  assert(findings[0].line === 5, `expected live prose on line 5, got ${findings[0].line}`);
});

test('P-MUST-31: four-space indented fence-like code does not open a fence', () => {
  const text = [
    '    ``` It is important to note that this is an indented code line.',
    'It should be noted that this sentence is live prose.'
  ].join('\n');
  const findings = scanOne(text);
  assert(findings.length === 1, `expected one live finding, got ${JSON.stringify(findings)}`);
  assert(findings[0].line === 2, `expected live prose on line 2, got ${findings[0].line}`);
});

test('P-MUST-31: a backtick in a backtick fence info string prevents opening', () => {
  const text = [
    '```bad`info',
    'It is important to note that this sentence is live prose.'
  ].join('\n');
  const findings = scanOne(text);
  assert(findings.length === 1, `expected one live finding, got ${JSON.stringify(findings)}`);
  assert(findings[0].line === 2, `expected live prose on line 2, got ${findings[0].line}`);
});

test('P-MUST-31: an unclosed opening marker does not mask the document', () => {
  const text = [
    '---',
    'It is important to note that this sentence is live prose.'
  ].join('\n');
  const findings = scanOne(text);
  assert(findings.length === 1, `expected one live finding, got ${JSON.stringify(findings)}`);
  assert(findings[0].line === 2, `expected live prose on line 2, got ${findings[0].line}`);
});

test('P-MUST-31: indented YAML block-scalar markers do not close frontmatter', () => {
  const text = [
    '\uFEFF---',
    'summary: |',
    '  ---',
    '  It is important to note that this remains frontmatter content.',
    '---',
    'It should be noted that this sentence is live prose.'
  ].join('\r\n');
  const findings = scanOne(text);
  assert(findings.length === 1, `expected one live finding, got ${JSON.stringify(findings)}`);
  assert(findings[0].line === 6, `expected live prose on line 6, got ${findings[0].line}`);
});

test('P-MUST-31: mixed indentation reaching column four masks fence-like code only', () => {
  const text = [
    '  \t``` It is important to note that this is an indented code line.',
    'It should be noted that this sentence is live prose.'
  ].join('\n');
  const findings = scanOne(text);
  assert(findings.length === 1, `expected one live finding, got ${JSON.stringify(findings)}`);
  assert(findings[0].line === 2, `expected live prose on line 2, got ${findings[0].line}`);
});

test('P-MUST-31: CRLF backtick and tilde fences preserve only live prose', () => {
  for (const [opener, closer] of [['```js', '```'], ['~~~md', '~~~']]) {
    const text = [
      opener,
      'It is important to note that this remains fenced code.',
      closer,
      'It should be noted that this sentence is live prose.'
    ].join('\r\n');
    const findings = scanOne(text);
    assert(findings.length === 1,
      `${opener} expected one live finding, got ${JSON.stringify(findings)}`);
    assert(findings[0].line === 4,
      `${opener} expected live prose on line 4, got ${findings[0].line}`);
  }
});

test('P-MUST-31: finding excerpts and reports remove terminal control bytes', () => {
  const hostile = '[DECISION] \x1b[2J\x00\x07 It is important to note that this sentence is vague.\x85';
  const findings = scanOne(hostile);
  const dangerous = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/;
  assert(findings.length === 1, `expected one finding, got ${JSON.stringify(findings)}`);
  assert(!dangerous.test(findings[0].excerpt), 'finding excerpt retained a terminal control byte');
  assert(findings[0].excerpt.length <= 160, 'sanitized excerpt exceeded 160 characters');

  const wrapped = validator.runChecks(hostile, null);
  const formatted = artifactLinter.formatReport({
    path: 'HOSTILE.md',
    type: 'unknown',
    findings: wrapped,
    summary: validator.summarize(wrapped)
  });
  assert(!dangerous.test(formatted), 'formatted report retained a terminal control byte');
});

test('P-MUST-31: adversarial unique backtick runs stay below 250ms at p95', () => {
  const benchmark = [
    "const { scan } = require('./lib/prose-lint');",
    'const target = 1024 * 1024;',
    "const pieces = ['Use '];",
    "let used = Buffer.byteLength('Use ');",
    'for (let length = 1400; length >= 1; length--) {',
    "  const piece = '`'.repeat(length) + 'x';",
    '  if (used + piece.length > target) continue;',
    '  pieces.push(piece);',
    '  used += piece.length;',
    '}',
    "pieces.push('a'.repeat(target - used));",
    "const fixture = pieces.join('');",
    "if (Buffer.byteLength(fixture) !== target || fixture.includes('\\n')) process.exit(2);",
    'const durations = [];',
    'for (let run = 0; run < 20; run++) {',
    '  const started = process.hrtime.bigint();',
    '  scan(fixture);',
    '  durations.push(Number(process.hrtime.bigint() - started) / 1e6);',
    '}',
    'durations.sort((a, b) => a - b);',
    'const p95 = durations[Math.ceil(durations.length * 0.95) - 1];',
    "process.stdout.write(JSON.stringify({ p95, max: durations[durations.length - 1] }));"
  ].join('\n');
  const result = spawnSync(process.execPath, ['-e', benchmark], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 8000
  });
  assert(!result.error, `adversarial scan did not finish within 8 seconds: ${result.error && result.error.message}`);
  assert(result.status === 0, `adversarial scan failed: ${result.stderr || result.stdout}`);
  const timing = JSON.parse(result.stdout);
  assert(timing.p95 < 250, `adversarial p95 was ${timing.p95.toFixed(2)}ms`);
});

test('P-MUST-31: indirect phrasing requires unclear context', () => {
  const concrete = [
    'That produces a wider single thought and hides the fact that it did.',
    'Remove the assumption that there is a server, then compare the resulting designs.'
  ];
  for (const fixture of concrete) {
    assert(scanOne(fixture).length === 0, `concrete fact usage was flagged: ${fixture}`);
  }
});

test('P-MUST-31: project terms remain valid in concrete technical sentences', () => {
  for (const term of ['surface', 'harness', 'primitive', 'robust', 'leverage']) {
    const fixture = NEGATIVE_FIXTURES.find(line => line.toLowerCase().includes(term));
    assert(fixture, `missing negative fixture for ${term}`);
    assert(scanOne(fixture).length === 0, `${term} was treated as a standalone word ban`);
  }
});

test('P-MUST-31: identical text and options produce byte-equivalent ordered findings', () => {
  const text = POSITIVE_FIXTURES.join('\n');
  const options = { outputProfile: 'engineering', highConfidenceOnly: true };
  const first = JSON.stringify(scanOne(text, options));
  const second = JSON.stringify(scanOne(text, options));
  assert(first === second, 'two scans of identical input differed');
  assert(JSON.stringify(options) === '{"outputProfile":"engineering","highConfidenceOnly":true}',
    'scanner mutated options');
});

test('P-MUST-33: at least 90 percent of 40 theater fixtures emit warnings', () => {
  assert(POSITIVE_FIXTURES.length === 40, `expected 40 fixtures, got ${POSITIVE_FIXTURES.length}`);
  const matched = POSITIVE_FIXTURES.filter(fixture => scanOne(fixture).length > 0).length;
  assert(matched >= 36, `positive recall was ${matched}/40`);
});

test('P-MUST-33: no more than 5 percent of 60 concrete fixtures emit warnings', () => {
  assert(NEGATIVE_FIXTURES.length === 60, `expected 60 fixtures, got ${NEGATIVE_FIXTURES.length}`);
  const flagged = NEGATIVE_FIXTURES.filter(fixture => scanOne(fixture).length > 0);
  assert(flagged.length <= 3, `false positives were ${flagged.length}/60: ${flagged.join(' | ')}`);
});

test('P-MUST-31: 1 MiB scan completes within 250 milliseconds at p95 across 20 runs', () => {
  const line = 'The router loads 124 command definitions from routing files and returns them in source order.\n';
  const repeats = Math.ceil((1024 * 1024) / Buffer.byteLength(line));
  const fixture = line.repeat(repeats).slice(0, 1024 * 1024);
  const durations = [];
  for (let i = 0; i < 20; i++) {
    const started = process.hrtime.bigint();
    const findings = scanOne(fixture);
    durations.push(Number(process.hrtime.bigint() - started) / 1e6);
    assert(findings.length === 0, 'performance fixture should remain clean');
  }
  durations.sort((a, b) => a - b);
  const p95 = durations[Math.ceil(durations.length * 0.95) - 1];
  assert(p95 < 250, `p95 was ${p95.toFixed(2)}ms`);
});

test('P-MUST-32: universal validation maps prose findings to advisory U-12 warnings', () => {
  const content = '[DECISION] It is important to note that the release provides value.';
  const findings = validator.runChecks(content, null);
  const u12 = findings.filter(finding => finding.code === 'U-12');
  assert(u12.length === 1, `expected one U-12 warning, got ${u12.length}`);
  assert(u12[0].severity === 'warning', `expected warning, got ${u12[0].severity}`);
  assert(u12[0].line === 1 && u12[0].column > 1, 'U-12 location was not preserved');
  assert(u12[0].message && u12[0].suggestion, 'U-12 explanation or suggestion missing');
  const summary = validator.summarize(u12);
  assert(summary.errors === 0 && summary.warnings === 1, 'U-12 changed the artifact error count');
  assert(summary.byCode['U-12'] === 1, 'U-12 per-code count missing');
});

test('P-MUST-32: artifact reports keep U-12 advisory while existing errors still block', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-prose-lint-'));
  const advisoryPath = path.join(dir, 'NOTES.md');
  const blockingPath = path.join(dir, 'BLOCKING.md');
  try {
    fs.writeFileSync(advisoryPath, '[DECISION] Overall, this is a significant step forward.\n');
    fs.writeFileSync(blockingPath,
      '[DECISION] Overall, this is a significant step forward. A dash follows: \u2014\n');
    const advisory = artifactLinter.lintFile(advisoryPath, { projectRoot: dir });
    const blocking = artifactLinter.lintFile(blockingPath, { projectRoot: dir });
    assert(advisory.summary.errors === 0, 'U-12-only artifact gained an error');
    assert(advisory.summary.byCode['U-12'] === 1, 'artifact summary omitted U-12');
    assert(blocking.summary.errors > 0, 'existing U-08 error stopped blocking');
    assert(blocking.findings.some(finding => finding.code === 'U-08' && finding.severity === 'error'),
      'U-08 severity changed');
    const formatted = artifactLinter.formatReport(advisory);
    assert(formatted.includes('[U-12] WARNING line 1'), 'formatted report omitted U-12 location');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('P-MUST-32: existing universal severities remain unchanged', () => {
  const expectations = [
    ['U-01', validator.checkSubstitution('Our app helps users be scalable and intuitive.'), 'warning'],
    ['U-02', validator.checkUnlabeled('This paragraph has enough substantive content to require an explicit artifact label.'), 'warning'],
    ['U-08', validator.checkEmEnDash('bad \u2014 dash'), 'error'],
    ['U-09', validator.checkEmoji('bad \u{1F680} icon'), 'error'],
    ['U-10', validator.checkPhantomRef('[missing](./absent-file.md)', { projectRoot: ROOT, docDir: ROOT }), 'warning'],
    ['U-11', validator.checkFutureDate('Recorded 2099-12-31.', { today: '2026-08-19' }), 'warning'],
    ['U-13', artifactLinter.checkMdxSafety('Bare <tag is unsafe.'), 'warning'],
    ['U-14', validator.checkSycophancy('Great question.'), 'warning']
  ];
  for (const [code, findings, severity] of expectations) {
    const finding = findings.find(item => item.code === code);
    assert(finding && finding.severity === severity, `${code} severity changed`);
  }
});

test('P-MUST-30: shared voice contract contains a separate audit and three specific pairs', () => {
  const voice = fs.readFileSync(path.join(ROOT, 'references/shared/VOICE.md'), 'utf8');
  const normalized = voice.toLowerCase().replace(/\s+/g, ' ');
  assert(voice.includes('Implements: P-MUST-30'), 'voice requirement annotation missing');
  assert(voice.includes('Post-draft prose audit'), 'separate post-draft audit heading missing');
  assert(normalized.includes('artifact decision') && normalized.includes('technical explanation') &&
    normalized.includes('public launch copy'), 'three Godpowers-specific pair categories missing');
  assert((voice.match(/\*\*Bad\*\*:/g) || []).length >= 4, 'expected at least three new bad examples');
  assert((voice.match(/\*\*Good\*\*:/g) || []).length >= 4, 'expected at least three new good examples');
  for (const phrase of ['preserve requirements', 'verified facts', 'code terms', 'quotations',
    'user-approved tone', 'three-label', 'substitution test']) {
    assert(normalized.includes(phrase), `voice audit missing ${phrase}`);
  }
});

test('P-MUST-34: docs and launch specialists apply output-specific post-draft audits', () => {
  const docs = fs.readFileSync(path.join(ROOT, 'specialists/god-docs-writer.md'), 'utf8');
  const launch = fs.readFileSync(path.join(ROOT, 'specialists/god-launch-strategist.md'), 'utf8');
  for (const [name, content] of [['docs', docs], ['launch', launch]]) {
    assert(content.includes('Implements: P-MUST-34'), `${name} requirement annotation missing`);
    assert(content.includes('references/shared/VOICE.md'), `${name} lost the shared voice contract`);
    assert(/post-draft audit/i.test(content), `${name} lost its post-draft audit obligation`);
    assert(/human-authored/i.test(content) && /objectively good/i.test(content),
      `${name} must state the scanner proof boundary`);
  }
  for (const phrase of ['direct factual explanations', 'exact repository names', 'verified commands',
    'concrete before-and-after behavior', 'required terminology', 'quoted source text',
    'runbook steps', 'evidence language']) {
    assert(docs.replace(/\s+/g, ' ').includes(phrase), `docs guidance missing ${phrase}`);
  }
  for (const phrase of ['founder or product voice', 'approved positioning', 'channel constraints',
    'Brand voice/tone decisions', 'Final headline approval']) {
    assert(launch.includes(phrase), `launch guidance missing ${phrase}`);
  }
});

test('P-MUST-35: package guard explicitly requires the prose scanner', () => {
  const source = fs.readFileSync(path.join(ROOT, 'scripts/check-package-contents.js'), 'utf8');
  const requiredFiles = source.match(/const REQUIRED_FILES = \[([\s\S]*?)\n\];/);
  assert(requiredFiles, 'package guard REQUIRED_FILES declaration missing');
  assert(/['"]lib\/prose-lint\.js['"]/.test(requiredFiles[1]),
    'package guard does not explicitly require lib/prose-lint.js');
  assert(source.includes('Implements: P-MUST-35'), 'package guard requirement annotation missing');
});

test('P-MUST-35: prose-quality documentation and release surfaces stay complete', () => {
  const cases = [
    {
      source: '6.1.0',
      published: '6.0.0',
      expected: {
        mode: 'candidate',
        usersMarker: 'current source version is v6.1.0, and the latest published release is v6.0.0',
        roadmapMarker: 'Current source: v6.1.0. Latest published: v6.0.0.',
        architectureStatus: 'STABLE v6.1.0 release candidate',
        releaseStatus: 'Status: Release candidate',
        securityRows: [['6.0.x', 'Yes'], ['6.1.x', 'Release candidate']]
      }
    },
    {
      source: '6.1.0',
      published: '6.1.0',
      expected: {
        mode: 'published',
        usersMarker: 'current source version is v6.1.0, and the latest published release is v6.1.0',
        roadmapMarker: 'Current source: v6.1.0. Latest published: v6.1.0.',
        architectureStatus: 'STABLE v6.1.0 published release',
        releaseStatus: 'Status: Published and verified',
        securityRows: [['6.1.x', 'Yes']]
      }
    }
  ];

  for (const fixture of cases) {
    const actual = releaseTruthExpectations(fixture.source, fixture.published);
    assert(actual.mode === fixture.expected.mode, `${fixture.expected.mode} mode mismatch`);
    assert(actual.usersMarker === fixture.expected.usersMarker,
      `${fixture.expected.mode} user marker mismatch`);
    assert(actual.roadmapMarker === fixture.expected.roadmapMarker,
      `${fixture.expected.mode} roadmap marker mismatch`);
    assert(actual.architectureStatus === fixture.expected.architectureStatus,
      `${fixture.expected.mode} architecture status mismatch`);
    assert(actual.releaseStatus === fixture.expected.releaseStatus,
      `${fixture.expected.mode} release status mismatch`);
    assert(JSON.stringify(actual.securityRows) === JSON.stringify(fixture.expected.securityRows),
      `${fixture.expected.mode} security rows mismatch`);
  }

  const inspiration = fs.readFileSync(path.join(ROOT, 'INSPIRATION.md'), 'utf8');
  const libraryReadme = fs.readFileSync(path.join(ROOT, 'lib/README.md'), 'utf8');
  const rootReadme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  const validation = fs.readFileSync(path.join(ROOT, 'docs/validation.md'), 'utf8');
  const changelog = fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8');
  const release = fs.readFileSync(path.join(ROOT, 'RELEASE.md'), 'utf8');
  const users = fs.readFileSync(path.join(ROOT, 'USERS.md'), 'utf8');
  const roadmap = fs.readFileSync(path.join(ROOT, 'docs/ROADMAP.md'), 'utf8');
  const architecture = fs.readFileSync(path.join(ROOT, 'ARCHITECTURE.md'), 'utf8');
  const security = fs.readFileSync(path.join(ROOT, 'SECURITY.md'), 'utf8');
  const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const state = JSON.parse(fs.readFileSync(path.join(ROOT, '.godpowers/state.json'), 'utf8'));
  const publishedVersion = state.tiers && state.tiers['tier-3'] &&
    state.tiers['tier-3'].launch && state.tiers['tier-3'].launch['release-version'];
  const sourceVersion = packageJson.version;
  const releaseTruth = releaseTruthExpectations(sourceVersion, publishedVersion);
  const compact = text => text.replace(/\s+/g, ' ');
  const missing = [];
  const requireContract = (condition, message) => {
    if (!condition) missing.push(message);
  };

  const inspirationText = compact(inspiration);
  requireContract(
    inspiration.includes('https://github.com/cursor/plugins/blob/main/pstack/skills/unslop/SKILL.md'),
    'INSPIRATION.md: exact pstack unslop link'
  );
  requireContract(/no upstream .{0,160} vendored/i.test(inspirationText),
    'INSPIRATION.md: explicit no-vendoring boundary');
  requireContract(/no runtime dependency/i.test(inspirationText),
    'INSPIRATION.md: explicit no-runtime-dependency boundary');

  const libraryText = compact(libraryReadme);
  requireContract(/U-12/i.test(libraryText) && /advisory/i.test(libraryText),
    'lib/README.md: advisory U-12 integration');
  requireContract(/false positives?/i.test(libraryText),
    'lib/README.md: false-positive boundary');
  requireContract(/false negatives?|miss(?:es|ed)? (?:revision-worthy )?prose|prose (?:that )?(?:needs|need) revision/i.test(libraryText),
    'lib/README.md: missed revision-worthy prose or false-negative boundary');
  requireContract(/clean scan (?:does not|cannot) prove/i.test(libraryText),
    'lib/README.md: clean-scan limitation');
  requireContract(/documentation/i.test(libraryText) && /launch/i.test(libraryText) &&
    /(?:founder|product) voice/i.test(libraryText),
  'lib/README.md: output-specific documentation and launch voice treatment');

  const rootText = compact(rootReadme);
  requireContract(/false positives?/i.test(rootText), 'README.md: false-positive boundary');
  requireContract(/false negatives?|miss(?:es|ed)? (?:revision-worthy )?prose|prose (?:that )?(?:needs|need) revision/i.test(rootText),
    'README.md: missed revision-worthy prose or false-negative boundary');
  requireContract(/clean scan (?:does not|cannot) prove/i.test(rootText),
    'README.md: clean-scan limitation');

  const validationText = compact(validation);
  requireContract(/U-12/i.test(validationText) && /advisory/i.test(validationText) &&
    /(?:never|does not) (?:the )?(?:block|error count)|does not block/i.test(validationText),
  'docs/validation.md: advisory non-blocking U-12 behavior');
  requireContract(/clean scan does not prove/i.test(validationText) &&
    /not a complete Markdown parser/i.test(validationText),
  'docs/validation.md: precision limits');

  const changelogSection = (changelog.match(/## \[6\.1\.0\][\s\S]*?(?=\n## \[|$)/) || [''])[0];
  requireContract(/prose-quality/i.test(changelogSection) && /U-12/i.test(changelogSection) &&
    /lib\/prose-lint\.js/.test(changelogSection),
  'CHANGELOG.md: 6.1.0 prose-quality facts');

  requireContract(/^\d+\.\d+\.\d+$/.test(publishedVersion || ''),
    '.godpowers/state.json: tier-3 launch release-version');
  requireContract(users.toLowerCase().includes(releaseTruth.usersMarker.toLowerCase()),
    `USERS.md: ${sourceVersion} source and ${publishedVersion} published truth`);
  requireContract(roadmap.includes(releaseTruth.roadmapMarker),
    `docs/ROADMAP.md: ${sourceVersion} source and ${publishedVersion} published truth`);
  requireContract(architecture.includes(releaseTruth.architectureStatus),
    `ARCHITECTURE.md: ${releaseTruth.mode} status`);
  requireContract(release.includes(releaseTruth.releaseHeading),
    `RELEASE.md: ${sourceVersion} release heading`);
  requireContract(release.includes(releaseTruth.releaseStatus),
    `RELEASE.md: ${releaseTruth.mode} status`);
  for (const [minor, status] of releaseTruth.securityRows) {
    const escapedMinor = minor.replace(/\./g, '\\.');
    requireContract(new RegExp(`\\|\\s*${escapedMinor}\\s*\\|\\s*${status}\\s*\\|`).test(security),
      `SECURITY.md: ${minor} ${status}`);
  }
  if (sourceVersion === '6.1.0') {
    requireContract(/prose/i.test(release) && /U-12/i.test(release),
      'RELEASE.md: 6.1.0 prose-quality facts');
  }

  assert(missing.length === 0, `missing prose documentation contracts:\n  - ${missing.join('\n  - ')}`);
});

test('P-MUST-33: static self-dogfood reports the fixed scope and reviewed baseline', () => {
  const result = spawnSync(process.execPath, ['scripts/static-check.js'], {
    cwd: ROOT,
    encoding: 'utf8'
  });
  const output = `${result.stdout}\n${result.stderr}`;
  assert(result.status === 0, `static check failed:\n${output}`);
  assert(output.includes('P-MUST-33: prose self-dogfood scans skills, specialists, agents, and references'),
    'static output did not confirm the full prose scope');
  assert(/Prose self-dogfood baseline: \d+ warnings across \d+ files\./.test(output),
    'static output omitted the reviewed warning baseline');
});

report();
