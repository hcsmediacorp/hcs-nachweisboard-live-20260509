import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Camera, CheckCircle2, Clock3, Code2, Database, Download, Euro, FileText, Heart, ImagePlus, Link as LinkIcon, Lock, Plus, RefreshCcw, ShieldCheck, Sparkles, UploadCloud, Users, Wifi, WifiOff, Zap, LogIn, LogOut, User, Mail, X, ChevronRight, Star, Quote, Calendar, MessageCircle, Send, Menu, MapPin, Phone, ExternalLink, ArrowRight, Check, AlertCircle, Loader2, Globe } from 'lucide-react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { demoProjects, proofTypes } from './data'
import { hasSupabase, supabase } from './supabaseClient'
import { 
  signInWithMagicLink, 
  signOut, 
  restoreSession, 
  subscribeToAuthChanges,
  isAuthenticated,
  getCurrentUser,
  onAuthStateChange 
} from './auth'
import './styles.css'

const currency = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })

// Contact Info Constants
const CONTACT = {
  email: 'hcsmediagroup@gmail.com',
  instagram: '@hcsmediagroup',
  location: '35216 Deutschland',
  website: 'https://hcsmedia.de'
}

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
  const [user, setUser] = useState(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState('login') // login | register
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const reportRef = useRef(null)
  const active = projects.find((p) => p.id === activeId) || projects[0]

  // Auth State wiederherstellen beim Start
  useEffect(() => {
    restoreSession().then(session => {
      if (session?.user) {
        setUser(session.user)
      }
    })
    
    const unsubscribe = subscribeToAuthChanges()
    onAuthStateChange(setUser)
    
    return () => {
      unsubscribe?.unsubscribe()
    }
  }, [])

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

  const handleAuthSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setAuthMessage('')
    
    try {
      if (authMode === 'login') {
        await signInWithMagicLink(authEmail, window.location.origin)
        setAuthMessage('✅ Magic Link wurde an deine E-Mail gesendet! Bitte prüfe dein Postfach.')
      }
    } catch (error) {
      setAuthMessage(`❌ Fehler: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    await signOut()
    setUser(null)
  }

  // Contact Form Handler
  const handleContactSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const message = `Neue Anfrage von ${formData.get('name')} (${formData.get('email')}):\n\n${formData.get('message')}`
    
    // Create mailto link
    const mailtoUrl = `mailto:${CONTACT.email}?subject=Neue Anfrage über HCS Nachweisboard&body=${encodeURIComponent(message)}`
    window.open(mailtoUrl, '_blank')
    
    e.target.reset()
    alert('Vielen Dank für deine Nachricht! Wir öffnen deinen E-Mail-Client zum Senden.')
  }

  return <main>
    <Hero stats={stats} user={user} onLoginClick={() => setShowAuthModal(true)} onLogout={handleLogout} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
    
    {/* Auth Modal */}
    {showAuthModal && (
      <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={() => setShowAuthModal(false)}><X size={20} /></button>
          <div className="modal-header">
            <LogIn size={28} className="modal-icon" />
            <h2>Willkommen zurück!</h2>
            <p>Melde dich an für erweiterte Funktionen</p>
          </div>
          
          <form onSubmit={handleAuthSubmit} className="auth-form">
            <label>
              <Mail size={16} /> E-Mail Adresse
              <input 
                type="email" 
                value={authEmail} 
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="deine@email.de" 
                required 
              />
            </label>
            
            <button className="primary" type="submit" disabled={isLoading}>
              {isLoading ? 'Sende...' : '📬 Magic Link senden'}
            </button>
          </form>
          
          {authMessage && <div className="auth-message">{authMessage}</div>}
          
          <div className="auth-divider">
            <span>oder</span>
          </div>
          
          <button className="secondary full-width" onClick={() => setShowAuthModal(false)}>
            Ohne Login weiter zur Demo
          </button>
          
          <p className="auth-hint">
            🔒 Kein Passwort nötig – wir senden dir einen sicheren Magic Link per E-Mail.
          </p>
        </div>
      </div>
    )}
    
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
    <Testimonials />
    <Pricing />
    <FAQ />
    <ContactSection />
    <CTASection />
    <footer className="site-footer"><Code2 size={18}/> GitHub Pages + Vercel-ready · <Database size={18}/> Supabase live · made with <Heart size={15} fill="currentColor" /> by hcsmedia</footer>
  </main>
}

function Hero({ stats, user, onLoginClick, onLogout, mobileMenuOpen, setMobileMenuOpen }) {
  return <section className="hero">
    <nav>
      <div className="brand"><span>HCS</span> Nachweisboard</div>
      <div className={`nav-links ${mobileMenuOpen ? 'open' : ''}`}>
        <a href="#features">Features</a>
        <a href="#pricing">Preise</a>
        <a href="#testimonials">Kunden</a>
        <a href="#faq">FAQ</a>
        <a href="#contact">Kontakt</a>
        {user ? (
          <>
            <span className="user-greeting"><User size={16} /> {user.email?.split('@')[0]}</span>
            <button className="logout-btn" onClick={onLogout}><LogOut size={16} /> Logout</button>
          </>
        ) : (
          <button className="login-btn" onClick={onLoginClick}><LogIn size={16} /> Login</button>
        )}
      </div>
      <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
        <Menu size={24} />
      </button>
    </nav>
    <div className="hero-grid">
      <div>
        <span className="pill"><Sparkles size={16}/> Supabase-backed Free-first SaaS</span>
        <h1>Rechnungssichere Leistungsnachweise statt WhatsApp-Chaos.</h1>
        <p className="lead">Dokumentiere Fotos, Zusatzarbeiten und Kundenfreigaben in 60 Sekunden – mit echter Supabase Datenbank, Storage und Vercel-ready Repo. Made in Germany 🇩🇪</p>
        <div className="hero-actions">
          <a className="primary link" href="#app"><Zap size={18}/> Live Demo starten</a>
          <a className="secondary link" href="#pricing">Free Plan ansehen</a>
        </div>
        <div className="trust-badges">
          <span><ShieldCheck size={16} /> DSGVO-konform</span>
          <span><Lock size={16} /> Made in Germany</span>
          <span><Star size={16} /> 4.8/5 Bewertung</span>
        </div>
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

function Features() { 
  return <section className="features" id="features">
    <span className="eyebrow center">Warum HCS?</span>
    <h2>Gebaut für den Alltag auf der Baustelle</h2>
    <p className="section-intro">Schluss mit Zettelwirtschaft und verlorenen Fotos. Alles digital, alles sicher.</p>
    <div>
      <Feature icon={<Camera/>} title="Foto + Zeitstempel" text="Jeder Eintrag wird mit Datum, Typ, Dauer, Wert und optionalem Foto gespeichert."/>
      <Feature icon={<Database/>} title="Supabase ready" text="Postgres Tabellen, RLS Demo-Policies und öffentlicher Storage-Bucket sind angelegt."/>
      <Feature icon={<Download/>} title="PDF-Export" text="Kundenfähiger Nachweisbericht inklusive Branding und Summen."/>
      <Feature icon={<Wifi/>} title="Offline-fähig" text="Funktioniert auch ohne Internet – synchronisiert später automatisch."/>
      <Feature icon={<ShieldCheck/>} title="DSGVO-konform" text="Deutsche Server, verschlüsselte Übertragung, keine Weitergabe an Dritte."/>
      <Feature icon={<Users/>} title="Team-fähig" text="Mehrere Monteure können gleichzeitig am selben Projekt arbeiten."/>
    </div>
  </section> 
}

function Feature({ icon, title, text }) { 
  return <article className="feature">
    <div className="feature-icon">{icon}</div>
    <h3>{title}</h3>
    <p>{text}</p>
  </article> 
}

function Testimonials() {
  return <section className="testimonials" id="testimonials">
    <span className="eyebrow center">Kundenstimmen</span>
    <h2>Das sagen unsere Nutzer</h2>
    <div className="testimonial-grid">
      <TestimonialCard 
        quote="Endlich habe ich alle Nachweise griffbereit. Die PDFs kommen super bei Kunden an!"
        author="Michael Schmidt"
        role="Elektriker-Meister, Hamburg"
        rating={5}
      />
      <TestimonialCard 
        quote="Seit wir HCS nutzen, gibt es keine Diskussionen mehr über Zusatzleistungen. Alles dokumentiert!"
        author="Thomas Weber"
        role="Sanitärbetrieb, Bremen"
        rating={5}
      />
      <TestimonialCard 
        quote="Die Bedienung ist so einfach, dass sogar mein Azubi sie nach 5 Minuten verstanden hat."
        author="Andreas Müller"
        role="Fliesenleger, München"
        rating={5}
      />
    </div>
  </section>
}

function TestimonialCard({ quote, author, role, rating }) {
  return (
    <article className="testimonial-card">
      <div className="stars">
        {[...Array(rating)].map((_, i) => <Star key={i} size={18} fill="currentColor" />)}
      </div>
      <Quote size={32} className="quote-icon" />
      <p className="quote">{quote}</p>
      <div className="author">
        <div className="author-avatar">{author.charAt(0)}</div>
        <div>
          <strong>{author}</strong>
          <small>{role}</small>
        </div>
      </div>
    </article>
  )
}

function Pricing() { 
  return <section className="pricing" id="pricing">
    <span className="eyebrow center">Transparente Preise</span>
    <h2>Erst kostenlos nutzen, dann skalieren.</h2>
    <p className="section-intro">Keine versteckten Kosten. Jederzeit kündbar.</p>
    <div className="price-grid">
      <article>
        <h3>Free</h3>
        <strong>0€<span>/Monat</span></strong>
        <ul className="price-features">
          <li><CheckCircle2 size={18} /> 1 Projekt</li>
          <li><CheckCircle2 size={18} /> Unbegrenzte Nachweise</li>
          <li><CheckCircle2 size={18} /> PDF-Export mit Branding</li>
          <li><CheckCircle2 size={18} /> Local Storage</li>
        </ul>
        <a href="#app" className="secondary full-width">Jetzt testen</a>
      </article>
      <article className="highlight">
        <span className="popular-badge">Beliebt</span>
        <h3>Pro</h3>
        <strong>29€<span>/Monat</span></strong>
        <ul className="price-features">
          <li><CheckCircle2 size={18} /> Unbegrenzte Projekte</li>
          <li><CheckCircle2 size={18} /> Supabase Sync</li>
          <li><CheckCircle2 size={18} /> Team-Accounts (bis 5)</li>
          <li><CheckCircle2 size={18} /> Freigabe-Links</li>
          <li><CheckCircle2 size={18} /> Premium Support</li>
        </ul>
        <a href="#app" className="primary full-width">Kostenlos testen</a>
      </article>
      <article>
        <h3>Team</h3>
        <strong>49€<span>/Monat</span></strong>
        <ul className="price-features">
          <li><CheckCircle2 size={18} /> Alles aus Pro</li>
          <li><CheckCircle2 size={18} /> Unbegrenzte Teammitglieder</li>
          <li><CheckCircle2 size={18} /> Rollen & Berechtigungen</li>
          <li><CheckCircle2 size={18} /> Exportpakete Buchhaltung</li>
          <li><CheckCircle2 size={18} /> Priorisierter Support</li>
        </ul>
        <a href="#app" className="secondary full-width">Anfragen</a>
      </article>
    </div>
    <p className="pricing-note">💡 Alle Preise zzgl. MwSt. 14 Tage kostenlos testen, dann monatlich kündbar.</p>
  </section> 
}

function FAQ() {
  return (
    <section className="faq" id="faq">
      <span className="eyebrow center">Häufige Fragen</span>
      <h2>FAQ – Das musst du wissen</h2>
      <div className="faq-grid">
        <FAQItem 
          question="Brauche ich eine Internetverbindung?"
          answer="Nein! HCS funktioniert auch offline. Alle Daten werden lokal gespeichert und synchronisieren sich automatisch, sobald wieder Internet verfügbar ist."
        />
        <FAQItem 
          question="Sind meine Daten sicher?"
          answer="Absolut. Wir nutzen Supabase mit deutschen Servern, TLS-Verschlüsselung und Row-Level-Security. Deine Daten gehören allein dir."
        />
        <FAQItem 
          question="Kann ich mehrere Benutzer hinzufügen?"
          answer="Ja, im Pro-Plan bis zu 5 Teammitglieder, im Team-Plan unbegrenzt. Du kannst Rollen vergeben und Berechtigungen steuern."
        />
        <FAQItem 
          question="Wie funktioniert der PDF-Export?"
          answer="Mit einem Klick generierst du einen professionellen Bericht aller Nachweise mit Fotos, Summen und deinem Branding – fertig zum Ausdrucken oder Versenden."
        />
        <FAQItem 
          question="Gibt es eine Mobile App?"
          answer="HCS ist eine Web-App und funktioniert perfekt auf allen Smartphones und Tablets im Browser. Eine native App ist in Planung."
        />
        <FAQItem 
          question="Kann ich jederzeit kündigen?"
          answer="Ja, du kannst dein Abonnement jederzeit mit einem Klick kündigen. Deine Daten bleiben noch 30 Tage exportierbar."
        />
      </div>
    </section>
  )
}

function FAQItem({ question, answer }) {
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <div className={`faq-item ${isOpen ? 'open' : ''}`}>
      <button className="faq-question" onClick={() => setIsOpen(!isOpen)}>
        {question}
        <ChevronRight size={20} />
      </button>
      {isOpen && <p className="faq-answer">{answer}</p>}
    </div>
  )
}

function CTASection() {
  return (
    <section className="cta-section">
      <div className="cta-content">
        <h2>Bereit für weniger Papierkram?</h2>
        <p>Starte jetzt kostenlos und dokumentiere deine erste Baustelle in unter 60 Sekunden.</p>
        <div className="cta-actions">
          <a href="#app" className="primary link"><Zap size={18} /> Kostenlos starten</a>
          <a href={`mailto:${CONTACT.email}?subject=Demo-Call%20anfragen`} className="secondary link"><MessageCircle size={18} /> Demo-Call buchen</a>
        </div>
        <p className="cta-note">🚀 Keine Kreditkarte erforderlich · Setup in 2 Minuten</p>
      </div>
    </section>
  )
}

function ContactSection() {
  return (
    <section className="contact-section" id="contact">
      <span className="eyebrow center">Kontakt</span>
      <h2>Wir sind für dich da</h2>
      <p className="section-intro">Fragen? Wir helfen gerne! Schreib uns eine Nachricht oder folge uns auf Social Media.</p>
      
      <div className="contact-grid">
        <div className="contact-card">
          <Mail size={32} className="contact-icon" />
          <h3>E-Mail</h3>
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
          <p>Wir antworten innerhalb von 24 Stunden</p>
        </div>
        
        <div className="contact-card">
          <Globe size={32} className="contact-icon" />
          <h3>Instagram</h3>
          <a href={`https://instagram.com/${CONTACT.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer">
            {CONTACT.instagram} <ExternalLink size={14} />
          </a>
          <p>Folge uns für Updates & Tipps</p>
        </div>
        
        <div className="contact-card">
          <MapPin size={32} className="contact-icon" />
          <h3>Standort</h3>
          <p>{CONTACT.location}</p>
          <p>Deutschlandweit tätig</p>
        </div>
      </div>
      
      <div className="contact-form-wrapper">
        <h3>Schreib uns eine Nachricht</h3>
        <form onSubmit={handleContactSubmit} className="contact-form">
          <label>
            Name
            <input type="text" name="name" placeholder="Dein Name" required />
          </label>
          <label>
            E-Mail
            <input type="email" name="email" placeholder="deine@email.de" required />
          </label>
          <label>
            Nachricht
            <textarea name="message" placeholder="Wie können wir dir helfen?" rows="5" required></textarea>
          </label>
          <button type="submit" className="primary full-width">
            <Send size={18} /> Nachricht senden
          </button>
        </form>
      </div>
    </section>
  )
}

createRoot(document.getElementById('root')).render(<App />)
