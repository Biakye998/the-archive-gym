# AGENTS.md — THE ARCHIVE Frontend

## Commands

| Task | Command |
|------|---------|
| Start dev server | `node server.js` |
| Preview | `open http://localhost:6435` |

## Project Structure

```
css/            # Stylesheets (modular, imported via style.css)
  design-tokens.css  # Colors, typography, spacing, motion tokens
  base.css           # Reset, typography, layout helpers
  buttons.css        # Button component system
  navbar.css         # Navigation + mobile menu
  hero.css           # Hero section
  experience.css     # Gym experience section
  training.css       # Training programs
  membership.css     # Membership plans
  cta-footer.css     # Final CTA + footer component styles
  style.css          # Entry point (imports all above)
js/app.js         # Interactivity (ArchiveApp class: mobile menu, scroll reveal, smooth scroll, form validation)
images/           # Curated premium imagery
  hero/           # Hero backgrounds
  gym/            # Gym interior
  training/       # Training/conditioning
  lifestyle/      # Lifestyle imagery
index.html        # Home page (hero + experience + training preview + membership + contact CTA)
training.html     # Training programs detail
strength.html     # Strength program detail
personal-training.html # Personal training program detail
group-training.html # Group training program detail
recovery.html     # Recovery program detail
membership.html   # Membership plans overview (all 3 plans)
core.html         # Core plan ($149/mo) detail page
performance.html  # Performance plan ($349/mo) detail page
archive.html      # Archive plan ($749/mo) detail page
about.html        # About / our approach
contact.html      # Contact page with working form
join.html         # Membership application form (multi-step)
trainers.html     # Coaching team
privacy.html      # Privacy policy
terms.html        # Terms of service
server.js         # Dev server (port 6435)
```

## Design System

- **Colors**: White background, deep navy text (#0f172a), royal blue accent (#1e40af)
- **Typography**: Fraunces (serif display), Inter (sans-serif body), monospace (labels)
- **Breakpoints**: 979px (tablet), 560px (mobile)

## Navigation Architecture

- Multi-page site with consistent navigation across all pages
- Home page (`index.html`) includes hero, experience overview, training preview, membership plans, and contact CTA sections
- Each navigation item links to a dedicated page:
  - `index.html` → Home
  - `training.html` → Training overview
  - `strength.html` → Strength program
  - `personal-training.html` → Personal training program
  - `group-training.html` → Group training program
  - `recovery.html` → Recovery program
  - `membership.html` → Membership overview (all 3 plans)
  - `core.html` → Core plan ($149/mo) detail
  - `performance.html` → Performance plan ($349/mo) detail
  - `archive.html` → Archive plan ($749/mo) detail
  - `about.html` → Our approach/methodology
  - `trainers.html` → Coaching team
  - `contact.html` → Contact form
  - `join.html` → Membership application
  - `privacy.html`, `terms.html` → Legal pages
- User flow: Training → Program detail → APPLY → join.html (with pre-selected program)
- User flow: Membership page → Plan SELECT → Plan detail page → APPLY → join.html (with pre-selected plan)
- `join.html` accepts URL parameters: `?plan=core|performance|archive` and `?program=strength|pt|group|recovery`
- Smooth scroll handled via `js/app.js` for same-page anchor links

## Supabase Integration Notes

All content uses `data-component`, `data-content`, `data-plan`, and `data-cta` attributes for targeting with future Supabase data.

## Content Architecture

The site is built with static HTML using consistent `data-component` attributes throughout, making future Supabase data integration straightforward. Each page shares the same CSS (`css/style.css`), JS (`js/app.js`), and component patterns. No fake backend — forms submit to static state with client-side validation.
