# HCS Nachweisboard - Agent Documentation

## Übersicht

**HCS Nachweisboard** ist eine mobile-first SaaS-Anwendung für kleine Handwerksbetriebe zur Dokumentation von Leistungsnachweisen, Zusatzarbeiten, Foto-Dokumentation und Kundenfreigaben mit PDF-Export.

**Branding:** made with ❤️ by hcsmedia

---

## Tech Stack

### Frontend
- **React** mit Vite als Build-Tool
- **Lucide React** für Icons
- **html2canvas** + **jsPDF** für PDF-Export
- **CSS** mit modernem Responsive Design

### Backend / Datenbank
- **Supabase** (PostgreSQL)
  - Tabellen: `projects`, `proofs`
  - Storage Bucket: `proof-photos` für Bilder
  - Row Level Security (RLS) mit Demo-Policies

### Hosting & Deployment
- **GitHub Pages** (über GitHub Actions)
- **Vercel** (vorkonfiguriert mit `vercel.json`)
- **CI/CD**: GitHub Actions Workflow für automatisches Deploy bei Push auf `main`

---

## Kernfunktionen

### 1. Projektverwaltung
- Erstellen und Verwalten mehrerer Baustellen/Projekte
- Projektdetails: Name, Kunde, Ort, Status, Budget, Fälligkeitsdatum
- Fortschrittsanzeige pro Projekt (Freigabe-Status)

### 2. Leistungsnachweise erfassen
- **Typen**: Arbeitszeit, Material, Zusatzleistung, Mangel, Abnahme, Foto-Doku
- Erfassung von:
  - Titel und Beschreibung
  - Zeit (Minuten)
  - Kosten (€)
  - Optional: Foto-Upload zu Supabase Storage
  - Notizen zur Dokumentation
- Zeitstempel wird automatisch gesetzt

### 3. Kundenfreigabe
- Nachweise können als "freigegeben" markiert werden
- Übersicht über offene Freigaben
- Visuelle Unterscheidung zwischen freigegebenen und offenen Punkten

### 4. PDF-Export
- Generierung eines kundenfähigen Berichts
- Enthält:
  - Projektübersicht
  - Alle Nachweise mit Details
  - Summen (Anzahl, Stunden, offener Wert)
  - Branding "made with ❤️ by hcsmedia"
- Export als A4-PDF über html2canvas + jsPDF

### 5. Daten-Sync
- **Local-first Ansatz**: Daten werden im localStorage gesichert
- **Supabase Sync**: Bei verfügbarer Verbindung automatische Synchronisation
- Fallback auf lokale Demo-Daten bei fehlender Verbindung
- manueller Refresh-Button zum Neuladen der Daten

---

## Datenbank-Schema

### Tabelle: `projects`
```sql
- id: uuid (primary key)
- name: text
- customer: text
- location: text
- status: text (default: 'Aktiv')
- budget: numeric
- due: date
- created_at: timestamptz
- updated_at: timestamptz
```

### Tabelle: `proofs`
```sql
- id: uuid (primary key)
- project_id: uuid (foreign key → projects)
- title: text
- type: text (Arbeitszeit, Material, Zusatzleistung, etc.)
- minutes: integer
- cost: numeric
- approved: boolean (default: false)
- note: text
- image_url: text (URL zum Storage-Bucket)
- created_at: timestamptz
- updated_at: timestamptz
```

### Storage Bucket: `proof-photos`
- Öffentlicher Bucket für Fotos
- Unterstützte Formate: JPEG, PNG, WebP, GIF
- Max. Dateigröße: 10 MB

---

## Environment Variablen

Für die Nutzung müssen folgende Umgebungsvariablen gesetzt werden:

```bash
VITE_SUPABASE_URL=https://YOUR_SUPABASE_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_YOUR_ANON_KEY
```

**Hinweis:** Die `.env.production` Datei ist nicht im Repo enthalten und muss lokal erstellt werden.

---

## Installation & Entwicklung

### Voraussetzungen
- Node.js (empfohlen: Version 22)
- npm oder pnpm
- Supabase-Projekt (kostenlos erstellbar unter supabase.com)

### Setup
```bash
# Dependencies installieren
npm install

# .env Datei erstellen (siehe oben)

# Development Server starten
npm run dev
```

### Build
```bash
npm run build
npm run preview
```

### Linting
```bash
npm run lint
```

---

## Deployment

### Vercel
1. Repo in Vercel importieren
2. Framework: Vite (automatisch erkannt)
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Environment Variables setzen (siehe oben)

### GitHub Pages
1. In GitHub Settings → Pages → Build and deployment → Source auf "GitHub Actions" stellen
2. Bei Push auf `main` wird automatisch deployed
3. Workflow-Datei: `.github/workflows/pages.yml`

---

## Security Hinweise

### Aktuell (Demo-Modus)
- RLS-Policies erlauben anonymen CRUD-Zugriff für alle Nutzer
- Zweck: Einfache Demo ohne Auth-Hürden
- Storage-Bucket ist öffentlich lesbar/schreibbar

### Vor Produktivsetzung empfohlen
- Supabase Auth aktivieren (Email, Magic Link, OAuth)
- RLS-Policies auf `auth.uid()` umstellen
- Mandantenfähigkeit implementieren (User/Team-Zuordnung)
- Service Role Keys niemals im Frontend verwenden

---

## Pricing-Modell (im Produkt integriert)

| Plan   | Preis     | Features                                          |
|--------|-----------|---------------------------------------------------|
| Free   | 0€/Monat  | 1 Projekt, Nachweise, PDF-Export mit Branding     |
| Pro    | 29€/Monat | Unbegrenzte Projekte, Supabase Sync, Team-Accounts, Freigabe-Links |
| Team   | 49€/Monat | Mehrere Monteure, Rollen, Exportpakete für Buchhaltung und Kunden |

---

## Demo-Daten

Das Repo enthält Seed-Daten für:
- 2 Beispielprojekte (Badumbau, Ladenbau)
- 3 Beispiel-Nachweise mit unterschiedlichen Typen

Diese werden beim ersten Start geladen und können als Vorlage dienen.

---

## Dateien im Überblick

| Datei                        | Beschreibung                                      |
|------------------------------|--------------------------------------------------|
| `src/main.jsx`               | Hauptkomponente mit App-Logik                    |
| `src/data.js`                | Demo-Daten und Proof-Typen                       |
| `src/supabaseClient.js`      | Supabase Client Initialisierung                  |
| `src/styles.css`             | Komplettes Styling (mobile-first)                |
| `supabase-schema.sql`        | Datenbank-Migration (Tabellen, Policies, Seeds)  |
| `index.html`                 | HTML Entry Point                                 |
| `package.json`               | Dependencies und Scripts                         |
| `vite.config.js`             | Vite Konfiguration                               |
| `vercel.json`                | Vercel Deployment Config                         |
| `.github/workflows/pages.yml`| GitHub Actions CI/CD                             |
| `.env.example`               | Vorlage für Environment-Variablen                |

---

## Besonderheiten

1. **Progressive Enhancement**: Funktioniert auch ohne Supabase (localStorage Fallback)
2. **Mobile-First UI**: Optimiert für Tablets/Smartphones auf der Baustelle
3. **Echtzeit-Sync**: Bei Supabase-Verbindung automatische Aktualisierung
4. **Bild-Upload**: Direkter Upload zu Supabase Storage mit öffentlicher URL
5. **Branding**: Durchgängiges "hcsmedia" Branding im UI und PDF-Export

---

## Nächste Schritte für Produktion

- [ ] Auth-System aktivieren (Supabase Auth)
- [ ] RLS-Policies mandantenfähig gestalten
- [ ] User-Management (Teams, Rollen)
- [ ] Zahlungsintegration für Pro/Team-Pläne
- [ ] Custom Domain für Storage-URLs
- [ ] Datenschutzkonforme Cookie-Einwilligung
- [ ] Backup-Strategie für Daten

---

*Diese Dokumentation wurde automatisch generiert und beschreibt den Stand des Repos.*
