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
  last_article_sanctions?: string; // JSON: Record<normalizedArticle, {min,max}>
}

function fmtEur(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (n >= 1_000)     return `€${(n / 1_000).toFixed(0)}K`;
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

export default function InventoryPage() {
  const router = useRouter();
  const [systems, setSystems] = useState<AISystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingIds, setCheckingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const loadSystems = useCallback(async () => {
    try {
      const data = await api.systems.list();
      setSystems(data as AISystem[]);
    } catch {
      /* handled */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSystems(); }, [loadSystems]);

  // Poll for any systems currently in "checking" state
  useEffect(() => {
    const checking = systems.filter(s => s.compliance_status === 'checking');
    if (checking.length === 0) return;
    const timer = setTimeout(loadSystems, 4000);
    return () => clearTimeout(timer);
  }, [systems, loadSystems]);

  async function deleteSystem(systemId: string, name: string) {
    if (!confirm(`Eliminare "${name}"? Verranno cancellati anche tutti i compliance check associati.`)) return;
    setDeletingIds(prev => new Set(prev).add(systemId));
    try {
      await api.systems.delete(systemId);
      setSystems(prev => prev.filter(s => s.system_id !== systemId));
    } catch (err: unknown) {
      alert((err as { message?: string }).message ?? 'Errore durante l\'eliminazione.');
    } finally {
      setDeletingIds(prev => { const n = new Set(prev); n.delete(systemId); return n; });
    }
  }

  async function activateCheck(systemId: string) {
    setCheckingIds(prev => new Set(prev).add(systemId));
    try {
      await api.compliance.trigger(systemId);
      // Update local state immediately to show "checking"
      setSystems(prev => prev.map(s =>
        s.system_id === systemId ? { ...s, compliance_status: 'checking' } : s
      ));
    } catch (err: unknown) {
      alert((err as { message?: string }).message ?? 'Errore nell\'avvio del check.');
    } finally {
      setCheckingIds(prev => { const n = new Set(prev); n.delete(systemId); return n; });
    }
  }

  if (loading) return <div className="db-loading"><div className="spin"></div></div>;

  const total         = systems.length;
  const compliant     = systems.filter(s => s.compliance_status === 'compliant').length;
  const gapFound      = systems.filter(s => s.compliance_status === 'gap_found').length;
  const unchecked     = systems.filter(s => s.compliance_status === 'unchecked').length;
  const checking      = systems.filter(s => s.compliance_status === 'checking').length;
  const analyzed      = compliant + gapFound;
  const riskAuto      = systems.filter(s => s.makes_automated_decisions).length;
  const score         = analyzed > 0 ? Math.round((compliant / analyzed) * 100) : null;
  // Merge per-article sanctions across systems: same article across systems → keep max (one sanction per article).
  const mergedArticles = new Map<string, { min: number; max: number }>();
  for (const s of systems) {
    if (!s.last_article_sanctions) continue;
    try {
      const map: Record<string, { min: number; max: number }> = JSON.parse(s.last_article_sanctions);
      for (const [art, val] of Object.entries(map)) {
        const existing = mergedArticles.get(art);
        if (!existing || val.max > existing.max) mergedArticles.set(art, val);
      }
    } catch { /* malformed JSON — skip */ }
  }
  let totalExposMax = 0, totalExposMin = 0;
  Array.from(mergedArticles.values()).forEach(v => { totalExposMax += v.max; totalExposMin += v.min; });
  // Fallback to simple sum for systems with old records that don't have last_article_sanctions yet
  if (totalExposMax === 0) {
    totalExposMax = systems.reduce((sum, s) => sum + (s.last_exposure_max ?? 0), 0);
    totalExposMin = systems.reduce((sum, s) => sum + (s.last_exposure_min ?? 0), 0);
  }
  const hasExposure = totalExposMax > 0;

  return (
    <div className="inv-page">
      <div className="inv-header">
        <div>
          <h1 className="inv-title">AI Inventory</h1>
          <p className="inv-sub">{total} sistema{total !== 1 ? 'i' : ''} censit{total !== 1 ? 'i' : 'o'}</p>
        </div>
        <a href="/dashboard/setup?add=1" className="btn-add-system">
          <svg width="14" height="14" viewBox="0 0 15 15" fill="none"><path d="M7.5 1v13M1 7.5h13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          Aggiungi Sistema
        </a>
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

            <div className="stat-card">
              <div className="stat-icon stat-icon-orange">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
              </div>
              <div className={`stat-num ${riskAuto > 0 ? 'stat-orange' : ''}`}>{riskAuto}</div>
              <div className="stat-label">Decisioni automatizzate</div>
            </div>
          </div>

          {/* Full-width exposure banner */}
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
                    Per ogni articolo violato si applica una sola sanzione — violazioni multiple dello stesso articolo non si sommano (Art. 99 AI Act)
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
                    .filter(s => (s.last_exposure_max ?? 0) > 0)
                    .sort((a, b) => (b.last_exposure_max ?? 0) - (a.last_exposure_max ?? 0))
                    .map(s => {
                      const maxE = Math.max(...systems.map(x => x.last_exposure_max ?? 0));
                      const pct = Math.max(5, ((s.last_exposure_max ?? 0) / maxE) * 100);
                      const color = (s.last_exposure_max ?? 0) > 1_000_000 ? '#EF4444' : (s.last_exposure_max ?? 0) > 200_000 ? '#F97316' : '#EAB308';
                      return (
                        <div key={s.system_id} className="exp-mini-row" onClick={() => router.push(`/dashboard/system?id=${s.system_id}`)}>
                          <span className="exp-mini-name">{s.tool_name}</span>
                          <div className="exp-mini-bar-wrap">
                            <div className="exp-mini-bar-fill" style={{ width: `${pct}%`, background: color }} />
                          </div>
                          <span className="exp-mini-amt" style={{ color }}>{fmtEur(s.last_exposure_max ?? 0)}</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {total > 0 && (
            <div className="stats-bar-wrap">
              <div className="stats-bar-label">
                <span>Distribuzione compliance</span>
                <span className="stats-bar-note">{analyzed} di {total} analizzati</span>
              </div>
              <div className="stats-bar">
                {compliant > 0  && <div className="sbar-seg sbar-green"  style={{ width: `${(compliant / total) * 100}%` }} title={`Conformi: ${compliant}`} />}
                {gapFound > 0   && <div className="sbar-seg sbar-red"    style={{ width: `${(gapFound  / total) * 100}%` }} title={`Gap trovati: ${gapFound}`} />}
                {checking > 0   && <div className="sbar-seg sbar-check"  style={{ width: `${(checking  / total) * 100}%` }} title={`In analisi: ${checking}`} />}
                {unchecked > 0  && <div className="sbar-seg sbar-dim"    style={{ width: `${(unchecked / total) * 100}%` }} title={`Non analizzati: ${unchecked}`} />}
              </div>
              <div className="stats-bar-legend">
                {compliant > 0 && <span className="sbl-item"><span className="sbl-dot sbl-green"/>Conformi {compliant}</span>}
                {gapFound  > 0 && <span className="sbl-item"><span className="sbl-dot sbl-red"/>Gap trovati {gapFound}</span>}
                {checking  > 0 && <span className="sbl-item"><span className="sbl-dot sbl-check"/>In analisi {checking}</span>}
                {unchecked > 0 && <span className="sbl-item"><span className="sbl-dot sbl-dim"/>Non analizzati {unchecked}</span>}
              </div>
            </div>
          )}

        </div>
      )}

      {total === 0 ? (
        <div className="inv-empty">
          <div className="empty-icon">⬡</div>
          <h3>Nessun sistema AI censito</h3>
          <p>Aggiungi il tuo primo sistema AI per avviare l'analisi di compliance.</p>
          <a href="/dashboard/setup" className="auth-btn" style={{ display: 'inline-block', textDecoration: 'none', marginTop: '16px' }}>
            Inizia Setup
          </a>
        </div>
      ) : (
        <div className="inv-grid">
          {systems.map(sys => (
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
                <div className={`compliance-badge ${STATUS_CLASS[sys.compliance_status]}`}>
                  {sys.compliance_status === 'checking' && <span className="pulse-dot"></span>}
                  {STATUS_LABEL[sys.compliance_status]}
                </div>
                {(sys.last_exposure_max ?? 0) > 0 && (
                  <div className="sys-exposure">
                    <span className="sys-exp-label">⚖️ Sanzione stimata:</span>
                    <span className="sys-exp-val">{fmtEur(sys.last_exposure_min ?? 0)} – {fmtEur(sys.last_exposure_max!)}</span>
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
                <button
                  className="sys-check-btn"
                  disabled={sys.compliance_status === 'checking' || checkingIds.has(sys.system_id)}
                  onClick={() => activateCheck(sys.system_id)}
                >
                  {sys.compliance_status === 'checking' || checkingIds.has(sys.system_id)
                    ? '⟳ Analisi in corso…'
                    : '▶ Avvia Compliance Check'}
                </button>
                {sys.compliance_status !== 'unchecked' && sys.compliance_status !== 'checking' && (
                  <button className="sys-detail-btn"
                    onClick={() => router.push(`/dashboard/system?id=${sys.system_id}`)}>
                    Dettaglio →
                  </button>
                )}
                <button
                  className="sys-delete-btn"
                  disabled={deletingIds.has(sys.system_id)}
                  onClick={() => deleteSystem(sys.system_id, sys.tool_name)}
                  title="Elimina sistema"
                >
                  {deletingIds.has(sys.system_id) ? '…' : '🗑'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
