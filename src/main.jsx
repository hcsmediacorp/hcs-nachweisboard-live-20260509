import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Camera, CheckCircle2, Clock3, Code2, Database, Download, Euro, FileText, Heart, ImagePlus, Link as LinkIcon, Lock, Plus, RefreshCcw, ShieldCheck, Sparkles, UploadCloud, Users, Wifi, WifiOff, Zap } from 'lucide-react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { demoProjects, proofTypes } from './data'
import { hasSupabase, supabase } from './supabaseClient'
import './styles.css'

const currency = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })

function normalizeProject(row) {
  return {
    id: row.id,
    name: row.name,
    customer: row.customer || '',
    location: row.location || '',
    status: row.status || 'Aktiv',
    budget: Number(row.budget || 0),
    due: row.due || '',
    proofs: (row.proofs || []).map((proof) => ({
      id: proof.id,
      project_id: proof.project_id,
      type: proof.type,
      title: proof.title,
      minutes: Number(proof.minutes || 0),
      cost: Number(proof.cost || 0),
      approved: Boolean(proof.approved),
      date: (proof.created_at || '').slice(0, 10),
      note: proof.note || '',
      image_url: proof.image_url || ''
    }))
  }
}

function loadFallbackProjects() {
  try {
    return JSON.parse(localStorage.getItem('hcs-proof-projects')) || demoProjects
  } catch {
    return demoProjects
  }
}

function App() {
  const [projects, setProjects] = useState(loadFallbackProjects)
  const [activeId, setActiveId] = useState(projects[0]?.id)
  const [form, setForm] = useState({ title: '', type: 'Arbeitszeit', minutes: 60, cost: 0, note: '', photo: null })
  const [syncState, setSyncState] = useState(hasSupabase ? 'Verbinde Supabase…' : 'Local-first Demo')
  const [isSaving, setIsSaving] = useState(false)
  const reportRef = useRef(null)
  const active = projects.find((p) => p.id === activeId) || projects[0]

  async function loadFromSupabase() {
    if (!supabase) return
    setSyncState('Lade Supabase…')
    const { data, error } = await supabase
      .from('projects')
      .select('*, proofs(*)')
      .order('created_at', { ascending: false })
      .order('created_at', { referencedTable: 'proofs', ascending: false })

    if (error) {
      console.error(error)
      setSyncState('Supabase Fehler – lokale Demo aktiv')
      return
    }
    const next = (data || []).map(normalizeProject)
    if (next.length) {
      setProjects(next)
      setActiveId((current) => next.find((project) => project.id === current)?.id || next[0].id)
      localStorage.setItem('hcs-proof-projects', JSON.stringify(next))
    }
    setSyncState('Supabase live verbunden')
  }

  useEffect(() => {
    loadFromSupabase()
  }, [])

  const stats = useMemo(() => {
    const proofs = projects.flatMap((p) => p.proofs)
    return {
      projects: projects.length,
      proofs: proofs.length,
      open: proofs.filter((p) => !p.approved).length,
      value: proofs.reduce((sum, p) => sum + Number(p.cost || 0), 0)
    }
  }, [projects])

  const persistLocal = (next) => {
    setProjects(next)
    localStorage.setItem('hcs-proof-projects', JSON.stringify(next))
  }

  const uploadPhoto = async (file) => {
    if (!file || !supabase) return ''
    const extension = file.name.split('.').pop() || 'jpg'
    const path = `${active.id}/${crypto.randomUUID()}.${extension}`
    const { error } = await supabase.storage.from('proof-photos').upload(path, file, { upsert: false })
    if (error) throw error
    const { data } = supabase.storage.from('proof-photos').getPublicUrl(path)
    return data.publicUrl
  }

  const addProof = async (event) => {
    event.preventDefault()
    if (!form.title.trim() || !active) return
    setIsSaving(true)
    try {
      let imageUrl = ''
      if (supabase && form.photo) imageUrl = await uploadPhoto(form.photo)

      const payload = {
        project_id: active.id,
        title: form.title.trim(),
        type: form.type,
        minutes: Number(form.minutes) || 0,
        cost: Number(form.cost) || 0,
        approved: false,
        note: form.note.trim() || 'Ohne Zusatznotiz erfasst.',
        image_url: imageUrl
      }

      if (supabase) {
        const { error } = await supabase.from('proofs').insert(payload)
        if (error) throw error
        await loadFromSupabase()
      } else {
        persistLocal(projects.map((project) => project.id === active.id ? {
          ...project,
          proofs: [{ id: crypto.randomUUID(), ...payload, date: new Date().toISOString().slice(0, 10) }, ...project.proofs]
        } : project))
      }
      setForm({ title: '', type: form.type, minutes: 60, cost: 0, note: '', photo: null })
      event.target.reset()
    } catch (error) {
      console.error(error)
      alert(`Speichern fehlgeschlagen: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const toggleApproval = async (proofId) => {
    const proof = active?.proofs.find((item) => item.id === proofId)
    if (!proof) return
    const approved = !proof.approved
    if (supabase) {
      const { error } = await supabase.from('proofs').update({ approved }).eq('id', proofId)
      if (error) return alert(`Freigabe fehlgeschlagen: ${error.message}`)
      await loadFromSupabase()
      return
    }
    persistLocal(projects.map((project) => project.id === active.id ? {
      ...project,
      proofs: project.proofs.map((item) => item.id === proofId ? { ...item, approved } : item)
    } : project))
  }

  const addProject = async () => {
    const payload = {
      name: 'Neues Projekt',
      customer: 'Kunde eintragen',
      location: 'Ort offen',
      status: 'Aktiv',
      budget: 0,
      due: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
    }
    if (supabase) {
      const { data, error } = await supabase.from('projects').insert(payload).select().single()
      if (error) return alert(`Projekt konnte nicht erstellt werden: ${error.message}`)
      await loadFromSupabase()
      setActiveId(data.id)
      return
    }
    const id = crypto.randomUUID()
    persistLocal([{ id, ...payload, proofs: [] }, ...projects])
    setActiveId(id)
  }

  const exportPdf = async () => {
    if (!reportRef.current || !active) return
    const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
    const image = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const width = pdf.internal.pageSize.getWidth()
    const height = (canvas.height * width) / canvas.width
    pdf.addImage(image, 'PNG', 0, 0, width, Math.min(height, 297))
    pdf.save(`${active.name.replaceAll(' ', '-')}-Nachweise.pdf`)
  }

  return <main>
    <Hero stats={stats} />
    <section className="workspace" id="app">
      <aside className="panel sidebar">
        <div className="panel-head">
          <div><span className="eyebrow">Projekte</span><h2>Nachweis-Cockpit</h2></div>
          <button className="icon-button" onClick={addProject} aria-label="Projekt hinzufügen"><Plus size={19} /></button>
        </div>
        <button className="sync-row" onClick={loadFromSupabase}><RefreshCcw size={15} /> Daten neu laden</button>
        <div className="project-list">
          {projects.map((project) => <button key={project.id} className={`project-card ${project.id === active?.id ? 'active' : ''}`} onClick={() => setActiveId(project.id)}>
            <span className="project-status">{project.status}</span>
            <strong>{project.name}</strong>
            <small>{project.customer} · {project.location}</small>
            <div className="bar"><i style={{ width: `${Math.min(100, project.proofs.filter(p => p.approved).length / Math.max(1, project.proofs.length) * 100)}%` }} /></div>
          </button>)}
        </div>
      </aside>

      <section className="panel capture">
        <div className="panel-head">
          <div><span className="eyebrow">Supabase CRUD</span><h2>Leistung erfassen</h2></div>
          <span className={`sync ${hasSupabase ? 'online' : ''}`}>{hasSupabase ? <Wifi size={14}/> : <WifiOff size={14}/>} {syncState}</span>
        </div>
        <form onSubmit={addProof} className="proof-form">
          <label>Titel<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="z.B. Zusatzleitung verlegt" required /></label>
          <label>Typ<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{proofTypes.map(t => <option key={t}>{t}</option>)}</select></label>
          <div className="grid-2">
            <label>Minuten<input type="number" min="0" value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value })} /></label>
            <label>Betrag €<input type="number" min="0" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></label>
          </div>
          <label>Notiz<textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Was ist passiert? Warum abrechnungsrelevant?" /></label>
          <label className="upload-card"><ImagePlus /><span>{form.photo ? form.photo.name : 'Foto in Supabase Storage hochladen'}</span><UploadCloud size={18} /><input type="file" accept="image/*" onChange={(e) => setForm({ ...form, photo: e.target.files?.[0] || null })} /></label>
          <button className="primary" disabled={isSaving}><Plus size={18} /> {isSaving ? 'Speichere…' : 'Nachweis speichern'}</button>
        </form>
      </section>

      <section className="panel report" ref={reportRef}>
        <div className="panel-head">
          <div><span className="eyebrow">Kundenfreigabe</span><h2>{active?.name}</h2><p>{active?.customer} · Fällig {active?.due}</p></div>
          <button className="secondary" onClick={exportPdf}><Download size={18} /> PDF</button>
        </div>
        <div className="summary-cards">
          <Metric icon={<FileText />} label="Nachweise" value={active?.proofs.length || 0} />
          <Metric icon={<Clock3 />} label="Stunden" value={((active?.proofs.reduce((s,p)=>s+p.minutes,0) || 0) / 60).toFixed(1)} />
          <Metric icon={<Euro />} label="Offener Wert" value={currency.format(active?.proofs.filter(p=>!p.approved).reduce((s,p)=>s+p.cost,0) || 0)} />
        </div>
        <div className="proof-list">
          {active?.proofs.map((proof) => <article className="proof" key={proof.id}>
            <div className="proof-icon">{proof.image_url ? <img src={proof.image_url} alt="Nachweis" /> : <Camera size={20}/>}</div>
            <div>
              <div className="proof-title"><strong>{proof.title}</strong><span>{proof.type}</span></div>
              <p>{proof.note}</p>
              <small>{proof.date} · {proof.minutes} Min · {currency.format(proof.cost)}</small>
            </div>
            <button className={`approve ${proof.approved ? 'done' : ''}`} onClick={() => toggleApproval(proof.id)}>{proof.approved ? <CheckCircle2 /> : <LinkIcon />} {proof.approved ? 'Freigegeben' : 'Freigabe'}</button>
          </article>)}
          {!active?.proofs.length && <div className="empty">Noch keine Nachweise. Erstelle den ersten Eintrag links.</div>}
        </div>
        <footer className="report-footer">made with <Heart size={14} fill="currentColor" /> by hcsmedia</footer>
      </section>
    </section>
    <Features />
    <Pricing />
    <footer className="site-footer"><Code2 size={18}/> GitHub Pages + Vercel-ready · <Database size={18}/> Supabase live · made with <Heart size={15} fill="currentColor" /> by hcsmedia</footer>
  </main>
}

function Hero({ stats }) {
  return <section className="hero">
    <nav><div className="brand"><span>HCS</span> Nachweisboard</div><a href="#pricing">Preise</a><a href="#app">Live Demo</a></nav>
    <div className="hero-grid">
      <div>
        <span className="pill"><Sparkles size={16}/> Supabase-backed Free-first SaaS</span>
        <h1>Rechnungssichere Leistungsnachweise statt WhatsApp-Chaos.</h1>
        <p className="lead">Dokumentiere Fotos, Zusatzarbeiten und Kundenfreigaben in 60 Sekunden – mit echter Supabase Datenbank, Storage und Vercel-ready Repo.</p>
        <div className="hero-actions"><a className="primary link" href="#app"><Zap size={18}/> Live Demo starten</a><a className="secondary link" href="#pricing">Free Plan ansehen</a></div>
      </div>
      <div className="hero-card">
        <Metric icon={<Users />} label="Projekte" value={stats.projects} />
        <Metric icon={<FileText />} label="Nachweise" value={stats.proofs} />
        <Metric icon={<Lock />} label="Offene Freigaben" value={stats.open} />
        <Metric icon={<Euro />} label="Dokumentierter Wert" value={currency.format(stats.value)} />
      </div>
    </div>
  </section>
}

function Metric({ icon, label, value }) { return <div className="metric"><span>{icon}</span><small>{label}</small><strong>{value}</strong></div> }
function Features() { return <section className="features"><h2>Gebaut für den Alltag auf der Baustelle</h2><div><Feature icon={<Camera/>} title="Foto + Zeitstempel" text="Jeder Eintrag wird mit Datum, Typ, Dauer, Wert und optionalem Foto gespeichert."/><Feature icon={<Database/>} title="Supabase ready" text="Postgres Tabellen, RLS Demo-Policies und öffentlicher Storage-Bucket sind angelegt."/><Feature icon={<Download/>} title="PDF-Export" text="Kundenfähiger Nachweisbericht inklusive Branding und Summen."/></div></section> }
function Feature({ icon, title, text }) { return <article className="feature">{icon}<h3>{title}</h3><p>{text}</p></article> }
function Pricing() { return <section className="pricing" id="pricing"><span className="eyebrow">Free-to-Paid</span><h2>Erst kostenlos nutzen, dann skalieren.</h2><div className="price-grid"><article><h3>Free</h3><strong>0€</strong><p>1 Projekt, Nachweise, PDF-Export mit Branding.</p></article><article className="highlight"><h3>Pro</h3><strong>29€/Monat</strong><p>Unbegrenzte Projekte, Supabase Sync, Team-Accounts, Freigabe-Links.</p></article><article><h3>Team</h3><strong>49€/Monat</strong><p>Mehrere Monteure, Rollen, Exportpakete für Buchhaltung und Kunden.</p></article></div></section> }

createRoot(document.getElementById('root')).render(<App />)
