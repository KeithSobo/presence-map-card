import { describe, it, expect } from 'vitest';
import { PRESENCE_MAP_VERSION } from '../src/config/version';
import { generateVersionJson } from '../scripts/generate-version.js';
import { validateRelease } from '../scripts/validate-release.js';
import fs from 'node:fs';

describe('CalVer Versioning and Release Validation', () => {
  it('conforms to CalVer format (year.month.change or year.month.change.dev)', () => {
    // Expected format: year.m.change[.dev]
    const calverRegex = /^\d{4}\.\d{1,2}\.\d+(\.\d+)?$/;
    expect(calverRegex.test(PRESENCE_MAP_VERSION)).toBe(true);
  });

  it('generates dist/version.json with the matching version', () => {
    const result = generateVersionJson();
    expect(result.version).toBe(PRESENCE_MAP_VERSION);
    expect(fs.existsSync(result.path)).toBe(true);

    const content = JSON.parse(fs.readFileSync(result.path, 'utf8'));
    expect(content.version).toBe(PRESENCE_MAP_VERSION);
  });

  it('validates release tag successfully against built artifacts', () => {
    const result = validateRelease(`v${PRESENCE_MAP_VERSION}`);
    expect(result.valid).toBe(true);
    expect(result.version).toBe(PRESENCE_MAP_VERSION);
  });

  it('throws when tag does not start with v', () => {
    expect(() => validateRelease(PRESENCE_MAP_VERSION)).toThrow(/must start with "v"/);
  });

  it('throws on version mismatch', () => {
    expect(() => validateRelease('v2099.1.1')).toThrow(/Version mismatch/);
  });
});
