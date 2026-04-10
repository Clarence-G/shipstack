# CLAUDE.md Enhancement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve CLAUDE.md and docs so Agents can start coding immediately without exploring, and always use pre-installed UI components.

**Architecture:** Three documentation-only changes: (1) inline architecture quick-reference in CLAUDE.md, (2) UI component constraint in Key Conventions + import tables in frontend.md/mobile.md, (3) stronger guide reference directives.

**Tech Stack:** Markdown only. No code changes.

---

### Task 1: Add Architecture Quick Reference to CLAUDE.md

**Files:**
- Modify: `CLAUDE.md:18-28` (replace "Development Guides" section and insert new section before it)

**Step 1: Add the Architecture Quick Reference section**

Insert the following after the existing `Architecture` section (after line 18, before `## Development Guides`):

```markdown
## Architecture Quick Reference

Do NOT explore the project structure with Glob/Grep. The complete structure is documented below. Read the relevant guide for the area you're working in, then start coding.

### Backend (`apps/backend/src/`)

```
├── index.ts              — Hono entry: CORS, auth routes (/api/auth/*), oRPC handler (/rpc/*)
├── orpc.ts               — implement(contract), InitialContext, authMiddleware, optionalAuthMiddleware
├── routers/
│   ├── index.ts          — Root router (assembles all domain routers)
│   ├── auth.router.ts    — auth.me handler
│   └── ai.router.ts      — ai.chat streaming handler
├── db/
│   ├── index.ts          — Drizzle client (postgres.js + schema)
│   ├── schema.ts         — All table definitions (Better Auth + business)
│   ├── seed-base.ts      — Base seed data (used by tests and dev seed)
│   └── seed.ts           — Dev seed script
├── lib/
│   ├── auth.ts           — Better Auth config (drizzle adapter, expo plugin)
│   ├── ai.ts             — AI model factory (OpenAI-compatible)
│   ├── env.ts            — Env var validation (Zod schema)
│   ├── logger.ts         — Pino logger (pretty dev, JSON prod)
│   └── s3.ts             — S3 client (MinIO/AWS/R2)
└── test/
    ├── setup.ts          — createTestEnv() — PGLite + typed oRPC client
    └── fixtures.ts       — createTestUser(), createTestSession()
```

### Frontend (`apps/frontend/src/`)

```
├── main.tsx              — ReactDOM root, QueryClient, BrowserRouter, Toaster
├── app.tsx               — Route definitions
├── app.css               — Tailwind v4 + OKLCH theme variables
├── layouts/
│   └── root.layout.tsx   — Header nav + <Outlet />
├── pages/                — Route pages (thin wrappers around blocks)
├── components/
│   ├── ui/               — shadcn/ui primitives (MUST use — see convention 9)
│   ├── block/            — Page-level blocks (login-form, signup-form)
│   ├── biz/              — Business components (chat)
│   └── shared/           — Shared reusable components
├── hooks/                — Custom hooks (use-upload, etc.)
└── lib/
    ├── orpc.ts           — oRPC client + TanStack Query utils
    ├── auth-client.ts    — Better Auth browser client (throwOnError wrappers)
    ├── logger.ts         — Pino browser logger
    └── utils.ts          — cn() helper (clsx + tailwind-merge)
```

### Mobile (`apps/mobile/src/`)

```
├── global.css            — Uniwind Tailwind v4 + OKLCH theme variables
├── app/                  — Expo Router file routes
│   ├── _layout.tsx       — Root: ThemeProvider + QueryProvider + PortalHost
│   ├── index.tsx         — Home screen (auth guard)
│   └── auth/             — Auth group (login, register)
├── components/
│   ├── ui/               — RN Reusables components (MUST use — see convention 9)
│   └── block/            — Block components (sign-in-form, sign-up-form, user-menu)
└── lib/
    ├── orpc.ts           — oRPC client (cookie-based auth via getCookie())
    ├── auth-client.ts    — Better Auth Expo client (SecureStore sessions)
    ├── theme.ts          — Navigation theme colors
    └── utils.ts          — cn() helper (clsx + tailwind-merge)
```

### Contract (`packages/contract/src/`)

```
├── index.ts              — Root contract { auth, ai, storage }
├── auth.contract.ts      — Auth procedures (me)
├── ai.contract.ts        — AI procedures (chat streaming)
└── storage.contract.ts   — File storage procedures (requestUploadUrl, confirmUpload, getDownloadUrl)
```
```

**Step 2: Verify the edit**

Run: `wc -l CLAUDE.md`
Expected: approximately 140+ lines (was 72)

**Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add architecture quick reference to CLAUDE.md"
```

---

### Task 2: Strengthen Development Guides References in CLAUDE.md

**Files:**
- Modify: `CLAUDE.md:24-31` (the existing "Development Guides" section)

**Step 1: Replace the passive bullet list with command-style table**

Replace:
```markdown
## Development Guides

Before working on any area, read the relevant guide:

- **Backend** (`apps/backend`): @docs/backend.md
- **Frontend** (`apps/frontend`): @docs/frontend.md
- **Mobile** (`apps/mobile`): @docs/mobile.md
- **oRPC patterns** (client, streaming, errors): @docs/orpc.md
- **Testing** (writing & running tests): @docs/testing.md
```

With:
```markdown
## Development Guides

Read the relevant guide BEFORE writing any code in that area. The guides contain implementation patterns, code examples, and component APIs that you MUST follow.

| Area | Guide | When to read |
|------|-------|-------------|
| Backend | @docs/backend.md | Implementing handlers, adding DB tables, auth, AI, tests |
| Frontend | @docs/frontend.md | Any UI work in `apps/frontend/` — includes full UI component list with imports |
| Mobile | @docs/mobile.md | Any UI work in `apps/mobile/` — includes full UI component list with imports |
| oRPC | @docs/orpc.md | Client setup, streaming, error handling, TanStack Query |
| Testing | @docs/testing.md | Writing or modifying tests |
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: strengthen guide references in CLAUDE.md"
```

---

### Task 3: Add UI Component Constraint (Convention 9) to CLAUDE.md

**Files:**
- Modify: `CLAUDE.md` (Key Conventions section, after item 8)

**Step 1: Add convention 9 after the existing convention 8**

After the line about interactive elements (convention 8), add:

```markdown
9. **Use pre-installed UI components. Do NOT hand-write equivalents.** Frontend uses shadcn/ui, mobile uses React Native Reusables — both in `@/components/ui/`. Check the installed component list in the relevant guide (@docs/frontend.md or @docs/mobile.md) BEFORE writing any UI. If a component is not installed, add it via CLI (`bunx shadcn@latest add <name>` for frontend, `npx @react-native-reusables/cli@latest add <name> --yes` for mobile). Never hand-write a Card, Button, Dialog, Input, Select, etc. when the library provides one.
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add UI component constraint as convention 9"
```

---

### Task 4: Add Component Import Quick Reference to frontend.md

**Files:**
- Modify: `docs/frontend.md:187-223` (replace "Installed components" subsection)

**Step 1: Replace the "Installed components" subsection with import-enriched version**

Replace the existing "### Installed components" section (lines 187-223) with:

```markdown
### Installed Components — Quick Reference

**MANDATORY:** Use these components for ALL UI. Never hand-write Tailwind equivalents (e.g., never write `<div className="rounded-lg border p-4">` when `<Card>` exists). If a component you need is not listed, add it via `bunx shadcn@latest add <name>`.

**Primitives (ui/):**

| Component | Import | Key exports |
|-----------|--------|------------|
| alert | `from '@/components/ui/alert'` | Alert, AlertTitle, AlertDescription |
| avatar | `from '@/components/ui/avatar'` | Avatar, AvatarImage, AvatarFallback |
| badge | `from '@/components/ui/badge'` | Badge |
| button | `from '@/components/ui/button'` | Button (variants: default, outline, secondary, ghost, destructive, link; sizes: default, xs, sm, lg, icon) |
| card | `from '@/components/ui/card'` | Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction |
| checkbox | `from '@/components/ui/checkbox'` | Checkbox |
| dialog | `from '@/components/ui/dialog'` | Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose |
| dropdown-menu | `from '@/components/ui/dropdown-menu'` | DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator |
| field | `from '@/components/ui/field'` | Field, FieldGroup, FieldLabel, FieldDescription, FieldError |
| input | `from '@/components/ui/input'` | Input |
| label | `from '@/components/ui/label'` | Label |
| popover | `from '@/components/ui/popover'` | Popover, PopoverTrigger, PopoverContent |
| scroll-area | `from '@/components/ui/scroll-area'` | ScrollArea, ScrollBar |
| select | `from '@/components/ui/select'` | Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup |
| separator | `from '@/components/ui/separator'` | Separator |
| sheet | `from '@/components/ui/sheet'` | Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose |
| skeleton | `from '@/components/ui/skeleton'` | Skeleton |
| switch | `from '@/components/ui/switch'` | Switch |
| table | `from '@/components/ui/table'` | Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableFooter, TableCaption |
| tabs | `from '@/components/ui/tabs'` | Tabs, TabsList, TabsTrigger, TabsContent |
| textarea | `from '@/components/ui/textarea'` | Textarea |
| tooltip | `from '@/components/ui/tooltip'` | Tooltip, TooltipTrigger, TooltipContent (requires TooltipProvider — already in root layout) |
| sonner | `from 'sonner'` | toast (Toaster already mounted in main.tsx) |

Add more: `cd apps/frontend && bunx shadcn@latest add <component-name>`

**Blocks (block/):**

| Block | Based on | Purpose |
|-------|---------|---------|
| `login-form` | shadcn `login-01` | Login card with `signIn.email()` + error/loading + `onSuccess` callback |
| `signup-form` | shadcn `signup-01` | Signup card with `signUp.email()` + error/loading + `onSuccess` callback |
```

**Step 2: Commit**

```bash
git add docs/frontend.md
git commit -m "docs: add component import quick reference to frontend.md"
```

---

### Task 5: Add Component Import Quick Reference to mobile.md

**Files:**
- Modify: `docs/mobile.md:163-166` (add a new subsection before "### Using existing components")

**Step 1: Insert import quick reference before the "Using existing components" subsection**

After `## UI Components (React Native Reusables)` heading (line 163) and its description (line 165), insert before `### Using existing components`:

```markdown
### Installed Components — Quick Reference

**MANDATORY:** Use these components for ALL UI. Never hand-write Tailwind equivalents. If a component you need is not listed, add it via `npx @react-native-reusables/cli@latest add <name> --yes`.

**Common components (with imports):**

| Component | Import | Key exports |
|-----------|--------|------------|
| button | `from '@/components/ui/button'` | Button (variants: default, destructive, outline, secondary, ghost, link) |
| text | `from '@/components/ui/text'` | Text (variants: default, h1-h4, p, lead, large, small, muted, blockquote, code) — MUST use this inside RN Reusables components, not RN Text |
| input | `from '@/components/ui/input'` | Input |
| label | `from '@/components/ui/label'` | Label |
| card | `from '@/components/ui/card'` | Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter |
| dialog | `from '@/components/ui/dialog'` | Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose |
| alert-dialog | `from '@/components/ui/alert-dialog'` | AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogAction, AlertDialogCancel |
| dropdown-menu | `from '@/components/ui/dropdown-menu'` | DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem |
| select | `from '@/components/ui/select'` | Select, SelectTrigger, SelectValue, SelectContent, SelectItem |
| checkbox | `from '@/components/ui/checkbox'` | Checkbox |
| switch | `from '@/components/ui/switch'` | Switch |
| tabs | `from '@/components/ui/tabs'` | Tabs, TabsList, TabsTrigger, TabsContent |
| avatar | `from '@/components/ui/avatar'` | Avatar, AvatarImage, AvatarFallback |
| badge | `from '@/components/ui/badge'` | Badge |
| separator | `from '@/components/ui/separator'` | Separator |
| skeleton | `from '@/components/ui/skeleton'` | Skeleton |
| progress | `from '@/components/ui/progress'` | Progress |
| tooltip | `from '@/components/ui/tooltip'` | Tooltip, TooltipTrigger, TooltipContent |

**Also installed (same import pattern `from '@/components/ui/<name>'`):**
accordion, alert, aspect-ratio, collapsible, context-menu, hover-card, icon, menubar, native-only-animated-view, popover, radio-group, textarea, toggle, toggle-group

Add more: `cd apps/mobile && npx @react-native-reusables/cli@latest add <name> --yes`
```

**Step 2: Commit**

```bash
git add docs/mobile.md
git commit -m "docs: add component import quick reference to mobile.md"
```

---

### Task 6: Final Review — Read complete CLAUDE.md and verify coherence

**Step 1: Read the full CLAUDE.md**

Run: `cat -n CLAUDE.md`
Verify: ~200 lines, all sections flow logically, no duplicate content.

**Step 2: Verify line count is reasonable**

Run: `wc -l CLAUDE.md docs/frontend.md docs/mobile.md`
Expected: CLAUDE.md ~200 lines, frontend.md ~770 lines, mobile.md ~700 lines.

**Step 3: Run lint to ensure no markdown issues**

Run: `bun run lint`

**Step 4: Squash into a single commit (optional)**

If all 4 previous commits are clean, optionally squash into one:
```bash
git add CLAUDE.md docs/frontend.md docs/mobile.md
git commit -m "docs: enhance CLAUDE.md with architecture quick reference, UI component constraints, and stronger guide references"
```
