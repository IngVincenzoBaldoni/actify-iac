'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { markSvg } from '@/lib/branding';

// Threats positioned around the shield ring
const THREATS = [
  { icon: '⚖️', label: 'Garante AI',         angle: 0   },
  { icon: '🏢', label: 'Clienti Enterprise', angle: 60  },
  { icon: '🏦', label: 'Banche',             angle: 120 },
  { icon: '🇪🇺', label: 'Commissione UE',   angle: 180 },
  { icon: '🛡️', label: 'Assicurazioni',      angle: 240 },
  { icon: '👤', label: 'Dipendenti',         angle: 300 },
] as const;

// Stage 480×480, center (240,240). Angle 0=top, clockwise.
function sPos(angleDeg: number, r: number) {
  const a = angleDeg * Math.PI / 180;
  return { x: 240 + r * Math.sin(a), y: 240 - r * Math.cos(a) };
}

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
  last_article_sanctions?: string; // JSON: Record<article, {min,max}>
  compliance_checklist?: Record<string, { status?: string }>;
}

// Compute the EFFECTIVE exposure by subtracting articles the user declared as "present"
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

const PLAN_LIMITS: Record<string, number> = {
  trial: 2, base: 5, premium: 20, enterprise: Infinity,
};
const PLAN_LABELS: Record<string, string> = {
  trial: 'Trial', base: 'Base', premium: 'Premium', enterprise: 'Enterprise',
};

export default function InventoryPage() {
  const router = useRouter();
  const [systems, setSystems] = useState<AISystem[]>([]);
  const [tier, setTier] = useState<string>('trial');
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [checkingIds, setCheckingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const loadSystems = useCallback(async () => {
    try {
      const [data, company] = await Promise.all([
        api.systems.list(),
        api.company.get(),
      ]);
      setSystems(data as AISystem[]);
      setTier((company as Record<string, unknown>).subscription_tier as string ?? 'trial');
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
    if (!confirm(`Eliminare "${name}"?\n\nVerranno cancellati definitivamente:\n• Tutti i compliance check\n• Tutti i documenti generati nel Vault\n\nQuesta azione è irreversibile.`)) return;
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

  const limit     = PLAN_LIMITS[tier] ?? 2;
  const atLimit   = systems.length >= limit;
  const pct       = limit === Infinity ? 0 : Math.min(100, Math.round((systems.length / limit) * 100));
  const fillClass = pct >= 100 ? 'full' : pct >= 80 ? 'warn' : '';

  const total         = systems.length;
  const compliant     = systems.filter(s => effectiveStatus(s) === 'compliant').length;
  const gapFound      = systems.filter(s => effectiveStatus(s) === 'gap_found').length;
  const unchecked     = systems.filter(s => s.compliance_status === 'unchecked').length;
  const checking      = systems.filter(s => s.compliance_status === 'checking').length;
  const analyzed      = compliant + gapFound;
  const riskAuto      = systems.filter(s => s.makes_automated_decisions).length;
  const score         = analyzed > 0 ? Math.round((compliant / analyzed) * 100) : null;
  // Merge per-article sanctions, skipping articles declared as "present" in checklist
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
    } catch { /* malformed JSON — skip */ }
  }
  let totalExposMax = 0, totalExposMin = 0;
  Array.from(mergedArticles.values()).forEach(v => { totalExposMax += v.max; totalExposMin += v.min; });
  // Fallback: sum effective per-system exposure for systems without last_article_sanctions
  if (totalExposMax === 0) {
    systems.forEach(s => {
      const e = computeEffectiveExposure(s);
      totalExposMax += e.max; totalExposMin += e.min;
    });
  }
  const hasExposure = totalExposMax > 0;

  return (
    <div className="inv-page">
      <div className="inv-header">
        <div>
          <h1 className="inv-title">AI Inventory</h1>
          <p className="inv-sub">{total} sistema{total !== 1 ? 'i' : ''} censit{total !== 1 ? 'i' : 'o'}</p>
        </div>
        <div className="inv-header-actions">
          {systems.length > 0 && (
            <button
              className="btn-inv-reload"
              disabled={reloading}
              onClick={async () => { setReloading(true); await loadSystems(); setReloading(false); }}
              title="Ricarica stati e stime aggiornate"
            >
              {reloading ? '⟳' : '↺'} Ricarica
            </button>
          )}
          {atLimit ? (
            <a href="/plan" className="btn-add-system" style={{ background: 'rgba(239,68,68,.1)', borderColor: 'rgba(239,68,68,.3)', color: '#EF4444' }}
              title={`Piano ${PLAN_LABELS[tier]}: limite di ${limit} tool raggiunto`}>
              ⬆ Upgrade piano
            </a>
          ) : (
            <a href="/dashboard/setup?add=1" className="btn-add-system">
              <svg width="14" height="14" viewBox="0 0 15 15" fill="none"><path d="M7.5 1v13M1 7.5h13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              Aggiungi Sistema
            </a>
          )}
        </div>
      </div>

      {/* Plan limit bar */}
      {limit !== Infinity && (
        <div className="plan-limit-bar-wrap">
          <span className="plan-limit-label">
            Piano <strong>{PLAN_LABELS[tier]}</strong>
          </span>
          <div className="plan-limit-track">
            <div className={`plan-limit-fill ${fillClass}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="plan-limit-count">{systems.length}/{limit} tool</span>
          {atLimit && (
            <a href="/plan" className="plan-limit-upgrade">Passa a Premium →</a>
          )}
        </div>
      )}

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
                    .map(s => ({ s, eff: computeEffectiveExposure(s) }))
                    .filter(({ eff }) => eff.max > 0)
                    .sort((a, b) => b.eff.max - a.eff.max)
                    .map(({ s, eff }) => {
                      const maxE = Math.max(...systems.map(x => computeEffectiveExposure(x).max));
                      const pct = Math.max(5, (eff.max / maxE) * 100);
                      const color = eff.max > 1_000_000 ? '#EF4444' : eff.max > 200_000 ? '#F97316' : '#EAB308';
                      return (
                        <div key={s.system_id} className="exp-mini-row" onClick={() => router.push(`/dashboard/system?id=${s.system_id}`)}>
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
        <div className="sv-wrap">

          {/* ── Shield stage ───────────────────────────────── */}
          <div className="sv-stage">

            {/* SVG overlay: dashed blocked arrows from threats toward shield */}
            <svg className="sv-svg" viewBox="0 0 480 480" fill="none" xmlns="http://www.w3.org/2000/svg">
              {THREATS.map(t => {
                const p1 = sPos(t.angle, 175);
                const p2 = sPos(t.angle, 132);
                const a  = t.angle * Math.PI / 180;
                const nx = Math.sin(a), ny = -Math.cos(a);
                return (
                  <g key={t.angle} className="sv-arrow">
                    <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                      stroke="rgba(239,68,68,0.45)" strokeWidth="1.5" strokeDasharray="3 3"/>
                    <polygon
                      points={`${p2.x},${p2.y} ${p2.x - nx*9 - ny*4},${p2.y - ny*9 + nx*4} ${p2.x - nx*9 + ny*4},${p2.y - ny*9 - nx*4}`}
                      fill="rgba(239,68,68,0.45)"/>
                  </g>
                );
              })}
            </svg>

            {/* Rings */}
            <div className="sv-ring sv-r3" />
            <div className="sv-ring sv-r2" />
            <div className="sv-ring sv-r1"><div className="sv-r1-arc" /></div>

            {/* ── Center: PMI (phase 1) then PMI+Actify (phase 2+) */}
            <div className="sv-core">
              <div className="sv-core-box">
                {/* Building — always visible */}
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                  stroke="rgba(203,213,225,0.9)" strokeWidth="1.5">
                  <path d="M3 21h18M3 21V7l9-4 9 4v14M9 21v-4h6v4"/>
                  <rect x="9" y="9" width="2" height="2" fill="rgba(203,213,225,0.9)" stroke="none"/>
                  <rect x="13" y="9" width="2" height="2" fill="rgba(203,213,225,0.9)" stroke="none"/>
                </svg>
                {/* Actify mark — fades in after PMI-alone phase */}
                <div className="sv-core-divider sv-actify-in" />
                <span className="sv-actify-in"
                  dangerouslySetInnerHTML={{ __html: markSvg(30, 'green') }} />
              </div>
              <div className="sv-core-tag sv-actify-in">AI Act Protected</div>
            </div>

            {/* Threat nodes */}
            {THREATS.map((t, i) => {
              const pos = sPos(t.angle, 202);
              return (
                <div key={t.angle} className="sv-threat sv-threats-in"
                  style={{ left: pos.x - 42, top: pos.y - 28, animationDelay: `${i * 0.3}s` }}>
                  <span className="sv-ti">{t.icon}</span>
                  <span className="sv-tl">{t.label}</span>
                </div>
              );
            })}
          </div>

          {/* ── Text below stage */}
          <h2 className="ief-title">Inizia a censire i tuoi strumenti AI</h2>
          <p className="ief-desc">
            Aggiungi i tuoi strumenti AI. Actify costruisce uno scudo di compliance
            che ti protegge da sanzioni, audit e richieste di clienti enterprise.
          </p>
          <div className="ief-pills">
            <span className="ief-pill"><span>⚖️</span> Stima sanzioni Art. 99</span>
            <span className="ief-pill"><span>⊙</span> Compliance check automatico</span>
            <span className="ief-pill"><span>📋</span> Roadmap correttiva</span>
          </div>
          <a href="/dashboard/setup?add=1" className="ief-cta">
            <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 1v13M1 7.5h13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            Aggiungi il primo sistema AI
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
                {(() => {
                  const effSt = effectiveStatus(sys);
                  const eff = computeEffectiveExposure(sys);
                  return (
                    <>
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
                    </>
                  );
                })()}
                <div className="sys-meta">
                  <span>{OVERSIGHT_LABEL[sys.human_oversight_level] ?? ''}</span>
                  {sys.last_check_at && (
                    <span>Ultimo check: {new Date(sys.last_check_at).toLocaleDateString('it-IT')}</span>
                  )}
                </div>
              </div>
              <div className="sys-card-footer">
                {sys.compliance_status === 'unchecked' && (
                  <button
                    className="sys-check-btn"
                    disabled={checkingIds.has(sys.system_id)}
                    onClick={() => activateCheck(sys.system_id)}
                  >
                    {checkingIds.has(sys.system_id) ? '⟳ Avvio…' : '▶ Avvia Compliance Check'}
                  </button>
                )}
                {sys.compliance_status === 'checking' && (
                  <button className="sys-check-btn" disabled>⟳ Analisi in corso…</button>
                )}
                {(effectiveStatus(sys) === 'gap_found' || effectiveStatus(sys) === 'compliant') && (
                  <button className="sys-detail-btn sys-detail-btn-full"
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
