'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { ComplianceCheck, ComplianceGap, ComplianceResult, ChecklistEntry } from '@/lib/types';
import { normalizeEntry } from '@/lib/types';

// ─── Article helpers ──────────────────────────────────────────────────────────

function articleNumFromLabel(label: string): number | null {
  const m = label.match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}


function fmtEur(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (n >= 1_000)     return `€${(n / 1_000).toFixed(0)}K`;
  return `€${n.toLocaleString('it-IT')}`;
}
function fmtEurFull(n: number): string { return `€${n.toLocaleString('it-IT')}`; }
function fmtPct(n: number): string     { return `${(n * 100).toFixed(0)}%`; }

// ─── Sanction Overview ────────────────────────────────────────────────────────

function SanctionOverview({ result }: { result: ComplianceResult }) {
  const exposure = result.total_exposure_estimate;
  if (!exposure) return null;

  const gaps      = result.compliance_gaps ?? [];
  const activeGaps = gaps.filter(g => g.status !== 'compliant' && (g.estimated_sanction_max ?? 0) > 0);
  const totalMax  = exposure.max;
  const totalMin  = exposure.min;

  const severityColor = totalMax === 0 ? '#22C55E' : totalMax > 1_000_000 ? '#EF4444' : totalMax > 200_000 ? '#F97316' : '#EAB308';
  const severityPct   = totalMax === 0 ? 100 : Math.min(98, Math.max(8, (totalMax / 15_000_000) * 100));

  if (totalMax === 0) {
    return (
      <div className="so-wrap so-compliant">
        <div className="so-compliant-inner">
          <div className="so-compliant-icon">✓</div>
          <div>
            <div className="so-compliant-title">Nessuna esposizione sanzionatoria stimata</div>
            <div className="so-compliant-sub">Il sistema risulta conforme agli articoli applicabili dell'AI Act</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="so-wrap">
      <div className="so-header">
        <div className="so-header-left">
          <span className="so-icon">⚖️</span>
          <div>
            <div className="so-title">Esposizione Sanzionatoria Stimata</div>
            <div className="so-subtitle">Art. 99 AI Act · Massimali di legge</div>
          </div>
        </div>
        <div className="so-source-chip">
          {exposure.turnover_source === 'exact' ? '✅ Fatturato esatto' : exposure.turnover_source === 'declared' ? '📊 Range dichiarato (mediana)' : '📐 Fatturato stimato'}
          <span className="so-source-val">{fmtEur(exposure.turnover_used)}</span>
        </div>
      </div>

      <div className="so-current-block">
        <div className="so-col-label">Esposizione stimata</div>
        <div className="so-big-num" style={{ color: severityColor }}>{fmtEur(totalMax)}</div>
        <div className="so-big-sub">da {fmtEur(totalMin)}</div>
        <div className="so-severity-bar">
          <div className="so-severity-fill" style={{ width: `${severityPct}%`, background: severityColor }} />
        </div>
        <div className="so-severity-label">{totalMax > 1_000_000 ? 'Rischio alto' : totalMax > 200_000 ? 'Rischio medio' : 'Rischio basso'}</div>
      </div>

      {activeGaps.length > 0 && (
        <div className="so-bars">
          <div className="so-bars-title">Dettaglio per articolo violato</div>
          {activeGaps.map(g => {
            const pct = totalMax > 0 ? Math.max(6, ((g.estimated_sanction_max ?? 0) / totalMax) * 100) : 0;
            const ti  = g.tier_info;
            const m   = exposure.methodology;
            return (
              <div key={g.gap_id} className="so-bar-row">
                <div className="so-bar-meta">
                  <span className="so-bar-art">{g.article}</span>
                  <span className="so-bar-req">{g.requirement}</span>
                </div>
                <div className="so-bar-track">
                  <div className="so-bar-seg-current" style={{ width: `${pct}%`, background: severityColor }} />
                </div>
                <span className="so-bar-amt">{fmtEur(g.estimated_sanction_max ?? 0)}</span>
                {ti && m && (
                  <div className="so-formula">
                    <span className="so-formula-tier">{ti.tier_label}</span>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4, lineHeight: 1.4 }}>
                      {ti.tier_label.includes('pratiche vietate')
                        ? 'Art. 99(3) AI Act — massimale di legge: €35M o 7% fatturato globale annuo (valore più alto)'
                        : ti.tier_label.includes('requisiti')
                          ? 'Art. 99(4) AI Act — massimale di legge: €15M o 3% fatturato globale annuo (valore più alto)'
                          : 'Art. 99(5) AI Act — massimale di legge: €7,5M o 1% fatturato globale annuo (valore più alto)'}
                    </div>
                    <div className="so-formula-steps">
                      <span>
                        <span className="so-fk">Fatturato × {fmtPct(ti.tier_pct)}</span>
                        <span className="so-fv"> = {fmtEurFull(ti.theoretical_pct_amount)}</span>
                      </span>
                      <span className="so-farrow">→</span>
                      <span>
                        <span className="so-fk">min({fmtEur(ti.tier_cap)} cap, {fmtEurFull(ti.theoretical_pct_amount)})</span>
                        <span className="so-fv"> = {fmtEurFull(ti.theoretical_max)}</span>
                      </span>
                      {m.is_sme && (
                        <>
                          <span className="so-farrow">→</span>
                          <span>
                            <span className="so-fk">Riduzione PMI Art. 100 (×{fmtPct(m.sme_reduction)})</span>
                            <span className="so-fv"> = {fmtEurFull(g.estimated_sanction_max ?? 0)} max</span>
                          </span>
                        </>
                      )}
                      <span className="so-farrow">→</span>
                      <span>
                        <span className="so-fk">Stima min (×{fmtPct(m.min_factor)} del max)</span>
                        <span className="so-fv"> = {fmtEurFull(g.estimated_sanction_min ?? 0)}</span>
                      </span>
                    </div>
                    {m.is_sme && (
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4, lineHeight: 1.4, borderTop: '1px solid var(--border)', paddingTop: 4 }}>
                        ⓘ <strong>Riduzione PMI (Art. 100):</strong> L&apos;AI Act prevede sanzioni &quot;proporzionate&quot; per PMI e startup — la riduzione del {fmtPct(m.sme_reduction)} è una stima prudenziale applicata al massimale di legge. La norma non fissa una percentuale esatta.
                      </div>
                    )}
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: m.is_sme ? 2 : 4, lineHeight: 1.4 }}>
                      ⓘ <strong>Range min indicativo:</strong> L&apos;Art. 99 Reg. UE 2024/1689 stabilisce solo massimali — l&apos;importo effettivo entro quel massimo è determinato dall&apos;Autorità di vigilanza in base a: gravità e durata dell&apos;infrazione, numero di persone coinvolte, intenzionalità o negligenza, misure adottate per attenuare il danno e cooperazione con le autorità. Il {fmtPct(m.min_factor)} del massimale applicabile rappresenta la nostra stima conservativa del caso tipico.
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {exposure.methodology && (
        <div className="so-method-box">
          <div className="so-method-title">📐 Parametri di calcolo</div>
          <div className="so-method-grid">
            <div className="so-method-row"><span className="so-mk">Fonte fatturato</span><span className="so-mv">{exposure.methodology.turnover_source_label}</span></div>
            <div className="so-method-row"><span className="so-mk">Fatturato usato</span><span className="so-mv">{fmtEurFull(exposure.turnover_used)}</span></div>
            <div className="so-method-row"><span className="so-mk">Riduzione PMI (Art. 100)</span><span className="so-mv">{exposure.methodology.is_sme ? `Sì — ×${fmtPct(exposure.methodology.sme_reduction)}` : 'No'}</span></div>
          </div>
        </div>
      )}

      <div className="so-disclaimer">{exposure.disclaimer}</div>
    </div>
  );
}

// ─── Compliance Checklist — SOLA LETTURA per il partner ──────────────────────

function ArticleBtn({ article }: { article: string }) {
  const num = articleNumFromLabel(article);
  if (!num) return null;
  return (
    <a
      href={`/partner/ai-act?article=${num}`}
      target="_blank"
      rel="noopener noreferrer"
      title="Leggi il testo completo dell'articolo nell'AI Act Reader"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        background: 'rgba(108,71,255,.1)', border: '1px solid rgba(108,71,255,.25)',
        borderRadius: 6, color: '#a78bfa', fontSize: 11, padding: '2px 8px',
        marginLeft: 8, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
        fontFamily: 'inherit', cursor: 'pointer',
      }}
    >
      ⚖️ Leggi Art. {num}
    </a>
  );
}

function ComplianceChecklist({
  gaps,
  checklist,
}: {
  gaps:      ComplianceGap[];
  checklist: Record<string, ChecklistEntry>;
}) {
  const getStatus = (article: string) => normalizeEntry(checklist[article]).status;

  const compliant   = gaps.filter(g => g.status === 'compliant' || getStatus(g.article) === 'present');
  const inProgress  = gaps.filter(g => g.status !== 'compliant' && getStatus(g.article) === 'partial');
  const missing     = gaps.filter(g => g.status !== 'compliant' && getStatus(g.article) === 'missing');

  return (
    <div className="fcard">
      <div className="cl-header-row">
        <h3>Gap Analysis AI Act</h3>
        <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 400 }}>Sola lettura</span>
      </div>
      <div className="cl-hint">
        Stato dei requisiti normativi rilevati dall'analisi AI. Per aggiornare lo stato dei gap, accedere con l'account PMI.
      </div>
      <div className="cl-counts">
        <span className="cl-count-ok">✓ {compliant.length} conformi</span>
        {inProgress.length > 0 && <span className="cl-count-partial">⟳ {inProgress.length} in lavorazione</span>}
        <span className="cl-count-miss">✗ {missing.length} da completare</span>
      </div>

      {compliant.length > 0 && (
        <div className="cl-section">
          <div className="cl-section-title cl-ok-title">✓ Conformi</div>
          {compliant.map(gap => (
            <div key={gap.gap_id} className="cl-item cl-item-ok">
              <div className="cl-item-head">
                <span className="cl-art">{gap.article}</span>
                <span className="cl-req">{gap.requirement}</span>
                <span className="cl-status-ok">Conforme</span>
                <ArticleBtn article={gap.article} />
              </div>
            </div>
          ))}
        </div>
      )}

      {inProgress.length > 0 && (
        <div className="cl-section">
          <div className="cl-section-title cl-partial-title">⟳ In lavorazione</div>
          {inProgress.map(gap => {
            const entry = normalizeEntry(checklist[gap.article]);
            return (
              <div key={gap.gap_id} className="cl-item cl-item-partial">
                <div className="cl-item-head">
                  <span className="cl-art">{gap.article}</span>
                  <span className="cl-req">{gap.requirement}</span>
                  <span className="cl-status-partial">In lavorazione</span>
                  <ArticleBtn article={gap.article} />
                </div>
                {entry.evidence_note && <div className="cl-evidence-note">📎 {entry.evidence_note}</div>}
                <p className="cl-desc">{gap.description}</p>
                <div className="cl-manual-card">
                  <div className="cl-manual-header"><span className="cl-manual-icon">📋</span><strong>Procedura richiesta</strong></div>
                  <p className="cl-manual-steps">{gap.what_to_do}</p>
                  {gap.deadline && <div className="cl-deadline">📅 Scadenza: <strong>{gap.deadline}</strong></div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {missing.length > 0 && (
        <div className="cl-section">
          <div className="cl-section-title cl-miss-title">✗ Gap da colmare</div>
          {missing.map(gap => (
            <div key={gap.gap_id} className="cl-item cl-item-miss">
              <div className="cl-item-head">
                <span className="cl-art">{gap.article}</span>
                <span className="cl-req">{gap.requirement}</span>
                <span className={`cl-status-miss${gap.status === 'partial' ? ' cl-partial' : ''}`}>
                  {gap.status === 'partial' ? 'Parziale' : 'Mancante'}
                </span>
                {gap.ungrounded && (
                  <span className="cl-ungrounded-badge" title="Nessun chunk normativo supporta questo articolo">⚠ Da verificare</span>
                )}
                <ArticleBtn article={gap.article} />
              </div>
              <p className="cl-desc">{gap.description}</p>
              <div className="cl-manual-card">
                <div className="cl-manual-header"><span className="cl-manual-icon">📋</span><strong>Procedura richiesta</strong></div>
                <p className="cl-manual-steps">{gap.what_to_do}</p>
                {gap.deadline && <div className="cl-deadline">📅 Scadenza: <strong>{gap.deadline}</strong></div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// Accepts pmiId + systemId as props — parent passes them from query params
export default function PartnerSystemDetailPage({ pmiId, systemId }: { pmiId: string; systemId: string }) {
  const router = useRouter();

  const [system, setSystem]   = useState<Record<string, unknown> | null>(null);
  const [check, setCheck]     = useState<ComplianceCheck | null>(null);
  const [loading, setLoading] = useState(true);

  const [checklist, setChecklist] = useState<Record<string, ChecklistEntry>>({});

  const load = useCallback(async () => {
    if (!pmiId || !systemId) return;
    try {
      const [sysData, latestCheck] = await Promise.allSettled([
        api.partnerInventory.getSystem(pmiId, systemId),
        api.partnerInventory.getLatestCheck(pmiId, systemId),
      ]);
      if (sysData.status    === 'fulfilled') setSystem(sysData.value);
      if (latestCheck.status === 'fulfilled') setCheck(latestCheck.value as unknown as ComplianceCheck);
    } finally {
      setLoading(false);
    }
  }, [pmiId, systemId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (system) {
      const raw = system.compliance_checklist as Record<string, ChecklistEntry | 'present' | 'missing'> | undefined;
      if (!raw) { setChecklist({}); return; }
      const normalized: Record<string, ChecklistEntry> = {};
      for (const [k, v] of Object.entries(raw)) normalized[k] = normalizeEntry(v);
      setChecklist(normalized);
    }
  }, [system]);

  useEffect(() => {
    if (check?.status === 'running') {
      const t = setTimeout(load, 4000);
      return () => clearTimeout(t);
    }
  }, [check, load]);

  const result = check?.result;
  const gaps   = result?.compliance_gaps ?? [];

  const effectiveGaps = useMemo((): ComplianceGap[] => {
    return gaps.map(g => {
      const entry = checklist[g.article];
      if (entry?.status === 'present') {
        return { ...g, status: 'compliant' as const, estimated_sanction_max: 0, estimated_sanction_min: 0 };
      }
      return g;
    });
  }, [gaps, checklist]);

  const effectiveResult = useMemo((): ComplianceResult | undefined => {
    if (!result) return undefined;
    const nonCompliant = effectiveGaps.filter(g => g.status !== 'compliant');
    const newMax = nonCompliant.reduce((s, g) => s + (g.estimated_sanction_max ?? 0), 0);
    const newMin = nonCompliant.reduce((s, g) => s + (g.estimated_sanction_min ?? 0), 0);
    return {
      ...result,
      compliance_gaps: effectiveGaps,
      total_exposure_estimate: result.total_exposure_estimate
        ? { ...result.total_exposure_estimate, max: newMax, min: newMin }
        : undefined,
    };
  }, [result, effectiveGaps]);

  if (loading) return <div className="db-loading"><div className="spin"></div></div>;
  if (!system) return <div className="inv-page"><p>Sistema non trovato.</p></div>;

  return (
    <div className="inv-page">
      <div className="inv-header">
        <div>
          <button className="btn-back-link" onClick={() => router.push(`/partner/inventory?pmi=${pmiId}`)}>
            ← {(system.company_name as string) ?? 'PMI'}
          </button>
          <h1 className="inv-title">{system.tool_name as string}</h1>
          <p className="inv-sub">{system.vendor as string} · {system.category as string} · {system.role as string}</p>
        </div>
      </div>

      {check?.status === 'running' && (
        <div className="check-running">
          <div className="spin" style={{ width: 32, height: 32 }}></div>
          <div>
            <strong>Analisi in corso…</strong>
            <p>Bedrock sta analizzando il sistema rispetto all'AI Act. ~30 secondi.</p>
          </div>
        </div>
      )}

      {effectiveResult && (
        <>
          {effectiveResult.rag_metadata && !effectiveResult.rag_metadata.rag_used && (
            <div className="rag-fallback-banner">
              <span className="rag-fallback-icon">⚠</span>
              <div className="rag-fallback-body">
                <strong>Analisi basata su contesto semplificato</strong>
                <p>La knowledge base normativa non era disponibile. I gap potrebbero essere incompleti.</p>
                {effectiveResult.rag_metadata.rag_fallback_reason && (
                  <span className="rag-fallback-reason">{effectiveResult.rag_metadata.rag_fallback_reason}</span>
                )}
              </div>
            </div>
          )}
          <SanctionOverview result={effectiveResult} />
          <div className={`risk-banner risk-${effectiveResult.risk_classification}`}>
            <div className="risk-label">Classificazione Rischio</div>
            <div className="risk-value">{effectiveResult.risk_classification.toUpperCase()}</div>
            <div className="risk-summary">{effectiveResult.executive_summary}</div>
          </div>
          <ComplianceChecklist
            gaps={gaps}
            checklist={checklist}
          />
        </>
      )}

      {!effectiveResult && check?.status === 'failed' && (
        <div className="inv-empty" style={{ borderColor: '#EF4444' }}>
          <div className="empty-icon">⚠️</div>
          <h3 style={{ color: '#EF4444' }}>Analisi fallita</h3>
          <p>Si è verificato un errore durante l'analisi. Riprova avviando un nuovo check.</p>
          {(check as unknown as { error?: string }).error && (
            <p style={{ fontSize: 12, color: '#6B7280', marginTop: 8, fontFamily: 'monospace' }}>
              {(check as unknown as { error?: string }).error}
            </p>
          )}
        </div>
      )}

      {!effectiveResult && check?.status !== 'running' && check?.status !== 'failed' && (
        <div className="inv-empty">
          <div className="empty-icon">📋</div>
          <h3>Nessuna analisi disponibile</h3>
          <p>La PMI non ha ancora avviato un Compliance Check per questo sistema.</p>
        </div>
      )}
    </div>
  );
}
