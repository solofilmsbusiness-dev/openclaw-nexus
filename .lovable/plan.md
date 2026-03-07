

## AI Stock Evaluator Panel for Trading Page

### Overview
Add a new built-in panel type "AI Evaluator" that lets users enter a futures symbol and get an AI-powered evaluation using Lovable AI (via the existing `LOVABLE_API_KEY`). The evaluator will analyze the instrument and return a structured assessment (sentiment, key levels, risk factors, trade ideas).

### Architecture

```text
User enters symbol → Edge Function (ai-evaluate) → Lovable AI Gateway → Structured response → Rendered in panel
```

### Changes

**1. New Edge Function: `supabase/functions/ai-evaluate/index.ts`**
- Accepts `{ symbol: string }` in POST body
- Calls Lovable AI Gateway (`google/gemini-3-flash-preview`) with a system prompt tailored for futures/stock evaluation
- Returns structured JSON: sentiment (bullish/bearish/neutral), confidence score, key support/resistance levels, risk factors, and a short trade idea
- Handles CORS, 429/402 errors

**2. `supabase/config.toml`** — add `[functions.ai-evaluate]` with `verify_jwt = false`

**3. New Component: `src/components/trading/AIEvaluatorPanel.tsx`**
- Symbol input (dropdown of `ALL_INSTRUMENTS` + custom text input)
- "Evaluate" button that calls the edge function via `supabase.functions.invoke`
- Displays results: sentiment badge (color-coded), confidence bar, support/resistance levels, risk bullets, trade idea text
- Loading state with skeleton
- Error handling with toast for rate limits

**4. `src/contexts/TradingLayoutContext.tsx`**
- Add `"ai-evaluator"` to `BuiltinPanelId` union and `ALL_BUILTINS` array

**5. `src/pages/Trading.tsx`**
- Add rendering case for the `"ai-evaluator"` panel ID, importing `AIEvaluatorPanel`

**6. `src/components/trading/AddPanelDialog.tsx`**
- Add "AI Evaluator" to `BUILTIN_LABELS` so users can restore it if removed

### AI Prompt Design
The edge function system prompt will instruct the model to act as a futures/stock market analyst and return a structured evaluation via tool calling, ensuring consistent JSON output with fields: `sentiment`, `confidence`, `support_levels`, `resistance_levels`, `risk_factors`, `trade_idea`.

### Panel UI
- Header: "AI Evaluator" with a Brain icon
- Symbol selector from existing instruments list
- Evaluate button with loading spinner
- Results card with: sentiment badge, confidence progress bar, S/R levels in a mini table, risk factors as bullet list, trade idea as highlighted text block
- History of last 3 evaluations stored in component state

