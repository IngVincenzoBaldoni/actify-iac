'use client';

import { Suspense } from 'react';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { ComplianceCheck, ComplianceGap } from '@/lib/types';

function fmtEur(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (n >= 1_000)     return `€${(n / 1_000).toFixed(0)}K`;
  return `€${n.toLocaleString('it-IT')}`;
}

const URGENCY_CLASS: Record<string, string> = {
  critical: 'urgency-critical', high: 'urgency-high',
  medium: 'urgency-medium', low: 'urgency-low',
};
const URGENCY_LABEL: Record<string, string> = {
  critical: '🔴 Critico', high: '🟠 Alto', medium: '🟡 Medio', low: '🟢 Basso',
};
const AUTO_LABELS: Record<string, string> = {
  document_generation: 'Genera Doc', policy_template: 'Policy Template',
  transparency_notice: 'Notice Trasparenza', risk_assessment: 'Risk Assessment',
  monitoring_plan: 'Piano Monitoraggio', conformity_declaration: 'Dichiarazione Conformità',
};

function SanctionOverview({ result }: { result: NonNullable<ComplianceCheck['result']> }) {
  const exposure = result.total_exposure_estimate;
  if (!exposure) return null;

  const gaps = result.compliance_gaps ?? [];
  const activeGaps = gaps.filter(g => g.status !== 'compliant' && (g.estimated_sanction_max ?? 0) > 0);
  const totalMax = exposure.max;
  const totalMin = exposure.min;

  // Compute post-remediation estimate: remove automatable gaps
  const automatableMax = activeGaps
    .filter(g => g.can_actify_automate)
    .reduce((s, g) => s + (g.estimated_sanction_max ?? 0), 0);
  const automatableMin = activeGaps
    .filter(g => g.can_actify_automate)
    .reduce((s, g) => s + (g.estimated_sanction_min ?? 0), 0);
  const remediatedMax = Math.max(0, totalMax - automatableMax);
  const remediatedMin = Math.max(0, totalMin - automatableMin);
  const savingsPct    = totalMax > 0 ? Math.round(((totalMax - remediatedMax) / totalMax) * 100) : 0;
  const hasRemediation = savingsPct > 0;

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
      {/* ── Header ── */}
      <div className="so-header">
        <div className="so-header-left">
          <span className="so-icon">⚖️</span>
          <div>
            <div className="so-title">Esposizione Sanzionatoria Stimata</div>
            <div className="so-subtitle">Art. 99 AI Act · Massimali di legge</div>
          </div>
        </div>
        <div className="so-source-chip">
          {exposure.turnover_source === 'declared' ? '📊 Fatturato dichiarato' : '📐 Fatturato stimato'}
          <span className="so-source-val">{fmtEur(exposure.turnover_used)}</span>
        </div>
      </div>

      {/* ── Before / After ── */}
      <div className="so-compare">
        <div className="so-col so-col-current">
          <div className="so-col-label">Situazione attuale</div>
          <div className="so-big-num" style={{ color: severityColor }}>{fmtEur(totalMax)}</div>
          <div className="so-big-sub">da {fmtEur(totalMin)}</div>
          <div className="so-severity-bar">
            <div className="so-severity-fill" style={{ width: `${severityPct}%`, background: severityColor }} />
          </div>
          <div className="so-severity-label">{totalMax > 1_000_000 ? 'Rischio alto' : totalMax > 200_000 ? 'Rischio medio' : 'Rischio basso'}</div>
        </div>

        <div className="so-arrow-col">
          <div className="so-arrow-line" />
          <div className="so-arrow-badge">Actify</div>
        </div>

        <div className={`so-col so-col-after ${hasRemediation ? '' : 'so-col-dim'}`}>
          <div className="so-col-label">Dopo remediazioni</div>
          <div className="so-big-num so-after-num">{fmtEur(remediatedMax)}</div>
          <div className="so-big-sub">da {fmtEur(remediatedMin)}</div>
          {hasRemediation && (
            <div className="so-savings-chip">-{savingsPct}% rischio</div>
          )}
          <div className="so-pro-lock">
            <span className="so-lock-icon">🔒</span>
            <span>Disponibile con <strong>Pro</strong></span>
            <a href="/dashboard/settings" className="so-upgrade-cta">Upgrade →</a>
          </div>
        </div>
      </div>

      {/* ── Gap breakdown bars ── */}
      {activeGaps.length > 0 && (
        <div className="so-bars">
          <div className="so-bars-title">Dettaglio per articolo violato</div>
          {activeGaps.map(g => {
            const pct = totalMax > 0 ? Math.max(6, ((g.estimated_sanction_max ?? 0) / totalMax) * 100) : 0;
            const remPct = g.can_actify_automate ? 0 : pct;
            return (
              <div key={g.gap_id} className="so-bar-row">
                <div className="so-bar-meta">
                  <span className="so-bar-art">{g.article}</span>
                  <span className="so-bar-req">{g.requirement}</span>
                  {g.can_actify_automate && <span className="so-bar-auto">⚡ automatizzabile</span>}
                </div>
                <div className="so-bar-track">
                  <div className="so-bar-seg-current" style={{ width: `${pct}%`, background: severityColor }} />
                  {g.can_actify_automate && (
                    <div className="so-bar-seg-after" style={{ width: `${remPct}%` }} />
                  )}
                </div>
                <span className="so-bar-amt">{fmtEur(g.estimated_sanction_max ?? 0)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Disclaimer ── */}
      <div className="so-disclaimer">{exposure.disclaimer}</div>
    </div>
  );
}

function SystemDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const systemId = searchParams.get('id') ?? '';
  const [system, setSystem] = useState<Record<string, unknown> | null>(null);
  const [check, setCheck] = useState<ComplianceCheck | null>(null);
  const [history, setHistory] = useState<ComplianceCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  const load = useCallback(async () => {
    if (!systemId) return;
    try {
      const [sysData, latestCheck, histData] = await Promise.allSettled([
        api.systems.get(systemId),
        api.compliance.getLatest(systemId),
        api.compliance.list(systemId),
      ]);
      if (sysData.status === 'fulfilled') setSystem(sysData.value);
      if (latestCheck.status === 'fulfilled') setCheck(latestCheck.value as unknown as ComplianceCheck);
      if (histData.status === 'fulfilled') setHistory(histData.value as unknown as ComplianceCheck[]);
    } finally {
      setLoading(false);
    }
  }, [systemId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (check?.status === 'running') {
      const t = setTimeout(load, 4000);
      return () => clearTimeout(t);
    }
  }, [check, load]);

  async function handleTrigger() {
    setTriggering(true);
    try {
      await api.compliance.trigger(systemId);
      setCheck(prev => prev ? { ...prev, status: 'running' } : null);
      setTimeout(load, 4000);
    } catch (err: unknown) {
      alert((err as { message?: string }).message ?? 'Errore');
    } finally {
      setTriggering(false);
    }
  }

  if (!systemId) return <div className="inv-page"><p>ID sistema mancante.</p></div>;
  if (loading) return <div className="db-loading"><div className="spin"></div></div>;
  if (!system) return <div className="inv-page"><p>Sistema non trovato.</p></div>;

  const result = check?.result;
  const gaps = result?.compliance_gaps ?? [];
  const criticalGaps = gaps.filter(g => g.urgency === 'critical' && g.status !== 'compliant');
  const score = result?.score;

  return (
    <div className="inv-page">
      <div className="inv-header">
        <div>
          <button className="btn-back-link" onClick={() => router.push('/dashboard/inventory')}>
            ← AI Inventory
          </button>
          <h1 className="inv-title">{system.tool_name as string}</h1>
          <p className="inv-sub">{system.vendor as string} · {system.category as string} · {system.role as string}</p>
        </div>
        <button className="sys-check-btn lg"
          disabled={check?.status === 'running' || triggering}
          onClick={handleTrigger}>
          {check?.status === 'running' || triggering ? '⟳ Analisi in corso…' : '▶ Nuovo Compliance Check'}
        </button>
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

      {result && (
        <>
          <SanctionOverview result={result} />

          <div className={`risk-banner risk-${result.risk_classification}`}>
            <div className="risk-label">Classificazione Rischio</div>
            <div className="risk-value">{result.risk_classification.toUpperCase()}</div>
            <div className="risk-summary">{result.executive_summary}</div>
          </div>

          {score && (
            <div className="score-grid">
              {Object.entries(score).map(([k, v]) => (
                <div key={k} className="score-card">
                  <div className="score-num" style={{ color: v >= 7 ? '#22C55E' : v >= 4 ? '#EAB308' : '#EF4444' }}>{v}/10</div>
                  <div className="score-label">{k.charAt(0).toUpperCase() + k.slice(1)}</div>
                </div>
              ))}
            </div>
          )}

          <div className="check-stats">
            <div className={`stat-pill ${criticalGaps.length > 0 ? 'pill-red' : 'pill-green'}`}>
              {result.compliance_summary.non_compliant_count} gap
            </div>
            {result.compliance_summary.most_urgent_deadline && (
              <div className="stat-pill pill-orange">
                Scadenza: {result.compliance_summary.most_urgent_deadline}
              </div>
            )}
            <div className="stat-pill pill-dim">
              {result.compliance_summary.compliant_count} conformi
            </div>
          </div>

          {result.priority_actions?.length > 0 && (
            <div className="fcard">
              <h3>Azioni Prioritarie</h3>
              {result.priority_actions.map((a, i) => (
                <div key={i} className={`action-row action-${a.priority}`}>
                  <span className="action-badge">{a.priority === 'immediate' ? '🚨 Immediato' : a.priority === 'short_term' ? '⚡ Breve termine' : '📋 Medio termine'}</span>
                  <strong>{a.action}</strong>
                  <span className="action-rationale">{a.rationale}</span>
                </div>
              ))}
            </div>
          )}

          <div className="fcard">
            <h3>Compliance Gaps ({gaps.length})</h3>
            {gaps.length === 0 ? (
              <p style={{ color: '#22C55E' }}>✓ Nessun gap rilevato. Il sistema risulta conforme.</p>
            ) : (
              gaps.map((gap: ComplianceGap) => (
                <div key={gap.gap_id} className={`gap-card ${gap.status === 'compliant' ? 'gap-ok' : ''}`}>
                  <div className="gap-head">
                    <span className="gap-article">{gap.article}</span>
                    <span className="gap-req">{gap.requirement}</span>
                    <span className={`urgency-badge ${URGENCY_CLASS[gap.urgency]}`}>
                      {URGENCY_LABEL[gap.urgency]}
                    </span>
                    {gap.status === 'compliant' && <span className="gap-status-ok">✓ Conforme</span>}
                    {gap.status === 'partial' && <span className="gap-status-partial">⚠ Parziale</span>}
                    {gap.status === 'missing' && <span className="gap-status-miss">✗ Mancante</span>}
                  </div>
                  <p className="gap-desc">{gap.description}</p>
                  {gap.status !== 'compliant' && (
                    <div className="gap-action">
                      <span className="gap-action-label">Cosa fare:</span> {gap.what_to_do}
                    </div>
                  )}
                  {gap.deadline && <div className="gap-deadline">📅 Scadenza: {gap.deadline}</div>}
                  {gap.can_actify_automate && gap.automation_type && (
                    <div className="auto-badge">
                      ⚡ Actify può automatizzarlo — {AUTO_LABELS[gap.automation_type] ?? gap.automation_type}
                      <span className="auto-cta">→ Upgrade a Pro</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {history.length > 1 && (
            <div className="fcard">
              <h3>Storico Check</h3>
              {history.slice(0, 5).map((h, i) => (
                <div key={h.check_id} className="hist-row">
                  <span className="hist-date">{new Date(h.created_at).toLocaleString('it-IT')}</span>
                  <span className={`hist-status ${h.status === 'completed' ? 'hs-ok' : 'hs-fail'}`}>{h.status}</span>
                  {i === 0 && <span className="hist-latest">Più recente</span>}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!result && check?.status === 'failed' && (
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

      {!result && check?.status !== 'running' && check?.status !== 'failed' && (
        <div className="inv-empty">
          <div className="empty-icon">📋</div>
          <h3>Nessun check eseguito</h3>
          <p>Avvia un Compliance Check per analizzare questo sistema rispetto all'AI Act.</p>
        </div>
      )}
    </div>
  );
}

export default function SystemDetailPage() {
  return (
    <Suspense fallback={<div className="db-loading"><div className="spin"></div></div>}>
      <SystemDetailContent />
    </Suspense>
  );
}
