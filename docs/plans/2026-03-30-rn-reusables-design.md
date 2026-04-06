# React Native Reusables Integration Design

**Date:** 2026-03-30
**Status:** Approved

## Goal

Integrate React Native Reusables (shadcn/ui for RN) into `apps/mobile`, replacing hand-written auth screens with RN Reusables auth blocks. Establish the component library foundation for future mobile UI work.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Install method | CLI `add` on existing project | No re-scaffold needed, preserves SDK 54 setup |
| SDK version | Keep SDK 54 (RN 0.81) | CLI is SDK-agnostic, @rn-primitives uses `*` peer deps |
| Styling | Uniwind (already configured) | Consistent with current setup, Tailwind v4 |
| Color tokens | OKLCH neutral theme, aligned with frontend | Visual consistency across web and mobile |
| Auth pages | `sign-in-form` + `sign-up-form` blocks | Pre-built forms with RN Reusables components |
| Theme system | `@variant light/dark` in global.css + theme.ts for nav | Standard RN Reusables pattern |

## Architecture

```
apps/mobile/
├── components.json              # shadcn-compatible CLI config
├── src/
│   ├── global.css               # Tailwind v4 + Uniwind + theme CSS variables
│   ├── lib/
│   │   ├── utils.ts             # cn() helper (clsx + tailwind-merge)
│   │   ├── theme.ts             # NAV_THEME for @react-navigation/native
│   │   ├── orpc.ts              # (existing)
│   │   └── auth-client.ts       # (existing)
│   ├── components/
│   │   ├── ui/                  # RN Reusables components (CLI-generated)
│   │   └── sign-in-form.tsx     # Auth block (CLI-generated, adapted)
│   │   └── sign-up-form.tsx     # Auth block (CLI-generated, adapted)
│   └── app/
│       ├── _layout.tsx          # ThemeProvider + PortalHost + QueryProvider
│       ├── index.tsx            # Home (existing)
│       └── auth/
│           ├── login.tsx        # Uses <SignInForm />
│           └── register.tsx     # Uses <SignUpForm />
```

## New Dependencies

| Package | Purpose |
|---------|---------|
| `react-native-reanimated` | Animations for RN Reusables components |
| `react-native-svg` | Required by lucide-react-native |
| `@rn-primitives/portal` | Portal system for overlays |
| `@rn-primitives/slot` | Slot primitive (used by Button etc.) |
| `lucide-react-native` | Icon library (matches frontend's lucide-react) |
| `class-variance-authority` | Component variant API (cva) |
| `clsx` | Conditional class joining |
| `tailwind-merge` | Deduplicates conflicting Tailwind classes |
| `tw-animate-css` | Animation CSS for Tailwind v4 |

## CSS Variables (global.css)

Uses OKLCH color format with `@variant light/dark` syntax inside `:root`. Same neutral palette as frontend but adapted for RN Reusables' `--color-*` prefix convention (Tailwind v4).

## Auth Block Adaptation

The CLI-generated `sign-in-form` and `sign-up-form` are standalone form components. We adapt them to:
- Wire submit handlers to `signIn.email()` / `signUp.email()` from `@/lib/auth-client`
- Use `router.replace("/")` for post-auth navigation
- Use `Alert.alert()` for error display (native feel)

## Symmetry with Frontend

| Aspect | Frontend (Web) | Mobile (RN) |
|--------|---------------|-------------|
| Component system | shadcn/ui | React Native Reusables |
| Styling | Tailwind CSS v4 | Uniwind (Tailwind v4) |
| Primitives | Radix UI | RN Primitives (Radix port) |
| Icons | lucide-react | lucide-react-native |
| Add components | `bunx shadcn add button` | `npx @react-native-reusables/cli add button` |
| Utility | `cn()` (clsx + tailwind-merge) | `cn()` (same) |

## Out of Scope (YAGNI)

- SDK 55 upgrade
- Components beyond auth blocks (add later with CLI)
- Shared component package between web and mobile
- Home screen redesign
- Deep linking
- Push notifications
