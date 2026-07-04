const pkg = require('../package.json');

const PACKAGE_NAME = pkg.name;
const PACKAGE_VERSION = pkg.version;
const REPOSITORY_URL = pkg.repository && pkg.repository.url
  ? pkg.repository.url
  : 'git+https://github.com/hannsxpeter/godpowers.git';
const HOMEPAGE_URL = pkg.homepage || 'https://github.com/hannsxpeter/godpowers#readme';
const BUGS_URL = pkg.bugs && pkg.bugs.url
  ? pkg.bugs.url
  : 'https://github.com/hannsxpeter/godpowers/issues';
const BIN_NAME = pkg.bin && Object.keys(pkg.bin)[0]
  ? Object.keys(pkg.bin)[0]
  : 'godpowers';

function repoSlug() {
  const url = REPOSITORY_URL
    .replace(/^git\+/, '')
    .replace(/^https:\/\/github\.com\//, '')
    .replace(/^git@github\.com:/, '')
    .replace(/\.git$/, '');
  return url || 'hannsxpeter/godpowers';
}

function npxCommand(version = 'latest') {
  return `npx ${PACKAGE_NAME}@${version}`;
}

module.exports = {
  PACKAGE_NAME,
  PACKAGE_VERSION,
  REPOSITORY_URL,
  HOMEPAGE_URL,
  BUGS_URL,
  BIN_NAME,
  repoSlug,
  npxCommand
};
