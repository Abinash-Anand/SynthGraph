# SynthGraph — website

Marketing and product site for SynthGraph, a provenance and experiment-management
system for synthetic-data research.

The site is dark-first, heavily three-dimensional, and built so that the 3D layer
explains the product rather than decorating it: every scene renders a real part of
the data model — generations, dataset versions, asset versions, training runs,
evaluation results, and the relationships between them.

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm start
npm run lint
npm run typecheck
```

## Configuration

Copy `.env.example` to `.env.local`. Every variable is optional.

| Variable | Purpose |
| --- | --- |
| `DEMO_FORM_ENDPOINT` | Where validated demo requests are forwarded (form service, CRM webhook, internal API). With no endpoint set, the API route validates and acknowledges the request and logs a minimal record — so a local or preview deployment still works end to end. |
| `DEMO_FORM_TOKEN` | Optional bearer token sent with the forwarded request. |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin used for metadata, `sitemap.xml` and `robots.txt`. |

No credentials are committed. The demo endpoint is called server-side only, from
`src/app/api/demo/route.ts`.

## Structure

```
src/
  app/                 routes: /, /product, /how-it-works, /research,
                       /developers, /security, /about, /demo, /api/demo
  components/
    3d/                WebGL primitives and scenes
    demo/              demo request form and success state
    navigation/        navbar, mobile overlay, footer
    sections/          homepage and page sections
    ui/                buttons, cards, code blocks, form fields, inspector
  data/                demo-data.ts (illustrative), site.ts (nav/footer)
  hooks/               reduced motion, in-view, media query, scroll progress
  lib/                 utils, three helpers, demo-request schema (zod)
  styles/              globals.css — design tokens and base styles
```

### The 3D layer

Every scene mounts through `components/3d/SceneCanvas.tsx`, which owns the
concerns that are easy to get wrong once per scene:

- nothing mounts until the section is near the viewport (`next/dynamic` +
  `IntersectionObserver`)
- the render loop stops (`frameloop="never"`) the moment a section scrolls away
- device pixel ratio is capped, harder on small screens
- reduced-motion visitors get a single static frame, not a slowed-down one
- the GL context is disposed explicitly on unmount
- a `SceneErrorBoundary` and a WebGL-less fallback sit behind each one

Scenes are composed from shared primitives — `GraphNode`, `GraphEdge`,
`ParticleFlow`, `CameraRig`, `ProvenanceGraph` — rather than being written
individually. Node positions are hand-placed and any randomness comes from a
seeded PRNG (`lib/utils.ts`), so a scene renders identically on every load.

Narrow screens get their own layout, not a scaled-down desktop one: each lineage
node carries both a `position` and a `compact` position, and the chain stacks
vertically below 768px.

Particles along an edge represent a recorded *relationship* between records —
never the transfer of dataset bytes. That distinction is load-bearing for the
product story and is stated in the copy next to each scene.

### Accessibility

- No information lives only inside a canvas. Every scene has an equivalent in
  real text beside or below it, and each scene wrapper is exposed as a single
  labelled `role="img"`.
- Skip link, semantic landmarks, visible focus rings, labelled form controls,
  inline validation with `aria-invalid` / `aria-describedby`, and an error
  summary that receives focus on failed submission.
- `prefers-reduced-motion` is honoured in CSS *and* in the render loops, so
  animation genuinely stops rather than running invisibly.

## Content and claims

The site describes a product in a private research pilot. Two rules are applied
throughout:

1. **Nothing is fabricated.** There are no customers, logos, testimonials,
   metrics, certifications, audits, benchmarks or shipped integrations on this
   site, because there are none to show. The security page says explicitly that
   no compliance claims are being made.
2. **Demo data is labelled as demo data.** Everything in `src/data/demo-data.ts`
   is illustrative and is marked as such wherever it appears — in the search
   mock, the comparison table, the dashboard preview and beside the 3D scenes.

Capability claims carry a status: `Available`, `Private pilot`, `Planned` or
`Roadmap`. The SDK is described as being in early development, not as a released
v1.0.

When any of this changes — a public repository, hosted documentation, a real
integration — update `src/data/site.ts` and the relevant `StatusBadge`.

## Notes

- The homepage keeps around nine WebGL contexts alive after a full scroll, well
  inside browser limits, with no context loss observed.
- three.js and its helpers dominate the JavaScript payload. The hero scene is
  code-split and client-only, so the headline and copy paint before it arrives.
