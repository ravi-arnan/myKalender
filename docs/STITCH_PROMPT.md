# Google Stitch Prompt — myKalender

> Copy paste prompt di bawah ini ke Google Stitch, lampirkan juga file PRD dan DESIGN system yang disediakan terpisah.

---

## PROMPT

Design a complete UI for **myKalender**, a web application that unifies multiple Google Calendar accounts into a single dashboard, with an AI assistant that generates calendar events from natural language prompts.

### Product Summary

Users connect multiple Google accounts (personal, work, campus, etc.) and see all their events in one unified calendar view, color-coded per account. A standout AI feature lets users type natural language descriptions of their schedule and automatically creates the events across the right accounts.

### Target Users

University students, professionals with multiple work accounts, freelancers, and anyone juggling more than one Google account.

### Screens to Design

Design the following screens at both **desktop (1440px)** and **mobile (375px)** widths.

**1. Landing Page**
- Hero band: bold headline ("Satu kalender untuk semua akun Google Anda" or similar), supporting paragraph, primary CTA "Sign in with Google", secondary CTA "Learn more"
- Hero right side: large mockup card showing a preview of the unified calendar with events from 3-4 accounts in different colors
- Feature section (3-up cards): "Unified View", "AI Scheduling", "Conflict Detection"
- AI feature spotlight band: show the AI prompt textarea + generated event preview cards (this is the standout feature)
- Pricing/CTA band: "Forever free" message with CTA
- Dark footer

**2. Sign-in Screen**
- Clean centered card with logo, "Sign in with Google" button, brief value proposition
- Background: white canvas

**3. Onboarding — Connect Additional Accounts**
- Step-by-step modal or full-page flow
- "Connect another Google account" button with explanatory text
- List of already-connected accounts with email + color picker + custom label input
- Skip option to go straight to dashboard

**4. Main Dashboard (Calendar View) — most important screen**
- Top nav: logo left, view switcher (Day / Week / Month) center as pill-group, user avatar + "AI Schedule" primary button right
- Left sidebar: connected accounts list with toggle visibility checkboxes, each row showing color dot + email + label, plus "Add account" button at bottom
- Main area: calendar grid (default Week view), events shown as colored blocks, time labels left, day headers top
- Conflict indicator: events that overlap across accounts get a small warning badge
- Floating "Today" button to jump to current date
- Mini date picker top-left of main area for quick navigation

**5. Month View Variant**
- Same nav + sidebar as Week view
- Main area: month grid with small event dots/labels per day, color-coded per account
- Click on a day expands to show events for that day

**6. AI Schedule Modal (signature feature)**
- Dark-surface modal (deliberate contrast against the otherwise light UI)
- Large textarea with placeholder example: "Senin sampai Jumat saya kuliah Kalkulus jam 8-10..."
- Below textarea: target account selector (dropdown or pill picker)
- Primary CTA "Generate Schedule"
- After generation: preview cards listing each parsed event with editable fields (title, time, date, recurrence) and per-event account assignment
- Footer with "Add All to Calendar" primary CTA and "Edit Prompt" secondary

**7. Event Detail Modal**
- Lightweight overlay
- Shows: event title, time range, location, description, source account (with color), recurrence info
- Actions: Edit, Delete (only for events created via app), Open in Google Calendar (external link)

**8. Settings — Connected Accounts**
- List view of all connected accounts
- Each row: avatar, email, custom label (editable), color swatch (clickable to change), last sync timestamp, "Disconnect" button
- "Add Google Account" CTA at top

**9. Empty States**
- No connected accounts (post-sign-in, before connecting any)
- No events in selected range
- AI generation: no results / parsing error

**10. Mobile Adaptations**
- Hamburger menu replaces top nav
- Sidebar becomes bottom sheet
- Calendar collapses to agenda list view as default on mobile (week view available via toggle)
- AI Schedule becomes full-screen modal

### Key Components to Define

- Top navigation bar (signed-in vs signed-out states)
- View switcher pill group (Day/Week/Month)
- Account row with color dot + toggle
- Calendar event block (with account color + title + time)
- Conflict warning badge
- AI prompt input area
- AI-generated event preview card (editable, with per-event account assignment)
- Add-account empty state card

### Design Direction

Follow the design system provided in the attached DESIGN reference. Key adherence points:

- White canvas dominant, with light gray cards for grouped content
- Monochrome primary actions (dark CTAs)
- Display headlines use weight 600 with tight negative letter-spacing
- Body text uses Inter
- Card radius 12px, button radius 8px, hero mockup card 16px, pill shapes for grouped nav
- Pastel accent palette (orange, pink, violet, emerald) used **only** for per-account color-coding of events and avatars — never on primary CTAs
- Generous whitespace, 96px section padding on marketing pages
- **AI Schedule modal uses dark surface** to mark it as the deliberate signature feature (same treatment as a featured pricing tier)
- Dark footer closes the landing page

### Tone

Confident, modern-SaaS, friendly but engineered. Not playful, not corporate. Think Cal.com or Linear, not Trello or Asana.

### Language

UI copy can be in **Bahasa Indonesia** with English technical terms where natural (e.g., "Sign in with Google", "AI Schedule" stay English; "Tambah akun", "Jadwal minggu ini" in Indonesian).

### Deliverables

- All screens listed above at desktop + mobile
- Component library with all reusable elements
- Hover and active states for buttons and interactive elements
- Color palette and typography tokens documented inline

---

## CHECKLIST SEBELUM SUBMIT KE STITCH

- [ ] Lampirkan file PRD
- [ ] Lampirkan file DESIGN system
- [ ] Copy prompt di atas (mulai dari "Design a complete UI..." sampai "...documented inline")
- [ ] Set output preference ke React/Tailwind kalau ada opsinya
