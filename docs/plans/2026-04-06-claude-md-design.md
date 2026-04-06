# Design: CLAUDE.md — AI Coding Guide for oRPC Template

**Date:** 2026-04-06  
**Status:** Approved

## Problem

The template has high-quality developer docs (`docs/*.md`) but no single entry point that AI coding tools automatically load. A developer cloning the repo and opening it in Claude Code (or any tool that reads `CLAUDE.md`) gets no project context until they manually point the AI at the right files.

## Goal

Create a `CLAUDE.md` at the repo root that:
- Auto-loads into AI coding tools on session start
- Gives enough context to work on any part of the stack immediately
- Routes the AI to the right detailed doc for each area

## Non-Goals

- Replacing or duplicating `docs/*.md` — those stay as-is
- Covering every API or library detail — that belongs in the docs
- Anything Cursor/Windsurf/Copilot-specific (out of scope for now)

## Design

### Five Sections

**1. Project Overview**  
One paragraph: monorepo, oRPC contract-first, three apps (backend/frontend/mobile), Bun runtime. Enough to orient any AI tool without reading anything else.

**2. Architecture at a Glance**  
The single most important mental model: `packages/contract` is the source of truth. Backend implements it, frontend/mobile consume it. Include the data flow diagram (text-based), ports, and key paths.

**3. Development Guides**  
Explicit `@file` references so Claude Code pulls in the right doc automatically:
- Backend work → `@docs/backend.md`
- Frontend work → `@docs/frontend.md`
- Mobile work → `@docs/mobile.md`
- oRPC patterns → `@docs/orpc.md`

**4. Key Conventions**  
Rules that apply regardless of which module you're in — things an AI must know before writing a single line:
- New API = define contract first in `packages/contract`
- No raw `fetch` — use the oRPC client
- Biome for lint/format, not ESLint/Prettier
- Drizzle for all DB access, no raw SQL
- Zod validation lives in the contract, not in handlers

**5. Commands**  
Quick-reference table of all `bun run *` commands. Same as README but surfaced here so AI tools can suggest the right command without reading README.

### What Stays Out of CLAUDE.md

- Code examples (those are in `docs/*.md`)
- Full tech stack tables (README covers this)
- Library-specific usage details (Drizzle schema syntax, Better Auth config, etc.)

## File Location

`CLAUDE.md` — repo root. Claude Code discovers it automatically; other tools can be pointed at it manually.
