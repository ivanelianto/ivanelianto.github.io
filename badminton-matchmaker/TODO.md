# TODO - Bulma-only styling migration (strict)

- [ ] Step 1: Strip `styles.css` down to Bulma-only usage:
  - Remove custom utility/shim classes (e.g. `.u-*`, `.fw-900`, `.no-margin`, focus/disabled helpers that duplicate Bulma)
  - Remove custom component styling classes that duplicate Bulma (e.g. `.card` overrides, `.btn` styles, custom `.table`, `.pill/.badge` styles) where feasible
  - Keep only the absolutely necessary bespoke CSS (if required) for:
    - drawer open/close animation (`.open`, `.drawer-backdrop.open`, `.navigation-drawer.open`)
    - view switching (`.view` / `.view.active`)
    - custom controls that Bulma can’t replicate (e.g. `.class-radio`, `.switch`)

- [ ] Step 2: Refactor `app.js` template classNames to Bulma equivalents:
  - Replace `.btn` -> `.button`
  - Replace `.btn good`/`.btn danger`/`.btn primary` -> `.button is-success|is-danger|is-primary`
  - Replace `card card--muted` -> `card` (and replace “muted/overlay” usage in markup)
  - Replace spacing helpers:
    - `mt-*`, `mb-*`, `mt-#`/`mb-#`/`ml-#`/`mr-#`/`u-mt-*`/`u-mb-*` -> Bulma `mt-*` / `mb-*` etc
    - remove `u-gap-*` and replace with Bulma layout classes or margin utilities
  - Replace custom typography utilities (`u-font-15`, `lh-13`, etc) with Bulma font-size classes (`is-size-7`, etc) and margins.

- [ ] Step 3: Refactor `confirmDialog.js` / modal content to use Bulma classes only; remove any dependency on `.confirm-dialog-*` styles (if removed).

- [ ] Step 4: Update any remaining HTML class usage in `index.html` that depends on removed custom CSS.

- [ ] Step 5: Manual verification by running in browser:
  - navigation drawer works
  - view switching works
  - modals render correctly
  - all buttons and layouts remain usable
