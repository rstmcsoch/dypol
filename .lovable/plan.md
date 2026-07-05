
# Dypol — Live Unscripted Life

A rebranded, orange→red themed site inspired by Bookie's layout. Keeps Home / Materials (teaser) / Portals (teaser) / Support, plus full auth + onboarding + profile. Adds a multi-theme picker with light/dark, and swaps navigation to a liquid-glass bottom nav on mobile/portrait, top nav on desktop/landscape.

## Sections & Routes

- `/` Home — hero with big "DYPOL" wordmark, tagline "Live Unscripted Life", promo card, CTAs (Browse Materials, Support). Empty logo + hero image slots for you to fill.
- `/welcome` Auth entry — Google, Email, Continue as Guest
- `/onboarding` — 3 steps (name → target category → confirm)
- `/materials` — filter sidebar + material cards. Every material from Bookie carried over (name, subject, type badge) as teasers; "Access Resource" buttons are placeholders with empty link slots.
- `/portals` — coaching portal cards (PW, Vibrant, Mission JEET, Unacademy, Careerwill, Apni Kaksha, Competishun, ALLEN) as teaser blocks with empty link slots.
- `/support` — contact / chat / donate section
- `/profile` — edit display name, target, avatar upload placeholder

Removed: Tests, YPT.

## Theme System

Theme picker modal (like the screenshot) with:
- Light / Dark mode toggle
- Color themes: **Sunset Blaze (default orange→red)**, Sandalwood, Forest Emerald, Ocean Deep, Sakura Blossom, Dracula Midnight, Lavender Mist, Cyberpunk Neon
- Stored in localStorage; applied via `data-theme` attr + `.dark` class on `<html>`
- All colors as oklch tokens in `src/styles.css`; primary gradient `--gradient-primary` used across CTAs and accents

## Navigation (responsive liquid glass)

- **Desktop / landscape tablet**: top nav pill, `backdrop-blur-2xl bg-white/10 border-white/20`, hover glow
- **Mobile / portrait tablet**: fixed floating bottom nav, rounded-3xl, liquid-glass, active tab pops with gradient + scale, taps ripple with radial gradient (touch-reactive, iOS-liquid-glass feel)
- Switches via `matchMedia('(orientation: portrait)')` + width check
- Items: Home, Materials, Portals, Support, Profile

## Interactivity

- Every button: hover lift + gradient shimmer, active scale-95, focus ring in primary
- Cards: hover lift, gradient border on hover
- Framer Motion for section reveal + nav transitions
- Empty logo slot in header and empty image slots on hero/portal cards, clearly marked so you can drop images in later

## Auth & Data (Lovable Cloud)

- Enable Lovable Cloud
- `profiles` table (id, display_name, target_category, avatar_url, is_guest, created_at) with RLS + auto-create trigger
- Google OAuth via Lovable broker + Email/password + Guest (anonymous) sign-in
- `_authenticated` layout gates `/profile` and `/onboarding`

## Technical Notes

- TanStack Start file-based routes
- Fonts via `@fontsource` — Space Grotesk (display) + Inter (body), distinct from Bookie
- ThemeProvider wired in `__root.tsx`
- Liquid-glass nav uses standard `backdrop-filter` only (build adds prefixes)
- Material/portal link fields left as `href: ""` with "Coming soon" state so URLs can be added later
- Metadata: title "Dypol — Live Unscripted Life", matching og/twitter tags

## Out of scope

- Real link URLs for materials/portals (empty per your request)
- Real logo + hero images (empty slots reserved)
- Tests, YPT, leaderboards, chat backend

Approve to build.
