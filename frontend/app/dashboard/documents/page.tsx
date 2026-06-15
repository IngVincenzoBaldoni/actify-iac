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

const DOC_TYPE_ICONS: Record<string, string> = {
  monitoring_plan:        '📊',
  transparency_notice:    '📢',
  risk_assessment:        '⚠️',
  policy_template:        '📋',
  document_generation:    '📄',
  conformity_declaration: '✅',
  art4_literacy_report:   '🎓',
};

const DOC_TYPE_LABELS: Record<string, string> = {
  monitoring_plan:        'Piano di Monitoraggio',
  transparency_notice:    'Disclosure Notice',
  risk_assessment:        'FRIA',
  policy_template:        'Policy AI',
  document_generation:    'Documentazione Tecnica',
  conformity_declaration: 'Dichiarazione di Conformità',
  art4_literacy_report:   'Report Art. 4 — AI Literacy',
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  generating: { label: '⟳ Generazione…', cls: 'badge-gen'  },
  draft:      { label: '✎ Bozza',         cls: 'badge-draft' },
  final:      { label: '✓ Finale',         cls: 'badge-final' },
  error:      { label: '⚠ Errore',         cls: 'badge-error' },
};

const GEN_STATUS_LABELS: Record<string, { label: string; cls: string; eta?: string }> = {
  QUEUED:          { label: '⟳ In coda',           cls: 'badge-gen',   eta: 'Avvio imminente…'       },
  RUNNING:         { label: '⟳ In esecuzione',      cls: 'badge-gen',   eta: 'Completamento ~60–90s'  },
  DRAFT_READY:     { label: '✎ Bozza pronta',       cls: 'badge-draft'                                },
  REVIEW_REQUIRED: { label: '⚠ Revisione richiesta', cls: 'badge-warn'                               },
  FAILED:          { label: '⚠ Fallito',             cls: 'badge-error'                               },
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

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return iso; }
}

function EmptyState() {
  return (
    <div className="vault-empty">
      <div className="vault-empty-icon">📂</div>
      <h2 className="vault-empty-title">Nessun documento ancora</h2>
      <p className="vault-empty-desc">
        Il Document Vault raccoglie tutti i documenti di compliance generati automaticamente da Actify.
        Avvia un Compliance Check su un sistema AI, poi usa il pulsante ⚡ per generare documenti.
      </p>
      <div className="vault-empty-types">
        {Object.entries(DOC_TYPE_LABELS).map(([k, l]) => (
          <span key={k} className="vault-empty-type-chip">
            {DOC_TYPE_ICONS[k]} {l}
          </span>
        ))}
      </div>
    </div>
  );
}

function DocumentVaultContent() {
  const [docs, setDocs]       = useState<ActifyDocument[]>([]);
  const [systems, setSystems] = useState<SystemInfo[]>([]);
  const [generations, setGenerations] = useState<DocGeneration[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [readying, setReadying]   = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const [docsRes, systemsRes, gensRes] = await Promise.allSettled([
        api.documents.listByCompany(),
        api.systems.list(),
        api.docPipeline.listByCompany(),
      ]);
      if (docsRes.status === 'fulfilled') setDocs((docsRes.value.documents ?? []) as ActifyDocument[]);
      if (systemsRes.status === 'fulfilled') setSystems(systemsRes.value as unknown as SystemInfo[]);
      if (gensRes.status === 'fulfilled') setGenerations(gensRes.value.generations ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 8s while there are active (QUEUED/RUNNING) generations
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
    if (filterType   && d.document_type !== filterType)   return false;
    if (filterStatus && d.status        !== filterStatus) return false;
    return true;
  });

  const groups = filtered.reduce<Record<string, ActifyDocument[]>>((acc, doc) => {
    const key = doc.system_id ?? 'unknown';
    (acc[key] ??= []).push(doc);
    return acc;
  }, {});

  async function openDocument(doc: ActifyDocument) {
    try {
      const fresh = await api.documents.get(doc.document_id) as unknown as ActifyDocument & { preview_url?: string };
      if (fresh.preview_url) window.open(fresh.preview_url, '_blank', 'noopener');
    } catch {
      alert('Impossibile aprire il documento');
    }
  }

  async function handleDelete(docId: string) {
    if (!confirm('Eliminare questo documento?')) return;
    setDeleting(docId);
    try {
      await api.documents.delete(docId);
      setDocs(prev => prev.filter(d => d.document_id !== docId));
    } catch {
      alert("Errore durante l'eliminazione");
    } finally {
      setDeleting(null);
    }
  }

  async function handleRegenerate(doc: ActifyDocument) {
    try {
      await api.documents.regenerate(doc.document_id);
      await load();
    } catch {
      alert('Errore durante la rigenerazione');
    }
  }

  async function handleMarkReady(docId: string) {
    setReadying(docId);
    try {
      await api.documents.finalize(docId);
      await load();
    } catch {
      alert('Errore durante la finalizzazione');
    } finally {
      setReadying(null);
    }
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
      await load();
    } catch {
      alert('Errore durante il caricamento');
    } finally {
      setUploading(null);
    }
  }

  if (loading) return <div className="db-loading"><div className="spin"></div></div>;

  return (
    <div className="vault-page">
      <div className="vault-header">
        <div>
          <h1 className="vault-title">Document Vault</h1>
          <p className="vault-sub">Documenti di compliance generati da Actify per i tuoi sistemi AI.</p>
        </div>
        {docs.length > 0 && (
          <div className="vault-stats">
            <div className="vault-stat"><span className="vault-stat-n">{docs.filter(d => d.status === 'final').length}</span><span className="vault-stat-l">Finalizzati</span></div>
            <div className="vault-stat"><span className="vault-stat-n">{docs.filter(d => d.status === 'draft').length}</span><span className="vault-stat-l">Bozze</span></div>
            <div className="vault-stat"><span className="vault-stat-n">{docs.length}</span><span className="vault-stat-l">Totale</span></div>
          </div>
        )}
      </div>

      {docs.length > 0 && (
        <div className="vault-filters">
          <select className="vault-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">Tutti i tipi</option>
            {Object.entries(DOC_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select className="vault-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Tutti gli stati</option>
            <option value="draft">Bozze</option>
            <option value="final">Finalizzati</option>
            <option value="generating">In generazione</option>
            <option value="error">Errore</option>
          </select>
          {(filterType || filterStatus) && (
            <button className="vault-filter-clear" onClick={() => { setFilterType(''); setFilterStatus(''); }}>
              ✕ Rimuovi filtri
            </button>
          )}
        </div>
      )}

      {/* Active pipeline generations (QUEUED/RUNNING only — no errors) */}
      {generations.filter(g => g.status === 'QUEUED' || g.status === 'RUNNING').length > 0 && (
        <div className="vault-group" style={{ marginBottom: 24 }}>
          <div className="vault-group-header">
            <div className="vault-group-sys">
              <span className="vault-group-sys-name">
                <><span className="spin-sm" /> Generazioni in corso</>
              </span>
            </div>
          </div>
          <div className="vault-group-docs">
            {generations
              .filter(g => g.status === 'QUEUED' || g.status === 'RUNNING')
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map(gen => {
                const st = GEN_STATUS_LABELS[gen.status] ?? GEN_STATUS_LABELS.FAILED;
                const sys = sysMap[gen.systemId];
                const isActive = gen.status === 'QUEUED' || gen.status === 'RUNNING';
                return (
                  <div key={gen.generationId} className="vault-doc">
                    <div className="vault-doc-left">
                      <div className="vault-doc-icon">{DOCTYPE_ICONS[gen.docType] ?? '📄'}</div>
                    </div>
                    <div className="vault-doc-right">
                      <div className="vault-doc-title">{DOCTYPE_LABELS[gen.docType] ?? gen.docType}</div>
                      <div className="vault-doc-meta">
                        {sys
                          ? <Link href={`/dashboard/system?id=${gen.systemId}`} className="vault-doc-art" style={{ textDecoration: 'none' }}>{sys.tool_name}</Link>
                          : <span className="vault-doc-art">Sistema AI</span>}
                        <span className="vault-doc-date">{fmtDate(gen.createdAt)}</span>
                        <span className={`badge ${st.cls}`}>{st.label}</span>
                      </div>
                      {isActive && st.eta && (
                        <div className="vault-doc-eta">{st.eta}</div>
                      )}
                      {gen.errorMessage && !isActive && (
                        <div className="vault-doc-error">{gen.errorMessage}</div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {docs.length === 0 && generations.filter(g => g.status === 'QUEUED' || g.status === 'RUNNING').length === 0 ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        <div className="inv-empty">
          <div className="empty-icon">🔍</div>
          <h3>Nessun documento corrisponde ai filtri</h3>
        </div>
      ) : (
        <div className="vault-groups">
          {Object.entries(groups).map(([systemId, groupDocs]) => {
            const sys = sysMap[systemId];
            return (
              <div key={systemId} className="vault-group">
                <div className="vault-group-header">
                  <div className="vault-group-sys">
                    <span className="vault-group-sys-name">{sys?.tool_name ?? 'Sistema sconosciuto'}</span>
                    {sys?.vendor_name && <span className="vault-group-sys-vendor">{sys.vendor_name}</span>}
                  </div>
                  <span className="vault-group-count">
                    {groupDocs.length} {groupDocs.length === 1 ? 'documento' : 'documenti'}
                  </span>
                </div>
                <div className="vault-group-docs">
                  {groupDocs.map(doc => {
                    const st = STATUS_LABELS[doc.status] ?? STATUS_LABELS.error;
                    const icon = DOC_TYPE_ICONS[doc.document_type] ?? '📄';
                    return (
                      <div key={doc.document_id} className="vault-doc">
                        <div className="vault-doc-left">
                          <div className="vault-doc-icon">{icon}</div>
                        </div>
                        <div className="vault-doc-right">
                          <div className="vault-doc-title">
                            {doc.title || DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                          </div>
                          <div className="vault-doc-meta">
                            <span className="vault-doc-art">{doc.article}</span>
                            <span className="vault-doc-type">{DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type}</span>
                            <span className="vault-doc-date">{fmtDate(doc.generated_at)}</span>
                            <span className={`badge ${st.cls}`}>{doc.status === 'final' ? '✓ READY' : st.label}</span>
                            {doc.finalized_at && (
                              <span className="vault-finalized-at">Approvato {fmtDate(doc.finalized_at)}</span>
                            )}
                          </div>
                          {doc.status === 'error' && doc.error_message && (
                            <div className="vault-doc-error">{doc.error_message}</div>
                          )}
                          <div className="vault-doc-actions">
                            {(doc.status === 'draft' || doc.status === 'final') && (
                              <button className="vault-btn vault-btn-open" onClick={() => openDocument(doc)}>
                                ⬇ Scarica
                              </button>
                            )}
                            {doc.status === 'draft' && (
                              <>
                                <button
                                  className="vault-btn vault-btn-open"
                                  style={{ background: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.4)', color: '#818cf8' }}
                                  disabled={readying === doc.document_id}
                                  onClick={() => handleMarkReady(doc.document_id)}>
                                  {readying === doc.document_id ? '…' : '✓ Segna READY'}
                                </button>
                                <label
                                  className="vault-btn vault-btn-regen"
                                  style={{ cursor: uploading === doc.document_id ? 'wait' : 'pointer' }}
                                  title="Ricarica versione modificata (PDF)">
                                  {uploading === doc.document_id ? '…' : '↑ Ricarica'}
                                  <input
                                    type="file"
                                    accept=".pdf"
                                    style={{ display: 'none' }}
                                    disabled={!!uploading}
                                    onChange={e => { const f = e.target.files?.[0]; if (f) handleReupload(doc, f); e.target.value = ''; }}
                                  />
                                </label>
                              </>
                            )}
                            {doc.status !== 'generating' && (
                              <button className="vault-btn vault-btn-regen" onClick={() => handleRegenerate(doc)}>
                                ↻ Rigenera
                              </button>
                            )}
                            <button
                              className="vault-btn vault-btn-del"
                              disabled={deleting === doc.document_id}
                              onClick={() => handleDelete(doc.document_id)}>
                              {deleting === doc.document_id ? '…' : '🗑'}
                            </button>
                          </div>
                        </div>
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
