

## Add Pre-made Panel Templates to Add Panel Dialog

Currently the "Add Panel" dialog only lets users create blank Notes, Embed, or Checklist panels. This plan adds a gallery of pre-made panel templates that users can add with one click -- each pre-populated with useful content.

### Pre-made Templates

| Template | Type | Pre-populated Content |
|---|---|---|
| **Trade Plan** | notes | Markdown template: Entry/Exit criteria, Risk/Reward, Position size |
| **Pre-Market Checklist** | checklist | Items: Check news, Review watchlist, Set alerts, Check economic calendar, Review open positions |
| **Risk Management Rules** | notes | Template: Max daily loss, Position sizing rules, Stop-loss rules |
| **Trade Review** | notes | Template: What went well, What went wrong, Lessons learned, Action items |
| **Daily Goals** | checklist | Items: Set daily P/L target, Identify key levels, Review strategy, Log trades |
| **Economic Calendar** | embed | Embedded TradingView economic calendar URL |
| **Market Sentiment** | notes | Template: Overall bias, Key support/resistance, Sector rotation notes |
| **Strategy Playbook** | notes | Template: Strategy name, Setup conditions, Entry rules, Exit rules, Example |
| **Session Log** | checklist | Items: Pre-market prep, Morning session review, Midday check-in, EOD review, Journal entry |
| **Quick Links** | embed | Placeholder for user's favorite trading resource URL |

### Files to Change

1. **`src/components/trading/AddPanelDialog.tsx`**
   - Add a `PREMADE_TEMPLATES` array with name, description, icon, type, and default content for each template
   - Restructure the dialog into two sections: "Quick Add Templates" (scrollable grid of template cards) and "Custom Panel" (existing create form, collapsed by default)
   - Clicking a template card instantly creates the panel with pre-populated content and closes the dialog
   - Each template card shows an icon, title, and short description

2. **`src/contexts/TradingLayoutContext.tsx`**
   - No changes needed -- templates use existing `addCustomPanel` with type `notes` / `checklist` / `embed`

### UI Layout of Dialog

```text
┌─ Add Panel ──────────────────────────┐
│                                      │
│  Restore hidden: [Market] [Agent]    │  (if any hidden)
│  ─────────────────────────────────   │
│  Templates                           │
│  ┌──────────┐ ┌──────────┐           │
│  │ 📋       │ │ ✅       │           │
│  │Trade Plan│ │Pre-Market│           │
│  │ Template │ │Checklist │           │
│  └──────────┘ └──────────┘           │
│  ┌──────────┐ ┌──────────┐           │
│  │ 🛡️       │ │ 📝       │           │
│  │Risk Mgmt │ │Trade     │           │
│  │ Rules    │ │Review    │           │
│  └──────────┘ └──────────┘           │
│  ... (scrollable)                    │
│  ─────────────────────────────────   │
│  ▸ Create Custom Panel               │  (collapsible)
│    [Title] [Type] [Create]            │
└──────────────────────────────────────┘
```

