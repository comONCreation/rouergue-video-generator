# Repository Guidelines

## Project Structure & Module Organization

This repository is a Remotion + React + TypeScript project for rally map videos. Source code lives in `src/`. `src/Root.tsx` registers compositions, `src/SegmentOverlay.tsx` is the main overlay, and reusable UI pieces are in `src/components/`. Rally timing and segment metadata are centralized in `src/data/segments.ts`; keep formatting helpers in `src/format.ts`, theme constants in `src/theme.ts`, and typography settings in `src/typography.ts`.

Use the standard Remotion CLI for rendering. Static assets belong in `public/`. Generated videos go to `out/` and should not be treated as source.

## Build, Test, and Development Commands

- `npm install`: install locked dependencies from `package-lock.json`.
- `npm run dev`: open Remotion Studio for local preview and composition selection.
- `npm run build`: bundle the Remotion project.
- `npm run render -- S1-ES1`: render one segment with the Remotion CLI.
- `npm run render -- FULL-S1`: render the full continuous stage 1 composition.
- `npm run render -- S1-ES1 out/S1-ES1.mov`: render to an explicit output file.

## Coding Style & Naming Conventions

Use strict TypeScript and React function components. Follow the existing style: two-space indentation, double quotes, named exports, and clear prop types near the consuming component. Component files use PascalCase, such as `LeftPanel.tsx`; utility modules use camelCase or descriptive lowercase names, such as `format.ts`.

Segment IDs follow `S{stage}-ES{number}` and `S{stage}-L{number}`, for example `S1-ES1` or `S2-L03`. Keep shared colors, spacing, and layout dimensions in `theme.ts`.

## Testing Guidelines

No automated test script is currently configured. Before submitting changes, run `npm run build` and preview affected compositions with `npm run dev`. For visual or timing changes, render at least one representative segment with `npm run render -- <segment-id>` and inspect the generated video in `out/`.

## Commit & Pull Request Guidelines

History uses Conventional Commit-style prefixes, often in French: `feat:`, `fix(scope):`, `refactor:`, and `chore:`. Keep commits focused, for example `fix(output): preserve transparent background`.

Pull requests should include a concise summary, affected segment IDs or components, verification commands run, and screenshots or rendered samples when the overlay layout changes. Link related issues or source documents when updating rally timing data.

## Configuration Notes

Render settings are centralized in `remotion.config.ts`. Default CLI exports use ProRes HQ `.mov` files in `out/`.
