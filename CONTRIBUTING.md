# Contributing to PresenceMap

Thank you for your interest in contributing to PresenceMap!

## Development Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/KeithSobo/presence-map-card.git
   cd presence-map-card
   ```

2. Install dependencies:

   ```bash
   npm ci
   ```

3. Available Scripts:
   - `npm run build`: Bundles the production card artifact into `dist/presence-map-card.js`.
   - `npm run watch`: Builds and watches for changes with source maps.
   - `npm run typecheck`: Validates strict TypeScript types with `tsc --noEmit`.
   - `npm run lint`: Runs ESLint on all files.
   - `npm run lint:fix`: Automatically fixes ESLint errors.
   - `npm run format`: Verifies formatting with Prettier.
   - `npm run format:fix`: Formats files using Prettier.
   - `npm run test`: Executes unit and browser component tests using Vitest.
   - `npm run test:coverage`: Executes Vitest tests and validates the 80%+ code coverage gate.

## Quality Standards

- All new code must be written in TypeScript with strict typing.
- Unit tests must be included for new features, coordinate math, data adapters, and edge cases.
- Coverage for handwritten logic must remain at or above 80% across statements, branches, functions, and lines.
- Follow the guidelines outlined in `AGENTS.md`.

## Submitting Pull Requests

1. Create a feature branch from `main`.
2. Ensure `npm run format`, `npm run lint`, `npm run typecheck`, `npm run test:coverage`, and `npm run build` all pass cleanly.
3. Open a Pull Request describing your changes, motivation, and any testing performed with actual sensors or simulated demo data.
