

## Add Lock/Freeze Toggle to Graph Controls

### Overview
Add a "lock" button next to the zoom controls that disables all panning, zooming, and node dragging — freezing the graph in place.

### Changes to `src/components/AgentGraph.tsx`

1. **Add `locked` state**: `const [locked, setLocked] = useState(false)`

2. **Guard interactions with `locked`**:
   - `handleWheel`: early return if locked
   - `handleBgMouseDown` (pan start): early return if locked
   - Node drag start logic: early return if locked
   - Zoom in/out/reset buttons: disable when locked

3. **Add lock button** in the zoom controls div (after the reset/Maximize button, line ~883):
   - Uses `Lock` / `Unlock` icon from lucide-react
   - Same styling as existing zoom buttons, with an active state (brighter border/bg) when locked
   - Title: "Lock view" / "Unlock view"

4. **Import** `Lock, Unlock` from lucide-react

