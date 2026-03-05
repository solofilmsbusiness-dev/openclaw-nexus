

## Add Solar System Particle Effects to Graph

### Overview
Add ambient orbital particles, stardust drifting effects, and energy rings around the core to give the graph a solar system feel — particles orbiting the core at various radii, small sparkle particles floating in the background, and energy pulse rings emanating from the core.

### Changes

**`src/components/AgentGraph.tsx`**

**1. Orbital Particles (planets/asteroids orbiting the core)**
- Add an `OrbitalParticles` component rendered inside the SVG after the grid/background
- Render 20-30 small circles at various orbital radii (80-350px from core), each using `<animateTransform type="rotate">` around `CORE_X, CORE_Y` with varying durations (10-60s) and directions
- Vary size (1-3px), opacity (0.1-0.4), and color (blue, cyan, purple tints)
- Apply the `particleGlow` filter on some larger ones

**2. Stardust / Background Sparkles**
- Add a `Stardust` component with ~40 tiny circles (0.5-1.5px) scattered across the viewBox area
- Each has a slow `<animate>` on opacity (twinkling effect, 2-8s random durations)
- Positioned randomly but deterministically (seeded from index)

**3. Core Energy Rings**
- Add 2-3 expanding rings from the core center using `<circle>` with `<animate>` on `r` (expanding outward from 30 to 200+) and `opacity` (fading from 0.15 to 0)
- Staggered start times, repeat indefinitely — creates a radar/pulse wave effect
- Use the primary blue color with low opacity

**4. Comet Trails on Edges**
- Add a second particle on each `AnimatedEdge` traveling the reverse direction with a slightly different speed, creating busier traffic
- Add a faint trail effect by rendering a second, larger, more transparent particle behind the main one

All particles are pure SVG animations (no JS timers), keeping performance lightweight.

