# HCS Nachweisboard

Mobile-first SaaS-Prototyp für kleine Handwerksbetriebe: Leistungsnachweise, Zusatzarbeiten, Foto-Doku, Kundenfreigabe und PDF-Export.

**Branding:** made with ❤️ by hcsmedia

## Live Stack

- Frontend: React + Vite
- Backend: Supabase Postgres + Storage
- Hosting: GitHub Pages oder Vercel
- CI: GitHub Actions

## Supabase Projekt

Dieses Repo ist für das frisch erstellte Supabase-Projekt vorbereitet:

```text
Project ref: dzcqrxhwsvdfitkjgede
URL: https://dzcqrxhwsvdfitkjgede.supabase.co
Public key: sb_publishable_S5wHzEUYjweSjaFjTtNYQA_4TUj2EKN
```

Angelegt sind:

- `public.projects`
- `public.proofs`
- Storage Bucket `proof-photos`
- Demo-RLS-Policies für anonymen CRUD Zugriff
- Seed-Daten für 2 Projekte und 3 Nachweise

> Hinweis: Die aktuellen RLS-Policies sind absichtlich demo-/prototype-freundlich. Vor Produktion bitte mandantenfähige Auth-Policies aktivieren.

## Lokal starten

```bash
npm install
npm run dev
```

## Build testen

```bash
npm run build
npm run preview
```

## Vercel Deploy

1. Repo in Vercel importieren
2. Framework: Vite
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Environment Variables setzen:

```bash
VITE_SUPABASE_URL=https://dzcqrxhwsvdfitkjgede.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_S5wHzEUYjweSjaFjTtNYQA_4TUj2EKN
```

Das Repo enthält zusätzlich `vercel.json`, damit der Import sauber erkannt wird.

## GitHub Pages

Der Workflow `.github/workflows/pages.yml` deployed bei Push auf `main` nach GitHub Pages.

In GitHub unter **Settings → Pages → Build and deployment → Source** auf **GitHub Actions** stellen, falls es nicht automatisch aktiv ist.

## Supabase Migration

Die komplette Datenbank-Migration liegt in:

```text
supabase-schema.sql
```

## Security Notes

- Der Supabase Publishable/Anon Key ist für Browser-Apps öffentlich nutzbar.
- Service Role Keys und Datenbankpasswörter gehören nie ins Repo.
- Für echte Kunden: Auth aktivieren, RLS nach `auth.uid()` absichern und Mandanten-/Teamtabellen ergänzen.
