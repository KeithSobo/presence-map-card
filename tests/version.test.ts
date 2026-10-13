import { describe, it, expect } from 'vitest';
import { PRESENCE_MAP_VERSION } from '../src/config/version';
import { generateVersionJson } from '../scripts/generate-version.js';
import { validateRelease } from '../scripts/validate-release.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

interface FixtureOptions {
  srcVersion?: string;
  distVersion?: string;
  createDistCardJs?: boolean;
  createDistVersionJson?: boolean;
  createSrcVersionTs?: boolean;
  malformedVersionJson?: boolean;
}

function createFixture(options?: FixtureOptions) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pmc-version-fixture-'));

  const {
    srcVersion = PRESENCE_MAP_VERSION,
    distVersion = PRESENCE_MAP_VERSION,
    createDistCardJs = true,
    createDistVersionJson = true,
    createSrcVersionTs = true,
    malformedVersionJson = false,
  } = options ?? {};

  if (createSrcVersionTs) {
    const srcDir = path.join(tmpDir, 'src', 'config');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(
      path.join(srcDir, 'version.ts'),
      `export const PRESENCE_MAP_VERSION = '${srcVersion}';\n`,
      'utf8'
    );
  }

  const distDir = path.join(tmpDir, 'dist');
  if (createDistCardJs || createDistVersionJson || malformedVersionJson) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  if (createDistCardJs) {
    fs.writeFileSync(path.join(distDir, 'presence-map-card.js'), '// compiled bundle\n', 'utf8');
  }

  if (malformedVersionJson) {
    fs.writeFileSync(path.join(distDir, 'version.json'), '{ malformed json content', 'utf8');
  } else if (createDistVersionJson) {
    fs.writeFileSync(
      path.join(distDir, 'version.json'),
      JSON.stringify({ version: distVersion }, null, 2) + '\n',
      'utf8'
    );
  }

  return {
    rootDir: tmpDir,
    cleanup: () => {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // ignore cleanup errors
      }
    },
  };
}

describe('CalVer Versioning and Release Validation', () => {
  it('conforms to CalVer format (year.month.change or year.month.change.dev)', () => {
    // Expected format: year.m.change[.dev]
    const calverRegex = /^\d{4}\.\d{1,2}\.\d+(\.\d+)?$/;
    expect(calverRegex.test(PRESENCE_MAP_VERSION)).toBe(true);
  });

  it('generates dist/version.json with the matching version', () => {
    const fixture = createFixture({ createDistVersionJson: false, createDistCardJs: false });
    try {
      const result = generateVersionJson(fixture.rootDir);
      expect(result.version).toBe(PRESENCE_MAP_VERSION);
      expect(fs.existsSync(result.path)).toBe(true);

      const content = JSON.parse(fs.readFileSync(result.path, 'utf8'));
      expect(content.version).toBe(PRESENCE_MAP_VERSION);
    } finally {
      fixture.cleanup();
    }
  });

  it('validates release tag successfully against built artifacts', () => {
    const fixture = createFixture();
    try {
      const result = validateRelease(`v${PRESENCE_MAP_VERSION}`, fixture.rootDir);
      expect(result.valid).toBe(true);
      expect(result.version).toBe(PRESENCE_MAP_VERSION);
      expect(result.tag).toBe(`v${PRESENCE_MAP_VERSION}`);
    } finally {
      fixture.cleanup();
    }
  });

  it('throws when tag does not start with v', () => {
    const fixture = createFixture();
    try {
      expect(() => validateRelease(PRESENCE_MAP_VERSION, fixture.rootDir)).toThrow(
        /must start with "v"/
      );
    } finally {
      fixture.cleanup();
    }
  });

  it('throws when tag is not a string or empty', () => {
    const fixture = createFixture();
    try {
      expect(() => validateRelease('', fixture.rootDir)).toThrow(
        /Git tag must be provided as a string/
      );
    } finally {
      fixture.cleanup();
    }
  });

  it('throws when tag does not match CalVer format', () => {
    const fixture = createFixture();
    try {
      expect(() => validateRelease('vinvalid.tag', fixture.rootDir)).toThrow(
        /must match a valid CalVer format/
      );
    } finally {
      fixture.cleanup();
    }
  });

  it('throws on version mismatch', () => {
    const fixture = createFixture();
    try {
      expect(() => validateRelease('v2099.1.1', fixture.rootDir)).toThrow(
        /Version mismatch: src\/config\/version\.ts is "[^"]+" but Git tag expects "2099\.1\.1"/
      );
    } finally {
      fixture.cleanup();
    }
  });

  it('throws on source vs dist/version.json mismatch', () => {
    const fixture = createFixture({ distVersion: '2025.1.1' });
    try {
      expect(() => validateRelease(`v${PRESENCE_MAP_VERSION}`, fixture.rootDir)).toThrow(
        /Version mismatch: src\/config\/version\.ts is "[^"]+" but dist\/version\.json is "2025\.1\.1"/
      );
    } finally {
      fixture.cleanup();
    }
  });

  it('throws when dist/version.json is missing', () => {
    const fixture = createFixture({ createDistVersionJson: false });
    try {
      expect(() => validateRelease(`v${PRESENCE_MAP_VERSION}`, fixture.rootDir)).toThrow(
        /dist\/version\.json not found/
      );
    } finally {
      fixture.cleanup();
    }
  });

  it('throws when dist/presence-map-card.js is missing', () => {
    const fixture = createFixture({ createDistCardJs: false });
    try {
      expect(() => validateRelease(`v${PRESENCE_MAP_VERSION}`, fixture.rootDir)).toThrow(
        /dist\/presence-map-card\.js not found/
      );
    } finally {
      fixture.cleanup();
    }
  });

  it('throws when src/config/version.ts is missing', () => {
    const fixture = createFixture({ createSrcVersionTs: false });
    try {
      expect(() => validateRelease(`v${PRESENCE_MAP_VERSION}`, fixture.rootDir)).toThrow(
        /src\/config\/version\.ts not found/
      );
    } finally {
      fixture.cleanup();
    }
  });

  it('throws when dist/version.json is malformed', () => {
    const fixture = createFixture({ malformedVersionJson: true });
    try {
      expect(() => validateRelease(`v${PRESENCE_MAP_VERSION}`, fixture.rootDir)).toThrow(
        /Failed to parse dist\/version\.json/
      );
    } finally {
      fixture.cleanup();
    }
  });
});
