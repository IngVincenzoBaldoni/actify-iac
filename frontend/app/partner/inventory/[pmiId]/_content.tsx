'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface AISystem {
  system_id: string;
  tool_name: string;
  vendor: string;
  category: string;
  role: 'provider' | 'deployer';
  compliance_status: 'unchecked' | 'checking' | 'gap_found' | 'compliant';
  last_check_at: string | null;
  makes_automated_decisions: boolean;
  human_oversight_level: string;
  last_exposure_min?: number;
  last_exposure_max?: number;
  last_article_sanctions?: string;
  compliance_checklist?: Record<string, { status?: string }>;
}

interface GapSummary {
  total: number;
  compliant: number;
  hybrid_pending: number;
  intervention_needed: number;
}

interface PMIDetail {
  pmi_id: string;
  company_name: string;
  contact_email: string;
  systems: AISystem[];
  gap_summary?: GapSummary;
}

interface VaultDocument {
  document_id:    string;
  system_id:      string;
  article:        string;
  document_type:  string;
  title:          string;
  status:         string;
  generated_at:   string;
  finalized_at?:  string;
}

const DOC_TYPE_LABEL: Record<string, string> = {
  document_generation:    'Generazione documento',
  policy_template:        'Policy template',
  transparency_notice:    'Notice trasparenza',
  risk_assessment:        'Risk assessment',
  monitoring_plan:        'Piano monitoraggio',
  conformity_declaration: 'Dichiarazione conformità',
};

function computeEffectiveExposure(sys: AISystem): { min: number; max: number } {
  if (!sys.last_article_sanctions) {
    return { min: sys.last_exposure_min ?? 0, max: sys.last_exposure_max ?? 0 };
  }
  try {
    const sanctions: Record<string, { min: number; max: number }> = JSON.parse(sys.last_article_sanctions);
    const checklist = sys.compliance_checklist ?? {};
    let min = 0, max = 0;
    for (const [art, val] of Object.entries(sanctions)) {
      if (checklist[art]?.status !== 'present') { min += val.min; max += val.max; }
    }
    return { min, max };
  } catch {
    return { min: sys.last_exposure_min ?? 0, max: sys.last_exposure_max ?? 0 };
  }
}

function effectiveStatus(sys: AISystem): AISystem['compliance_status'] {
  if (sys.compliance_status === 'unchecked' || sys.compliance_status === 'checking') return sys.compliance_status;
  const { max } = computeEffectiveExposure(sys);
  return max === 0 ? 'compliant' : 'gap_found';
}

function fmtEur(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (n >= 1_000)     return `€${(n / 1_000).toFixed(0)}K`;
  if (n === 0)        return '—';
  return `€${n.toLocaleString('it-IT')}`;
}

const STATUS_LABEL: Record<string, string> = {
  unchecked: 'Non analizzato', checking: 'Analisi in corso…',
  gap_found: 'Gap trovati', compliant: 'Conforme',
};
const STATUS_CLASS: Record<string, string> = {
  unchecked: 'status-unchecked', checking: 'status-checking',
  gap_found: 'status-gap', compliant: 'status-ok',
};
const OVERSIGHT_LABEL: Record<string, string> = {
  always: 'Supervisione: sempre', sometimes: 'Supervisione: a volte',
  never: 'Supervisione: mai', na: 'N/A',
};

// Accepts pmiId as prop — parent (inventory/page.tsx) passes it from ?pmi= query param
export default function PMIInventoryDetailPage({ pmiId }: { pmiId: string }) {
  const router = useRouter();

  const [pmi, setPmi]           = useState<PMIDetail | null>(null);
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async () => {
    if (!pmiId) return;
    try {
      const data = await api.partnerInventory.getPMI(pmiId);
      const resp = data as unknown as { pmi: PMIDetail; documents?: VaultDocument[] };
      setPmi(resp.pmi ?? (data as unknown as PMIDetail));
      setDocuments(resp.documents ?? []);
    } catch {
      /* handled */
    } finally {
      setLoading(false);
    }
  }, [pmiId]);

  useEffect(() => {
    setLoading(true);
    setPmi(null);
    load();
  }, [load]);

  useEffect(() => {
    const systems = pmi?.systems ?? [];
    if (systems.some(s => s.compliance_status === 'checking')) {
      const t = setTimeout(load, 4000);
      return () => clearTimeout(t);
    }
  }, [pmi, load]);

  if (loading) return <div className="db-loading"><div className="spin"></div></div>;
  if (!pmi)    return <div style={{ padding: 48, color: 'var(--muted)' }}>PMI non trovata.</div>;

  const systems    = pmi.systems ?? [];
  const total      = systems.length;
  const compliant  = systems.filter(s => effectiveStatus(s) === 'compliant').length;
  const gapFound   = systems.filter(s => effectiveStatus(s) === 'gap_found').length;
  const unchecked  = systems.filter(s => s.compliance_status === 'unchecked').length;
  const checking   = systems.filter(s => s.compliance_status === 'checking').length;
  const analyzed   = compliant + gapFound;
  const score      = analyzed > 0 ? Math.round((compliant / analyzed) * 100) : null;

  const mergedArticles = new Map<string, { min: number; max: number }>();
  for (const s of systems) {
    if (!s.last_article_sanctions) continue;
    try {
      const map: Record<string, { min: number; max: number }> = JSON.parse(s.last_article_sanctions);
      const checklist = s.compliance_checklist ?? {};
      for (const [art, val] of Object.entries(map)) {
        if (checklist[art]?.status === 'present') continue;
        const existing = mergedArticles.get(art);
        if (!existing || val.max > existing.max) mergedArticles.set(art, val);
      }
    } catch { /* skip */ }
  }
  let totalExposMax = 0, totalExposMin = 0;
  Array.from(mergedArticles.values()).forEach(v => { totalExposMax += v.max; totalExposMin += v.min; });
  if (totalExposMax === 0) {
    systems.forEach(s => {
      const e = computeEffectiveExposure(s);
      totalExposMax += e.max; totalExposMin += e.min;
    });
  }
  const hasExposure = totalExposMax > 0;

  // Navigate to system detail using query params (stays on same static page)
  function goToSystem(systemId: string) {
    router.push(`/partner/inventory?pmi=${pmiId}&system=${systemId}`);
  }

  return (
    <div className="inv-page">
      <div className="inv-header">
        <div>
          <h1 className="inv-title">AI Inventory — {pmi.company_name}</h1>
          <p className="inv-sub">{total} sistema{total !== 1 ? 'i' : ''} censit{total !== 1 ? 'i' : 'o'} · {pmi.contact_email}</p>
        </div>
        <button className="btn-inv-reload" onClick={load} title="Ricarica stati aggiornati">
          ↺ Ricarica
        </button>
      </div>

      {total > 0 && (
        <div className="inv-stats">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon stat-icon-blue">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
              </div>
              <div className="stat-num">{total}</div>
              <div className="stat-label">Sistemi totali</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-green">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div className="stat-num stat-green">{compliant}</div>
              <div className="stat-label">Conformi</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-red">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div className="stat-num stat-red">{gapFound}</div>
              <div className="stat-label">Gap trovati</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-dim">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <div className="stat-num">{unchecked}{checking > 0 && <span className="stat-checking"> +{checking}</span>}</div>
              <div className="stat-label">Non analizzati{checking > 0 ? ` (${checking} in corso)` : ''}</div>
            </div>
            <div className="stat-card stat-card-score">
              <div className="stat-icon stat-icon-orange">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
              </div>
              {score !== null ? (
                <>
                  <div className={`stat-num ${score >= 70 ? 'stat-green' : score >= 40 ? 'stat-orange' : 'stat-red'}`}>{score}%</div>
                  <div className="stat-label">Tasso conformità</div>
                </>
              ) : (
                <>
                  <div className="stat-num stat-dim">—</div>
                  <div className="stat-label">Tasso conformità</div>
                </>
              )}
            </div>
          </div>

          <div className={`exp-banner ${hasExposure ? 'exp-banner-active' : 'exp-banner-empty'}`}>
            <div className="exp-banner-left">
              <div className="exp-banner-icon">⚖️</div>
              <div>
                <div className="exp-banner-title">Esposizione Sanzionatoria Stimata</div>
                <div className="exp-banner-sub">Art. 99 AI Act · Basata sui gap di compliance rilevati</div>
              </div>
            </div>
            <div className="exp-banner-center">
              {hasExposure ? (
                <>
                  <div className="exp-banner-num">{fmtEur(totalExposMax)}</div>
                  <div className="exp-banner-range">da {fmtEur(totalExposMin)}</div>
                  <div className="exp-banner-dedup-note">
                    Per ogni articolo violato si applica una sola sanzione (Art. 99 AI Act)
                  </div>
                </>
              ) : (
                <div className="exp-banner-none">Esegui un compliance check per stimare le sanzioni</div>
              )}
            </div>
            {hasExposure && (
              <div className="exp-banner-right">
                <div className="exp-banner-systems">
                  {[...systems]
                    .map(s => ({ s, eff: computeEffectiveExposure(s) }))
                    .filter(({ eff }) => eff.max > 0)
                    .sort((a, b) => b.eff.max - a.eff.max)
                    .map(({ s, eff }) => {
                      const maxE  = Math.max(...systems.map(x => computeEffectiveExposure(x).max));
                      const pct   = Math.max(5, (eff.max / maxE) * 100);
                      const color = eff.max > 1_000_000 ? '#EF4444' : eff.max > 200_000 ? '#F97316' : '#EAB308';
                      return (
                        <div key={s.system_id} className="exp-mini-row" onClick={() => goToSystem(s.system_id)}>
                          <span className="exp-mini-name">{s.tool_name}</span>
                          <div className="exp-mini-bar-wrap">
                            <div className="exp-mini-bar-fill" style={{ width: `${pct}%`, background: color }} />
                          </div>
                          <span className="exp-mini-amt" style={{ color }}>{fmtEur(eff.max)}</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          <div className="stats-bar-wrap">
            <div className="stats-bar-label">
              <span>Distribuzione compliance</span>
              <span className="stats-bar-note">{analyzed} di {total} analizzati</span>
            </div>
            <div className="stats-bar">
              {compliant > 0 && <div className="sbar-seg sbar-green"  style={{ width: `${(compliant / total) * 100}%` }} />}
              {gapFound  > 0 && <div className="sbar-seg sbar-red"    style={{ width: `${(gapFound  / total) * 100}%` }} />}
              {checking  > 0 && <div className="sbar-seg sbar-check"  style={{ width: `${(checking  / total) * 100}%` }} />}
              {unchecked > 0 && <div className="sbar-seg sbar-dim"    style={{ width: `${(unchecked / total) * 100}%` }} />}
            </div>
            <div className="stats-bar-legend">
              {compliant > 0 && <span className="sbl-item"><span className="sbl-dot sbl-green"/>Conformi {compliant}</span>}
              {gapFound  > 0 && <span className="sbl-item"><span className="sbl-dot sbl-red"/>Gap trovati {gapFound}</span>}
              {checking  > 0 && <span className="sbl-item"><span className="sbl-dot sbl-check"/>In analisi {checking}</span>}
              {unchecked > 0 && <span className="sbl-item"><span className="sbl-dot sbl-dim"/>Non analizzati {unchecked}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Gap summary — intervention needed + hybrid pending */}
      {pmi.gap_summary && (pmi.gap_summary.intervention_needed > 0 || pmi.gap_summary.hybrid_pending > 0) && (
        <div className="fcard" style={{ marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Situazione Gap</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {pmi.gap_summary.intervention_needed > 0 && (
              <div style={{ flex: 1, minWidth: 180, background: 'rgba(239,68,68,.05)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 10, padding: '14px 18px' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#EF4444', marginBottom: 4 }}>{pmi.gap_summary.intervention_needed}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#EF4444', marginBottom: 4 }}>Intervento professionale richiesto</div>
                <div style={{ fontSize: 12, color: 'var(--dim)', lineHeight: 1.5 }}>Gap operativi che richiedono la tua expertise legale o consulenziale. La PMI non può risolverli autonomamente.</div>
              </div>
            )}
            {pmi.gap_summary.hybrid_pending > 0 && (
              <div style={{ flex: 1, minWidth: 180, background: 'rgba(249,115,22,.05)', border: '1px solid rgba(249,115,22,.2)', borderRadius: 10, padding: '14px 18px' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#F97316', marginBottom: 4 }}>{pmi.gap_summary.hybrid_pending}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#F97316', marginBottom: 4 }}>Documenti pronti — azione PMI pendente</div>
                <div style={{ fontSize: 12, color: 'var(--dim)', lineHeight: 1.5 }}>Actify ha già generato il documento. La PMI deve ancora dichiarare la conformità o caricare una prova.</div>
              </div>
            )}
            {pmi.gap_summary.compliant > 0 && (
              <div style={{ flex: 1, minWidth: 180, background: 'rgba(34,197,94,.05)', border: '1px solid rgba(34,197,94,.2)', borderRadius: 10, padding: '14px 18px' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#22C55E', marginBottom: 4 }}>{pmi.gap_summary.compliant}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#22C55E', marginBottom: 4 }}>Gap risolti</div>
                <div style={{ fontSize: 12, color: 'var(--dim)', lineHeight: 1.5 }}>Requisiti già conformi — nessuna azione necessaria.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vault documents */}
      {documents.length > 0 && (
        <div className="fcard" style={{ marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>📄 Documenti nel Vault ({documents.length})</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '6px 10px', color: 'var(--dim)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Articolo</th>
                  <th style={{ textAlign: 'left', padding: '6px 10px', color: 'var(--dim)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Tipo</th>
                  <th style={{ textAlign: 'left', padding: '6px 10px', color: 'var(--dim)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Titolo</th>
                  <th style={{ textAlign: 'left', padding: '6px 10px', color: 'var(--dim)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Stato</th>
                  <th style={{ textAlign: 'left', padding: '6px 10px', color: 'var(--dim)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Data</th>
                </tr>
              </thead>
              <tbody>
                {documents.map(doc => {
                  const isFinal = doc.status === 'final';
                  const system  = systems.find(s => s.system_id === doc.system_id);
                  return (
                    <tr key={doc.document_id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 7px' }}>{doc.article}</span>
                      </td>
                      <td style={{ padding: '8px 10px', color: 'var(--muted)' }}>{DOC_TYPE_LABEL[doc.document_type] ?? doc.document_type}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ fontWeight: 500 }}>{doc.title}</div>
                        {system && <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2 }}>{system.tool_name}</div>}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 4, padding: '2px 8px', background: isFinal ? 'rgba(34,197,94,.1)' : 'rgba(96,165,250,.1)', color: isFinal ? '#22C55E' : '#60A5FA' }}>
                          {isFinal ? '✓ Finalizzato' : 'Bozza'}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', color: 'var(--dim)', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {new Date(doc.finalized_at ?? doc.generated_at).toLocaleDateString('it-IT')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {total === 0 ? (
        <div className="inv-empty">
          <div className="inv-empty-icon">📋</div>
          <div className="inv-empty-title">Nessun sistema AI censito</div>
          <div className="inv-empty-sub">Questa PMI non ha ancora completato il questionario di assessment.</div>
        </div>
      ) : (
        <div className="inv-grid">
          {systems.map(sys => {
            const effSt = effectiveStatus(sys);
            const eff   = computeEffectiveExposure(sys);
            return (
              <div key={sys.system_id} className="sys-card">
                <div className="sys-card-head">
                  <div>
                    <div className="sys-name">{sys.tool_name}</div>
                    {sys.vendor && <div className="sys-vendor">{sys.vendor}</div>}
                  </div>
                  <div className="sys-badges">
                    <span className={`role-badge ${sys.role}`}>{sys.role}</span>
                    <span className="cat-badge">{sys.category}</span>
                  </div>
                </div>
                <div className="sys-card-body">
                  <div className={`compliance-badge ${STATUS_CLASS[effSt]}`}>
                    {effSt === 'checking' && <span className="pulse-dot"></span>}
                    {STATUS_LABEL[effSt]}
                  </div>
                  {eff.max > 0 && (
                    <div className="sys-exposure">
                      <span className="sys-exp-label">⚖️ Sanzione stimata:</span>
                      <span className="sys-exp-val">{fmtEur(eff.min)} – {fmtEur(eff.max)}</span>
                    </div>
                  )}
                  <div className="sys-meta">
                    <span>{OVERSIGHT_LABEL[sys.human_oversight_level] ?? ''}</span>
                    {sys.last_check_at && (
                      <span>Ultimo check: {new Date(sys.last_check_at).toLocaleDateString('it-IT')}</span>
                    )}
                  </div>
                </div>
                <div className="sys-card-footer">
                  {sys.compliance_status === 'checking' && (
                    <span style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>⟳ Analisi in corso…</span>
                  )}
                  {sys.compliance_status === 'unchecked' && (
                    <span style={{ fontSize: 12, color: 'var(--dim)', fontStyle: 'italic' }}>In attesa di analisi</span>
                  )}
                  {(effSt === 'gap_found' || effSt === 'compliant') && (
                    <button className="sys-detail-btn sys-detail-btn-full" onClick={() => goToSystem(sys.system_id)}>
                      Dettaglio →
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
