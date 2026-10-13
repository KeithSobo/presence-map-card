import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const CALVER_RELEASE_REGEX = /^\d{4}\.\d{1,2}\.\d+(\.\d+)?$/;

export function validateRelease(
  tag,
  rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
) {
  if (!tag || typeof tag !== 'string') {
    throw new Error('Git tag must be provided as a string.');
  }

  if (!tag.startsWith('v')) {
    throw new Error(`Git tag "${tag}" must start with "v" (e.g. v2026.10.1).`);
  }

  const expectedVersion = tag.slice(1);
  if (!CALVER_RELEASE_REGEX.test(expectedVersion)) {
    throw new Error(
      `Git tag "${tag}" must match a valid CalVer format (e.g. v2026.10.1 or v2026.10.1.0).`
    );
  }

  const distVersionJsonPath = path.join(rootDir, 'dist', 'version.json');
  if (!fs.existsSync(distVersionJsonPath)) {
    throw new Error(`dist/version.json not found at ${distVersionJsonPath}`);
  }

  const distCardJsPath = path.join(rootDir, 'dist', 'presence-map-card.js');
  if (!fs.existsSync(distCardJsPath)) {
    throw new Error(`dist/presence-map-card.js not found at ${distCardJsPath}`);
  }

  let distVersion;
  try {
    const raw = fs.readFileSync(distVersionJsonPath, 'utf8');
    const parsed = JSON.parse(raw);
    distVersion = parsed.version;
  } catch (err) {
    throw new Error(`Failed to parse dist/version.json: ${err.message}`);
  }

  if (!distVersion) {
    throw new Error('dist/version.json does not contain a "version" property.');
  }

  const versionTsPath = path.join(rootDir, 'src', 'config', 'version.ts');
  if (!fs.existsSync(versionTsPath)) {
    throw new Error(`src/config/version.ts not found at ${versionTsPath}`);
  }

  const versionTsContent = fs.readFileSync(versionTsPath, 'utf8');
  const match = versionTsContent.match(/PRESENCE_MAP_VERSION\s*=\s*['"]([^'"]+)['"]/);
  if (!match) {
    throw new Error(`Could not locate PRESENCE_MAP_VERSION in ${versionTsPath}`);
  }
  const srcVersion = match[1];

  if (!CALVER_RELEASE_REGEX.test(srcVersion)) {
    throw new Error(
      `src/config/version.ts version "${srcVersion}" must match a valid CalVer format (e.g. 2026.10.1).`
    );
  }

  if (srcVersion !== distVersion) {
    throw new Error(
      `Version mismatch: src/config/version.ts is "${srcVersion}" but dist/version.json is "${distVersion}".`
    );
  }

  if (srcVersion !== expectedVersion) {
    throw new Error(
      `Version mismatch: src/config/version.ts is "${srcVersion}" but Git tag expects "${expectedVersion}".`
    );
  }

  return {
    valid: true,
    version: srcVersion,
    tag,
  };
}

const currentFilePath = fileURLToPath(import.meta.url);
const executedFilePath = process.argv[1] ? path.resolve(process.argv[1]) : '';

if (executedFilePath === currentFilePath) {
  const tag = process.argv[2];
  if (!tag) {
    console.error('Usage: node scripts/validate-release.js <tag>');
    process.exit(1);
  }

  try {
    const result = validateRelease(tag);
    console.log(
      `Release validation succeeded: Tag ${result.tag} matches version ${result.version} and dist artifacts are valid.`
    );
  } catch (err) {
    console.error(`Release validation failed: ${err.message}`);
    process.exit(1);
  }
}
