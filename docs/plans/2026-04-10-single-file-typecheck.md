# Single-File TypeCheck Script Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `bun run typecheck <file>` script that runs TypeScript type checking on a single file using the Compiler API, respecting each workspace's tsconfig (including path aliases), as a complement to Biome.

**Architecture:** A single `scripts/typecheck.ts` script uses `ts.createProgram` with `rootNames: [targetFile]` to load only the target file's import graph. It finds the nearest `tsconfig.json` via `ts.findConfigFile`, parses it fully (resolving `extends` and `paths`), then calls `ts.getPreEmitDiagnostics(program, sourceFile)` scoped to just the target file. TypeScript is installed at the workspace root so all workspaces can use it without their own TypeScript devDep.

**Tech Stack:** TypeScript Compiler API (`typescript` npm package), Bun script runner

---

### Task 1: Install TypeScript at workspace root

**Files:**
- Modify: `package.json` (root)

**Step 1: Install TypeScript as workspace root devDependency**

```bash
cd /Users/bytedance/Projects/orpc_template
bun add -d typescript -w
```

Expected output: TypeScript added to root `package.json` devDependencies.

**Step 2: Verify tsc is available**

```bash
bunx tsc --version
```

Expected: `Version 5.x.x` or `Version 6.x.x` (no error).

**Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: add typescript to workspace root for typecheck script"
```

---

### Task 2: Write the typecheck script

**Files:**
- Create: `scripts/typecheck.ts`

**Step 1: Create the script**

```typescript
// scripts/typecheck.ts
import * as ts from 'typescript'
import * as path from 'path'

const targetArg = process.argv[2]

if (!targetArg) {
  console.error('Usage: bun run typecheck <file>')
  process.exit(1)
}

const targetFile = path.resolve(targetArg)

// Walk up from the file's directory to find tsconfig.json
const configPath = ts.findConfigFile(
  path.dirname(targetFile),
  ts.sys.fileExists,
  'tsconfig.json',
)

if (!configPath) {
  console.error(`No tsconfig.json found for ${targetFile}`)
  process.exit(1)
}

const configFile = ts.readConfigFile(configPath, ts.sys.readFile)

if (configFile.error) {
  console.error(ts.formatDiagnostic(configFile.error, ts.createCompilerHost({})))
  process.exit(1)
}

const parsedConfig = ts.parseJsonConfigFileContent(
  configFile.config,
  ts.sys,
  path.dirname(configPath),
)

// Use only the target file as entry point — loads just its import graph, not all workspace files
const program = ts.createProgram({
  rootNames: [targetFile],
  options: parsedConfig.options,
})

const sourceFile = program.getSourceFile(targetFile)

if (!sourceFile) {
  console.error(`Could not load source file: ${targetFile}`)
  process.exit(1)
}

const diagnostics = ts.getPreEmitDiagnostics(program, sourceFile)

if (diagnostics.length === 0) {
  console.log(`✓ No type errors in ${path.relative(process.cwd(), targetFile)}`)
  process.exit(0)
}

// Format errors in standard tsc style: file(line,col): error TSxxx: message
const host: ts.FormatDiagnosticsHost = {
  getCurrentDirectory: () => process.cwd(),
  getCanonicalFileName: (f) => f,
  getNewLine: () => '\n',
}

process.stdout.write(ts.formatDiagnosticsWithColorAndContext(diagnostics, host))
console.log(`\nFound ${diagnostics.length} error(s) in ${path.relative(process.cwd(), targetFile)}`)
process.exit(1)
```

**Step 2: Register the script in root package.json**

Add to `scripts` in root `package.json`:
```json
"typecheck": "bun run scripts/typecheck.ts"
```

**Step 3: Commit**

```bash
git add scripts/typecheck.ts package.json
git commit -m "feat: add single-file typecheck script using TypeScript Compiler API"
```

---

### Task 3: Verify — clean file (should pass)

Test against a file that has no type errors.

**Step 1: Run typecheck on a known-clean file**

```bash
cd /Users/bytedance/Projects/orpc_template
bun run typecheck apps/backend/src/routers/auth.router.ts
```

Expected output:
```
✓ No type errors in apps/backend/src/routers/auth.router.ts
```
Expected exit code: `0`

**Step 2: Verify exit code**

```bash
echo $?
```

Expected: `0`

---

### Task 4: Verify — intentionally broken file (should fail)

**Step 1: Create a temp file with a type error**

```bash
cat > /tmp/broken.ts << 'EOF'
const x: number = "this is a string"
export {}
EOF
```

Wait — this won't have a tsconfig. Instead, introduce a temporary type error directly into a project file, check it, then revert.

**Step 1: Introduce a type error in auth.router.ts**

Edit `apps/backend/src/routers/auth.router.ts` — add one line at the top of the handler:

```typescript
const _bad: number = "intentional type error"
```

**Step 2: Run typecheck — expect failure**

```bash
bun run typecheck apps/backend/src/routers/auth.router.ts
```

Expected: output contains `Type 'string' is not assignable to type 'number'` and exit code `1`.

**Step 3: Verify exit code**

```bash
echo $?
```

Expected: `1`

**Step 4: Revert the intentional error**

Remove the `_bad` line from `auth.router.ts`.

**Step 5: Run typecheck again — expect pass**

```bash
bun run typecheck apps/backend/src/routers/auth.router.ts
```

Expected: `✓ No type errors in apps/backend/src/routers/auth.router.ts`

---

### Task 5: Verify — path alias resolution works

This confirms `@myapp/contract` resolves correctly from the backend workspace.

**Step 1: Run typecheck on a file that uses path aliases**

```bash
bun run typecheck apps/backend/src/routers/storage.router.ts
```

Expected: `✓ No type errors in apps/backend/src/routers/storage.router.ts` (no "Cannot find module '@myapp/contract'" errors)

**Step 2: Run typecheck on a frontend file**

```bash
bun run typecheck apps/frontend/src/lib/orpc.ts
```

Expected: `✓ No type errors in apps/frontend/src/lib/orpc.ts`

---

### Task 6: Final commit

Only after ALL verification steps pass.

```bash
git add -A
git status  # confirm only expected files changed
git commit -m "feat: single-file typecheck script — verified passing"
```
