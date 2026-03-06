

## Two Changes

### 1. Color-Code Edge Connectors by Kind

Currently, all edge connectors use the same green color (`hsl(152, 70%, 55%)`) for data particles regardless of their `kind` property. The `kind` field already exists with values: `control`, `data`, `comms`, `handoff`.

**File: `src/components/AgentGraph.tsx`**

- Add a `EDGE_KIND_COLORS` map at the top:
  - `control` → cyan/blue (`hsl(195, 80%, 55%)`)
  - `data` → green (`hsl(152, 70%, 55%)`) (current default)
  - `comms` → purple (`hsl(270, 60%, 60%)`)
  - `handoff` → amber/orange (`hsl(38, 75%, 55%)`)

- In `AnimatedEdge`, replace the hardcoded `dataColor = "hsl(152, 70%, 55%)"` with a lookup: `const dataColor = EDGE_KIND_COLORS[kind]`

- Update the edge stroke color (when not down) to also use this kind-based color instead of the generic `color` prop

- The `kind` label text already shows on hover — it will now match the particle color

- Add a small legend in the graph toolbar area showing the 4 kinds with their colors

### 2. Privacy Policy & Terms of Service Pages

**Files to create:**
- `src/pages/PrivacyPolicy.tsx` — standard privacy policy page with placeholder legal content, styled to match the dark theme
- `src/pages/TermsOfService.tsx` — standard terms of service page with placeholder legal content

**File: `src/App.tsx`**
- Add routes: `/privacy` and `/terms`

These pages will have publicly accessible URLs:
- Privacy: `{preview-url}/privacy`
- Terms: `{preview-url}/terms`

