import type { ComplianceResult } from '@/lib/types';

function fmtEur(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (n >= 1_000)     return `€${(n / 1_000).toFixed(0)}K`;
  return `€${n.toLocaleString('it-IT')}`;
}
function fmtEurFull(n: number): string {
  return `€${n.toLocaleString('it-IT')}`;
}
function fmtPct(n: number): string {
  return `${(n * 100).toFixed(0)}%`;
}

export function SanctionOverview({ result, compact = false }: { result: ComplianceResult; compact?: boolean }) {
  const exposure = result.total_exposure_estimate;
  if (!exposure) return null;

  const gaps = result.compliance_gaps ?? [];
  const activeGaps = gaps.filter(g => g.status !== 'compliant' && (g.estimated_sanction_max ?? 0) > 0);
  const totalMax = exposure.max;
  const totalMin = exposure.min;

  const severityColor  = totalMax === 0 ? '#22C55E' : totalMax > 1_000_000 ? '#EF4444' : totalMax > 200_000 ? '#F97316' : '#EAB308';
  const severityPct    = totalMax === 0 ? 100 : Math.min(98, Math.max(8, (totalMax / 15_000_000) * 100));

  if (totalMax === 0) {
    return (
      <div className="so-wrap so-compliant">
        <div className="so-compliant-inner">
          <div className="so-compliant-icon">✓</div>
          <div>
            <div className="so-compliant-title">Nessuna esposizione sanzionatoria stimata</div>
            <div className="so-compliant-sub">Il sistema risulta conforme agli articoli applicabili dell&apos;AI Act</div>
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

      {!compact && activeGaps.length > 0 && (
        <div className="so-bars">
          <div className="so-bars-title">Dettaglio per articolo violato</div>
          {activeGaps.map(g => {
            const pct    = totalMax > 0 ? Math.max(6, ((g.estimated_sanction_max ?? 0) / totalMax) * 100) : 0;
            const ti     = g.tier_info;
            const m      = exposure.methodology;
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
                        ? 'Art. 99(3) AI Act — massimale di legge: €35M o 7% fatturato globale annuo'
                        : ti.tier_label.includes('requisiti')
                          ? 'Art. 99(4) AI Act — massimale di legge: €15M o 3% fatturato globale annuo'
                          : 'Art. 99(5) AI Act — massimale di legge: €7,5M o 1% fatturato globale annuo'}
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

      {!compact && exposure.methodology && (
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
