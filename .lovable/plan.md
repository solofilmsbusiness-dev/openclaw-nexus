

## Add Dark/Light Mode Toggle to Dashboard

The app has `next-themes` installed but no `ThemeProvider` or light mode CSS variables. Here's the plan:

### 1. Light Mode CSS Variables (`src/index.css`)
Add a `.light` selector (or remove the `:root` dark-only assumption) with light-appropriate values for all CSS variables — lighter backgrounds, darker text, adjusted card/border/muted colors.

### 2. ThemeProvider Setup (`src/App.tsx`)
Wrap the app in `next-themes`' `ThemeProvider` with `attribute="class"`, `defaultTheme="dark"`, and `storageKey="solo-os-theme"`. Place it near the top of the component tree.

### 3. Toggle Button in MetricsBar (`src/components/MetricsBar.tsx`)
Add a `Sun`/`Moon` icon button next to the existing Settings gear in the MetricsBar. It will call `useTheme()` from `next-themes` to toggle between dark and light. Styled consistently with the settings button (same size, hover effects).

### Files Changed

| File | Change |
|------|--------|
| `src/index.css` | Add `.light` / `:root` light-mode CSS variable block |
| `src/App.tsx` | Wrap in `ThemeProvider` from `next-themes` |
| `src/components/MetricsBar.tsx` | Add Sun/Moon toggle button using `useTheme()` |

