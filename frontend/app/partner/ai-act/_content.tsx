'use client';

import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';

// ─── Article catalogue ─────────────────────────────────────────────────────────

interface ArticleEntry { num: number; title: string; }
interface Chapter { label: string; articles: ArticleEntry[]; }

const CHAPTERS: Chapter[] = [
  {
    label: 'Capo I — Disposizioni generali',
    articles: [
      { num: 1,  title: 'Oggetto' },
      { num: 2,  title: 'Ambito di applicazione' },
      { num: 3,  title: 'Definizioni' },
      { num: 4,  title: 'Alfabetizzazione in materia di IA' },
    ],
  },
  {
    label: 'Capo II — Pratiche di IA vietate',
    articles: [
      { num: 5,  title: 'Pratiche di IA vietate' },
    ],
  },
  {
    label: 'Capo III — Sistemi di IA ad alto rischio',
    articles: [
      { num: 6,  title: 'Regole di classificazione' },
      { num: 7,  title: 'Modifiche all\'allegato III' },
      { num: 8,  title: 'Conformità ai requisiti' },
      { num: 9,  title: 'Sistema di gestione dei rischi' },
      { num: 10, title: 'Dati e governance dei dati' },
      { num: 11, title: 'Documentazione tecnica' },
      { num: 12, title: 'Conservazione dei registri' },
      { num: 13, title: 'Trasparenza e fornitura di informazioni' },
      { num: 14, title: 'Supervisione umana' },
      { num: 15, title: 'Accuratezza, solidità e cibersicurezza' },
      { num: 16, title: 'Obblighi dei fornitori' },
      { num: 17, title: 'Sistema di gestione della qualità' },
      { num: 18, title: 'Documentazione tecnica (fornitori)' },
      { num: 19, title: 'Registrazione' },
      { num: 20, title: 'Registrazione automatica degli eventi' },
      { num: 21, title: 'Cooperazione con autorità' },
      { num: 22, title: 'Rappresentanti autorizzati' },
      { num: 23, title: 'Obblighi degli importatori' },
      { num: 24, title: 'Obblighi dei distributori' },
      { num: 25, title: 'Responsabilità nella catena del valore' },
      { num: 26, title: 'Obblighi dei deployer' },
      { num: 27, title: 'Valutazione impatto sui diritti fondamentali' },
    ],
  },
  {
    label: 'Capo IV — Trasparenza per rischio limitato',
    articles: [
      { num: 50, title: 'Obblighi di trasparenza' },
    ],
  },
  {
    label: 'Capo V — Modelli di IA per finalità generali',
    articles: [
      { num: 51, title: 'Classificazione dei modelli GPAI' },
      { num: 52, title: 'Obblighi di trasparenza GPAI' },
      { num: 53, title: 'Obblighi dei fornitori GPAI' },
      { num: 54, title: 'Eccezioni per ricerca' },
      { num: 55, title: 'Obblighi GPAI a rischio sistemico' },
      { num: 56, title: 'Valutazione modelli GPAI' },
    ],
  },
  {
    label: 'Capo VI — Governance',
    articles: [
      { num: 57, title: 'Ufficio per l\'IA' },
      { num: 58, title: 'Comitato europeo per l\'IA' },
      { num: 59, title: 'Autorità nazionali competenti' },
      { num: 64, title: 'Accesso ai dati e documentazione' },
      { num: 72, title: 'Sorveglianza del mercato' },
      { num: 73, title: 'Gestione dei rischi a livello UE' },
      { num: 79, title: 'Misure nazionali di vigilanza' },
    ],
  },
  {
    label: 'Capo X — Sanzioni',
    articles: [
      { num: 99,  title: 'Sanzioni' },
      { num: 100, title: 'Sanzioni per PMI e startup' },
      { num: 101, title: 'Sanzioni per violazioni relative ai modelli GPAI' },
    ],
  },
];

const ALL_ARTICLES = CHAPTERS.flatMap(c => c.articles);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatText(text: string): React.ReactNode {
  // Double-newline = paragraph break; single newline = soft wrap from source, replace with space
  return text.split(/\n\n+/).map((para, i) => (
    <p key={i} style={{ margin: '0 0 1em 0', lineHeight: 1.75, color: 'var(--text2)' }}>
      {para.replace(/\n/g, ' ')}
    </p>
  ));
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AiActReader() {
  const [activeNum, setActiveNum]   = useState<number | null>(null);
  const [text, setText]             = useState('');
  const [title, setTitle]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [notFound, setNotFound]     = useState(false);
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>(
    () => Object.fromEntries(CHAPTERS.map(c => [c.label, true]))
  );
  const contentRef = useRef<HTMLDivElement>(null);

  // Read ?article=N from URL on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const n = parseInt(params.get('article') ?? '', 10);
    if (n && !isNaN(n)) loadArticle(n);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadArticle(num: number) {
    setActiveNum(num);
    setLoading(true);
    setNotFound(false);
    setText('');
    setTitle('');

    // Ensure the chapter containing this article is open
    for (const chapter of CHAPTERS) {
      if (chapter.articles.some(a => a.num === num)) {
        setOpenChapters(prev => ({ ...prev, [chapter.label]: true }));
        break;
      }
    }

    // Update URL without navigation
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('article', String(num));
      window.history.replaceState(null, '', url.toString());
    }

    try {
      const data = await api.articles.get(num);
      setText(data.text);
      setTitle(data.article_title);
      contentRef.current?.scrollTo({ top: 0 });
    } catch (e: unknown) {
      const err = e as { statusCode?: number };
      setNotFound(err.statusCode === 404 || true);
    } finally {
      setLoading(false);
    }
  }

  function toggleChapter(label: string) {
    setOpenChapters(prev => ({ ...prev, [label]: !prev[label] }));
  }

  const activeEntry = ALL_ARTICLES.find(a => a.num === activeNum);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 0px)', overflow: 'hidden', background: 'var(--bg)', width: '100%' }}>

      {/* ── Left sidebar ── */}
      <aside style={{
        width: 240, flexShrink: 0, borderRight: '1px solid var(--border)',
        overflowY: 'auto', background: 'var(--surface)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--muted)', marginBottom: 4 }}>
            Regolamento UE 2024/1689
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>AI Act — Testo ufficiale</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
            Fonte: GU UE L 2024/1689
          </div>
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {CHAPTERS.map(chapter => (
            <div key={chapter.label}>
              <button
                onClick={() => toggleChapter(chapter.label)}
                style={{
                  width: '100%', textAlign: 'left', background: 'none', border: 'none',
                  padding: '8px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', gap: 8,
                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .7,
                  color: 'var(--muted)',
                }}
              >
                <span>{chapter.label}</span>
                <span style={{ fontSize: 10, flexShrink: 0, opacity: 0.6 }}>{openChapters[chapter.label] ? '▾' : '▸'}</span>
              </button>

              {openChapters[chapter.label] && chapter.articles.map(article => (
                <button
                  key={article.num}
                  onClick={() => loadArticle(article.num)}
                  style={{
                    width: '100%', textAlign: 'left', background: activeNum === article.num ? 'rgba(108,71,255,.15)' : 'none',
                    border: 'none', borderLeft: activeNum === article.num ? '3px solid #6C47FF' : '3px solid transparent',
                    padding: '7px 20px 7px 17px', cursor: 'pointer',
                    display: 'flex', alignItems: 'baseline', gap: 10,
                    color: activeNum === article.num ? 'var(--text)' : 'var(--text2)',
                    fontWeight: activeNum === article.num ? 600 : 400,
                    fontSize: 13,
                    transition: 'background .12s, border-color .12s',
                  }}
                >
                  <span style={{ fontSize: 10, fontWeight: 700, color: activeNum === article.num ? '#6C47FF' : 'var(--muted)', flexShrink: 0, minWidth: 32 }}>
                    Art. {article.num}
                  </span>
                  <span style={{ lineHeight: 1.3 }}>{article.title}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* ── Content area ── */}
      <div ref={contentRef} style={{ flex: 1, overflowY: 'auto', padding: '32px 28px 60px' }}>
        {!activeNum && (
          <div>
            {/* Hero */}
            <div style={{ marginBottom: 36 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--muted)', marginBottom: 8 }}>
                Regolamento (UE) 2024/1689 · In vigore dal 1° agosto 2024
              </div>
              <h1 style={{ fontSize: 30, fontWeight: 800, color: 'var(--text)', margin: '0 0 14px', lineHeight: 1.2 }}>
                AI Act — Il primo framework normativo globale sull&apos;intelligenza artificiale
              </h1>
              <p style={{ fontSize: 14.5, color: 'var(--text2)', lineHeight: 1.75, margin: 0 }}>
                Il Regolamento UE 2024/1689 stabilisce un quadro uniforme per lo sviluppo, l&apos;immissione sul mercato
                e l&apos;utilizzo di sistemi di intelligenza artificiale nell&apos;Unione Europea. Adotta un approccio
                basato sul rischio: più alto il rischio, più stringenti gli obblighi. Seleziona un articolo dalla
                sidebar per leggere il testo completo dalla knowledge base normativa di Actify.
              </p>
            </div>

            {/* KPI cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
              {([
                { icon: '📋', value: '113',      label: 'Articoli',              sub: '+ 13 Allegati tecnici',                  accent: '#6C47FF', topBorder: 'rgba(196,181,253,.55)' },
                { icon: '📅', value: 'Dic 2027', label: 'Alto rischio Annex III', sub: '↑ Digital Omnibus (ex Ago 2026)',        accent: '#f59e0b', topBorder: 'rgba(252,211,77,.50)' },
                { icon: '⚖️', value: '€35M',     label: 'Sanzione massima',       sub: 'o 7% del fatturato globale',             accent: '#ef4444', topBorder: 'rgba(252,165,165,.55)' },
                { icon: '🌍', value: '27',        label: 'Paesi UE',               sub: 'Applicazione diretta, no recepimento',   accent: '#22c55e', topBorder: 'rgba(134,239,172,.50)' },
              ] as { icon: string; value: string; label: string; sub: string; accent: string; topBorder: string }[]).map(kpi => (
                <div key={kpi.label} className="inv-kpi-card" style={{ borderTopColor: kpi.topBorder }}>
                  <div style={{ fontSize: 18, marginBottom: 10, filter: 'drop-shadow(0 0 6px rgba(255,255,255,.15))' }}>{kpi.icon}</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.5px' }}>{kpi.value}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginTop: 6 }}>{kpi.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3, lineHeight: 1.4 }}>{kpi.sub}</div>
                </div>
              ))}
            </div>

            {/* Two-col: risk tiers + timeline */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              {/* Risk tiers */}
              <div style={{
                background: 'linear-gradient(145deg,rgba(255,255,255,.045) 0%,rgba(255,255,255,.012) 100%)',
                border: '1px solid rgba(255,255,255,.09)', borderTopColor: 'rgba(255,255,255,.18)',
                borderRadius: 14, padding: '20px 22px',
                boxShadow: '0 0 0 1px rgba(255,255,255,.025) inset, 0 6px 24px rgba(0,0,0,.38)',
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.1, color: 'var(--muted)', marginBottom: 14 }}>Approccio basato sul rischio</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {([
                    { title: 'Pratiche vietate (Art. 5)',  desc: 'Scoring sociale, manipolazione subliminale, sfruttamento di vulnerabilità. Vietati in ogni contesto.',                                             borderColor: '#ef4444', bg: 'rgba(239,68,68,.07)',  tag: 'VIETATO' },
                    { title: 'Alto rischio (Art. 6–27)',   desc: 'Sanità, istruzione, occupazione, infrastrutture critiche. Obblighi rigorosi: documentazione, gestione rischi, supervisione umana.',              borderColor: '#f97316', bg: 'rgba(249,115,22,.07)', tag: 'ALTO' },
                    { title: 'Rischio limitato (Art. 50)', desc: 'Chatbot, deepfake e contenuti sintetici devono identificarsi come AI. Obblighi di trasparenza.',                                                   borderColor: '#f59e0b', bg: 'rgba(245,158,11,.07)', tag: 'LIMITATO' },
                    { title: 'Rischio minimo',             desc: 'Filtri antispam, AI nei videogiochi, strumenti di produttività. Nessun obbligo aggiuntivo.',                                                        borderColor: 'rgba(255,255,255,.22)', bg: 'rgba(255,255,255,.03)', tag: 'MINIMO' },
                  ] as { title: string; desc: string; borderColor: string; bg: string; tag: string }[]).map(item => (
                    <div key={item.title} style={{
                      display: 'flex', gap: 12, padding: '10px 12px',
                      background: item.bg, borderRadius: 9,
                      border: '1px solid rgba(255,255,255,.07)',
                      borderLeft: `3px solid ${item.borderColor}`,
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text)' }}>{item.title}</div>
                          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: .6, padding: '1px 5px', borderRadius: 4, color: item.borderColor, background: `${item.borderColor}22`, border: `1px solid ${item.borderColor}44` }}>{item.tag}</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.55 }}>{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline */}
              <div style={{
                background: 'linear-gradient(145deg,rgba(255,255,255,.045) 0%,rgba(255,255,255,.012) 100%)',
                border: '1px solid rgba(255,255,255,.09)', borderTopColor: 'rgba(255,255,255,.18)',
                borderRadius: 14, padding: '20px 22px',
                boxShadow: '0 0 0 1px rgba(255,255,255,.025) inset, 0 6px 24px rgba(0,0,0,.38)',
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.1, color: 'var(--muted)', marginBottom: 14 }}>Timeline di applicazione</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {([
                    { date: 'Ago 2024', label: 'Entrata in vigore',                desc: 'Pubblicazione in Gazzetta Ufficiale UE. Il Regolamento diventa legge.',                                           done: true  },
                    { date: 'Feb 2025', label: 'Art. 4-5 — Literacy + divieti',   desc: 'AI Literacy obbligatoria (Art. 4) e pratiche vietate operative (Art. 5): scoring sociale, manipolazione.',       done: true  },
                    { date: 'Ago 2025', label: 'GPAI e Ufficio AI operativi',     desc: 'Obblighi per modelli AI per finalità generali (Art. 51–56). Ufficio AI UE pienamente operativo.',                 done: true  },
                    { date: 'Dic 2026', label: 'Art. 50 — sistemi pre-esistenti', desc: 'Obblighi di trasparenza per chatbot e sistemi già sul mercato. (Digital Omnibus 2025)',                            done: false },
                    { date: 'Dic 2027', label: 'Sistemi alto rischio Annex III',  desc: 'Piena applicazione per tutti i sistemi ad alto rischio Allegato III. Posticipato dal Digital Omnibus.',            done: false },
                  ] as { date: string; label: string; desc: string; done: boolean }[]).map((step, i, arr) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', paddingBottom: i < arr.length - 1 ? 14 : 0, position: 'relative' }}>
                      {/* vertical connector */}
                      {i < arr.length - 1 && (
                        <div style={{ position: 'absolute', left: 75, top: 16, bottom: 0, width: 1, background: 'rgba(255,255,255,.08)', zIndex: 0 }} />
                      )}
                      <div style={{ width: 62, flexShrink: 0, textAlign: 'right', paddingTop: 2 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700,
                          color: step.done ? '#22c55e' : 'rgba(255,255,255,.3)',
                          background: step.done ? 'rgba(34,197,94,.10)' : 'transparent',
                          border: step.done ? '1px solid rgba(34,197,94,.22)' : 'none',
                          borderRadius: 4, padding: step.done ? '1px 5px' : '0',
                        }}>{step.date}</span>
                      </div>
                      <div style={{
                        width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 3, zIndex: 1,
                        background: step.done ? '#22c55e' : 'rgba(255,255,255,.12)',
                        border: step.done ? '2px solid rgba(34,197,94,.4)' : '1.5px solid rgba(255,255,255,.2)',
                        boxShadow: step.done ? '0 0 8px rgba(34,197,94,.5)' : 'none',
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: step.done ? 'var(--text)' : 'var(--text2)', marginBottom: 3 }}>{step.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>{step.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Relevant articles */}
            <div style={{
              background: 'linear-gradient(145deg,rgba(255,255,255,.045) 0%,rgba(255,255,255,.012) 100%)',
              border: '1px solid rgba(255,255,255,.09)', borderTopColor: 'rgba(108,71,255,.45)',
              borderRadius: 14, padding: '18px 22px',
              boxShadow: '0 0 0 1px rgba(255,255,255,.025) inset, 0 6px 24px rgba(0,0,0,.38)',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.1, color: 'var(--muted)', marginBottom: 12 }}>Articoli più rilevanti per la compliance — clicca per leggere</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {([
                  { n: 4,   icon: '🎓', desc: 'Alfabetizzazione AI' },
                  { n: 5,   icon: '🚫', desc: 'Pratiche vietate' },
                  { n: 6,   icon: '🏷️', desc: 'Classificazione rischio' },
                  { n: 9,   icon: '⚠️', desc: 'Gestione rischi' },
                  { n: 10,  icon: '📊', desc: 'Governance dati' },
                  { n: 13,  icon: '📢', desc: 'Trasparenza' },
                  { n: 14,  icon: '👁️', desc: 'Supervisione umana' },
                  { n: 26,  icon: '🏢', desc: 'Obblighi deployer' },
                  { n: 50,  icon: '💬', desc: 'Obblighi chatbot' },
                  { n: 99,  icon: '⚖️', desc: 'Sanzioni' },
                  { n: 100, icon: '🏭', desc: 'Sanzioni PMI' },
                ] as { n: number; icon: string; desc: string }[]).map(({ n, icon, desc }) => {
                  const entry = ALL_ARTICLES.find(a => a.num === n);
                  if (!entry) return null;
                  return (
                    <button
                      key={n}
                      onClick={() => loadArticle(n)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        background: 'rgba(108,71,255,.10)',
                        border: '1px solid rgba(108,71,255,.28)',
                        borderTopColor: 'rgba(196,181,253,.35)',
                        borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                        padding: '7px 14px',
                        boxShadow: '0 2px 8px rgba(0,0,0,.25)',
                        transition: 'background .12s, box-shadow .12s',
                      }}
                    >
                      <span style={{ fontSize: 13 }}>{icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#c4b5fd' }}>Art. {n}</span>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>— {desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeNum && (
          <>
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--muted)', marginBottom: 6 }}>
                Regolamento UE 2024/1689 — AI Act
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', margin: 0, lineHeight: 1.25 }}>
                Art. {activeNum}
                {title && <span style={{ fontWeight: 500 }}> — {title}</span>}
              </h1>
            </div>

            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--muted)', padding: '40px 0' }}>
                <div className="spin" style={{ width: 20, height: 20 }} />
                <span>Caricamento dalla knowledge base…</span>
              </div>
            )}

            {!loading && notFound && (
              <div style={{ padding: '32px 24px', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)', color: 'var(--muted)', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
                <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Testo non disponibile nella knowledge base</div>
                <div style={{ fontSize: 13 }}>
                  Il testo completo di Art. {activeNum} non è attualmente indicizzato.
                  Prova un altro articolo dalla sidebar.
                </div>
              </div>
            )}

            {!loading && !notFound && text && (
              <>
                <article style={{ fontSize: 15 }}>
                  {formatText(text)}
                </article>
                <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--muted)' }}>
                  Fonte: Regolamento (UE) 2024/1689 del Parlamento Europeo e del Consiglio (AI Act). Gazzetta Ufficiale UE L 2024/1689.
                  Il testo è estratto dalla knowledge base normativa di Actify e ha valore puramente informativo.
                </div>

                {/* Prev / next navigation */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, gap: 12 }}>
                  {(() => {
                    const idx = ALL_ARTICLES.findIndex(a => a.num === activeNum);
                    const prev = idx > 0 ? ALL_ARTICLES[idx - 1] : null;
                    const next = idx < ALL_ARTICLES.length - 1 ? ALL_ARTICLES[idx + 1] : null;
                    return (
                      <>
                        {prev ? (
                          <button onClick={() => loadArticle(prev.num)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text2)', cursor: 'pointer', fontSize: 13, padding: '8px 16px', fontFamily: 'inherit' }}>
                            ← Art. {prev.num} — {prev.title}
                          </button>
                        ) : <div />}
                        {next && (
                          <button onClick={() => loadArticle(next.num)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text2)', cursor: 'pointer', fontSize: 13, padding: '8px 16px', fontFamily: 'inherit' }}>
                            Art. {next.num} — {next.title} →
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
