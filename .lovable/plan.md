

## Fix: Kill Switch Red Overlay Covers Full Graph Container

### Problem
The red overlay is an SVG `<rect>` sized to the `viewBox`, but the SVG maintains a fixed 4:3 aspect ratio (800×600). When the container is taller (which it is on most screens), the SVG letterboxes, leaving dark gaps at top and bottom that the SVG rect can't reach.

### Solution
Replace the SVG `<rect>` overlay with an HTML `<div>` overlay positioned absolutely over the entire graph container. This guarantees full coverage regardless of aspect ratio.

**`src/components/AgentGraph.tsx`**:
1. Remove the SVG `<rect>` kill overlay (lines 974-983)
2. Add an absolutely-positioned `<div>` overlay inside the outer container div (after the SVG), using `killProgress` for opacity:
   ```tsx
   <div
     className="absolute inset-0 pointer-events-none z-[1] rounded-xl"
     style={{
       background: "radial-gradient(ellipse at center, hsl(0 70% 40% / 0.25), hsl(0 70% 30% / 0.12))",
       opacity: killProgress,
       transition: "none",
     }}
   />
   ```
3. This div uses `inset-0` to fill the full container, `rounded-xl` to match the glass-panel corners, and the radial gradient gives a more dramatic center-bright effect.

Single file change, ~5 lines modified.

