

## Make Light Mode Text Black for Better Visibility

The light mode `--foreground` is currently `225 15% 12%` (dark blue-gray) and `--muted-foreground` is `220 10% 45%` (medium gray). These need to be pushed closer to black.

### Changes to `src/index.css` (`.light` block)

| Variable | Current | New |
|----------|---------|-----|
| `--foreground` | `225 15% 12%` | `0 0% 5%` (near-black) |
| `--card-foreground` | `225 15% 12%` | `0 0% 5%` |
| `--popover-foreground` | `225 15% 12%` | `0 0% 5%` |
| `--secondary-foreground` | `225 10% 30%` | `0 0% 10%` |
| `--muted-foreground` | `220 10% 45%` | `220 10% 30%` (darker gray) |
| `--sidebar-foreground` | `225 15% 20%` | `0 0% 10%` |
| `--sidebar-accent-foreground` | `225 15% 20%` | `0 0% 10%` |

Single file change, no structural modifications.

