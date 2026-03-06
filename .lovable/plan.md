

## Add Search & Hover Preview to Add Panel Dialog

### Overview
Enhance the Add Panel dialog with two features: a search bar to filter templates, and a hover preview that shows a miniature snapshot of each panel's content before adding it.

### Changes

**File: `src/components/trading/AddPanelDialog.tsx`**

1. **Search bar** — Add a search `Input` with a `Search` icon below the dialog header. Filter `PREMADE_TEMPLATES` and `hiddenBuiltins` by matching the query against `title`, `description`, and `type`. Show a "No results" message when nothing matches.

2. **Hover preview tooltip** — Use `HoverCard` (from `@radix-ui/react-hover-card`, already installed) on each template button. On hover, the `HoverCardContent` renders a styled preview box showing:
   - **Notes** panels: First ~6 lines of the markdown content rendered as styled text (monospace, truncated)
   - **Checklist** panels: Parse the JSON and show the checklist items with checkbox icons (read-only)
   - **Embed** panels: Show the URL with a globe icon and "Embedded page" label (no actual iframe to avoid load delays)
   - **Graph** panels: Show a small "Agent flow diagram" label with the Network icon
   - **Calculator** panels: Show a "Position sizing calculator" label with the Calculator icon

   The preview card will be ~240px wide, positioned to the right (`side="right"`) with a fallback to bottom, styled with the existing glass-panel aesthetic.

3. **Preview component** — Create a small `TemplatePreview` component inline within the file that takes a `PremadeTemplate` and renders the appropriate mini-preview based on `type`.

### Layout flow
```text
┌─ Dialog ─────────────────────────┐
│ Add Panel                        │
│ ┌──────────────────────────────┐ │
│ │ 🔍 Search panels...          │ │
│ └──────────────────────────────┘ │
│ [Restore hidden panels...]       │
│ Templates                        │
│ ┌─────────┐  ┌─────────┐        │
│ │ Trade   │──│ Preview  │        │
│ │ Plan    │  │ card on  │        │
│ └─────────┘  │ hover    │        │
│ ┌─────────┐  └──────────┘        │
│ │ Pre-Mkt │                      │
│ └─────────┘                      │
│ ...                              │
│ ▸ Create Custom Panel            │
└──────────────────────────────────┘
```

### Technical details
- Search state: `const [search, setSearch] = useState("")`
- Filter: `PREMADE_TEMPLATES.filter(t => [t.title, t.description, t.type].some(s => s.toLowerCase().includes(search.toLowerCase())))`
- Same filter logic applied to `hiddenBuiltins` using `BUILTIN_LABELS`
- `HoverCard` with `openDelay={300}` to avoid flickering on quick mouse movements
- Preview content truncated to prevent overflow (max-h with overflow-hidden)

