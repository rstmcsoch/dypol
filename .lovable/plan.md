## Add a real in-app editor for Dypol

Right now everything (materials, portals, logo, hero, site copy) lives in TypeScript files, so there's no way to change it from the running app. I'll wire the site to Lovable Cloud so you can sign in as admin and edit content live — with changes visible to every visitor on every device.

### 1. Enable Lovable Cloud + admin auth

- Turn on Lovable Cloud (database, auth, storage).
- Enable Email/Password sign-in (you'll create your admin account with your own email).
- Add `profiles` table (linked to `auth.users`) and a separate `user_roles` table with an `app_role` enum (`admin`, `user`) — roles never live on the profile (security).
- `has_role(uid, role)` security-definer function used by every RLS policy.
- After you sign up the first time, I'll flip your account to `admin` via the DB.

### 2. Content tables (all publicly readable, admin-only writable)

- `materials` — id, tier, subject, type, title, desc, link, sort_order
- `portals` — id, name, desc, link, count, sort_order
- `site_settings` — single row keyed `main`: site_title, tagline, logo_url, hero_image_url, footer_text, support_email, support_whatsapp, home_cta_primary_label/url, home_cta_secondary_label/url, plus a `nav_items` JSON for header/footer links.
- Storage bucket `site-assets` (public) for logo + hero image uploads.
- Seed materials/portals rows from the current `src/lib/data.ts` so nothing visually changes on first load.

### 3. Frontend rewire (public reads)

- Replace hard-coded imports from `src/lib/data.ts` in `materials.tsx`, `portals.tsx`, `index.tsx`, `__root.tsx`, `support.tsx` with public Supabase reads through TanStack Query.
- Logo slot, hero image slot, site title, tagline, footer, and support contacts all read from `site_settings`.
- Public routes stay SSR-friendly (server publishable client with narrow `TO anon` SELECT policies).

### 4. Editor UX — both inline pencils AND an /admin dashboard

**Inline (visible only when signed in as admin):**
- Pencil icon overlay on every editable surface: logo, hero image, tagline, each material card, each portal card, footer, support block.
- Click → modal with the right form (text fields, URL field, image upload where relevant) → saves and refreshes.

**/admin dashboard (protected under `_authenticated/_admin/`):**
- **Overview** — site title/tagline/footer/CTAs form + logo & hero uploaders.
- **Materials** — table with add / edit / delete / drag-to-reorder; tier, subject, type dropdowns; link field; bulk paste-links helper.
- **Portals** — same treatment (name, desc, link, count).
- **Media** — list uploaded images in `site-assets` with copy-URL + delete.
- **Account** — sign out, change password.

Non-admin visitors get the normal site — no pencils, no /admin route.

### 5. Auth flow updates

- `/welcome` gets a real email/password sign-in + sign-up (Google removed for now since only you edit; can add later).
- Guest mode stays for visitors who just want to browse (no edits).
- `_authenticated/_admin/route.tsx` gates the dashboard on `has_role(uid,'admin')`; non-admins get redirected.

### 6. Uploads

- Logo and hero image use a shared `<ImageUploadField>` that uploads to `site-assets` storage, then stores the public URL in `site_settings`.
- Material/portal images (if you want them later) reuse the same component — this plan wires it for logo + hero; adding per-card images later is a small follow-up.

### Technical notes

- TanStack Start server functions with `requireSupabaseAuth` for all admin writes, plus a `has_role` check inside each write handler (defense in depth alongside RLS).
- Public reads use the server publishable client so SSR works without a session.
- All admin form inputs validated with zod (length + URL shape) on client and server.
- RLS: `materials`, `portals`, `site_settings` — `SELECT TO anon, authenticated USING (true)`; `INSERT/UPDATE/DELETE` restricted to `has_role(auth.uid(),'admin')`. Storage `site-assets` public read, admin-only write.
- One migration creates schema + seeds current data; a follow-up insert-tool call flips your account to admin after your first sign-up.

### Out of scope (say the word to add)

- Google/Apple sign-in (email/password is enough for a single admin).
- Per-material image uploads (structure is ready, UI is a follow-up).
- Multi-admin invitations, audit log, draft/publish workflow.
- Migrating existing localStorage guest profiles into Cloud.

### What you'll do after I build

1. Sign up on `/welcome` with your email → I flip that account to admin.
2. Sign in → pencils appear + `/admin` is unlocked.
3. Edit anything from the running site or from the dashboard; changes are instantly live for everyone.

Approve and I'll enable Cloud and ship it.