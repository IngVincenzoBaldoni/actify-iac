'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { LiteracySystemSummary } from '@/lib/types';

// ─── Config maps ──────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  not_started: { label: 'Non avviato',  color: '#DC2626', bg: 'rgba(220,38,38,0.12)',  dot: '#DC2626' },
  in_progress: { label: 'In corso',     color: '#CA8A04', bg: 'rgba(202,138,4,0.12)',  dot: '#CA8A04' },
  compliant:   { label: 'Conforme',     color: '#16A34A', bg: 'rgba(22,163,74,0.12)',  dot: '#22C55E' },
};

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  provider: { label: 'Provider', color: '#818CF8', bg: 'rgba(99,102,241,0.15)' },
  deployer: { label: 'Deployer', color: '#38BDF8', bg: 'rgba(14,165,233,0.15)' },
};

const RISK_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  prohibited: { label: 'Vietato',         color: '#F87171', bg: 'rgba(220,38,38,0.15)',  border: '#DC2626' },
  high:       { label: 'Alto Rischio',    color: '#FB923C', bg: 'rgba(234,88,12,0.15)',  border: '#EA580C' },
  limited:    { label: 'Rischio Limitato',color: '#FCD34D', bg: 'rgba(202,138,4,0.15)',  border: '#CA8A04' },
  minimal:    { label: 'Rischio Minimo',  color: '#4ADE80', bg: 'rgba(22,163,74,0.15)', border: '#16A34A' },
};

const ELEVATED: React.CSSProperties = {
  background: 'linear-gradient(145deg, rgba(255,255,255,.055) 0%, rgba(255,255,255,.018) 100%)',
  border: '1px solid rgba(255,255,255,.09)',
  borderTop: '1.5px solid rgba(255,255,255,.22)',
  boxShadow: '0 0 0 1px rgba(255,255,255,.03) inset, 0 6px 24px rgba(0,0,0,.42)',
};

// ─── Main component ───────────────────────────────────────────────────────────

function LiteracyContent() {
  const router = useRouter();
  const [systems, setSystems] = useState<LiteracySystemSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTrialUser, setIsTrialUser] = useState(false);
  const [generatingConsolidated, setGeneratingConsolidated] = useState(false);
  const [consolidatedError, setConsolidatedError] = useState<string | null>(null);

  useEffect(() => {
    Promise.allSettled([
      api.literacy.listSystems(),
      api.company.get(),
    ]).then(([litRes, companyRes]) => {
      if (litRes.status === 'fulfilled') setSystems((litRes.value as { systems: LiteracySystemSummary[] }).systems);
      if (companyRes.status === 'fulfilled') {
        const tier = (companyRes.value as Record<string, unknown>).subscription_tier as string ?? '';
        setIsTrialUser(!['base', 'premium', 'enterprise'].includes(tier));
      }
    }).finally(() => setLoading(false));
  }, []);

  const compliant   = systems.filter(s => s.literacy_status === 'compliant').length;
  const inProgress  = systems.filter(s => s.literacy_status === 'in_progress').length;
  const notStarted  = systems.filter(s => s.literacy_status === 'not_started').length;
  const allCompliant = systems.length > 0 && systems.every(s => s.literacy_status === 'compliant');

  async function handleGenerateConsolidated() {
    setGeneratingConsolidated(true);
    setConsolidatedError(null);
    try {
      await api.literacy.generateConsolidatedReport();
      router.push('/dashboard/documents');
    } catch (e) {
      setConsolidatedError((e as Error).message ?? 'Errore durante la generazione');
    } finally {
      setGeneratingConsolidated(false);
    }
  }

  if (!loading && isTrialUser) {
    return (
      <div className="inv-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', maxWidth: 480, padding: '48px 32px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎓</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text1)', marginBottom: 8 }}>AI Literacy Tracker</h2>
          <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
            Il tracciamento della formazione AI (obbligo Art. 4 EU AI Act) e la gestione dei profili di competenza sono disponibili dal piano <strong style={{ color: 'var(--text1)' }}>Starter</strong> in su.
          </p>
          <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.6, marginBottom: 28 }}>
            Con il piano Trial hai già identificato i tuoi gap con la Gap Analysis. Passa a Starter per iniziare a chiuderli con la formazione certificata.
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
      <div className="inv-header">
        <div>
          <h1 className="inv-title">AI Literacy Tracker</h1>
          <p className="inv-sub">Gestisci la formazione AI per sistema — obbligo Art. 4 EU AI Act</p>
        </div>
      </div>

      {/* ── Unified Art. 4 board ──────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(145deg, rgba(34,197,94,.055) 0%, rgba(14,165,233,.025) 50%, rgba(99,102,241,.04) 100%)',
        border: '1px solid rgba(255,255,255,.09)',
        borderTop: '2px solid rgba(34,197,94,.45)',
        borderRadius: 18,
        boxShadow: '0 0 0 1px rgba(34,197,94,.04) inset, 0 8px 32px rgba(0,0,0,.45)',
        padding: '28px 32px',
        marginBottom: 28,
      }}>

        {/* Row 1 — header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, marginBottom: 24 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 13, flexShrink: 0,
            background: 'rgba(34,197,94,.1)', border: '1.5px solid rgba(34,197,94,.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
          }}>🎓</div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)', margin: 0, marginBottom: 8, letterSpacing: -0.3 }}>
              Obbligo Art. 4 — AI Literacy per ogni sistema AI
            </h2>
            <p style={{ fontSize: 13.5, color: 'var(--text2)', lineHeight: 1.7, margin: 0 }}>
              Il Reg. UE 2024/1689 richiede che il personale che usa o supervisiona sistemi AI disponga
              di un livello adeguato di competenze in base al proprio ruolo. Actify genera automaticamente
              i <strong>profili di utenza</strong> corretti (Provider vs Deployer) per ogni sistema censito
              nell&apos;AI Inventory e traccia le evidenze — certificazioni esterne o formazione interna.
              {' '}Quando le evidenze coprono <strong>almeno l&apos;80% delle persone</strong> in ogni profilo attivo,
              il sistema viene marcato automaticamente come <strong>Conforme</strong> e diventa possibile
              generare il <strong>Report Art. 4</strong> da salvare nel Document Vault come prova ispettiva.
            </p>
          </div>
        </div>

        {/* Row 2 — 3 feature cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { icon: '⚖️', label: 'Riduce le sanzioni',  desc: "Evidenze documentate dimostrano diligenza Art. 4 e riducono l'importo effettivo della multa." },
            { icon: '🛡️', label: 'Prova ispettiva',     desc: 'Report PDF da presentare in sede di audit o ispezione da parte delle autorità nazionali.' },
            { icon: '👥', label: 'Profili automatici',  desc: 'Actify genera i profili Provider/Deployer giusti per ogni sistema — nessuna configurazione manuale.' },
          ].map(c => (
            <div key={c.label} style={{
              background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.09)',
              borderRadius: 12, padding: '18px 20px',
            }}>
              <div style={{ fontSize: 24, marginBottom: 10 }}>{c.icon}</div>
              <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text)', marginBottom: 6 }}>{c.label}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>{c.desc}</div>
            </div>
          ))}
        </div>

        {/* Row 3 — KPI stats (only when data loaded) */}
        {!loading && systems.length > 0 && (
          <>
            <div style={{ height: 1, background: 'rgba(255,255,255,.07)', marginBottom: 22 }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: allCompliant ? 22 : 0 }}>
              {[
                { label: 'Conformi',    value: compliant,  color: '#16A34A', glow: 'rgba(22,163,74,.2)' },
                { label: 'In corso',    value: inProgress, color: '#CA8A04', glow: 'rgba(202,138,4,.2)' },
                { label: 'Non avviati', value: notStarted, color: '#DC2626', glow: 'rgba(220,38,38,.2)' },
              ].map(s => (
                <div key={s.label} style={{
                  background: 'rgba(255,255,255,.035)', border: '1px solid rgba(255,255,255,.08)',
                  borderRadius: 12, padding: '18px 22px', textAlign: 'center',
                  boxShadow: s.value > 0 ? `0 0 20px ${s.glow}` : 'none',
                }}>
                  <div style={{ fontSize: 36, fontWeight: 900, color: s.color, lineHeight: 1, marginBottom: 6 }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Row 4 — Consolidated CTA (only when all compliant) */}
        {!loading && allCompliant && (
          <>
            <div style={{ height: 1, background: 'rgba(34,197,94,.2)', marginBottom: 22 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 32, lineHeight: 1, flexShrink: 0 }}>🏆</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 900, fontSize: 15, color: '#4ADE80', marginBottom: 4 }}>
                  Tutti i {systems.length} sistemi AI sono conformi all&apos;Art. 4
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text2)', lineHeight: 1.6 }}>
                  Genera un <strong>Attestato Consolidato</strong> che li copre tutti in un unico PDF — prova ispettiva globale nel Document Vault.
                </div>
              </div>
              <button
                onClick={handleGenerateConsolidated}
                disabled={generatingConsolidated}
                style={{
                  flexShrink: 0,
                  background: generatingConsolidated ? 'rgba(22,163,74,.4)' : '#16A34A',
                  color: '#fff', border: 'none', borderRadius: 11,
                  padding: '13px 26px', fontSize: 14, fontWeight: 800,
                  cursor: generatingConsolidated ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 16px rgba(22,163,74,.4)',
                  whiteSpace: 'nowrap',
                }}>
                {generatingConsolidated ? 'Generazione…' : '📄 Genera Attestato Consolidato →'}
              </button>
            </div>
            {consolidatedError && (
              <div style={{ marginTop: 12, padding: '9px 14px', background: 'rgba(220,38,38,.12)', border: '1px solid rgba(220,38,38,.3)', borderRadius: 8, fontSize: 12, color: '#F87171' }}>
                ✗ {consolidatedError}
              </div>
            )}
          </>
        )}

      </div>

      {loading && <div className="db-loading"><div className="spin"></div></div>}

      {!loading && systems.length === 0 && (
        <div className="inv-empty">
          <div className="inv-empty-icon">🎓</div>
          <div className="inv-empty-title">Nessun sistema AI censito</div>
          <div className="inv-empty-sub">Aggiungi sistemi AI nell&apos;AI Inventory per iniziare a tracciare la formazione Art. 4.</div>
          <button className="btn-submit" onClick={() => router.push('/dashboard/inventory')}>Vai all&apos;AI Inventory →</button>
        </div>
      )}

      {!loading && systems.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {systems.map(sys => {
            const cfg    = STATUS_CONFIG[sys.literacy_status];
            const role   = ROLE_CONFIG[sys.system_role] ?? ROLE_CONFIG.deployer;
            const risk   = RISK_CONFIG[sys.risk_classification] ?? RISK_CONFIG.minimal;
            return (
              <div
                key={sys.system_id}
                style={{
                  ...ELEVATED,
                  borderRadius: 12,
                  padding: '18px 22px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 18,
                  borderLeft: `3px solid ${risk.border}`,
                }}
              >
                {/* Status dot */}
                <div style={{ width: 11, height: 11, borderRadius: '50%', flexShrink: 0, background: cfg.dot, boxShadow: `0 0 6px ${cfg.dot}` }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Name + role + risk badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>{sys.tool_name}</span>
                    <span style={{
                      fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                      background: role.bg, color: role.color,
                      border: `1px solid ${role.color}33`,
                    }}>
                      {role.label}
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
                      background: risk.bg, color: risk.color,
                      border: `1px solid ${risk.color}44`,
                      letterSpacing: 0.2,
                    }}>
                      {risk.label}
                    </span>
                  </div>
                  {/* Vendor / category / profiles */}
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                    {sys.vendor && <span>{sys.vendor} · </span>}
                    {sys.category && <span>{sys.category} · </span>}
                    {sys.profiles_total > 0
                      ? <span>{sys.profiles_covered}/{sys.profiles_total} profili coperti</span>
                      : <span>Profili non ancora inizializzati</span>}
                  </div>
                </div>

                {/* Status badge */}
                <div style={{
                  flexShrink: 0, padding: '5px 14px', borderRadius: 20,
                  background: cfg.bg, color: cfg.color,
                  fontSize: 12, fontWeight: 700,
                  border: `1px solid ${cfg.color}33`,
                }}>
                  {cfg.label}
                </div>

                <button
                  onClick={() => router.push(`/dashboard/literacy/detail?id=${sys.system_id}`)}
                  style={{
                    flexShrink: 0, background: 'var(--green)', color: '#fff',
                    border: 'none', borderRadius: 8, padding: '8px 18px',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,.3)',
                  }}>
                  Gestisci →
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function LiteracyPage() {
  return (
    <Suspense fallback={<div className="db-loading"><div className="spin"></div></div>}>
      <LiteracyContent />
    </Suspense>
  );
}
