

## Fix: Quick Links Embed Panel Blank/White Error

### Problem
The Quick Links template defaults to `https://finviz.com/map.ashx`, which blocks iframe embedding via `X-Frame-Options` or CSP headers. Most major financial sites do the same. The iframe renders a blank white page.

### Solution
Two changes in `src/components/trading/CustomPanel.tsx`:

1. **Add error handling to EmbedContent** -- wrap the iframe in a container that also shows a fallback link. Use the `onError` event and an `onLoad` check. Since cross-origin iframes can't reliably detect load failures, the best UX is to always show an "Open in new tab" link below/overlaid on the iframe so users aren't stuck on a white screen.

2. **Add `allow-forms allow-popups` to sandbox** -- some embeddable widgets need these permissions.

### Changes -- `src/components/trading/CustomPanel.tsx` only

Replace `EmbedContent` with:
- State `failed` (boolean), set on iframe `onError`
- If `failed`, show a styled fallback card with the URL as a clickable external link
- Always render a small "Open in new tab" link below the iframe regardless of state
- Add `referrerPolicy="no-referrer"` and expand `sandbox` to `allow-scripts allow-same-origin allow-forms allow-popups`

Also update the **Quick Links** default URL in `AddPanelDialog.tsx` from `finviz.com/map.ashx` (which blocks iframes) to something more embeddable, or keep it but note it may not embed.

### Console error fix
The `EmbedContent` function component gets a ref from `motion.div` in `PanelWrapper`. Wrap it with `React.forwardRef` to fix the "Function components cannot be given refs" warning.

