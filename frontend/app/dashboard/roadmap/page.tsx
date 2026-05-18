'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { ComplianceGap, ComplianceCheck } from '@/lib/types';

// ─── Local types ────────────────────────────────────────────────────────────
interface AISystem {
  system_id: string;
  tool_name: string;
  vendor: string;
  compliance_status: 'unchecked' | 'checking' | 'gap_found' | 'compliant';
}

interface Milestone {
  id: string;
  date: Date;
  label: string;
  sublabel: string;
  badge: string;
  description: string;
  isMain?: boolean;
  isAnnex?: boolean;
}

type RoadmapRow =
  | { kind: 'gap';       system: AISystem; gap: ComplianceGap }
  | { kind: 'ok';        system: AISystem }
  | { kind: 'unchecked'; system: AISystem }
  | { kind: 'na' };

// ─── AI Act milestones ───────────────────────────────────────────────────────
const MILESTONES: Milestone[] = [
  {
    id: 'feb2025',
    date: new Date('2025-02-02'),
    label: 'Febbraio 2025',
    sublabel: 'Pratiche vietate',
    badge: 'Art. 5',
    description: 'Divieto di pratiche AI inaccettabili: manipolazione subliminale, sfruttamento vulnerabilità, social scoring, riconoscimento biometrico in spazi pubblici.',
  },
  {
    id: 'aug2025',
    date: new Date('2025-08-02'),
    label: 'Agosto 2025',
    sublabel: 'GPAI & Trasparenza',
    badge: 'Art. 50-56',
    description: 'Obblighi di trasparenza per sistemi a interazione diretta con utenti e modelli AI a uso generale (GPAI).',
  },
  {
    id: 'aug2026',
    date: new Date('2026-08-02'),
    label: 'Agosto 2026',
    sublabel: 'Sistemi ad Alto Rischio',
    badge: 'Art. 8-27',
    description: 'Requisiti completi per i sistemi AI ad alto rischio: documentazione tecnica, gestione rischi, supervisione umana, governance dati, trasparenza, registrazione nel DB UE.',
    isMain: true,
  },
  {
    id: 'aug2027',
    date: new Date('2027-08-02'),
    label: 'Agosto 2027',
    sublabel: 'Annex I — Prodotti',
    badge: 'Art. 6',
    description: 'Sistemi AI come componenti di sicurezza in prodotti coperti da legislazione di armonizzazione UE (macchinari, dispositivi medici, aviazione, automotive).',
    isAnnex: true,
  },
];

const AUTO_LABEL: Record<string, string> = {
  document_generation:    'Genera Doc',
  policy_template:        'Genera Policy',
  transparency_notice:    'Genera Notice',
  risk_assessment:        'Genera Assessment',
  monitoring_plan:        'Genera Piano',
  conformity_declaration: 'Genera Dichiarazione',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getMilestoneId(article: string): string {
  const num = parseInt(article.match(/\d+/)?.[0] ?? '0');
  if (num === 5) return 'feb2025';
  if (num >= 50) return 'aug2025';
  return 'aug2026';
}

function daysFromNow(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000);
}

function truncate(s: string, max = 110): string {
  return s.length > max ? s.slice(0, max).trimEnd() + '…' : s;
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function RoadmapPage() {
  const [systems,  setSystems]  = useState<AISystem[]>([]);
  const [checks,   setChecks]   = useState<Record<string, ComplianceCheck>>({});
  const [loading,  setLoading]  = useState(true);
  const [loadStep, setLoadStep] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      setLoadStep('Caricamento sistemi AI…');
      const sysList = (await api.systems.list()) as AISystem[];
      setSystems(sysList);

      const analysed = sysList.filter(
        s => s.compliance_status === 'gap_found' || s.compliance_status === 'compliant',
      );
      const map: Record<string, ComplianceCheck> = {};
      for (let i = 0; i < analysed.length; i++) {
        setLoadStep(`Caricamento analisi ${i + 1} / ${analysed.length}…`);
        try {
          const c = (await api.compliance.getLatest(analysed[i].system_id)) as unknown as ComplianceCheck;
          if (c?.result) map[analysed[i].system_id] = c;
        } catch { /* skip failed check */ }
      }
      setChecks(map);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Build rows for a milestone
  function getRows(m: Milestone): RoadmapRow[] {
    if (m.isAnnex) return [{ kind: 'na' }];
    return systems.flatMap<RoadmapRow>(sys => {
      const check = checks[sys.system_id];
      if (!check?.result) return [{ kind: 'unchecked', system: sys }];
      const gaps = check.result.compliance_gaps.filter(
        g => g.status !== 'compliant' && getMilestoneId(g.article) === m.id,
      );
      if (gaps.length === 0) return [{ kind: 'ok', system: sys }];
      return gaps.map(gap => ({ kind: 'gap' as const, system: sys, gap }));
    });
  }

  const now      = new Date();
  const mainMs   = MILESTONES.find(m => m.isMain)!;
  const daysMain = daysFromNow(mainMs.date);
  const hasChecks = Object.keys(checks).length > 0;

  const totalGapsMain = Object.values(checks).reduce((acc, c) => {
    if (!c.result) return acc;
    return acc + c.result.compliance_gaps.filter(
      g => g.status !== 'compliant' && getMilestoneId(g.article) === 'aug2026',
    ).length;
  }, 0);

  if (loading) {
    return (
      <div className="rd-loading">
        <div className="spin" />
        <p className="rd-load-step">{loadStep}</p>
      </div>
    );
  }

  const noSystems = systems.length === 0;

  return (
    <div className="rd-page">

      {/* ── Header ── */}
      <div className="rd-header">
        <div className="rd-header-body">
          <div className="rd-tag">Compliance Roadmap</div>
          <h1 className="rd-title">La tua roadmap AI Act</h1>
          <p className="rd-sub">
            {noSystems
              ? "Aggiungi sistemi AI nell'Inventory per generare la roadmap."
              : !hasChecks
              ? 'Esegui un compliance check sui tuoi sistemi per sbloccare la roadmap.'
              : `${systems.length} sistem${systems.length !== 1 ? 'i' : 'a'} analizzat${systems.length !== 1 ? 'i' : 'o'} · ${
                  totalGapsMain > 0
                    ? `${totalGapsMain} gap aperti entro agosto 2026`
                    : 'nessun gap critico per agosto 2026 ✓'
                }`}
          </p>
        </div>

        {hasChecks && daysMain > 0 && (
          <div className={`rd-countdown ${daysMain <= 30 ? 'rd-crit' : daysMain <= 90 ? 'rd-warn' : 'rd-ok-c'}`}>
            <span className="rd-days">{daysMain}</span>
            <span className="rd-days-lbl">giorni alla<br />scadenza principale</span>
          </div>
        )}
        {hasChecks && daysMain <= 0 && (
          <div className="rd-countdown rd-expired">
            <span className="rd-days" style={{ fontSize: 28 }}>Scaduta</span>
            <span className="rd-days-lbl">agosto 2026 passata</span>
          </div>
        )}
      </div>

      {noSystems || !hasChecks ? (
        <div className="rd-empty">
          <div className="rd-empty-icon">⊙</div>
          <p>{noSystems ? 'Nessun sistema AI registrato.' : 'Nessun compliance check completato.'}</p>
          <a href="/dashboard/inventory" className="rd-goto-btn">
            {noSystems ? 'Aggiungi sistemi →' : "Vai all'AI Inventory →"}
          </a>
        </div>
      ) : (
        <>
          {/* ── Timeline bar ── */}
          <div className="rd-timeline">
            {MILESTONES.map((m, i) => {
              const past = m.date < now;
              return (
                <div
                  key={m.id}
                  className={`rd-node ${m.isMain ? 'node-main' : past ? 'node-past' : 'node-future'}`}
                >
                  {i > 0 && (
                    <div className={`rd-track ${MILESTONES[i - 1].date < now ? 'track-done' : ''}`} />
                  )}
                  <div className="rd-dot">
                    {past && !m.isMain && (
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                        <path d="M2 5.5l2.5 2.5L9 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    {m.isMain && <span className="rd-pulse" />}
                  </div>
                  <div className="rd-node-info">
                    <div className="rd-node-date">{m.label}</div>
                    <div className="rd-node-sub">{m.sublabel}</div>
                    {m.isMain && daysMain > 0 && (
                      <div className="rd-node-timer">⏱ {daysMain}g</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Milestone sections ── */}
          <div className="rd-sections">
            {MILESTONES.map(m => {
              const rows     = getRows(m);
              const gapCount = rows.filter(r => r.kind === 'gap').length;
              const past     = m.date < now;

              return (
                <div
                  key={m.id}
                  className={`rd-sect ${
                    m.isMain ? 'sect-main' : past ? 'sect-past' : 'sect-future'
                  }`}
                >
                  {/* Section header */}
                  <div className="rd-sect-hd">
                    <div className="rd-sect-hd-l">
                      <span className="rd-sect-badge">{m.badge}</span>
                      <div>
                        <div className="rd-sect-title">
                          {m.label}
                          {m.isMain  && <span className="pill-main">SCADENZA PRINCIPALE</span>}
                          {past && !m.isMain && <span className="pill-past">PASSATA</span>}
                        </div>
                        <div className="rd-sect-desc">
                          {m.sublabel} — {m.description}
                        </div>
                      </div>
                    </div>
                    {!m.isAnnex && (
                      <div className="rd-sect-stat">
                        {gapCount > 0
                          ? <span className="pill-gap">{gapCount} gap apert{gapCount !== 1 ? 'i' : 'o'}</span>
                          : <span className="pill-ok">✓ Nessun gap</span>}
                      </div>
                    )}
                  </div>

                  {/* Rows */}
                  <div className="rd-rows">
                    {rows.map((row, ri) => {
                      if (row.kind === 'na') return (
                        <div key="na" className="rd-row row-na">
                          <span className="rd-ri">○</span>
                          <span className="rd-rsys">—</span>
                          <span className="rd-rtxt dim">Nessun sistema safety-component Annex I rilevato — scadenza non applicabile</span>
                        </div>
                      );

                      if (row.kind === 'unchecked') return (
                        <div key={row.system.system_id + '_uc'} className="rd-row row-uc">
                          <span className="rd-ri">◌</span>
                          <span className="rd-rsys">{row.system.tool_name}</span>
                          <span className="rd-rtxt dim">Compliance check non ancora eseguito</span>
                          <a href="/dashboard/inventory" className="rd-btn ghost">Esegui check →</a>
                        </div>
                      );

                      if (row.kind === 'ok') return (
                        <div key={row.system.system_id + '_ok'} className="rd-row row-ok">
                          <span className="rd-ri ok">✓</span>
                          <span className="rd-rsys">{row.system.tool_name}</span>
                          <span className="rd-rvendor">{row.system.vendor}</span>
                          <span className="rd-rtxt">Tutti i requisiti soddisfatti per questa scadenza</span>
                        </div>
                      );

                      // gap
                      const { gap, system } = row;
                      const urg = gap.urgency;
                      return (
                        <div
                          key={`${system.system_id}-${gap.gap_id ?? ri}`}
                          className={`rd-row row-gap urg-${urg}`}
                        >
                          <span className="rd-ri">
                            {urg === 'critical' ? '🔴' : urg === 'high' ? '🟠' : '🟡'}
                          </span>
                          <span className="rd-rsys">{system.tool_name}</span>
                          <span className="rd-rart">{gap.article}</span>
                          <span className="rd-rtxt">
                            {truncate(gap.description || gap.requirement)}
                          </span>
                          {gap.can_actify_automate && gap.automation_type && (
                            <a
                              href={`/dashboard/systems/${system.system_id}`}
                              className="rd-btn"
                            >
                              {AUTO_LABEL[gap.automation_type] ?? 'Risolvi'} →
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
