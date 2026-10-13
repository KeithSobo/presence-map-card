import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

export function getVersion(
  rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
) {
  const versionTsPath = path.join(rootDir, 'src', 'config', 'version.ts');
  const content = fs.readFileSync(versionTsPath, 'utf8');
  const match = content.match(/PRESENCE_MAP_VERSION\s*=\s*['"]([^'"]+)['"]/);
  if (!match) {
    throw new Error(`Could not find PRESENCE_MAP_VERSION in ${versionTsPath}`);
  }
  return match[1];
}

export function generateVersionJson(
  rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
) {
  const distDir = path.join(rootDir, 'dist');
  const targetFile = path.join(distDir, 'version.json');

  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  const version = getVersion(rootDir);
  const payload = {
    version,
  };

  fs.writeFileSync(targetFile, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  return { path: targetFile, version };
}

const currentFilePath = fileURLToPath(import.meta.url);
const executedFilePath = process.argv[1] ? path.resolve(process.argv[1]) : '';

if (executedFilePath === currentFilePath) {
  const result = generateVersionJson();
  console.log(`Generated dist/version.json with version ${result.version}`);
}
