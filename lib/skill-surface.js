const fs = require('fs');
const path = require('path');
const frontmatter = require('./frontmatter');

const parseFrontmatter = (text) => frontmatter.parse(text, { strict: true });

function listSkills(rootDir = path.join(__dirname, '..', 'skills')) {
  return fs.readdirSync(rootDir)
    .filter((file) => /^god.*\.md$/.test(file))
    .sort()
    .map((file) => {
      const full = path.join(rootDir, file);
      const text = fs.readFileSync(full, 'utf8');
      const frontmatter = parseFrontmatter(text);
      return {
        file,
        command: `/${path.basename(file, '.md')}`,
        name: frontmatter.name || path.basename(file, '.md'),
        description: frontmatter.description || '',
        path: full
      };
    });
}

function commandNames(rootDir) {
  return listSkills(rootDir).map((skill) => skill.command);
}

module.exports = {
  parseFrontmatter,
  listSkills,
  commandNames
};
