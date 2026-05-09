export const demoProjects = [
  {
    id: 'p-101',
    name: 'Badumbau Familie Keller',
    customer: 'Keller Immobilien GbR',
    location: 'Bremen Findorff',
    status: 'Aktiv',
    budget: 8400,
    due: '2026-05-18',
    proofs: [
      { id: 'n-1', type: 'Zusatzleistung', title: 'Alte Fliesen entfernt', minutes: 135, cost: 210, approved: true, date: '2026-05-07', note: 'Untergrund stärker beschädigt als im Angebot dokumentiert.' },
      { id: 'n-2', type: 'Material', title: 'Feuchtraumplatten nachbestellt', minutes: 25, cost: 168, approved: false, date: '2026-05-08', note: 'Vom Kunden telefonisch freigegeben, PDF-Freigabe offen.' }
    ]
  },
  {
    id: 'p-102',
    name: 'Ladenbau Elektro Phase 2',
    customer: 'Nordlicht Retail GmbH',
    location: 'Hamburg Altona',
    status: 'Wartet auf Freigabe',
    budget: 12600,
    due: '2026-05-24',
    proofs: [
      { id: 'n-3', type: 'Arbeitszeit', title: 'Kabeltrassen angepasst', minutes: 210, cost: 346, approved: false, date: '2026-05-06', note: 'Planänderung wegen Lüftungsführung.' }
    ]
  }
]

export const proofTypes = ['Arbeitszeit', 'Material', 'Zusatzleistung', 'Mangel', 'Abnahme', 'Foto-Doku']
