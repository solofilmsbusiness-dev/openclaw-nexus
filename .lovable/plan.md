

## Add Uploadable Background Image to Agent Graph

### What
Add an image upload button to the graph panel's toolbar that lets users pick an image file, which then renders as a blurred background behind the SVG graph. Include controls to adjust blur, opacity, position (x/y offset), and scale -- all within the graph container.

### How

**File: `src/components/AgentGraph.tsx`**

1. **State**: Add state for the background image URL (via `URL.createObjectURL`), blur amount (default ~8px), opacity (default 0.3), position offset x/y, and scale. Add a `showBgControls` toggle.

2. **Upload button**: Add an `ImagePlus` icon button to the existing top-right toolbar (line ~950, next to zoom controls). Clicking it opens a hidden `<input type="file" accept="image/*">` element.

3. **Background image layer**: Insert a `<div>` with `position: absolute; inset: 0` between the glass-panel container (line 869) and the SVG element (line 1024). This div renders the uploaded image using CSS `background-image` with:
   - `filter: blur(${blurAmount}px)`
   - `opacity: ${opacity}`
   - `background-position` offset by x/y values
   - `background-size` controlled by scale percentage
   - `pointer-events: none` so it doesn't interfere with graph interactions

4. **Adjustment panel**: When an image is loaded, show a small floating controls panel (bottom-right, similar style to the legend panel) with:
   - **Blur** slider (0-20px)
   - **Opacity** slider (0-1)
   - **Scale** slider (50%-200%)
   - **Position X/Y** sliders (-50% to +50%)
   - **Remove** button to clear the image
   - A toggle button (e.g., `SlidersHorizontal` icon) in the toolbar to show/hide this panel

5. **Persistence**: Store settings in localStorage keyed by a simple identifier so the background persists across page reloads. The image itself is stored as a base64 data URL in localStorage (with a reasonable size limit warning via toast if over ~5MB).

### UI Details
- All controls use the existing design language: `glass-panel`, `border-border/30`, `bg-secondary/30`, `text-muted-foreground`, `font-mono text-[10px]`
- Sliders use the existing `@radix-ui/react-slider` component
- The adjustment panel is compact (~200px wide) and dismissible

