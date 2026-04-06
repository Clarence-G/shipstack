# Design: Rename to shipstack + Rewrite README

**Date:** 2026-04-06  
**Status:** Approved

## Changes

### 1. Project Rename: `orpc-template` → `shipstack`

- GitHub repo name: `shipstack`
- Root `package.json` name field: `shipstack`
- README title: `shipstack`

### 2. README Rewrite

Replace the current detailed README with a medium-density format targeting indie hackers.

**Keep:**
- Tech stack table (condensed, no descriptions)
- Architecture diagram (text, existing)
- Quick Start steps
- Commands table

**Remove:**
- Features section (Env Validation, Logging, Dark Mode, Error Handling, etc.)
- Environment Variables full table (this info belongs in `.env.example` comments)
- Extending the Scaffold section (belongs in `docs/backend.md`)
- Architecture Decisions section (belongs in `CLAUDE.md` / docs)

**New README structure:**

```
# shipstack

<tagline>

<tech badges>

## Why

<5 bullet highlights>

## Stack

<condensed table>

## Architecture

<existing text diagram>

## Quick Start

<5 steps: clone, install, env, migrate, dev>

## Commands

<commands table, same as current>

## Documentation

<links to docs/*.md>
```

### Tagline

> The opinionated full-stack starter for indie hackers.  
> Type-safe from contract to client. Web + Mobile + Backend in one repo.

### 5 Highlights

1. **Contract-first API** — One Zod schema shared across backend, web, and mobile. If types don't match, `tsc` catches it.
2. **Three apps, one repo** — React Web + Expo Mobile + Hono Backend. No setup from scratch.
3. **Auth included** — Better Auth with email/password. Expo SecureStore sessions on mobile. Ready to extend.
4. **AI + Storage ready** — Streaming AI chat via AI SDK + S3 presigned uploads. Uncomment and configure.
5. **AI coding ready** — CLAUDE.md + per-area docs. Coding agents know the stack on first load.

### Tech Badges

Inline shields.io badges for: Bun · Hono · oRPC · Drizzle · Better Auth · React · Expo · TypeScript
