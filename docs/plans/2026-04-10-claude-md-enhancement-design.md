# CLAUDE.md Enhancement Design

**Date:** 2026-04-10
**Goal:** Reduce Agent exploration time, enforce UI component usage, and strengthen architecture awareness — all through documentation improvements.

## Problem Statement

1. **Exploration overhead:** When given a development task, Agents spend time running Glob/Grep to explore project structure before they can code. The current CLAUDE.md (72 lines) is too high-level — it tells Agents that docs exist but doesn't give enough architecture context to skip exploration.

2. **UI component underuse:** Agents hand-write Tailwind markup (`<div className="rounded-lg border p-4">`) instead of using pre-installed shadcn/ui (frontend) and React Native Reusables (mobile) components (`<Card>`). They also skip complex installed components (Dialog, Sheet, Select) because they don't know they're available.

3. **Weak guide references:** The current `@docs/xxx.md` references in CLAUDE.md are passive ("Before working on any area, read the relevant guide"). Agents don't always follow this, especially when they think they can infer the patterns.

## Design

Three changes, all documentation-only (no code changes):

### Change 1: Add Architecture Quick Reference to CLAUDE.md

Add a new section after "Architecture" with complete directory trees for all four packages (backend, frontend, mobile, contract). Each file gets a one-line description.

**Key directive at the top of the section:**
> Do NOT explore the project structure with Glob/Grep. The complete structure is documented below.

This eliminates the information gap that triggers exploration. ~60 lines.

### Change 2: Add UI Component Constraint to Key Conventions

Add convention #9 to CLAUDE.md:

> **Use pre-installed UI components. Do NOT hand-write equivalents.**
> - Frontend: shadcn/ui in `@/components/ui/`. Full component list and imports in @docs/frontend.md.
> - Mobile: React Native Reusables in `@/components/ui/`. Full component list and imports in @docs/mobile.md.
> - If not installed, add via CLI. Never hand-write a Card, Button, Dialog, Input, etc.

Then add detailed component tables (with import paths) to:
- `docs/frontend.md` — all 23 installed shadcn/ui components with full import statements
- `docs/mobile.md` — top 15 common components with full imports, remaining 17 as name-only list

### Change 3: Strengthen Guide References

Replace the passive bullet list with a command-style table:

> Read the relevant guide BEFORE writing any code in that area. The guides contain implementation patterns, code examples, and component APIs that you MUST follow.

| Area | Guide | When to read |
|------|-------|-------------|
| Backend | @docs/backend.md | Implementing handlers, adding DB tables, auth, AI, tests |
| Frontend | @docs/frontend.md | Any UI work in `apps/frontend/` — includes UI component list with imports |
| Mobile | @docs/mobile.md | Any UI work in `apps/mobile/` — includes UI component list with imports |
| oRPC | @docs/orpc.md | Client setup, streaming, error handling, TanStack Query |
| Testing | @docs/testing.md | Writing or modifying tests |

## Files to Change

1. **`CLAUDE.md`** — Add architecture quick reference (~60 lines), convention #9, strengthen guide references. Target: ~200 lines total (from 72).

2. **`docs/frontend.md`** — Add "Installed UI Components — Quick Reference" section with import table for all 23 components. Add stronger "MUST use" language.

3. **`docs/mobile.md`** — Add "Installed UI Components — Quick Reference" section. Top 15 with imports, remaining 17 as name list. Add stronger "MUST use" language.

## What This Does NOT Change

- No code changes
- No new files added to components/
- docs/backend.md, docs/orpc.md, docs/testing.md unchanged
- The detailed implementation guides in docs/ remain the authoritative reference
