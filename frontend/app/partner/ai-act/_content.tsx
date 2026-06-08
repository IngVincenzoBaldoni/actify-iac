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
  // Split by double-newline for paragraphs; single newline for line breaks
  return text.split(/\n\n+/).map((para, i) => (
    <p key={i} style={{ margin: '0 0 1em 0', lineHeight: 1.75, color: 'var(--text2)', textAlign: 'justify' }}>
      {para.split('\n').map((line, j, arr) => (
        <span key={j}>
          {line}
          {j < arr.length - 1 && <br />}
        </span>
      ))}
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
    <div style={{ display: 'flex', height: 'calc(100vh - 0px)', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ── Left sidebar ── */}
      <aside style={{
        width: 300, flexShrink: 0, borderRight: '1px solid var(--border)',
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
      <div ref={contentRef} style={{ flex: 1, overflowY: 'auto', padding: '40px 56px 60px', maxWidth: 860 }}>
        {!activeNum && (
          <div style={{ maxWidth: 560, margin: '60px auto', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚖️</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>
              Testo ufficiale AI Act
            </h2>
            <p style={{ color: 'var(--muted)', lineHeight: 1.7, fontSize: 14 }}>
              Seleziona un articolo dalla sidebar per leggere il testo completo del Regolamento UE 2024/1689.
              Puoi navigare tra tutti i capitoli e articoli principali dell&apos;AI Act direttamente dalla knowledge base di Actify.
            </p>
            <div style={{ marginTop: 32, padding: '16px 20px', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)', textAlign: 'left' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--muted)', marginBottom: 10 }}>Articoli più rilevanti per la compliance</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {[4, 5, 6, 9, 10, 13, 14, 26, 50, 99, 100].map(n => {
                  const entry = ALL_ARTICLES.find(a => a.num === n);
                  if (!entry) return null;
                  return (
                    <button
                      key={n}
                      onClick={() => loadArticle(n)}
                      style={{
                        background: 'rgba(108,71,255,.1)', border: '1px solid rgba(108,71,255,.25)',
                        borderRadius: 6, color: '#a78bfa', cursor: 'pointer', fontSize: 12,
                        padding: '4px 10px', fontFamily: 'inherit',
                      }}
                    >
                      Art. {n} — {entry.title}
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
