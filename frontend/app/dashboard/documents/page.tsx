'use client';

import { Suspense } from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { ActifyDocument, DocGeneration } from '@/lib/types';

interface SystemInfo {
  system_id: string;
  tool_name: string;
  vendor_name?: string;
}

// ─── Config maps ──────────────────────────────────────────────────────────────

const DOC_TYPE_ICONS: Record<string, string> = {
  monitoring_plan:          '📊',
  transparency_notice:      '📢',
  risk_assessment:          '⚠️',
  policy_template:          '📋',
  document_generation:      '📄',
  conformity_declaration:   '✅',
  art4_literacy_report:     '🎓',
  art4_consolidated_report: '🏆',
  audit_trail_report:       '🔏',
};

const DOC_TYPE_LABELS: Record<string, string> = {
  monitoring_plan:          'Piano di Monitoraggio',
  transparency_notice:      'Disclosure Notice',
  risk_assessment:          'FRIA',
  policy_template:          'Policy AI',
  document_generation:      'Documentazione Tecnica',
  conformity_declaration:   'Dichiarazione di Conformità',
  art4_literacy_report:     'Report Art. 4 — AI Literacy',
  art4_consolidated_report: 'Attestato Consolidato Art. 4',
  audit_trail_report:       'Audit Trail',
};

const DOC_TYPE_COLOR: Record<string, { color: string; bg: string }> = {
  art4_literacy_report:     { color: '#A78BFA', bg: 'rgba(167,139,250,0.14)' },
  art4_consolidated_report: { color: '#34D399', bg: 'rgba(52,211,153,0.14)'  },
  audit_trail_report:       { color: '#60A5FA', bg: 'rgba(96,165,250,0.14)'  },
  monitoring_plan:          { color: '#FB923C', bg: 'rgba(251,146,60,0.14)'  },
  transparency_notice:      { color: '#FCD34D', bg: 'rgba(252,211,77,0.14)'  },
  risk_assessment:          { color: '#F87171', bg: 'rgba(248,113,113,0.14)' },
  policy_template:          { color: '#818CF8', bg: 'rgba(129,140,248,0.14)' },
  document_generation:      { color: '#94A3B8', bg: 'rgba(148,163,184,0.14)' },
  conformity_declaration:   { color: '#4ADE80', bg: 'rgba(74,222,128,0.14)'  },
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  final:      { label: 'READY',           color: '#22C55E', bg: 'rgba(22,163,74,0.13)',    dot: '#22C55E' },
  draft:      { label: 'Bozza',           color: '#CA8A04', bg: 'rgba(202,138,4,0.13)',    dot: '#CA8A04' },
  generating: { label: 'In generazione',  color: '#60A5FA', bg: 'rgba(59,130,246,0.13)',   dot: '#60A5FA' },
  error:      { label: 'Errore',          color: '#F87171', bg: 'rgba(220,38,38,0.13)',    dot: '#F87171' },
};

const GEN_STATUS_CFG: Record<string, { label: string; color: string; bg: string; eta?: string }> = {
  QUEUED:          { label: '⟳ In coda',             color: '#60A5FA', bg: 'rgba(59,130,246,0.13)', eta: 'Avvio imminente…'      },
  RUNNING:         { label: '⟳ In esecuzione',        color: '#60A5FA', bg: 'rgba(59,130,246,0.13)', eta: 'Completamento ~60–90s' },
  DRAFT_READY:     { label: '✎ Bozza pronta',         color: '#CA8A04', bg: 'rgba(202,138,4,0.13)'  },
  REVIEW_REQUIRED: { label: '⚠ Revisione richiesta',  color: '#F59E0B', bg: 'rgba(245,158,11,0.13)' },
  FAILED:          { label: '⚠ Fallito',              color: '#F87171', bg: 'rgba(220,38,38,0.13)'  },
};

const DOCTYPE_ICONS: Record<string, string> = {
  DISCLOSURE_NOTICE: '📢',
  MONITORING_PLAN:   '📊',
  AI_POLICY:         '📋',
  TECH_DOC:          '📄',
  CONFORMITY_DECL:   '✅',
};

const DOCTYPE_LABELS: Record<string, string> = {
  DISCLOSURE_NOTICE: 'Disclosure Notice',
  MONITORING_PLAN:   'Piano di Monitoraggio',
  AI_POLICY:         'Policy AI',
  TECH_DOC:          'Documentazione Tecnica',
  CONFORMITY_DECL:   'Dichiarazione di Conformità',
};

const SPECIAL_GROUPS: Record<string, { name: string; icon: string; desc: string; borderColor: string }> = {
  audit_trail: { name: 'Audit Trail',        icon: '🔏', desc: 'Log immutabile eventi aziendali',  borderColor: '#60A5FA' },
  consolidated: { name: 'Report Consolidati', icon: '🏆', desc: 'Attestati multi-sistema Art. 4', borderColor: '#34D399' },
};

const ELEVATED: React.CSSProperties = {
  background: 'linear-gradient(145deg, rgba(255,255,255,.055) 0%, rgba(255,255,255,.018) 100%)',
  border: '1px solid rgba(255,255,255,.09)',
  borderTop: '1.5px solid rgba(255,255,255,.22)',
  boxShadow: '0 0 0 1px rgba(255,255,255,.03) inset, 0 6px 24px rgba(0,0,0,.42)',
};

const SELECT_STYLE: React.CSSProperties = {
  background: 'rgba(255,255,255,.06)',
  border: '1px solid rgba(255,255,255,.12)',
  borderRadius: 9,
  color: 'var(--text)',
  fontSize: 13,
  fontWeight: 600,
  padding: '8px 14px',
  cursor: 'pointer',
  outline: 'none',
};

const BTN_GHOST: React.CSSProperties = {
  background: 'rgba(255,255,255,.06)',
  border: '1px solid rgba(255,255,255,.12)',
  borderRadius: 8,
  color: 'var(--text2)',
  fontSize: 12,
  fontWeight: 600,
  padding: '6px 12px',
  cursor: 'pointer',
};


function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return iso; }
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 24px' }}>
      <div style={{ fontSize: 56, marginBottom: 20 }}>📂</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: '0 0 12px' }}>Nessun documento ancora</h2>
      <p style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 480, margin: '0 auto 28px', lineHeight: 1.7 }}>
        Il Document Vault raccoglie tutti i documenti di compliance generati automaticamente da Actify.
        Avvia un Compliance Check su un sistema AI, poi usa il pulsante ⚡ per generare documenti.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        {Object.entries(DOC_TYPE_LABELS).map(([k, l]) => (
          <span key={k} style={{
            fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 20,
            background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)',
            color: 'var(--muted)',
          }}>
            {DOC_TYPE_ICONS[k]} {l}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function DocumentVaultContent() {
  const [docs, setDocs]           = useState<ActifyDocument[]>([]);
  const [systems, setSystems]     = useState<SystemInfo[]>([]);
  const [generations, setGenerations] = useState<DocGeneration[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filterType, setFilterType] = useState('');
  const [readying, setReadying]   = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [finalizeConfirm, setFinalizeConfirm] = useState<string | null>(null);
  const [isTrialUser, setIsTrialUser] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const [docsRes, systemsRes, gensRes, companyRes] = await Promise.allSettled([
        api.documents.listByCompany(),
        api.systems.list(),
        api.docPipeline.listByCompany(),
        api.company.get(),
      ]);
      if (docsRes.status === 'fulfilled')    setDocs((docsRes.value.documents ?? []) as ActifyDocument[]);
      if (systemsRes.status === 'fulfilled') setSystems(systemsRes.value as unknown as SystemInfo[]);
      if (gensRes.status === 'fulfilled')    setGenerations(gensRes.value.generations ?? []);
      if (companyRes.status === 'fulfilled') {
        const tier = (companyRes.value as Record<string, unknown>).subscription_tier as string ?? '';
        setIsTrialUser(!['base', 'premium', 'enterprise'].includes(tier));
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const hasActive = generations.some(g => g.status === 'QUEUED' || g.status === 'RUNNING');
    if (hasActive) {
      pollRef.current = setInterval(() => { load(); }, 8000);
    } else {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    }
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [generations, load]);

  const sysMap = Object.fromEntries(systems.map(s => [s.system_id, s]));

  const filtered = docs.filter(d => {
    if (filterType && d.document_type !== filterType) return false;
    return true;
  });

  const groups = filtered.reduce<Record<string, ActifyDocument[]>>((acc, doc) => {
    const key = doc.system_id ?? 'unknown';
    (acc[key] ??= []).push(doc);
    return acc;
  }, {});

  const activeGens = generations.filter(g => g.status === 'QUEUED' || g.status === 'RUNNING');

  const typeCounts = Object.keys(DOC_TYPE_LABELS)
    .map(type => ({
      type,
      count: docs.filter(d => d.document_type === type).length,
    }))
    .filter(t => t.count > 0)
    .sort((a, b) => b.count - a.count);

  async function openDocument(doc: ActifyDocument) {
    try {
      const fresh = await api.documents.get(doc.document_id) as unknown as ActifyDocument & { preview_url?: string };
      if (fresh.preview_url) window.open(fresh.preview_url, '_blank', 'noopener');
    } catch { alert('Impossibile aprire il documento'); }
  }

  async function handleMarkReady(docId: string) {
    setReadying(docId);
    try { await api.documents.finalize(docId); await load(); }
    catch { alert('Errore durante la finalizzazione'); }
    finally { setReadying(null); }
  }

  async function handleReupload(doc: ActifyDocument, file: File) {
    setUploading(doc.document_id);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await api.documents.reupload(doc.document_id, base64, file.name);
      setUploadSuccess(doc.document_id);
      await load();
      setTimeout(() => setUploadSuccess(null), 6000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore sconosciuto';
      alert(`Errore durante il caricamento: ${msg}`);
    }
    finally { setUploading(null); }
  }

  if (!loading && isTrialUser) {
    return (
      <div className="inv-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', maxWidth: 480, padding: '48px 32px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📁</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text1)', marginBottom: 8 }}>Document Vault</h2>
          <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
            La generazione automatica dei documenti di compliance (Policy AI, Risk Assessment, Dichiarazione di Conformità e altri) è disponibile dal piano <strong style={{ color: 'var(--text1)' }}>Starter</strong> in su.
          </p>
          <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.6, marginBottom: 28 }}>
            Con il piano Trial hai accesso a AIPI, Gap Analysis, FEB e Audit Trail — strumenti di diagnostica completi per capire dove sei prima di generare i documenti.
          </p>
          <a href="/plan" style={{ display: 'inline-block', padding: '12px 28px', background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#fff', fontWeight: 700, borderRadius: 10, textDecoration: 'none', fontSize: 15 }}>
            Passa a Starter →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="inv-page">

      {/* ── Upload success toast ─────────────────────────────────────────────── */}
      {uploadSuccess && (
        <div style={{
          position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999,
          background: 'linear-gradient(135deg, #065F46, #047857)',
          border: '1px solid rgba(52,211,153,.4)',
          borderRadius: 14,
          padding: '14px 28px',
          display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,.5)',
          color: '#fff', fontSize: 14, fontWeight: 700,
          whiteSpace: 'nowrap',
        }}>
          <span style={{ fontSize: 20 }}>✅</span>
          <span>Documento finalizzato caricato con successo!</span>
          <span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,.7)', marginLeft: 4 }}>
            Torna alla Gap Analysis per chiudere il gap.
          </span>
        </div>
      )}

      {/* ── Finalizza confirmation modal ─────────────────────────────────── */}
      {finalizeConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: '#1E1B2E', border: '1px solid rgba(129,140,248,.25)',
            borderRadius: 18, padding: '32px 36px', maxWidth: 480, width: '90%',
            boxShadow: '0 24px 64px rgba(0,0,0,.6)',
          }}>
            <div style={{ fontSize: 32, marginBottom: 16, textAlign: 'center' }}>⚠️</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#E2E8F0', marginBottom: 12, textAlign: 'center' }}>
              Sei sicuro di voler finalizzare?
            </div>
            <div style={{ fontSize: 13, color: 'rgba(226,232,240,.7)', lineHeight: 1.7, marginBottom: 24 }}>
              <strong style={{ color: '#FBBF24' }}>Consigliato:</strong> prima di segnare il documento come finalizzato,
              scarica la bozza <strong>.docx</strong>, completala e firmala, poi ricaricala con il pulsante{' '}
              <strong>↑ Ricarica</strong>.
              <br /><br />
              Se finalizzi ora senza ricaricare, il documento verrà marcato come definitivo
              nella sua versione generata automaticamente (non revisionata).
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setFinalizeConfirm(null)}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 10,
                  background: 'transparent', border: '1px solid rgba(226,232,240,.2)',
                  color: 'rgba(226,232,240,.7)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}>
                Annulla
              </button>
              <button
                onClick={() => { const id = finalizeConfirm; setFinalizeConfirm(null); handleMarkReady(id); }}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 10,
                  background: '#6366F1', border: 'none',
                  color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}>
                Finalizza senza ricarica
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="inv-header">
        <div>
          <h1 className="inv-title">Document Vault</h1>
          <p className="inv-sub">Archivio immutabile dei documenti di compliance generati da Actify.</p>
        </div>
      </div>

      {/* ── Intro board ──────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(145deg, rgba(99,102,241,.055) 0%, rgba(14,165,233,.025) 50%, rgba(167,139,250,.04) 100%)',
        border: '1px solid rgba(255,255,255,.09)',
        borderTop: '2px solid rgba(99,102,241,.45)',
        borderRadius: 18,
        boxShadow: '0 0 0 1px rgba(99,102,241,.04) inset, 0 8px 32px rgba(0,0,0,.45)',
        padding: '28px 32px',
        marginBottom: 28,
      }}>
        {/* Row 1 — icon + title + desc */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, marginBottom: 24 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 13, flexShrink: 0,
            background: 'rgba(99,102,241,.1)', border: '1.5px solid rgba(99,102,241,.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
          }}>🔐</div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)', margin: '0 0 8px', letterSpacing: -0.3 }}>
              Il tuo archivio legale di compliance AI
            </h2>
            <p style={{ fontSize: 13.5, color: 'var(--text2)', lineHeight: 1.7, margin: 0 }}>
              Ogni documento generato da Actify — Report Art. 4, Attestati Consolidati, Audit Trail, piani di monitoraggio —
              viene salvato automaticamente qui. Il Vault è <strong>immutabile</strong>: i documenti non possono essere eliminati,
              garantendo l&apos;integrità della catena probatoria in caso di ispezione.
              Scarica i documenti direttamente da questa pagina (PDF o Word .docx) e presentali alle autorità di vigilanza come prova documentale
              della conformità al <strong>Reg. UE 2024/1689</strong>.
            </p>
          </div>
        </div>

        {/* Row 2 — 3 feature cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            {
              icon: '🛡️',
              label: 'Prova ispettiva',
              desc: 'Ogni documento ha timestamp, hash e autore. Dimostra diligenza documentale davanti alle autorità nazionali.',
            },
            {
              icon: '⚖️',
              label: 'Riduce le sanzioni',
              desc: 'La documentazione completa è uno dei criteri espliciti che le autorità usano per ridurre l\'importo effettivo della multa.',
            },
            {
              icon: '🔒',
              label: 'Archivio immutabile',
              desc: 'I documenti non possono essere cancellati né modificati. L\'integrità del record è garantita per tutta la durata dell\'obbligo.',
            },
          ].map(c => (
            <div key={c.label} style={{
              background: 'rgba(255,255,255,.04)',
              border: '1px solid rgba(255,255,255,.09)',
              borderRadius: 12, padding: '18px 20px',
            }}>
              <div style={{ fontSize: 24, marginBottom: 10 }}>{c.icon}</div>
              <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text)', marginBottom: 6 }}>{c.label}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>{c.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Stats + Filters board ────────────────────────────────────────────── */}
      {!loading && docs.length > 0 && (
        <div style={{
          background: 'linear-gradient(145deg, rgba(96,165,250,.045) 0%, rgba(99,102,241,.030) 50%, rgba(167,139,250,.040) 100%)',
          border: '1px solid rgba(255,255,255,.09)',
          borderTop: '2px solid rgba(99,102,241,.45)',
          borderRadius: 18,
          boxShadow: '0 0 0 1px rgba(99,102,241,.04) inset, 0 8px 32px rgba(0,0,0,.45)',
          padding: '26px 30px',
          marginBottom: 28,
        }}>

          {/* Header row — total + filter */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 16,
              background: 'rgba(255,255,255,.035)',
              border: '1px solid rgba(255,255,255,.08)',
              borderRadius: 14, padding: '18px 24px',
              boxShadow: `0 0 28px rgba(129,140,248,.22)`,
            }}>
              <div style={{ fontSize: 44, fontWeight: 900, color: '#818CF8', lineHeight: 1, letterSpacing: -2 }}>
                {docs.length}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>
                  Totale documenti
                </div>
                <div style={{ width: 36, height: 2, background: '#818CF8', borderRadius: 2, opacity: 0.55 }} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <select style={SELECT_STYLE} value={filterType} onChange={e => setFilterType(e.target.value)}>
                <option value="">Tutti i tipi</option>
                {Object.entries(DOC_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              {filterType && (
                <button style={{ ...BTN_GHOST, color: '#F87171', borderColor: 'rgba(248,113,113,.3)' }}
                  onClick={() => setFilterType('')}>
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(255,255,255,.07)', marginBottom: 18 }} />

          {/* Per-type KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {typeCounts.map(({ type, count }) => {
              const color    = DOC_TYPE_COLOR[type] ?? { color: '#94A3B8', bg: 'rgba(148,163,184,0.14)' };
              const isActive = filterType === type;
              return (
                <button
                  key={type}
                  onClick={() => setFilterType(isActive ? '' : type)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    background: isActive ? color.bg : 'rgba(255,255,255,.035)',
                    border: `1px solid ${isActive ? color.color + '55' : 'rgba(255,255,255,.08)'}`,
                    borderRadius: 14, padding: '18px 20px',
                    cursor: 'pointer', transition: 'all .15s', textAlign: 'left',
                    boxShadow: isActive ? `0 0 24px ${color.color}33` : 'none',
                  }}
                >
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{DOC_TYPE_ICONS[type] ?? '📄'}</span>
                  <div>
                    <div style={{
                      fontSize: 36, fontWeight: 900, lineHeight: 1, letterSpacing: -1,
                      color: isActive ? color.color : 'var(--text)',
                    }}>
                      {count}
                    </div>
                    <div style={{
                      fontSize: 11, fontWeight: 600, marginTop: 5, whiteSpace: 'nowrap',
                      color: isActive ? color.color : 'var(--muted)',
                    }}>
                      {DOC_TYPE_LABELS[type]}
                    </div>
                    {isActive && (
                      <div style={{ width: 28, height: 2, background: color.color, borderRadius: 2, marginTop: 5, opacity: 0.7 }} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

        </div>
      )}

      {/* ── Loading ──────────────────────────────────────────────────────────── */}
      {loading && <div className="db-loading"><div className="spin"></div></div>}

      {/* ── Empty state ──────────────────────────────────────────────────────── */}
      {!loading && docs.length === 0 && activeGens.length === 0 && <EmptyState />}

      {/* ── Active pipeline generations ──────────────────────────────────────── */}
      {activeGens.length > 0 && (
        <div style={{ ...ELEVATED, borderRadius: 14, overflow: 'hidden', marginBottom: 16, borderLeft: '3px solid #60A5FA' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 22px', borderBottom: '1px solid rgba(255,255,255,.07)',
            background: 'rgba(255,255,255,.02)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="spin-sm" />
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Generazioni in corso</div>
            </div>
            <div style={{
              fontSize: 12, fontWeight: 700, color: '#60A5FA',
              background: 'rgba(96,165,250,.12)', border: '1px solid rgba(96,165,250,.25)',
              borderRadius: 20, padding: '4px 12px',
            }}>
              {activeGens.length} attive
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {activeGens
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((gen, idx) => {
                const st  = GEN_STATUS_CFG[gen.status] ?? GEN_STATUS_CFG.FAILED;
                const sys = sysMap[gen.systemId];
                return (
                  <div key={gen.generationId} style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '16px 22px',
                    borderBottom: idx < activeGens.length - 1 ? '1px solid rgba(255,255,255,.06)' : 'none',
                  }}>
                    <div style={{ fontSize: 24, flexShrink: 0 }}>{DOCTYPE_ICONS[gen.docType] ?? '📄'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                        {DOCTYPE_LABELS[gen.docType] ?? gen.docType}
                      </div>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        {sys
                          ? <Link href={`/dashboard/system?id=${gen.systemId}`} style={{ fontSize: 12, color: '#818CF8', textDecoration: 'none', fontWeight: 700 }}>{sys.tool_name}</Link>
                          : <span style={{ fontSize: 12, color: 'var(--muted)' }}>Sistema AI</span>}
                        <span style={{ fontSize: 12, color: 'var(--dim)' }}>{fmtDate(gen.createdAt)}</span>
                      </div>
                      {st.eta && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, fontStyle: 'italic' }}>{st.eta}</div>}
                    </div>
                    <div style={{
                      padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                      background: st.bg, color: st.color, border: `1px solid ${st.color}33`,
                    }}>
                      {st.label}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ── No filter match ──────────────────────────────────────────────────── */}
      {!loading && docs.length > 0 && filtered.length === 0 && (
        <div className="inv-empty">
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text2)', margin: '0 0 8px' }}>Nessun documento corrisponde ai filtri</h3>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>Prova a rimuovere i filtri applicati.</p>
        </div>
      )}

      {/* ── Document groups ──────────────────────────────────────────────────── */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {Object.entries(groups).map(([systemId, groupDocs]) => {
            const sys     = sysMap[systemId];
            const special = SPECIAL_GROUPS[systemId];
            const groupName    = special?.name ?? sys?.tool_name ?? 'Sistema sconosciuto';
            const groupDesc    = special?.desc ?? sys?.vendor_name ?? undefined;
            const borderColor  = special?.borderColor ?? 'rgba(255,255,255,.15)';

            return (
              <div key={systemId} style={{ ...ELEVATED, borderRadius: 14, overflow: 'hidden', borderLeft: `3px solid ${borderColor}` }}>

                {/* Group header */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 24px',
                  borderBottom: '1px solid rgba(255,255,255,.07)',
                  background: 'rgba(255,255,255,.025)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {special && (
                      <div style={{
                        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                        background: `${borderColor}18`, border: `1.5px solid ${borderColor}40`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                      }}>
                        {special.icon}
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.2 }}>
                        {groupName}
                      </div>
                      {groupDesc && (
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{groupDesc}</div>
                      )}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 12, fontWeight: 700,
                    color: special ? borderColor : 'var(--muted)',
                    background: special ? `${borderColor}12` : 'rgba(255,255,255,.06)',
                    border: `1px solid ${special ? borderColor + '30' : 'rgba(255,255,255,.1)'}`,
                    borderRadius: 20, padding: '4px 12px',
                  }}>
                    {groupDocs.length} {groupDocs.length === 1 ? 'documento' : 'documenti'}
                  </div>
                </div>

                {/* Documents */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {groupDocs.map((doc, idx) => {
                    const st        = STATUS_CFG[doc.status] ?? STATUS_CFG.error;
                    const icon      = DOC_TYPE_ICONS[doc.document_type] ?? '📄';
                    const typeColor = DOC_TYPE_COLOR[doc.document_type] ?? { color: '#94A3B8', bg: 'rgba(148,163,184,0.14)' };

                    const isTechDoc = doc.document_type === 'TECH_DOC' || doc.document_type === 'document_generation';
                    const isDocxFile = doc.s3_key?.endsWith('.docx') ?? false;
                    return (
                        <div
                          key={doc.document_id}
                          style={{ borderBottom: idx < groupDocs.length - 1 ? '1px solid rgba(255,255,255,.06)' : 'none' }}
                        >
                          {/* Main row */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 24px' }}>
                            {/* Status dot */}
                            <div style={{
                              width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                              background: st.dot, boxShadow: `0 0 7px ${st.dot}`,
                            }} />

                            {/* Doc icon */}
                            <div style={{ fontSize: 26, flexShrink: 0, lineHeight: 1 }}>{icon}</div>

                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 7, lineHeight: 1.3 }}>
                                {doc.title || DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <span style={{
                                  fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
                                  background: typeColor.bg, color: typeColor.color,
                                  border: `1px solid ${typeColor.color}30`,
                                }}>
                                  {DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type}
                                </span>
                                <span style={{ fontSize: 12, color: 'var(--dim)' }}>{fmtDate(doc.generated_at)}</span>
                                {doc.finalized_at && (
                                  <span style={{ fontSize: 11, color: '#4ADE80', fontWeight: 600 }}>
                                    ✓ Finalizzato {fmtDate(doc.finalized_at as string)}
                                  </span>
                                )}
                              </div>
                              {doc.status === 'error' && doc.error_message && (
                                <div style={{ fontSize: 11, color: '#F87171', marginTop: 5 }}>{doc.error_message}</div>
                              )}
                            </div>

                            {/* Status badge */}
                            <div style={{
                              flexShrink: 0, padding: '5px 14px', borderRadius: 20,
                              background: st.bg, color: st.color,
                              fontSize: 12, fontWeight: 700,
                              border: `1px solid ${st.color}33`,
                              whiteSpace: 'nowrap',
                            }}>
                              {doc.status === 'final' ? '✓ READY' : st.label}
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                              {(doc.status === 'draft' || doc.status === 'final') && (
                                <button
                                  onClick={() => openDocument(doc)}
                                  style={{
                                    background: isDocxFile ? '#2563EB' : '#16A34A',
                                    color: '#fff',
                                    border: 'none', borderRadius: 9,
                                    padding: '9px 18px', fontSize: 13, fontWeight: 800,
                                    cursor: 'pointer',
                                    boxShadow: isDocxFile ? '0 2px 10px rgba(37,99,235,.35)' : '0 2px 10px rgba(22,163,74,.35)',
                                    whiteSpace: 'nowrap',
                                  }}>
                                  {isDocxFile ? '↓ .docx' : '↓ PDF'}
                                </button>
                              )}
                              {!isTechDoc && (doc.status === 'draft' || doc.status === 'final') && (
                                <>
                                  {doc.status === 'draft' && (
                                    <button
                                      style={{ ...BTN_GHOST, color: '#818CF8', borderColor: 'rgba(129,140,248,.35)', whiteSpace: 'nowrap' }}
                                      disabled={readying === doc.document_id}
                                      onClick={() => setFinalizeConfirm(doc.document_id)}>
                                      {readying === doc.document_id ? '…' : '✓ Finalizza'}
                                    </button>
                                  )}
                                  <label style={{ ...BTN_GHOST, cursor: uploading === doc.document_id ? 'wait' : 'pointer', whiteSpace: 'nowrap' }}>
                                    {uploading === doc.document_id ? '…' : '↑ Ricarica'}
                                    <input
                                      type="file"
                                      accept=".pdf,.docx"
                                      style={{ display: 'none' }}
                                      disabled={!!uploading}
                                      onChange={e => { const f = e.target.files?.[0]; if (f) handleReupload(doc, f); e.target.value = ''; }}
                                    />
                                  </label>
                                </>
                              )}
                            </div>
                          </div>

                          {/* documento finalizzato — evidenza upload */}
                          {doc.status === 'final' && (
                            <div style={{
                              margin: '0 24px 20px',
                              background: 'rgba(22,163,74,.08)',
                              border: '1px solid rgba(34,197,94,.3)',
                              borderRadius: 12,
                              padding: '14px 20px',
                              display: 'flex', alignItems: 'flex-start', gap: 14,
                            }}>
                              <span style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }}>✅</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 800, color: '#4ADE80', marginBottom: 4 }}>
                                  {doc.uploaded_at ? 'Versione finalizzata caricata' : 'Documento finalizzato'}
                                </div>
                                <div style={{ fontSize: 12, color: 'rgba(74,222,128,.8)', lineHeight: 1.6 }}>
                                  {doc.uploaded_at
                                    ? <>Caricato il <strong>{new Date(doc.uploaded_at as string).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>. Usa il bottone <strong>↓ .docx</strong> in alto per scaricarlo e verificarlo.</>
                                    : <>Segnato come definitivo. Usa <strong>↑ Ricarica</strong> per sostituirlo con la versione firmata.</>
                                  }
                                </div>
                              </div>
                            </div>
                          )}

                          {/* TECH_DOC guidance box — draft only */}
                          {isTechDoc && doc.status === 'draft' && (
                            <div style={{
                              margin: '0 24px 20px',
                              background: 'rgba(37,99,235,.07)',
                              border: '1px solid rgba(37,99,235,.28)',
                              borderRadius: 12,
                              padding: '16px 20px',
                            }}>
                              <div style={{ fontSize: 13, fontWeight: 800, color: '#93C5FD', marginBottom: 10 }}>
                                📝 Come finalizzare la Documentazione Tecnica
                              </div>
                              <ol style={{ margin: '0 0 16px 0', paddingLeft: 18, fontSize: 13, color: 'rgba(147,197,253,.9)', lineHeight: 1.8 }}>
                                <li>Scarica il file <strong>.docx</strong> con il pulsante blu in alto a destra</li>
                                <li>Completa tutti i campi <strong>[DA COMPLETARE]</strong> seguendo la struttura del documento</li>
                                <li>Fai firmare il documento dal responsabile tecnico e dal legale rappresentante</li>
                                <li>Ricarica il file finalizzato (PDF o .docx) con il pulsante qui sotto</li>
                                <li>Torna alla <strong>Gap Analysis</strong> del sistema e segna il gap Art. 11 come conforme</li>
                              </ol>
                              <label style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                background: uploading === doc.document_id ? 'rgba(99,102,241,.4)' : '#6366F1',
                                color: '#fff', borderRadius: 10,
                                padding: '12px 24px', fontSize: 14, fontWeight: 800,
                                cursor: uploading === doc.document_id ? 'wait' : 'pointer',
                                boxShadow: '0 2px 12px rgba(99,102,241,.4)',
                                border: 'none',
                              }}>
                                {uploading === doc.document_id
                                  ? <><span className="spin-sm" /> Caricamento in corso…</>
                                  : '↑ Carica documento finalizzato (.pdf o .docx)'}
                                <input
                                  type="file"
                                  accept=".pdf,.docx"
                                  style={{ display: 'none' }}
                                  disabled={!!uploading}
                                  onChange={e => { const f = e.target.files?.[0]; if (f) handleReupload(doc, f); e.target.value = ''; }}
                                />
                              </label>
                            </div>
                          )}
                        </div>
                    );
                  })}
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

export default function DocumentVaultPage() {
  return (
    <Suspense fallback={<div className="db-loading"><div className="spin"></div></div>}>
      <DocumentVaultContent />
    </Suspense>
  );
}
