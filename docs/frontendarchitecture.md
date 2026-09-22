# SynthGraph Frontend Architecture

## 1. Purpose

The frontend is the visual research workspace around SynthGraph's provenance system.

The backend is substantially complete. The primary frontend objective is therefore to expose that capability as a coherent, interconnected research experience rather than a minimalist CRUD administration panel.

The frontend must make it easy to:

```text
Understand
Investigate
Compare
Trace
Reproduce
Document
```

## 2. Core UX Model

The user is investigating an experiment, not browsing database records.

Every major screen should help answer:

1. What happened?
2. What changed?
3. Why did it change?
4. What produced this result?
5. Can I reproduce it?

Information hierarchy:

```text
Orientation
    ↓
Situation
    ↓
Evidence
    ↓
Causality
    ↓
Action
```

## 3. Flagship Experience

The flagship surface is Experiment Detail.

```text
Experiment
    ↓
Runs
    ↓
Metrics
    ↓
Lineage
    ↓
Parameters
    ↓
Comparison
    ↓
Reproduction
```

Recommended navigation:

```text
Overview | Runs | Lineage | Metrics | Parameters | Reproduction
```

## 4. Three-Pane Research Workspace

Desktop:

```text
┌──────────────┬──────────────────────────────────┬──────────────────────┐
│ CONTROL RAIL │          CENTER CANVAS           │ INSPECTOR RAIL       │
│ ~220px       │ flexible                         │ ~360–400px           │
│ navigation   │ metrics / lineage / tables      │ selected entity      │
│ projects     │ comparison                       │ parameters           │
│ experiments  │                                  │ provenance           │
│ datasets     │                                  │ reproduction         │
└──────────────┴──────────────────────────────────┴──────────────────────┘
```

The center canvas is the main working surface. The inspector is contextual and collapsible.

## 5. Technology

Existing stack:

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Motion
- React Three Fiber
- Drei
- Three.js
- Zod

Recommended additions:

- `@tanstack/react-query` for server state
- Apache ECharts for analytical charts
- `@xyflow/react` for lineage
- `@tanstack/react-table` for dense tables
- `cmdk` for command/search UX

Conditional:

- `elkjs` for complex lineage layout
- `@tanstack/react-virtual` for genuinely large tables
- Jotai for justified shared transient UI state

Do not add every conditional library at the start.

## 6. State Architecture

Use the simplest mechanism matching the state.

```text
Server state        → TanStack Query
URL/shareable state → URL parameters
Local UI state      → React state
Shared transient    → Jotai only if justified
```

Server data should not be duplicated into global UI state without a clear reason.

## 7. API Architecture

Do not scatter raw `fetch()` calls through components.

Preferred flow:

```text
React Component
      ↓
Feature Hook
      ↓
TanStack Query
      ↓
API Client
      ↓
NestJS REST API
```

Conceptual API layer:

```text
lib/api/
├── client.ts
├── auth.ts
├── projects.ts
├── experiments.ts
├── generations.ts
├── datasets.ts
├── assets.ts
├── training.ts
├── metrics.ts
├── evaluations.ts
├── comparison.ts
├── reproduction.ts
├── documentation.ts
└── reports.ts
```

## 8. Repository Organization

Recommended target:

```text
src/
├── app/
│   ├── dashboard/
│   ├── projects/
│   ├── experiments/[experimentId]/
│   │   ├── overview/
│   │   ├── runs/
│   │   ├── lineage/
│   │   ├── metrics/
│   │   ├── parameters/
│   │   └── reproduction/
│   ├── compare/
│   └── settings/
├── components/
│   ├── ui/
│   ├── layout/
│   ├── charts/
│   ├── lineage/
│   ├── tables/
│   ├── inspectors/
│   └── feedback/
├── features/
│   ├── experiments/
│   ├── generations/
│   ├── datasets/
│   ├── training/
│   ├── evaluation/
│   ├── lineage/
│   ├── comparison/
│   ├── reproduction/
│   └── reports/
└── lib/
    ├── api/
    ├── query/
    ├── validation/
    ├── formatting/
    └── state/
```

Adopt this incrementally. Do not reorganize the whole repository for cosmetic consistency.

## 9. Experiment Detail

Experiment Detail is the most important screen.

Header:

```text
Name
Status
Key metric
Last activity
[Compare] [Reproduce] [Export]

Overview | Runs | Lineage | Metrics | Parameters | Reproduction
```

The right inspector updates according to the selected run, generation, dataset, training run, evaluation, or lineage node.

## 10. Progressive Disclosure

Raw JSON is a secondary technical representation.

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

For example:

```text
GENERATION CONFIGURATION

Environment       HalfCheetah-v5
Seed              1
Generator         PPO
Deterministic     Yes

[View Raw Manifest]
```

The raw payload belongs in a drawer or secondary tab.

## 11. Parameter Presentation

Do not render stringified JSON as the dominant table representation.

Instead of:

```text
{"seed":1,"gamma":0.99,"n_steps":1024,"learning_rate":0.0003}
```

render structured values:

```text
seed: 1
gamma: 0.99
n_steps: 1024
learning_rate: 0.0003
```

For sweeps, identify which parameters vary across the selected records.

Varying parameters should be prominent. Constant parameters should be muted.

The UI should help answer:

> What actually changed?

## 12. Lineage

Use `@xyflow/react`.

The backend is authoritative for relationships. The frontend must not infer lineage from names, timestamps, ordering, IDs, or visual assumptions.

Conceptual graph:

```text
Generation
    ↓
Dataset
    ↓
Training Run
    ↓
Evaluation
```

Nodes should show entity type, name, status, and useful metrics/version information.

Selection should:

```text
Select node
   ↓
Highlight connected path
   ↓
Mute unrelated nodes
   ↓
Update inspector
   ↓
Update relevant charts/tables
```

## 13. Lineage Layout

Start with deterministic layout.

Introduce `elkjs` only when graph complexity proves automatic layout is necessary.

Do not add a layout engine merely because the graph library supports it.

## 14. Charts

Use Apache ECharts for:

- training curves;
- evaluation metrics;
- multi-run comparisons;
- parameter sweeps;
- scatter plots;
- distributions;
- time series.

Every chart must answer a research question.

## 15. Linked Visualization

A central SynthGraph interaction is cross-surface selection:

```text
User clicks metric point
        ↓
Selected Run
        ├── Run table highlights row
        ├── Lineage highlights path
        ├── Inspector loads run
        ├── Parameters update
        ├── Dataset context updates
        └── Reproduction context updates
```

This is UI interaction state, not a frontend event bus.

## 16. Tables

Use TanStack Table for:

- run explorer;
- parameter comparison;
- datasets;
- evaluation results;
- search results.

Support sorting, filtering, selection, useful status/metric columns, and aligned numeric values.

Apply:

```css
font-variant-numeric: tabular-nums;
```

to relevant numeric cells.

Add virtualization only when measured row counts justify it.

## 17. Comparison

Comparison is a first-class workflow.

Support 2–10 selected runs/generations.

Compare:

- parameters;
- generator;
- dataset;
- training;
- environment;
- metrics;
- status;
- provenance.

Presentation:

```text
Summary
   ↓
Meaningful differences
   ↓
Detailed differences
   ↓
Raw data
```

Do not require manual raw-JSON comparison.

## 18. Reproduction

The reproduction UI consumes the backend reproduction manifest.

Display:

- generator/version;
- parameters;
- seed;
- code version;
- dataset;
- assets;
- environment;
- missing dependencies;
- external dependencies.

Distinguish:

```text
Known
Supplied
Missing
External
Unavailable
```

The frontend visualizes reproduction truth. It does not invent reproduction logic.

## 19. Live Training

Start with TanStack Query polling.

Show:

- running;
- capture state;
- latest metrics;
- last update;
- stale;
- failed;
- completed.

Do not replace the entire page during refreshes.

SSE can be introduced later if actual live-update requirements justify it. WebSockets are not required unless a concrete bidirectional use case emerges.

## 20. Command Palette

Use `cmdk`.

Primary shortcut:

```text
Cmd/Ctrl + K
```

Useful commands:

```text
Go to project
Go to experiment
Open run
Compare runs
Open lineage
Open reproduction
Search
```

## 21. Motion

Use Motion for meaningful state changes:

- drawers;
- selection;
- lineage focus;
- progressive disclosure;
- navigation;
- comparison changes.

Avoid constant floating animation, decorative parallax, and animation that delays interaction.

Respect reduced-motion preferences.

## 22. 3D

React Three Fiber is for genuinely spatial information:

- synthetic scene previews;
- point clouds;
- camera distributions;
- spatial bounding boxes;
- domain-randomization regions.

Isolate 3D to its feature/component boundary.

Do not use 3D for ordinary metrics, tables, or decoration.

## 23. Error and Async States

Every async feature must define:

```text
Loading
Empty
Error
Stale
Partial / unavailable
```

Normalize backend errors in the API layer.

Never expose stack traces, raw SQL errors, internal infrastructure details, or credentials.

## 24. Security

Never expose API secrets, JWT secrets, service credentials, or database credentials in the client.

Do not put secrets in URLs or bundles.

Client-side validation is for UX. Backend validation and authorization remain authoritative.

Do not use long-lived SDK API keys as browser session credentials.

## 25. Performance

Priorities:

1. avoid duplicate requests;
2. cache server state;
3. avoid unnecessary rerenders;
4. lazy-load expensive visualizations;
5. downsample dense metrics when necessary;
6. virtualize genuinely large tables;
7. keep lineage rendering responsive.

Optimize measured bottlenecks, not hypothetical scale.

## 26. Accessibility

Require:

- keyboard navigation;
- visible focus;
- semantic HTML;
- accessible labels;
- sufficient contrast;
- reduced motion;
- non-color-only status communication.

Charts and graph nodes should provide useful textual context where practical.

## 27. Responsive Behavior

Desktop/laptop is the primary research environment.

At smaller widths:

```text
Control Rail → collapsed navigation
Inspector    → drawer
Center       → primary surface
```

Preserve experiment context and core lineage interaction. Do not force full desktop density onto mobile.

## 28. Quality Bar

Before a feature is complete:

### UX
- answers a real research question;
- has clear hierarchy;
- does not require raw JSON for common tasks;
- keeps related surfaces connected.

### Engineering
- server state uses the query layer;
- API calls are centralized;
- components have focused responsibilities;
- no unnecessary dependency was introduced.

### Reliability
- loading;
- empty;
- error;
- partial/stale states where relevant.

### Security
- no secrets exposed;
- no client-side authorization assumptions.

### Accessibility
- keyboard support;
- focus states;
- accessible labels;
- reduced motion.

### Performance
- no unnecessary requests;
- no unnecessary rerenders;
- large data handled deliberately.

## 29. Principles

- Separation of concerns.
- Composition over giant components.
- KISS.
- YAGNI.
- Dependency discipline.
- Backend authority.
- Progressive disclosure.

> Libraries render SynthGraph's model. They do not become SynthGraph's model.
