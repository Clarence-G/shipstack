# Design: `/design-md` Skill

## Goal

让 AI agent 方便地浏览和使用 getdesign.md 的设计系统文件，支持临时参考和永久应用两种场景。

## Architecture

```
docs/design-systems/           # 59 个品牌的 DESIGN.md 全量下载
├── vercel.md
├── stripe.md
├── ...

.agents/skills/design-md/
└── SKILL.md                   # Skill 定义（分类索引 + 操作指令）

.claude/skills/
└── design-md -> ../../.agents/skills/design-md   # 软链接
```

## Data Source

- CLI: `npx getdesign@latest add {brand} --out {path}`
- 全部 59 个品牌一次性下载到 `docs/design-systems/{brand}.md`
- 下载脚本：`scripts/download-design-systems.sh`

## Skill 行为

### 触发方式

`/design-md` 或 `/design-md {args}`

### 操作模式

| 用户输入 | Agent 行为 |
|---------|-----------|
| `/design-md` (无参数) | 展示分类索引，询问用户场景，推荐 2-3 个候选 |
| `/design-md vercel` | 读取 `docs/design-systems/vercel.md`，作为当前对话上下文指导 UI 编码 |
| `/design-md vercel --apply` | 复制 `docs/design-systems/vercel.md` 到项目根 `DESIGN.md` |
| `/design-md --list` | 列出所有 59 个品牌及一句话描述 |
| 用户描述需求（如"给 SaaS 产品做个深色主题"） | Agent 根据索引匹配推荐，用户选择后读取对应文件 |

### 分类索引结构

Skill 内嵌一份分类索引，按以下维度组织：

**按视觉风格:**
- Monochrome/Minimal: vercel, tesla, spacex, uber, hashicorp, ollama, x.ai
- Dark Premium: cursor, supabase, sentry, raycast, resend, superhuman, warp, elevenlabs, nvidia, minimax, opencode.ai, composio
- Colorful/Vibrant: figma, spotify, airbnb, pinterest, miro, zapier, airtable, lovable, posthog
- Gradient/Purple: stripe, linear.app, mistral.ai, kraken, cohere, together.ai
- Brand Color Accent: bmw, ferrari, lamborghini, renault, wise, mongodb, mintlify, sanity, cal, voltagent, expo

**按适用场景:**
- Developer Tool / Infra: vercel, supabase, cursor, sentry, linear.app, raycast, expo, resend, hashicorp, clickhouse, replicate, warp, mintlify, opencode.ai, composio, voltagent, together.ai, ollama, posthog
- SaaS / Productivity: notion, figma, airtable, cal, miro, intercom, webflow, framer, sanity
- Consumer / Marketplace: airbnb, spotify, uber, pinterest, zapier
- Fintech / Crypto: stripe, coinbase, revolut, kraken, wise
- AI Product: claude, cursor, cohere, elevenlabs, lovable, minimax, mistral.ai, runwayml, x.ai
- Premium / Luxury: apple, bmw, ferrari, lamborghini, tesla, renault, spacex, superhuman, nvidia

**按色调:**
- Light: vercel, apple, notion, stripe, airbnb, figma, cal, replicate, wise, webflow, ibm
- Dark: cursor, supabase, sentry, raycast, resend, superhuman, warp, spotify, uber, spacex, ferrari, lamborghini, nvidia, elevenlabs, minimax, opencode.ai, composio, voltagent, together.ai, ollama, posthog, cohere, runwayml
- Both (明确支持双主题): linear.app, framer, miro, airtable, intercom

## File Naming

`docs/design-systems/{brand}.md` — brand 名取自 `npx getdesign list` 输出的第一列（如 `linear.app`, `mistral.ai`, `x.ai`, `together.ai` 保留原名含点号）。

## 下载脚本

`scripts/download-design-systems.sh`:
- 遍历 `npx getdesign list` 输出，逐个下载
- 每个品牌执行: `npx getdesign add {brand} --out docs/design-systems/{brand}.md --force`
- 幂等可重跑

## 设计决策

| 决策 | 选择 | 原因 |
|------|------|------|
| 数据存储 | 全量下载到本地 | 离线可用、零延迟、agent 直接 Read |
| 索引位置 | 内嵌到 SKILL.md | 触发时自动加载，无需额外请求 |
| 索引结构 | 多维度分类 | agent 可从风格/场景/色调多角度匹配 |
| 文件格式 | 每品牌一个 .md | 方便 agent 按需读取单个文件，不加载全部 |
| Skill 位置 | .agents/skills/ + 软链接 | 与现有 uniwind skill 一致 |
| 不做 MCP | Skill 足够 | 索引+Read 已覆盖所有场景，无需额外 tool |
