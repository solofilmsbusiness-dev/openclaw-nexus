
The settings button is currently positioned in the bottom-right corner (fixed bottom-4 right-4) with small text and muted styling (text-[10px] text-muted-foreground). It blends in with the command palette button next to it.

To make it more visible, the plan will:

1. **Increase size & prominence**: Make the gear icon larger (w-5 h-5 instead of w-3.5 h-3.5), add larger padding
2. **Enhance visual hierarchy**: Use the primary color (bright blue) for the icon to stand out, add hover glow effect
3. **Add animation**: Subtle pulse or rotation on hover to draw attention
4. **Position it prominently**: Move to top-right corner (fixed top-4 right-4) instead of bottom-right, making it more discoverable

Changes:
- **src/pages/Index.tsx**: Update settings button styling with larger icon, primary color, hover animation, and move to top-right
- **src/index.css**: Add a gentle hover animation (scale + glow) for the settings button
