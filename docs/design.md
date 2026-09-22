# SynthGraph Design System

## Purpose

This is the visual source of truth for SynthGraph. The product should feel like a high-end research instrument for investigating synthetic-data and simulation-based ML experiments, not a generic SaaS CRUD dashboard.

## Design Direction

Technical, precise, modern, dark-first, calm, information-dense without feeling crowded, interactive, and research-oriented.

Avoid generic enterprise admin panels, spreadsheet-like layouts, crypto dashboards, gaming/cyberpunk aesthetics, excessive glassmorphism, and decorative UI.

> Dense information should feel organized, not crowded.

## Primary Workspace

Use a three-pane desktop layout:

```text
┌───────────────┬───────────────────────────────────────┬──────────────────┐
│ CONTROL RAIL  │          CENTER CANVAS                │ INSPECTOR RAIL   │
│ ~220px        │ flexible                              │ ~360–400px        │
│ navigation    │ experiment / charts / lineage / runs │ selected entity   │
└───────────────┴───────────────────────────────────────┴──────────────────┘
```

The center canvas is the main working surface. The inspector is contextual and collapsible.

## Colors

```text
Background       #09090B
Surface           #111113
Panel             #131316
Elevated          #18181B
Subtle            #1F1F23
Border            #27272A

Text primary      #F4F4F5
Text secondary    #A1A1AA
Text muted        #71717A

Accent            #8B5CF6
Accent hover      #A78BFA
Accent subtle     #6D28D9

Success           #22C55E
Warning           #F59E0B
Error             #EF4444
Info              #38BDF8
```

Use accent and semantic colors selectively. Never communicate important state through color alone.

## Typography

Primary font: Inter, with system-ui fallbacks.

Technical font: Geist Mono, JetBrains Mono, or ui-monospace.

Use monospace for hashes, seeds, IDs, paths, code, exact parameters, and raw JSON.

```text
Display          36–48px
Page title       28–32px
Section heading  20–24px
Card heading     15–18px
Body             14–16px
Metadata         12–13px
Technical        12–14px
```

Weights: 400, 500, 600, 700.

Apply `font-variant-numeric: tabular-nums` to metric tables, counters, durations, and aligned numeric values.

## Spacing

Use a 4px base:

```text
4  8  12  16  20  24  32  40  48  64
```

Do not invent arbitrary spacing values.

## Borders, Radius, Shadows

```text
Border            1px solid #27272A
Controls          6px radius
Cards             8–10px radius
Panels            12px radius
Pills             9999px
```

Prefer surface contrast and subtle borders over heavy shadows. Avoid neon/glowing containers.

## Buttons

Primary actions such as Compare, Reproduce, Create, and Save should use the accent system, not giant white fills.

Secondary actions should use neutral surfaces with borders.

Every button needs default, hover, active, disabled, and loading states.

## Cards and Panels

Cards group meaningful concepts. Do not create a card for every database record.

## Progressive Disclosure

Raw JSON is never the primary UI.

```text
Result
  ↓
Research-relevant details
  ↓
Provenance
  ↓
Exact configuration
  ↓
Raw JSON
```

Example:

```text
GENERATION CONFIGURATION
Environment       HalfCheetah-v5
Seed              1
Generator         PPO
Deterministic     Yes

[View Raw Manifest]
```

## Inspector

The contextual inspector should show the selected entity's most useful information:

```text
TRAINING RUN
Status           Completed
Reward           0.84
Steps            150,000
Duration         18m 42s

CONFIGURATION
Learning rate    0.0003
Gamma            0.99
Seed             1

PROVENANCE
Dataset          dataset-v17
Code             a91f3c
```

## Lineage

Lineage should visually communicate Generation → Dataset → Training → Evaluation.

Selected nodes are emphasized, connected paths are emphasized, unrelated nodes are muted. Edges communicate direction without noise.

## Charts and Tables

Charts must answer research questions, not decorate the page.

Tables should use strong column hierarchy, aligned numerics, monospace technical identifiers, tabular numerals, restrained borders, and meaningful selection states.

Stringified JSON should never dominate table cells. For sweeps, varying parameters are prominent and constant parameters are muted.

## Motion

Motion explains state.

```text
Micro interaction  100–150ms
UI transition      150–250ms
Panel transition   200–300ms
Complex layout     300–450ms
```

Use Motion for drawers, selection, lineage focus, progressive disclosure, and navigation. Respect `prefers-reduced-motion`.

## 3D

React Three Fiber is for genuinely spatial information such as synthetic scenes, point clouds, camera distributions, and spatial bounds. Do not use 3D for ordinary metrics or decoration.

## Loading, Empty, Error

Every async surface needs intentional loading, empty, error, stale, and partial/unavailable states.

Errors should be calm and actionable, never raw HTTP, SQL, or stack traces.

## Responsive Behavior

Desktop/laptop is the primary research environment. At smaller widths, collapse the control rail and make the inspector a drawer while preserving experiment context and core lineage interaction.

## Accessibility

Require keyboard navigation, visible focus, semantic HTML, accessible labels, sufficient contrast, reduced-motion support, and non-color-only status communication.

## Anti-Patterns

Avoid raw JSON as primary UI, flat `#000000` backgrounds, uniform borders everywhere, excessive gradients, glassmorphism, neon glows, giant white buttons, giant card grids, oversized headings, decorative 3D, meaningless animations, and arbitrary colors.

## North Star

> The UI should feel like a researcher is looking inside an experiment, not browsing records about it.
