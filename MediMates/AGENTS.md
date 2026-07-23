# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project Snapshot

- Mobile app: Expo + React Native + Expo Router + TypeScript.
- Backend: Firebase (Auth, Firestore, Storage, Functions).
- Monorepo-style layout: app code at repo root, Cloud Functions under `functions/`.

Primary reference docs:
- [README.md](README.md)

## Workspace Map

- `app/`: File-based routes (Expo Router). Route groups include `(auth)` and `(tabs)`.
- `src/features/`: Feature modules (auth, meds, chat, mates, payments, etc.).
- `src/design-system/`: Tokens, theme provider, and reusable UI components.
- `src/lib/`: Firebase client init, React Query client, utilities.
- `src/stores/`: Zustand stores for auth and UI state.
- `functions/src/`: Firebase Cloud Functions source (compiled to `functions/lib/`).

Important entry points:
- `app/_layout.tsx`: Global providers, auth guard, root navigation.
- `src/lib/firebase.ts`: Firebase client singleton initialization.
- `functions/src/index.ts`: Functions export surface.

## Commands Agents Should Use

Run from repository root:

- Install deps: `npm install`
- Start app: `npm run start`
- Lint app: `npm run lint`
- Typecheck app: `npm run typecheck`

Run from `functions/` when touching Cloud Functions:

- Install deps: `npm install`
- Build: `npm run build`
- Local emulator: `npm run serve`
- Deploy functions: `npm run deploy`

## Coding Conventions

- TypeScript is strict. Prefer explicit types for public interfaces and shared data models.
- Use path alias imports via `@/` for app code.
- Keep route screens in `app/` thin. Put reusable logic in `src/features/*`, `src/lib/*`, or `src/stores/*`.
- Use existing design tokens/components from `src/design-system/` before adding new styling patterns.
- Keep data access and side effects in hooks/services, not directly in presentational components.

## Feature and Data Boundaries

- Auth/profile state is centralized in Zustand (`src/stores/auth-store.ts`).
- Server state and async fetching should align with React Query patterns already used in the app.
- Firebase Cloud Functions changes must be made in `functions/src/` only, then compiled to `functions/lib/` via build script.

## Validation Checklist Before Finishing

- If app code changed: run `npm run lint` and `npm run typecheck` at root.
- If Cloud Functions changed: run `npm run build` in `functions/`.
- Keep changes focused; avoid broad refactors unless requested.

## Agent Behavior Notes

- Prefer minimal, surgical edits that follow existing folder and naming patterns.
- Do not introduce new frameworks or architectural patterns unless explicitly requested.
- When uncertain about routing or provider behavior, verify against `app/_layout.tsx` and current feature modules before editing.