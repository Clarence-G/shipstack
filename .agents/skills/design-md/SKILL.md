---
name: design-md
description: >
  Browse, select, and apply design system inspiration files from getdesign.md.
  Use this skill whenever the user mentions design systems, visual style, UI
  inspiration, brand aesthetic, "make it look like X", DESIGN.md, or wants to
  pick a design direction for their project. Also use when building new UI pages
  and no design system has been chosen yet — proactively suggest browsing options.
  Triggers on: design system, visual style, UI style, brand style, "look like",
  "style of", DESIGN.md, design inspiration, dark theme, light theme, minimal UI,
  gradient UI, pick a design, choose a design.
---

# Design System Inspiration Library

58 design system files sourced from [getdesign.md](https://getdesign.md), stored locally in `references/`. Each file is ~300 lines covering: visual theme, color palette, typography, component styles, layout principles, depth/elevation, do's/don'ts, responsive behavior, and an agent prompt guide.

## How to Use This Skill

### Step 1: Understand What the User Needs

If the user names a specific brand (e.g., "use Vercel style"), skip to Step 3.

Otherwise, ask what they're building and what vibe they want. Use the index below to recommend 2-3 candidates. Present them as a short comparison:

```
I'd suggest these based on your SaaS dashboard:
1. **Linear** — ultra-minimal, purple accent, precision feel
2. **Supabase** — dark emerald, developer-centric, code-first
3. **Stripe** — purple gradients, elegant weight-300 typography

Which feels right? Or describe what you're after and I'll narrow it down.
```

### Step 2: Let the User Choose

Once the user picks a brand, proceed to Step 3.

### Step 3: Read the Design System File

Read the full reference file to load it into context:

```
Read references/{brand}.md
```

The file path is relative to this skill's directory:
`.agents/skills/design-md/references/{brand}.md`

After reading, you now have the complete design system — colors, typography, spacing, component patterns, do's/don'ts, and ready-to-use prompt snippets from the "Agent Prompt Guide" section.

### Step 4: Apply

**Temporary reference** (default): Use the design system to guide your current UI work. Follow the colors, typography, spacing, and component patterns described in the file.

**Permanent application** (if user says "apply", "save", or "use as project design"): Copy the file to the project root as `DESIGN.md`:

```bash
cp .agents/skills/design-md/references/{brand}.md ./DESIGN.md
```

This makes it the project's permanent design reference. Future sessions will pick it up automatically.

---

## Design System Index

### By Visual Style

**Monochrome / Minimal** — clean, restrained, black-and-white or near-monochrome
| Brand | File | One-liner |
|-------|------|-----------|
| Vercel | `vercel.md` | Black and white precision, Geist font, shadow-as-border |
| Tesla | `tesla.md` | Radical subtraction, full-viewport photography, near-zero UI |
| SpaceX | `spacex.md` | Stark black and white, full-bleed imagery, futuristic |
| Uber | `uber.md` | Bold black and white, tight type, urban energy |
| HashiCorp | `hashicorp.md` | Enterprise-clean, black and white |
| Ollama | `ollama.md` | Terminal-first, monochrome simplicity |
| x.ai | `x.ai.md` | Stark monochrome, futuristic minimalism |
| Figma | `figma.md` | Black-and-white UI shell showcasing colorful product content |
| ElevenLabs | `elevenlabs.md` | Near-white with whisper-thin Waldenburg headings, ultra-low-opacity shadows |
| Apple | `apple.md` | Cinematic black/white alternating sections, premium SF Pro, blue interactive accent |

**Dark Premium** — dark backgrounds, accent colors, polished surfaces
| Brand | File | One-liner |
|-------|------|-----------|
| Supabase | `supabase.md` | Dark emerald theme, code-first |
| Sentry | `sentry.md` | Dark dashboard, data-dense, pink-purple accent |
| Raycast | `raycast.md` | Sleek dark chrome, vibrant gradient accents |
| Resend | `resend.md` | Minimal dark theme, monospace accents |
| Superhuman | `superhuman.md` | Premium dark UI, keyboard-first, purple glow |
| Warp | `warp.md` | Warm earthy near-black, terminal as lifestyle brand |
| NVIDIA | `nvidia.md` | Green-black energy, technical power aesthetic |
| OpenCode | `opencode.ai.md` | Warm-tinted dark canvas, terminal-native, Berkeley Mono |
| Composio | `composio.md` | Pitch-black with bioluminescent cyan glows, brutalist shadows |
| VoltAgent | `voltagent.md` | Void-black canvas, emerald accent, terminal-native |
| Framer | `framer.md` | Pure black canvas, electric-blue accent, compressed typography |
| Sanity | `sanity.md` | Near-black command center, neon signal-light accents at hover |
| ClickHouse | `clickhouse.md` | Pure black with acid neon yellow-green, high-voltage energy |
| Runway ML | `runwayml.md` | Cinematic black, full-bleed photography IS the UI, near-invisible interface |

**Colorful / Vibrant** — playful palettes, friendly and energetic
| Brand | File | One-liner |
|-------|------|-----------|
| Spotify | `spotify.md` | Vibrant green on dark, bold type, album-art-driven |
| Airbnb | `airbnb.md` | Warm coral accent, photography-driven, rounded UI |
| Pinterest | `pinterest.md` | Red accent, masonry grid, image-first |
| Miro | `miro.md` | Bright yellow accent, infinite canvas aesthetic |
| Zapier | `zapier.md` | Warm orange, friendly illustration-driven |
| Airtable | `airtable.md` | Swiss-precision white canvas, deep navy, blue-tinted shadows |
| MiniMax | `minimax.md` | Clean white canvas with blue/pink accents, colorful AI model cards |
| Clay | `clay.md` | Warm cream canvas with artisanal multi-color palette (matcha, cyan, gold, purple) |
| Replicate | `replicate.md` | Explosive orange-magenta gradients, pill-shaped everything, 128px display type |
| Webflow | `webflow.md` | Clean white canvas, vibrant blue/purple/pink secondary palette, cascading shadows |
| Coinbase | `coinbase.md` | Trust-signaling white/dark alternation, single deep-blue accent, four-font system |

**Gradient / Purple** — elegant gradients, often purple-toned
| Brand | File | One-liner |
|-------|------|-----------|
| Stripe | `stripe.md` | Signature purple gradients, weight-300 elegance |
| Linear | `linear.app.md` | Ultra-minimal dark-native, indigo-violet accent, translucent borders |
| Kraken | `kraken.md` | Clean white platform with commanding purple brand accent, dual fonts |
| Cohere | `cohere.md` | Polished enterprise white/gray with dramatic deep-purple contrast sections |
| Together AI | `together.ai.md` | Pastel-gradient dreamscape, lavender + magenta + orange, dual-theme |
| Revolut | `revolut.md` | Stadium-scale billboard type on near-black, indigo-blue accent, full token system |

**Warm / Editorial** — warm tones, serif touches, content-focused
| Brand | File | One-liner |
|-------|------|-----------|
| Notion | `notion.md` | Warm-neutral minimalism, parchment whites, serif headings, whisper borders |
| Claude | `claude.md` | Warm terracotta accent, parchment canvas, editorial serif typography |
| Lovable | `lovable.md` | Parchment cream, humanist typography, opacity-only color system |
| PostHog | `posthog.md` | Earthy warm-green palette, hand-drawn illustrations, hidden orange accent |
| Intercom | `intercom.md` | Warm off-white editorial, single vibrant Fin Orange accent |
| Cursor | `cursor.md` | Warm cream off-white, orange accent, aggressive negative-tracked gothic display |

**Brand Accent** — strong brand color identity
| Brand | File | One-liner |
|-------|------|-----------|
| BMW | `bmw.md` | Luxury automotive, dark premium surfaces |
| Ferrari | `ferrari.md` | Chiaroscuro editorial, Ferrari Red accents |
| Lamborghini | `lamborghini.md` | True black surfaces, gold accents, dramatic uppercase |
| Renault | `renault.md` | Aurora gradients, NouvelR typography, yellow + blue accents |
| Wise | `wise.md` | Lime-green fintech, ultra-heavy weight-900 billboard typography |
| MongoDB | `mongodb.md` | Green leaf branding, developer documentation focus |
| Mintlify | `mintlify.md` | Clean, green-accented, reading-optimized |
| Cal.com | `cal.md` | Clean neutral UI, developer-oriented simplicity |
| Mistral AI | `mistral.ai.md` | Golden-amber maximalism, orange gradient, European luxury AI |
| Expo | `expo.md` | Cool-white precision, cobalt-blue links, Apple-polished developer tool |
| IBM | `ibm.md` | Carbon Design System, single blue accent, tokenized architecture, 0px-radius buttons |

### By Use Case

**Developer Tool / Infrastructure**
vercel, supabase, cursor, sentry, linear.app, raycast, expo, resend, hashicorp, clickhouse, replicate, warp, mintlify, opencode.ai, composio, voltagent, together.ai, ollama, posthog, mongodb

**SaaS / Productivity**
notion, figma, airtable, cal, miro, intercom, webflow, framer, sanity

**Consumer / Marketplace**
airbnb, spotify, uber, pinterest, zapier

**Fintech / Crypto**
stripe, coinbase, revolut, kraken, wise

**AI Product**
claude, cursor, cohere, elevenlabs, lovable, minimax, mistral.ai, runwayml, x.ai

**Premium / Luxury**
apple, bmw, ferrari, lamborghini, tesla, renault, spacex, superhuman, nvidia

### By Color Tone

**Light-first**: vercel, tesla, uber, ollama, figma, elevenlabs, airbnb, cal, wise, webflow, intercom, airtable, zapier, pinterest, miro, mintlify, minimax, lovable, posthog, expo, kraken, cohere, mistral.ai, cursor, stripe, clay

**Dark-first**: supabase, sentry, raycast, resend, warp, nvidia, opencode.ai, composio, voltagent, framer, sanity, clickhouse, runwayml, spacex, spotify, linear.app, x.ai, lamborghini

**Dual-theme**: apple, bmw, claude, ferrari, hashicorp, mongodb, superhuman, together.ai, coinbase, renault, replicate, notion, ibm, revolut

---

## Updating the Library

To refresh all design system files:

```bash
bash scripts/download-design-systems.sh
```

This re-downloads all files from getdesign.md using the `npx getdesign` CLI.
