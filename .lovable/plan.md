

## Add Settings Button to Index Page

Add a settings/gear icon button (using `lucide-react`'s `Settings` icon) to the bottom-right area of the Index page, next to the existing `⌘K` hint button. Clicking it navigates to `/admin` via `react-router-dom`'s `useNavigate`.

### Changes

**`src/pages/Index.tsx`**
- Import `Settings` from `lucide-react` and `useNavigate` from `react-router-dom`
- Add a gear button in the `fixed bottom-4 right-4` container, styled consistently with the existing `⌘K` button, linking to `/admin`

