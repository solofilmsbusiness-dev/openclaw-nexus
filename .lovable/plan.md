

## Fix Light Mode Text Visibility in Agent Graph

### Problem
The SVG text elements in `AgentGraph.tsx` use hardcoded HSL colors designed for dark mode. In light mode, these appear nearly invisible against the white/light background.

### Hardcoded Colors to Fix (in `src/components/AgentGraph.tsx`)

| Line | Element | Current Color | Fix |
|------|---------|--------------|-----|
| 294 | Agent name | `hsl(0, 0%, 85%)` | `hsl(var(--foreground))` |
| 298 | Agent subtitle | `hsl(0, 0%, 55%)` | `hsl(var(--muted-foreground))` |
| 1139 | "SOLO OS CORE" label | `hsl(0, 0%, 75%)` | `hsl(var(--foreground))` |
| 1148 | Online count | `hsl(152, 60%, 48%)` | Keep (green is readable on both) |
| 451 | Rotating core text | `hsl(215, 80%, 60%)` | Keep (blue is readable on both) |
| 1060 | Grid pattern stroke | `hsl(225, 10%, 14%)` | Use CSS variable for border |
| 1133 | Core circle fill | `hsl(225, 12%, 10%)` | `hsl(var(--card))` |

### Additional SVG Elements
- The grid pattern (line 1060) uses a dark-mode-only stroke color -- change to `hsl(var(--border))`
- Core node background circle (line 1133) is hardcoded dark -- change to `hsl(var(--card))`

### Approach
Since SVG `fill`/`stroke` attributes accept CSS `hsl()` with variables, replace hardcoded values with theme-aware CSS custom properties already defined in `index.css` (e.g., `--foreground`, `--muted-foreground`, `--card`, `--border`).

### File Changed
- `src/components/AgentGraph.tsx` -- ~6 lines changed, all SVG fill/stroke attributes

