'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { LiteracySystemSummary } from '@/lib/types';

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  not_started: { label: 'Non avviato',  color: '#DC2626', bg: 'rgba(220,38,38,0.08)',   dot: '#DC2626' },
  in_progress: { label: 'In corso',     color: '#CA8A04', bg: 'rgba(202,138,4,0.08)',   dot: '#CA8A04' },
  compliant:   { label: 'Conforme',     color: '#16A34A', bg: 'rgba(22,163,74,0.08)',   dot: '#22C55E' },
};

const ROLE_LABELS: Record<string, string> = { provider: 'Provider', deployer: 'Deployer' };
const ROLE_COLORS: Record<string, string> = { provider: '#6366F1', deployer: '#0EA5E9' };

// ─── Main component ───────────────────────────────────────────────────────────

function LiteracyContent() {
  const router = useRouter();
  const [systems, setSystems] = useState<LiteracySystemSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.literacy.listSystems()
      .then(r => setSystems((r as { systems: LiteracySystemSummary[] }).systems))
      .catch(() => {/* silent */})
      .finally(() => setLoading(false));
  }, []);

  const compliant   = systems.filter(s => s.literacy_status === 'compliant').length;
  const inProgress  = systems.filter(s => s.literacy_status === 'in_progress').length;
  const notStarted  = systems.filter(s => s.literacy_status === 'not_started').length;

  return (
    <div className="inv-page">
      <div className="inv-header">
        <div>
          <h1 className="inv-title">AI Literacy Tracker</h1>
          <p className="inv-sub">Gestisci la formazione AI per sistema — obbligo Art. 4 EU AI Act</p>
        </div>
      </div>

      {/* Art. 4 context banner */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px 28px', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
          <span style={{ fontSize: 30, lineHeight: 1 }}>🎓</span>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: 0, marginBottom: 5 }}>Obbligo Art. 4 — AI Literacy per ogni sistema AI</h2>
            <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>
              Il Reg. UE 2024/1689 richiede che il personale che usa o supervisiona sistemi AI disponga
              di un livello adeguato di competenze in base al proprio ruolo. Actify genera automaticamente
              i <strong>profili di utenza</strong> corretti (Provider vs Deployer) per ogni sistema censito
              nell&apos;AI Inventory e traccia le evidenze — certificazioni esterne o formazione interna.
            </p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { icon: '⚖️', label: 'Riduce le sanzioni', desc: "Evidenze documentate dimostrano diligenza Art. 4 e riducono l'importo effettivo della multa." },
            { icon: '🛡️', label: 'Prova ispettiva', desc: 'Report PDF scaricabile da presentare in sede di audit o ispezione da parte delle autorità nazionali.' },
            { icon: '👥', label: 'Profili automatici', desc: 'Actify genera i profili Provider/Deployer giusti per ogni sistema — nessuna configurazione manuale.' },
          ].map(c => (
            <div key={c.label} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 20, marginBottom: 7 }}>{c.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text)', marginBottom: 5 }}>{c.label}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>{c.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      {!loading && systems.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Conformi',    value: compliant,  color: '#16A34A' },
            { label: 'In corso',    value: inProgress, color: '#CA8A04' },
            { label: 'Non avviati', value: notStarted, color: '#DC2626' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 22px' }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {systems.map(sys => {
            const cfg = STATUS_CONFIG[sys.literacy_status];
            return (
              <div key={sys.system_id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
                {/* Status dot */}
                <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: cfg.dot }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{sys.tool_name}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: `${ROLE_COLORS[sys.system_role]}18`, color: ROLE_COLORS[sys.system_role] }}>
                      {ROLE_LABELS[sys.system_role] ?? sys.system_role}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {sys.vendor && <span>{sys.vendor} · </span>}
                    {sys.category && <span>{sys.category} · </span>}
                    {sys.profiles_total > 0
                      ? <span>{sys.profiles_covered}/{sys.profiles_total} profili coperti</span>
                      : <span>Profili non ancora inizializzati</span>}
                  </div>
                </div>

                {/* Status badge */}
                <div style={{ flexShrink: 0, padding: '4px 12px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 700 }}>
                  {cfg.label}
                </div>

                <button
                  onClick={() => router.push(`/dashboard/literacy/detail?id=${sys.system_id}`)}
                  style={{ flexShrink: 0, background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
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
