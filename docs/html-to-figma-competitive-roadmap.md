# Bridging the 10–20% Accuracy Gap

This document analyses the failure modes that keep “HTML → Figma” tools at 80–90% fidelity, describes how the current repository addresses (or plans to address) each pain point, and lays out an actionable roadmap to outperform existing solutions.

---

## 1. Key Pain Points in Competing Tools

| Problem | User impact | Status in this repo | Next actions |
| --- | --- | --- | --- |
| **CSS Grid ↔ Figma mismatch** | Complex layouts degrade into absolutely positioned frames, forcing manual fixes. | Partial support. Current extractor records auto layout hints and Yoga approximates flexbox, but grid-template areas/minmax/fr are not reconstructed. | Implement a “smart layout” engine that interprets grid properties and converts them into nested Auto Layout frames with annotations for original CSS. |
| **Duplicate component detection** | Repeat elements become independent groups, not reusable components. | In progress. `component-manager.ts` deduplicates some nodes via schema flags, but fingerprints for arbitrary repetition are limited. | Expand DOM fingerprinting to detect repeated structures automatically, then convert first occurrence into a component and subsequent ones into instances. |
| **Lack of interactive states** | Only default styling is captured; hover/focus/prototype wiring is absent. | Not implemented. Extraction runs once, relying on default computed styles. | Extend capture pipeline (preferably Playwright) to sample pseudo-states (`:hover`, `:focus`). Produce variant arrays in schema and map to Figma variants + prototype interactions. |
| **Lost design tokens (CSS variables)** | Figma receives literal hex values, breaking design system continuity. | Partial. Design token maps are captured in `injected-script.ts`, but importer creates shared styles rather than Figma Variables. | Promote captured tokens into Figma Variables, establish alias relationships, and bind fills/text styles to these variables. |
| **SPA/dynamic content issues** | Static scrapes miss JS-rendered DOM or capture loading states only. | Addressed. Both Puppeteer scripts and Chrome extension execute page JS, scroll to trigger lazy content, and wait for extraction completion. | Continue hardening heuristics (network idle, skeleton detection) and expose fallback manual capture controls. |

---

## 2. Roadmap to Outperform Existing Solutions

### 2.1 Smart Layout Engine (Grid Heuristics)
- Parse `grid-template-columns` / `rows`, convert `fr` units to pixel widths using the parent frame size at capture time.
- When encountering `grid-template-areas`, construct a hierarchy of Auto Layout frames that mirror the area map rather than falling back to absolute positioning.
- Annotate imported frames with non-rendered metadata (e.g., plugin data key `originalCss`) to preserve source intent for designers.

### 2.2 Design System Fingerprinting
- Generate structural fingerprints (CSS properties + tag + child signature) for every DOM node during extraction.
- Mark nodes with matching fingerprints in the schema. Extend `component-manager.ts` to turn the first occurrence into a component and subsequent ones into `component.createInstance()` placements.
- Produce a “Generated Design System” section/page inside Figma that aggregates the main components for quick reuse.

### 2.3 Interactive State Capture
- Switch headless capture to Playwright (or enhance Puppeteer with CDP commands) to trigger interactions programmatically:
  - Default → `:hover` → `:focus` states.
  - Record computed style deltas and asset changes per state.
- Update the schema to carry variant data (e.g., `states: { default: {...}, hover: {...} }`).
- In the importer, create component variants, apply state-specific styles, and wire prototyping events (While Hovering, On Focus).

### 2.4 Design Token Variable Mapping
- During extraction, persist both raw values and originating CSS variable names, plus alias relationships (`--button-bg` → `--brand-primary`).
- In the plugin:
  - Create/update a Figma Variable collection (“Imported Tokens”).
  - Instantiate base variables and alias variables with correct references.
  - Bind fills, strokes, typography, and spacing to the corresponding variables instead of raw styles.

### 2.5 Robust SPA Handling
- Maintain the existing scrolling + lazy-load detection (`PageScroller`, design token extraction progress).
- Add heuristics for dynamic modules: wait for the DOM mutation count to stabilise, detect skeleton loaders, and optionally provide a manual “pause & capture” control.

---

## 3. Validation & Milestones

1. **Grid heuristic milestone**
   - Test pages with complex `grid-template-areas`.
   - Ensure resulting Figma frames remain editable and visually accurate (<5% manual cleanup).

2. **Component fingerprint milestone**
   - Validate on pages with repeated cards/buttons/lists.
   - Confirm asset panel shows generated components; instances preserve original positioning.

3. **Interactive variant milestone**
   - Capture hover/focus states for buttons/forms.
   - Verify prototype interactions work automatically in Figma.

4. **Design token milestone**
   - Import a design-system-heavy page (CSS variables).
   - Confirm Figma Variables mirror token naming and alias structure.

5. **Regression testing**
   - Combine Puppeteer + Chrome extension captures.
   - Run end-to-end import, ensuring no payload size or chunking regressions in the handoff pipeline.

---

## 4. Strategic Outlook

Closing the 10–20% fidelity gap requires moving beyond “pixel-perfect” aspiration and focusing on semantic fidelity—preserving layout intent, reusable components, interaction states, and design system context. Implementing the roadmap above positions this project to deliver cleaner imports and a genuinely usable starting point for designers, differentiating it from today’s lossy converters.

Update this roadmap as milestones are delivered; it should act as both competitive analysis and an engineering backlog for high-impact improvements.
