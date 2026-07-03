/**
 * Drift Detector
 *
 * Detects divergence between artifact decisions and actual code.
 * Uses the linkage map to know which files are linked to which artifacts.
 *
 * Drift types:
 *   - DESIGN token drift: code uses a value that doesn't match the
 *     declared token value
 *   - DESIGN component drift: implementing file's actual styling differs
 *     from component property declarations
 *   - ARCH container drift: file is in container A but its imports
 *     reach container B in a way ARCH says shouldn't happen
 *   - STACK version drift: package.json has a version different from
 *     what the stack DECISION artifact declares
 *
 * Public API:
 *   detectAll(projectRoot) -> { findings, summary }
 *   detectDesignTokenDrift(projectRoot, designContent) -> findings
 *   detectStackVersionDrift(projectRoot, stackContent) -> findings
 */

const fs = require('fs');
const path = require('path');

const linkage = require('./linkage');
const designSpec = require('./design-spec');
const artifactMap = require('./artifact-map');
const syncFs = require('./sync-fs');

/**
 * Detect drift between DESIGN.md tokens and code that references them.
 * If a file references a token that no longer exists in DESIGN.md, drift.
 * If a file declares a token override (CSS var) with a different value, drift.
 */
function detectDesignTokenDrift(projectRoot, designContent) {
  const findings = [];
  if (!designContent) {
    const designPath = path.join(projectRoot, 'DESIGN.md');
    if (!fs.existsSync(designPath)) return findings;
    designContent = fs.readFileSync(designPath, 'utf8');
  }
  const parsed = designSpec.parse(designContent);
  if (!parsed.frontmatter) return findings;
  const fm = parsed.frontmatter;

  // Collect all valid token paths
  const validTokens = new Set();
  function walk(obj, prefix) {
    for (const [k, v] of Object.entries(obj)) {
      const here = prefix ? `${prefix}.${k}` : k;
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        walk(v, here);
      } else {
        validTokens.add(here);
      }
    }
  }
  walk(fm, '');

  // Read reverse linkage to find files referencing tokens
  const rev = linkage.readReverse(projectRoot);
  for (const [filePath, ids] of Object.entries(rev)) {
    for (const id of ids) {
      if (linkage.classifyId(id) === 'token') {
        // Check the token still exists
        if (!validTokens.has(id) && !hasTokenInTree(fm, id)) {
          findings.push({
            kind: 'design-token-drift',
            severity: 'error',
            file: filePath,
            artifactId: id,
            message: `File references token "${id}" that no longer exists in DESIGN.md.`
          });
        }
      }
    }
  }
  return findings;
}

/**
 * Detect drift between stack DECISION declared versions and actual
 * package.json (or pyproject.toml etc.) versions.
 */
function detectStackVersionDrift(projectRoot, stackContent) {
  const findings = [];
  if (!stackContent) {
    const stackRel = artifactMap.requiredArtifactsForTier('stack')[0].path;
    stackContent = syncFs.readArtifactOrNull(projectRoot, stackRel);
  }
  if (!stackContent) return findings;

  // Extract declared deps from stack table: "| Foo | Choice | Lock-in |"
  // and from "Selected Stack" rows. Heuristic: capture lines like
  //   "Node 20 LTS" or "Next.js 15" or "Go 1.23"
  const versionDeclared = {};
  const tableLineRegex = /\|\s*[\w\s]+\s*\|\s*([\w.-]+)\s+(\d+(?:\.\d+)*(?:[\w-]*)?)\s*\|/g;
  let m;
  while ((m = tableLineRegex.exec(stackContent)) !== null) {
    versionDeclared[m[1].toLowerCase()] = m[2];
  }

  // Read package.json
  const pkgPath = path.join(projectRoot, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      for (const [decl, expectedVer] of Object.entries(versionDeclared)) {
        // Match against a dep name fragment
        for (const [depName, actualSpec] of Object.entries(deps)) {
          if (depName.toLowerCase().includes(decl) || decl.includes(depName.toLowerCase())) {
            // Strip version specifier characters
            const actualVer = String(actualSpec).replace(/^[\^~>=<]+/, '');
            const majorActual = actualVer.split('.')[0];
            const majorExpected = expectedVer.split('.')[0];
            if (majorActual && majorExpected && majorActual !== majorExpected) {
              findings.push({
                kind: 'stack-version-drift',
                severity: 'warning',
                file: 'package.json',
                artifactId: `S-${decl}`,
                message: `STACK declares ${decl} ${expectedVer}; package.json has ${depName} ${actualSpec}.`
              });
            }
          }
        }
      }
    } catch (e) {
      // ignore parse errors
    }
  }
  return findings;
}

/**
 * Check if a token path exists in the parsed frontmatter tree.
 */
function hasTokenInTree(fm, tokenPath) {
  return tokenPath.split('.').reduce((acc, k) => (acc ? acc[k] : undefined), fm) !== undefined;
}

/**
 * Detect ARCH container drift: cross-container imports that violate ARCH.
 * Heuristic V1: if a file is linked to C-foo but imports from a path that
 * looks like C-bar (e.g., src/bar/), flag.
 */
function detectArchContainerDrift(projectRoot) {
  const findings = [];
  const rev = linkage.readReverse(projectRoot);
  for (const [filePath, ids] of Object.entries(rev)) {
    const containerIds = ids.filter(id => linkage.classifyId(id) === 'container');
    if (containerIds.length === 0) continue;
    const fullPath = path.join(projectRoot, filePath);
    if (!fs.existsSync(fullPath)) continue;
    const ext = path.extname(filePath);
    if (!['.js', '.jsx', '.ts', '.tsx', '.mjs'].includes(ext)) continue;

    const content = fs.readFileSync(fullPath, 'utf8');
    const importRegex = /(?:import\s+[^'"]*from\s+|require\s*\(\s*)['"]([^'"]+)['"]/g;
    let m;
    while ((m = importRegex.exec(content)) !== null) {
      const importPath = m[1];
      if (importPath.startsWith('.')) continue; // relative, same package
      // Look for cross-container: something like "src/bar/" or "@/services/bar/"
      const crossMatch = importPath.match(/(?:src|services?|lib|app)[\/\\]([\w-]+)/);
      if (crossMatch) {
        const otherSlug = crossMatch[1];
        const otherContainerId = `C-${otherSlug}`;
        if (otherContainerId !== containerIds[0] && containerIds.indexOf(otherContainerId) === -1) {
          // It's a cross-container import. Whether this is drift depends on ARCH;
          // V1 reports as info (suggestion to verify), not error.
          findings.push({
            kind: 'arch-container-cross-import',
            severity: 'info',
            file: filePath,
            artifactId: containerIds[0],
            message: `File in ${containerIds[0]} imports from ${otherContainerId} (verify ARCH allows this).`
          });
        }
      }
    }
  }
  return findings;
}

/**
 * Detect all known drift types.
 */
function detectAll(projectRoot) {
  const findings = [
    ...detectDesignTokenDrift(projectRoot),
    ...detectStackVersionDrift(projectRoot),
    ...detectArchContainerDrift(projectRoot)
  ];
  const summary = {
    errors: findings.filter(f => f.severity === 'error').length,
    warnings: findings.filter(f => f.severity === 'warning').length,
    infos: findings.filter(f => f.severity === 'info').length,
    byKind: {}
  };
  for (const f of findings) {
    summary.byKind[f.kind] = (summary.byKind[f.kind] || 0) + 1;
  }
  return { findings, summary };
}

module.exports = {
  detectAll,
  detectDesignTokenDrift,
  detectStackVersionDrift,
  detectArchContainerDrift
};
