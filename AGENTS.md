# Repository Guidelines

## Project Structure & Module Organization

This repository is a Remotion + React + TypeScript project for transparent rally video overlays. Source code lives in `src/`. `src/Root.tsx` registers compositions, `src/SegmentOverlay.tsx` is the main overlay, and reusable UI pieces are in `src/components/`. Rally timing and segment metadata are centralized in `src/data/segments.ts`; keep formatting helpers in `src/format.ts`, theme constants in `src/theme.ts`, and typography settings in `src/typography.ts`.

Rendering utilities are in `scripts/`: `render-one.ts` renders one segment and `render-all.ts` renders batches. Static assets belong in `public/`. Generated videos go to `out/` and should not be treated as source.

## Build, Test, and Development Commands

- `npm install`: install locked dependencies from `package-lock.json`.
- `npm run dev`: open Remotion Studio for local preview and composition selection.
- `npm run build`: bundle the Remotion project.
- `npm run render:one -- S1-ES1`: render one segment for quick iteration.
- `npm run render:one -- S1-ES1 --duration 15`: render with a custom duration.
- `npm run render:all -- --duration 45`: render every segment with a shared duration.
- `npm run render:all -- --only S1-ES1,S2-ES15`: render a targeted segment list.

## Coding Style & Naming Conventions

Use strict TypeScript and React function components. Follow the existing style: two-space indentation, double quotes, named exports, and clear prop types near the consuming component. Component files use PascalCase, such as `LeftPanel.tsx`; utility modules use camelCase or descriptive lowercase names, such as `format.ts`.

Segment IDs follow `S{stage}-ES{number}` and `S{stage}-L{number}`, for example `S1-ES1` or `S2-L03`. Keep shared colors, spacing, and layout dimensions in `theme.ts`.

## Testing Guidelines

No automated test script is currently configured. Before submitting changes, run `npm run build` and preview affected compositions with `npm run dev`. For visual or timing changes, render at least one representative segment with `npm run render:one -- <segment-id>` and inspect the alpha overlay in `out/`.

## Commit & Pull Request Guidelines

History uses Conventional Commit-style prefixes, often in French: `feat:`, `fix(scope):`, `refactor:`, and `chore:`. Keep commits focused, for example `fix(output): preserve transparent background`.

Pull requests should include a concise summary, affected segment IDs or components, verification commands run, and screenshots or rendered samples when the overlay layout changes. Link related issues or source documents when updating rally timing data.

## Configuration Notes

Optional per-segment durations can be placed in a root `durations.json` file. Keep local duration experiments out of committed source unless they are intended as canonical render settings.
