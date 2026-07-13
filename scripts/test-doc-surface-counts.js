#!/usr/bin/env node
/**
 * Keep public surface claims tied to the repository contents.
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pkg = require(path.join(root, 'package.json'));

function countFiles(dir, pattern) {
  return fs
    .readdirSync(path.join(root, dir))
    .filter((name) => pattern.test(name))
    .length;
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function assertIncludes(rel, expected) {
  const content = read(rel);
  if (!content.includes(expected)) {
    throw new Error(`${rel} missing expected text: ${expected}`);
  }
}

const counts = {
  skills: countFiles('skills', /^god.*\.md$/),
  agents: countFiles('specialists', /^god.*\.md$/),
  workflows: countFiles('workflows', /\.yaml$/),
  recipes: countFiles(path.join('routing', 'recipes'), /\.yaml$/),
  libModules: countFiles('lib', /\.js$/),
};

const version = pkg.version;
const surface = `${counts.skills} skills, ${counts.agents} agents`;
const commandSurface = `${counts.skills} slash commands`;
const workflowSurface = `${counts.workflows} workflows`;
const recipeSurface = `${counts.recipes} recipes`;

assertIncludes('package.json', `${counts.skills} slash commands and ${counts.agents} specialist agents`);
assertIncludes('README.md', `version-${version}-blue`);
assertIncludes('README.md', `all ${counts.skills} skills + ${counts.agents} agents`);
assertIncludes('USERS.md', `current source version is v${version}`);
assertIncludes('ARCHITECTURE.md', `STABLE v${version}`);
assertIncludes('ARCHITECTURE.md', `Core: ${surface}, ${workflowSurface}`);
assertIncludes('docs/ROADMAP.md', `Current source: v${version}`);
assertIncludes('docs/ROADMAP.md', `**${commandSurface}**`);
assertIncludes('docs/ROADMAP.md', `**${counts.agents} specialist agents**`);
assertIncludes('docs/reference.md', `reference for v${version}`);
assertIncludes('docs/reference.md', `Slash commands (${counts.skills} total)`);
assertIncludes('docs/reference.md', `Specialist agents (${counts.agents} total)`);
assertIncludes('skills/god-version.md', `Surface: ${surface}, ${workflowSurface}, ${recipeSurface}`);
assertIncludes('skills/god-doctor.md', `[OK] ${counts.skills} skills installed`);
assertIncludes('skills/god-doctor.md', `[OK] ${counts.agents} agents installed`);

// ARCHITECTURE-MAP.md was the one count-bearing doc with no machine guard, so it
// silently rotted to v2.4.3 counts (DOC-001). Guard its surface and version
// markers here so it stays in lockstep with the rest of the release surface.
assertIncludes('ARCHITECTURE-MAP.md',
  `${counts.skills} slash commands, ${counts.agents} agents, ${counts.workflows} workflows, ${counts.recipes} recipes`);
assertIncludes('ARCHITECTURE-MAP.md', `## Numbers (as of v${version})`);
assertIncludes('ARCHITECTURE-MAP.md', `package.json (v${version})`);
assertIncludes('ARCHITECTURE-MAP.md', `<- ${counts.skills} slash-command skill files`);
assertIncludes('ARCHITECTURE-MAP.md', `Real JS runtime (${counts.libModules} modules)`);
assertIncludes('ARCHITECTURE-MAP.md', `| Slash commands | ${counts.skills} |`);
assertIncludes('ARCHITECTURE-MAP.md', `| Intent recipes | ${counts.recipes} |`);
assertIncludes('ARCHITECTURE-MAP.md', `**JS runtime modules** | **${counts.libModules}**`);

// Install-profile sizes in docs/surface-contraction.md rotted silently as the
// profiles grew. Derive each size from lib/install-profiles.js selection
// against the shipped skills/ directory so the doc cannot drift again.
const installProfiles = require(path.join(root, 'lib', 'install-profiles.js'));
const skillNames = fs
  .readdirSync(path.join(root, 'skills'))
  .filter((name) => /^god.*\.md$/.test(name))
  .map((name) => name.replace(/\.md$/, ''));
for (const profile of [...Object.keys(installProfiles.PROFILE_SKILLS), 'full']) {
  const size = installProfiles.selectedSkillNames(profile, skillNames).size;
  assertIncludes(
    'docs/surface-contraction.md',
    `The \`${profile}\` profile currently selects ${size} skills from the shipped \`skills/\` directory.`
  );
}

// Catalog completeness (DOC-004 / PATTERN-E): every lib/*.js must have a row in
// lib/README.md so the "living module catalog" cannot silently drift again.
const libReadme = read(path.join('lib', 'README.md'));
const undocumented = fs
  .readdirSync(path.join(root, 'lib'))
  .filter((name) => /\.js$/.test(name))
  .filter((name) => !libReadme.includes('`' + name + '`'));
if (undocumented.length > 0) {
  throw new Error(`lib/README.md is missing catalog rows for: ${undocumented.join(', ')}`);
}

console.log(`  + public surface docs match v${version}: ${surface}, ${workflowSurface}, ${recipeSurface}, ${counts.libModules} lib modules; lib/README catalog complete`);
