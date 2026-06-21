'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { ComplianceResult } from '@/lib/types';

// ── Article sidebar ───────────────────────────────────────────────────────────

function parseArticleNum(article: string): number | null {
  const m = article.match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

function formatArticleText(text: string): React.ReactNode {
  return text.split(/\n\n+/).map((para, i) => (
    <p key={i} style={{ margin: '0 0 1.1em 0', lineHeight: 1.8, color: 'var(--text2)', fontSize: 13 }}>
      {para.split('\n').map((line, j, arr) => (
        <span key={j}>{line}{j < arr.length - 1 && <br />}</span>
      ))}
    </p>
  ));
}

function ArticleSidebar({ articleNum, onClose }: { articleNum: number; onClose: () => void }) {
  const [text, setText]       = useState('');
  const [title, setTitle]     = useState('');
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    setLoading(true); setText(''); setTitle('');
    api.articles.get(articleNum)
      .then((d: { text: string; article_title: string }) => { setText(d.text); setTitle(d.article_title); })
      .catch(() => setText(''))
      .finally(() => setLoading(false));
    return () => cancelAnimationFrame(raf);
  }, [articleNum]);

  function handleClose() { setVisible(false); setTimeout(onClose, 280); }

  return (
    <>
      <div onClick={handleClose} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.45)', opacity: visible ? 1 : 0, transition: 'opacity 0.28s ease', cursor: 'pointer' }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 460, background: 'var(--surface)', borderLeft: '1px solid var(--border)', zIndex: 401, display: 'flex', flexDirection: 'column', transform: visible ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)', boxShadow: '-12px 0 48px rgba(0,0,0,0.6)' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.4, color: 'var(--green)', marginBottom: 6 }}>Reg. UE 2024/1689 — Testo ufficiale</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', letterSpacing: -0.4, lineHeight: 1.2 }}>
                Art. {articleNum}
                {title && <span style={{ color: 'var(--text2)', fontWeight: 600, fontSize: 15 }}> — {title}</span>}
              </div>
            </div>
            <button onClick={handleClose} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', fontSize: 16, cursor: 'pointer', padding: '5px 9px', borderRadius: 7, lineHeight: 1, transition: 'all .15s', flexShrink: 0 }}>✕</button>
          </div>
          <div style={{ marginTop: 12 }}>
            <a href={`/dashboard/ai-act?article=${articleNum}`} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--green)', textDecoration: 'none', padding: '5px 12px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 7 }}>
              ⚖️ Apri nel Testo AI Act →
            </a>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 40px' }}>
          {loading && <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 48 }}><div className="spin" style={{ width: 32, height: 32, borderWidth: 2, margin: 0 }} /></div>}
          {!loading && !text && <div style={{ color: 'var(--muted)', fontStyle: 'italic', fontSize: 13 }}>Testo non disponibile per questo articolo.</div>}
          {!loading && text && formatArticleText(text)}
        </div>
      </div>
    </>
  );
}

function fmtEur(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (n >= 1_000)     return `€${(n / 1_000).toFixed(0)}K`;
  return `€${n.toLocaleString('it-IT')}`;
}
function fmtEurFull(n: number): string { return `€${n.toLocaleString('it-IT')}`; }
function fmtPct(n: number): string { return `${(n * 100).toFixed(0)}%`; }

// ── Article summaries (EU 2024/1689) ─────────────────────────────────────────

const ARTICLE_SUMMARY: Record<string, { title: string; summary: string }> = {
  'Art. 4':  { title: 'Alfabetizzazione in materia di IA', summary: 'I fornitori e i deployer adottano misure adeguate per garantire un livello sufficiente di alfabetizzazione AI nel loro personale, tenendo conto delle competenze tecniche, dell\'esperienza e del contesto d\'uso del sistema.' },
  'Art. 9':  { title: 'Sistema di gestione dei rischi', summary: 'Deve essere istituito, documentato e mantenuto un sistema iterativo di gestione dei rischi per l\'intero ciclo di vita del sistema, comprendente identificazione, stima, valutazione e misure di mitigazione dei rischi noti e prevedibili.' },
  'Art. 10': { title: 'Dati e governance dei dati', summary: 'I dataset di addestramento, validazione e prova devono essere pertinenti, rappresentativi, privi di errori e completi ai fini dell\'uso previsto, con proprietà statistiche appropriate rispetto alle persone su cui il sistema opererà.' },
  'Art. 11': { title: 'Documentazione tecnica', summary: 'La documentazione tecnica deve essere redatta prima dell\'immissione sul mercato e mantenuta aggiornata, in modo da dimostrare la conformità ai requisiti e consentire la valutazione da parte delle autorità competenti.' },
  'Art. 12': { title: 'Tenuta dei registri', summary: 'I sistemi ad alto rischio devono essere in grado di registrare automaticamente gli eventi durante il funzionamento, proporzionatamente all\'uso previsto, per consentire verifiche in situazioni critiche.' },
  'Art. 13': { title: 'Trasparenza verso i deployer', summary: 'I sistemi ad alto rischio sono progettati per garantire trasparenza sufficiente a permettere ai deployer di interpretare e usare correttamente l\'output, corredati di istruzioni complete e comprensibili.' },
  'Art. 14': { title: 'Supervisione umana', summary: 'I sistemi ad alto rischio devono essere dotati di misure di interfaccia uomo-macchina che consentano supervisione efficace: comprensione dei limiti, monitoraggio, intervento e possibilità di non seguire le decisioni del sistema.' },
  'Art. 15': { title: 'Accuratezza, robustezza e cybersicurezza', summary: 'I sistemi ad alto rischio devono conseguire e mantenere livelli adeguati di accuratezza e robustezza, inclusa la resilienza contro tentativi non autorizzati di alterarne i risultati o le prestazioni.' },
  'Art. 22': { title: 'Valutazione d\'impatto sui diritti fondamentali', summary: 'I deployer pubblici (o privati che forniscono servizi pubblici) effettuano una valutazione d\'impatto sui diritti fondamentali prima di mettere in servizio il sistema, notificandone i risultati all\'autorità competente.' },
  'Art. 50': { title: 'Obblighi di trasparenza', summary: 'I fornitori garantiscono che i sistemi che interagiscono con persone fisiche informino gli utenti che stanno interagendo con un\'IA. I contenuti sintetici rilevanti devono essere contrassegnati come generati artificialmente.' },
};

// ── Component ─────────────────────────────────────────────────────────────────

export function SanctionOverview({ result, compact = false }: { result: ComplianceResult; compact?: boolean }) {
  const [articleSidebar, setArticleSidebar] = useState<number | null>(null);
  const exposure = result.total_exposure_estimate;
  if (!exposure) return null;

  const gaps = result.compliance_gaps ?? [];
  const activeGaps = gaps.filter(g => g.status !== 'compliant' && (g.estimated_sanction_max ?? 0) > 0);
  const totalMax = exposure.max;
  const totalMin = exposure.min;

  const severityColor = totalMax === 0 ? '#22C55E' : totalMax > 1_000_000 ? '#EF4444' : totalMax > 200_000 ? '#F97316' : '#F59E0B';
  const severityPct   = totalMax === 0 ? 100 : Math.min(98, Math.max(8, (totalMax / 15_000_000) * 100));

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
          {exposure.turnover_source === 'exact' ? '✅ Fatturato esatto' : exposure.turnover_source === 'declared' ? '📊 Range dichiarato (mediana)' : '📐 Fatturato stimato'}
          <span className="so-source-val">{fmtEur(exposure.turnover_used)}</span>
        </div>
      </div>

      {/* ── Exposure block ── */}
      <div className="so-current-block">
        <div className="so-col-label">Esposizione stimata</div>
        <div className="so-big-num" style={{ color: severityColor }}>{fmtEur(totalMax)}</div>
        <div className="so-big-sub">da {fmtEur(totalMin)}</div>
        <div className="so-severity-bar">
          <div className="so-severity-fill" style={{ width: `${severityPct}%`, background: severityColor }} />
        </div>
        <div className="so-severity-label" style={{ color: severityColor }}>
          {totalMax > 1_000_000 ? '⬆ Rischio alto' : totalMax > 200_000 ? '▲ Rischio medio' : '▼ Rischio basso'}
        </div>
      </div>

      {/* ── Article cards ── */}
      {!compact && activeGaps.length > 0 && (
        <div className="so-bars">
          <div className="so-bars-title">Dettaglio per articolo violato</div>
          {activeGaps.map(g => {
            const pct  = totalMax > 0 ? Math.max(4, ((g.estimated_sanction_max ?? 0) / totalMax) * 100) : 0;
            const ti   = g.tier_info;
            const m    = exposure.methodology;
            const info = ARTICLE_SUMMARY[g.article];
            const artSlug = encodeURIComponent(g.article);

            return (
              <div key={g.gap_id} className="so-bar-row">

                {/* ── Headline ── */}
                <div className="so-bar-headline">
                  <div className="so-bar-headline-left">
                    <span className="so-bar-art">{g.article}</span>
                    {info && <span className="so-bar-art-title">{info.title}</span>}
                  </div>
                  <div className="so-bar-headline-right">
                    <span className="so-bar-range-min">{fmtEur(g.estimated_sanction_min ?? 0)}</span>
                    <span className="so-bar-range-sep"> – </span>
                    <span className="so-bar-amt">{fmtEur(g.estimated_sanction_max ?? 0)}</span>
                  </div>
                </div>

                {/* ── Bar ── */}
                <div className="so-bar-track">
                  <div className="so-bar-seg-current" style={{ width: `${pct}%`, background: severityColor }} />
                </div>

                {/* ── Two-column body ── */}
                <div className="so-bar-body">

                  {/* Left: summary + CTA */}
                  <div className="so-bar-left">
                    <p className="so-bar-summary">
                      {info?.summary ?? 'Per questo articolo si applicano i requisiti generali del Regolamento UE 2024/1689 sull\'Intelligenza Artificiale.'}
                    </p>
                    <button
                      onClick={() => { const n = parseArticleNum(g.article); if (n) setArticleSidebar(n); }}
                      className="so-bar-read-cta"
                    >
                      <span>📖</span>
                      <span>Leggi {g.article} completo</span>
                      <span style={{ opacity: 0.5 }}>→</span>
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="so-bar-col-divider" />

                  {/* Right: formula */}
                  {ti && m && (
                    <div className="so-bar-right">
                      <div className="so-formula-tier">{ti.tier_label}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginBottom: 8, lineHeight: 1.5 }}>
                        {ti.tier_label.includes('pratiche vietate')
                          ? 'Art. 99(3) — massimale: €35M o 7% fatturato'
                          : ti.tier_label.includes('requisiti')
                            ? 'Art. 99(4) — massimale: €15M o 3% fatturato'
                            : 'Art. 99(5) — massimale: €7,5M o 1% fatturato'}
                      </div>
                      <div className="so-formula-steps">
                        <span><span className="so-fk">Fatturato × {fmtPct(ti.tier_pct)}</span><span className="so-fv"> = {fmtEurFull(ti.theoretical_pct_amount)}</span></span>
                        <span className="so-farrow">→</span>
                        <span><span className="so-fk">min({fmtEur(ti.tier_cap)}, {fmtEurFull(ti.theoretical_pct_amount)})</span><span className="so-fv"> = {fmtEurFull(ti.theoretical_max)}</span></span>
                        {m.is_sme && (<>
                          <span className="so-farrow">→</span>
                          <span><span className="so-fk">PMI ×{fmtPct(m.sme_reduction)}</span><span className="so-fv"> = {fmtEurFull(g.estimated_sanction_max ?? 0)}</span></span>
                        </>)}
                        <span className="so-farrow">→</span>
                        <span><span className="so-fk">min ×{fmtPct(m.min_factor)}</span><span className="so-fv"> = {fmtEurFull(g.estimated_sanction_min ?? 0)}</span></span>
                      </div>
                      {m.is_sme && (
                        <div className="so-formula-note">
                          <strong>Riduzione PMI (Art. 100):</strong> stima prudenziale del {fmtPct(m.sme_reduction)} applicata al massimale — la norma non fissa una percentuale esatta.
                        </div>
                      )}
                      <div className="so-formula-note">
                        <strong>Range min:</strong> l&apos;importo effettivo è determinato dall&apos;Autorità di vigilanza in base a gravità, durata, intenzionalità e cooperazione. Il {fmtPct(m.min_factor)} del massimale è la nostra stima conservativa.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Methodology ── */}
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
      {articleSidebar !== null && (
        <ArticleSidebar articleNum={articleSidebar} onClose={() => setArticleSidebar(null)}/>
      )}
    </div>
  );
}
