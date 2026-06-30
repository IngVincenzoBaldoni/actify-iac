'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { markSvg } from '@/lib/branding';

const THREATS = [
  { icon: '⚖️', label: 'Garante AI',         angle: 0   },
  { icon: '🏢', label: 'Clienti Enterprise', angle: 60  },
  { icon: '🏦', label: 'Banche',             angle: 120 },
  { icon: '🇪🇺', label: 'Commissione UE',   angle: 180 },
  { icon: '🛡️', label: 'Assicurazioni',      angle: 240 },
  { icon: '👤', label: 'Dipendenti',         angle: 300 },
] as const;

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
  purpose: string;
  department?: string;
  headcount?: number;
  target_users: string[];
  makes_automated_decisions: boolean;
  human_oversight_level: string;
  decision_domains: string[];
  affects_vulnerable_groups: boolean;
  data_types: string[];
  output_type?: string;
  annex_iii_domains?: string[];
  is_safety_component?: boolean;
  compliance_status: 'unchecked' | 'checking' | 'gap_found' | 'compliant';
  last_check_at: string | null;
  last_article_sanctions?: string;
  compliance_checklist?: Record<string, string | { status?: string }>;
}

// ── Derived metadata helpers ────────────────────────────────────────────────

const AVATAR_PALETTE = [
  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444',
  '#F97316', '#EAB308', '#22C55E', '#14B8A6',
  '#0EA5E9', '#3B82F6',
];

function avatarColor(name: string): string {
  return AVATAR_PALETTE[name.charCodeAt(0) % AVATAR_PALETTE.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

function riskLevel(sys: AISystem): { label: string; color: string; bg: string } {
  if (sys.makes_automated_decisions && (sys.human_oversight_level === 'never' || sys.human_oversight_level === 'sometimes')) {
    return { label: 'ALTO',  color: '#EF4444', bg: 'rgba(239,68,68,0.2)'  };
  }
  if (sys.makes_automated_decisions || sys.human_oversight_level === 'never') {
    return { label: 'MEDIO', color: '#F97316', bg: 'rgba(249,115,22,0.2)' };
  }
  return   { label: 'BASSO', color: '#22C55E', bg: 'rgba(34,197,94,0.2)'  };
}


function computeEffectiveExposure(sys: AISystem): { min: number; max: number } {
  if (!sys.last_article_sanctions) return { min: 0, max: 0 };
  try {
    const sanctions: Record<string, { min: number; max: number }> = JSON.parse(sys.last_article_sanctions);
    const checklist = sys.compliance_checklist ?? {};
    let min = 0, max = 0;
    for (const [art, val] of Object.entries(sanctions)) {
      const entry = checklist[art];
      const st = typeof entry === 'string' ? entry : (entry as { status?: string })?.status;
      if (st !== 'present') { min += val.min; max += val.max; }
    }
    return { min, max };
  } catch {
    return { min: 0, max: 0 };
  }
}

function computeAggExposure(systems: AISystem[]): { min: number; max: number } {
  const artMap = new Map<string, { min: number; max: number }>();
  for (const sys of systems) {
    if (!sys.last_article_sanctions) continue;
    try {
      const sanctions: Record<string, { min: number; max: number }> = JSON.parse(sys.last_article_sanctions);
      const checklist = sys.compliance_checklist ?? {};
      for (const [art, val] of Object.entries(sanctions)) {
        const entry = checklist[art];
        const st = typeof entry === 'string' ? entry : (entry as { status?: string })?.status;
        if (st !== 'present') {
          const ex = artMap.get(art) ?? { min: 0, max: 0 };
          ex.min = Math.max(ex.min, val.min);
          ex.max = Math.max(ex.max, val.max);
          artMap.set(art, ex);
        }
      }
    } catch { /* ignore */ }
  }
  return {
    min: Array.from(artMap.values()).reduce((s, v) => s + v.min, 0),
    max: Array.from(artMap.values()).reduce((s, v) => s + v.max, 0),
  };
}

function effectiveStatus(sys: AISystem): AISystem['compliance_status'] {
  if (sys.compliance_status === 'unchecked' || sys.compliance_status === 'checking') return sys.compliance_status;
  const { max } = computeEffectiveExposure(sys);
  return max === 0 ? 'compliant' : 'gap_found';
}

function fmtExposure(amount: number): string {
  if (amount <= 0) return '';
  if (amount >= 1_000_000) return `€${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (amount >= 1_000) return `€${Math.round(amount / 1_000)}K`;
  return `€${amount}`;
}

// ── Static label maps ───────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  unchecked: 'Non analizzato', checking: 'Analisi in corso…',
  gap_found: 'Gap trovati', compliant: 'Conforme',
};
const STATUS_CLASS: Record<string, string> = {
  unchecked: 'status-unchecked', checking: 'status-checking',
  gap_found: 'status-gap', compliant: 'status-ok',
};
const ROLE_LABEL: Record<string, string> = {
  provider: 'Provider', deployer: 'Deployer',
};
const OUTPUT_LABEL: Record<string, string> = {
  content_generation: 'Generazione contenuti',
  recommendation:     'Raccomandazione',
  scoring:            'Scoring',
  automated_decision: 'Decisione auto.',
};
const CAT_LABEL: Record<string, string> = {
  hr: 'HR', finance: 'Finanza', llm: 'LLM',
  marketing: 'Marketing', operations: 'Operations',
  legal: 'Legal', tech: 'Tech', healthcare: 'Healthcare', altro: 'Altro',
};

const PLAN_LIMITS: Record<string, number> = {
  trial: 5, base: 10, premium: Infinity, enterprise: Infinity,
};
const PLAN_LABELS: Record<string, string> = {
  trial: 'Trial', base: 'Starter', premium: 'Professional', enterprise: 'Enterprise',
};

// ── AI Act milestones ───────────────────────────────────────────────────────

const ACT_MILESTONES = [
  { date: 'AGO 2024', label: 'Entrata in vigore del Regolamento',     ts: new Date('2024-08-01') },
  { date: 'FEB 2025', label: 'Art. 4-5 — AI Literacy + divieti',      ts: new Date('2025-02-02') },
  { date: 'AGO 2025', label: 'GPAI e Ufficio AI operativi',            ts: new Date('2025-08-02') },
  { date: 'DIC 2026', label: 'Art. 50 — sistemi pre-esistenti *',      ts: new Date('2026-12-02') },
  { date: 'DIC 2027', label: 'Sistemi alto rischio Annex III *',       ts: new Date('2027-12-02') },
  { date: 'AGO 2028', label: 'Sistemi alto rischio Annex I *',         ts: new Date('2028-08-02') },
  { date: 'AGO 2030', label: 'Sistemi legacy (senza modifiche)',        ts: new Date('2030-08-02') },
];

// ── Article breach chart ─────────────────────────────────────────────────────

function ArticleBreachChart({ systems }: { systems: AISystem[] }) {
  const articleMap = new Map<string, { totalMin: number; totalMax: number; tools: string[] }>();
  for (const sys of systems) {
    if (!sys.last_article_sanctions) continue;
    try {
      const sanctions: Record<string, { min: number; max: number }> = JSON.parse(sys.last_article_sanctions);
      const checklist = sys.compliance_checklist ?? {};
      for (const [art, val] of Object.entries(sanctions)) {
        const entry = checklist[art];
        const st = typeof entry === 'string' ? entry : (entry as { status?: string })?.status;
        if (st !== 'present') {
          const existing = articleMap.get(art) ?? { totalMin: 0, totalMax: 0, tools: [] };
          existing.totalMin = Math.max(existing.totalMin, val.min);
          existing.totalMax = Math.max(existing.totalMax, val.max);
          if (!existing.tools.includes(sys.tool_name)) existing.tools.push(sys.tool_name);
          articleMap.set(art, existing);
        }
      }
    } catch { /* ignore */ }
  }

  const top = Array.from(articleMap.entries())
    .map(([art, d]) => ({ art, ...d }))
    .sort((a, b) => b.totalMax - a.totalMax)
    .slice(0, 4);

  const peak = top[0]?.totalMax ?? 1;
  const COLORS = ['#EF4444', '#F97316', '#FBBF24', '#FB923C'];

  if (top.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <div style={{ fontSize: 22 }}>✓</div>
        <div style={{ fontSize: 12, color: 'var(--dim)', textAlign: 'center' }}>Nessun gap normativo rilevato dalla gap analysis</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly' }}>
      {top.map((item, idx) => {
        const pct = Math.round((item.totalMax / peak) * 100);
        const col = COLORS[idx] ?? COLORS[COLORS.length - 1];
        return (
          <div key={item.art} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: col, minWidth: 44, letterSpacing: 0.2 }}>
                {item.art}
              </span>
              <div style={{ flex: 1, height: 7, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <div style={{
                  width: `${pct}%`, height: '100%', borderRadius: 4,
                  background: `linear-gradient(90deg, ${col}99, ${col})`,
                  boxShadow: `0 0 8px ${col}55`,
                }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color: col, minWidth: 40, textAlign: 'right' }}>
                {fmtExposure(item.totalMax)}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 4, paddingLeft: 51 }}>
              {item.tools.slice(0, 3).map(t => (
                <span key={t} style={{
                  fontSize: 9, fontWeight: 600, color: 'rgba(148,163,184,0.8)',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 3, padding: '1px 5px',
                }}>
                  {t.length > 13 ? t.slice(0, 13) + '…' : t}
                </span>
              ))}
              {item.tools.length > 3 && (
                <span style={{ fontSize: 9, color: 'var(--dim)', alignSelf: 'center' }}>+{item.tools.length - 3}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Dynamic rotating widget ──────────────────────────────────────────────────

function DynamicWidget({ systems }: { systems: AISystem[] }) {
  const [slide, setSlide]   = useState(0);
  const [fading, setFading] = useState(false);
  const SLIDES = 3;
  const now = new Date();

  useEffect(() => {
    const t = setInterval(() => {
      setFading(true);
      setTimeout(() => { setSlide(s => (s + 1) % SLIDES); setFading(false); }, 350);
    }, 5500);
    return () => clearInterval(t);
  }, []);

  const { min: totalMin, max: totalMax } = computeAggExposure(systems);
  const gapSystems = systems.filter(s => effectiveStatus(s) === 'gap_found').length;

  return (
    <div className="inv-kpi-card" style={{ display: 'flex', flexDirection: 'column', minHeight: 220 }}>
      {/* Slide content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', opacity: fading ? 0 : 1, transform: fading ? 'translateY(8px)' : 'translateY(0)', transition: 'opacity 0.35s ease, transform 0.35s ease' }}>

        {/* ── Slide 0: AI Act timeline ── */}
        {slide === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--dim)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14 }}>
              Scadenze chiave — AI Act
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {ACT_MILESTONES.map((m, i) => {
                const past    = m.ts < now;
                const current = !past && i > 0 && ACT_MILESTONES[i - 1].ts < now;
                const dotColor = past ? '#22C55E' : current ? '#F97316' : '#252532';
                const dotBorder = current ? '2px solid #F97316' : past ? 'none' : '1px solid #3A3A4A';
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: 3 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, border: dotBorder, flexShrink: 0 }}/>
                      {i < ACT_MILESTONES.length - 1 && (
                        <div style={{ width: 1, height: 11, background: past ? 'rgba(34,197,94,.22)' : 'rgba(255,255,255,.06)', margin: '2px 0' }}/>
                      )}
                    </div>
                    <div style={{ paddingBottom: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: .8, marginRight: 6, color: past ? '#22C55E' : current ? '#F97316' : 'var(--dim)' }}>{m.date}</span>
                      <span style={{ fontSize: 12, color: past ? 'var(--muted)' : current ? 'var(--text)' : 'var(--dim)', fontWeight: current ? 700 : 400 }}>{m.label}</span>
                      {current && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 800, color: '#F97316', background: 'rgba(249,115,22,.1)', border: '1px solid rgba(249,115,22,.25)', padding: '1px 5px', borderRadius: 3, letterSpacing: .5 }}>ORA</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Slide 1: FBE summary ── */}
        {slide === 1 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--dim)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14 }}>
              Esposizione sanzionatoria totale
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, textAlign: 'center' }}>
              <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: -2, lineHeight: 1, color: totalMax > 0 ? '#EF4444' : '#22C55E' }}>
                {totalMax > 0 ? fmtExposure(totalMax) : '€0'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--dim)' }}>esposizione massima stimata</div>
              {totalMin > 0 && totalMin !== totalMax && (
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  Min <span style={{ color: 'var(--text2)', fontWeight: 700 }}>{fmtExposure(totalMin)}</span>
                  <span style={{ color: 'var(--dim)', margin: '0 6px' }}>—</span>
                  Max <span style={{ color: '#EF4444', fontWeight: 700 }}>{fmtExposure(totalMax)}</span>
                </div>
              )}
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--dim)' }}>
                {gapSystems > 0
                  ? <><span style={{ color: '#EF4444', fontWeight: 700 }}>{gapSystems} sistem{gapSystems !== 1 ? 'i' : 'a'}</span> con gap aperti</>
                  : <span style={{ color: '#22C55E' }}>✓ Nessun gap aperto</span>}
              </div>
            </div>
          </div>
        )}

        {/* ── Slide 2: Top articoli violati ── */}
        {slide === 2 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--dim)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
              Top articoli violati — Gap Analysis
            </div>
            <ArticleBreachChart systems={systems} />
          </div>
        )}
      </div>

      {/* Apple-style pill dots */}
      <div style={{ display: 'flex', gap: 5, justifyContent: 'center', paddingTop: 14 }}>
        {Array.from({ length: SLIDES }).map((_, i) => (
          <div key={i} style={{ height: 5, width: i === slide ? 18 : 5, borderRadius: 3, background: i === slide ? '#22C55E' : 'rgba(255,255,255,.18)', transition: 'all .45s cubic-bezier(.4,0,.2,1)' }}/>
        ))}
      </div>
    </div>
  );
}

// ── Donut chart ─────────────────────────────────────────────────────────────

function DonutChart({ compliant, gapFound, checking, unchecked, total }: {
  compliant: number; gapFound: number; checking: number; unchecked: number; total: number;
}) {
  const r = 66, cx = 100, cy = 100, sw = 28;
  const circ = 2 * Math.PI * r;
  const segs = [
    { n: compliant, color: '#22C55E', glow: 'rgba(34,197,94,0.7)'  },
    { n: gapFound,  color: '#EF4444', glow: 'rgba(239,68,68,0.7)'  },
    { n: checking,  color: '#F97316', glow: 'rgba(249,115,22,0.7)' },
    { n: unchecked, color: '#252530', glow: null                   },
  ];
  let cum = 0;
  return (
    <svg viewBox="0 0 200 200" width={270} height={270} style={{ display: 'block' }}>
      <defs>
        <radialGradient id="dnt-hole" cx="50%" cy="38%" r="62%">
          <stop offset="0%" stopColor="#1C1C26"/>
          <stop offset="100%" stopColor="#0D0D12"/>
        </radialGradient>
        {/* Per-segment glow filters */}
        {segs.map((s, i) => s.glow && (
          <filter key={i} id={`glow-${i}`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        ))}
      </defs>

      {/* Deep shadow ring — gives 3D depth */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,0,0,0.65)" strokeWidth={sw + 10}/>

      {/* Track ring */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#17171F" strokeWidth={sw}/>

      {/* Colored segments */}
      {segs.map((s, i) => {
        if (s.n === 0) return null;
        const dash = (s.n / total) * circ;
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={s.color} strokeWidth={sw}
            strokeDasharray={`${Math.max(0, dash - 3)} ${circ - dash + 3}`}
            strokeDashoffset={circ - cum}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
            filter={s.glow ? `url(#glow-${i})` : undefined}
          />
        );
        cum += dash;
        return el;
      })}

      {/* Sheen highlight at top (simulates light source) */}
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke="rgba(255,255,255,0.07)" strokeWidth={sw}
        strokeDasharray={`${circ * 0.22} ${circ * 0.78}`}
        strokeDashoffset={circ * 0.11}
        transform={`rotate(-90 ${cx} ${cy})`}
      />

      {/* Inner fill with gradient for depth */}
      <circle cx={cx} cy={cy} r={r - sw / 2 - 5} fill="url(#dnt-hole)"/>

      {/* Center number */}
      <text x={cx} y={cy - 7} textAnchor="middle" fill="#F8FAFC"
        fontSize="40" fontWeight="900" fontFamily="inherit">{total}</text>
      <text x={cx} y={cy + 16} textAnchor="middle" fill="#64748B"
        fontSize="11" fontWeight="600" fontFamily="inherit" letterSpacing="1.5">SISTEMI</text>
    </svg>
  );
}

// ── Component ───────────────────────────────────────────────────────────────

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
    } catch { /* handled */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSystems(); }, [loadSystems]);

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

  const total       = systems.length;
  const compliant   = systems.filter(s => effectiveStatus(s) === 'compliant').length;
  const gapFound    = systems.filter(s => effectiveStatus(s) === 'gap_found').length;
  const unchecked   = systems.filter(s => s.compliance_status === 'unchecked').length;
  const checking    = systems.filter(s => s.compliance_status === 'checking').length;
  const analyzed    = compliant + gapFound;
  const riskAuto    = systems.filter(s => s.makes_automated_decisions).length;
  const score       = analyzed > 0 ? Math.round((compliant / analyzed) * 100) : null;
  const gapCritical   = systems.filter(s => effectiveStatus(s) === 'gap_found' && riskLevel(s).label === 'ALTO').length;
  const gapMedium     = gapFound - gapCritical;
  const providerCount = systems.filter(s => s.role === 'provider').length;
  const deployerCount = systems.filter(s => s.role === 'deployer').length;
  const riskHighCount = systems.filter(s => riskLevel(s).label === 'ALTO').length;
  const riskMedCount  = systems.filter(s => riskLevel(s).label === 'MEDIO').length;
  const riskLowCount  = systems.filter(s => riskLevel(s).label === 'BASSO').length;

  return (
    <div className="inv-page">
      <div className="inv-header">
        <div>
          <h1 className="inv-title">AIPI — AI Passports Inventory</h1>
          <p className="inv-sub">{total} sistema{total !== 1 ? 'i' : ''} censit{total !== 1 ? 'i' : 'o'}</p>
        </div>
        <div className="inv-header-actions">
          {systems.length > 0 && (
            <button
              className="btn-inv-reload"
              disabled={reloading}
              onClick={async () => { setReloading(true); await loadSystems(); setReloading(false); }}
              title="Ricarica stati aggiornati"
            >
              {reloading ? '⟳' : '↺'} Ricarica
            </button>
          )}
          {atLimit ? (
            <a href="/plan" className="btn-add-system"
              style={{ background: 'rgba(239,68,68,.1)', borderColor: 'rgba(239,68,68,.3)', color: '#EF4444' }}
              title={`Piano ${PLAN_LABELS[tier]}: limite di ${limit} tool raggiunto`}>
              ⬆ Upgrade piano
            </a>
          ) : (
            <a href="/dashboard/setup?add=1" className="btn-add-system">
              <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
                <path d="M7.5 1v13M1 7.5h13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              Nuovo AI Passport
            </a>
          )}
        </div>
      </div>

      {/* Plan limit bar */}
      {limit !== Infinity && (
        <div className="plan-limit-bar-wrap">
          <span className="plan-limit-label">Piano <strong>{PLAN_LABELS[tier]}</strong></span>
          <div className="plan-limit-track">
            <div className={`plan-limit-fill ${fillClass}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="plan-limit-count">{systems.length}/{limit} passaporti</span>
          {atLimit && <a href="/plan" className="plan-limit-upgrade">Passa a Premium →</a>}
        </div>
      )}

      {/* Stats — donut + KPI */}
      {total > 0 && (
        <div className="inv-stats-v2">
          {/* Header */}
          <div className="inv-stats-header">
            <div>
              <div className="inv-stats-title">Panoramica Compliance</div>
              <div className="inv-stats-sub">
                Monitora in tempo reale la conformità dei tuoi sistemi AI al Regolamento UE 2024/1689.
                Actify analizza ogni passaporto, rileva gap normativi rispetto agli articoli dell&apos;AI Act
                e stima l&apos;esposizione sanzionatoria massima — così sai esattamente dove intervenire.
              </div>
            </div>
            <div className="inv-stats-eu-badge">EU AI Act · 2024/1689</div>
          </div>

          {/* Content row */}
          <div className="inv-stats-content">
          {/* Donut + legend */}
          <div className="inv-donut-col">
            <DonutChart compliant={compliant} gapFound={gapFound} checking={checking} unchecked={unchecked} total={total} />
            <div className="inv-donut-legend">
              {compliant > 0  && <div className="inv-leg-row"><span className="inv-leg-dot" style={{ background: '#22C55E' }}/><span>Conformi: <strong>{compliant}</strong></span></div>}
              {gapFound  > 0  && <div className="inv-leg-row"><span className="inv-leg-dot" style={{ background: '#EF4444' }}/><span>Gap trovati: <strong>{gapFound}</strong></span></div>}
              {checking  > 0  && <div className="inv-leg-row"><span className="inv-leg-dot" style={{ background: '#F97316' }}/><span>In analisi: <strong>{checking}</strong></span></div>}
              {unchecked > 0  && <div className="inv-leg-row"><span className="inv-leg-dot" style={{ background: '#2E2E36', border: '1px solid #4A4A56' }}/><span>Non analizzati: <strong>{unchecked}</strong></span></div>}
            </div>
          </div>

          {/* KPI 2×2 grid */}
          <div className="inv-kpi-grid">
            {/* Tasso conformità */}
            <div className="inv-kpi-card">
              <div className="inv-kpi-num" style={{ color: score === null ? 'var(--dim)' : score >= 70 ? '#22C55E' : score >= 40 ? '#F97316' : '#EF4444' }}>
                {score !== null ? `${score}%` : '—'}
              </div>
              <div className="inv-kpi-label">Tasso conformità</div>
              <div className="inv-kpi-sub">
                {analyzed > 0 ? `${analyzed} sistem${analyzed !== 1 ? 'i' : 'a'} su ${total}` : 'Nessuno analizzato'}
              </div>
            </div>

            {/* Gap aperti */}
            <div className="inv-kpi-card">
              <div className="inv-kpi-num" style={{ color: gapFound > 0 ? '#EF4444' : 'var(--dim)' }}>{gapFound}</div>
              <div className="inv-kpi-label">Gap aperti totali</div>
              <div className="inv-kpi-sub">
                {gapFound === 0
                  ? <span style={{ color: '#22C55E' }}>✓ Nessun gap</span>
                  : <><span style={{ color: '#EF4444' }}>● {gapCritical} critic{gapCritical !== 1 ? 'i' : 'o'}</span>{gapMedium > 0 && <> · <span style={{ color: '#F97316' }}>{gapMedium} medi{gapMedium !== 1 ? '' : 'o'}</span></>}</>
                }
              </div>
            </div>

            {/* Sistemi censiti */}
            <div className="inv-kpi-card">
              <div className="inv-kpi-num" style={{ color: 'var(--text)' }}>{total}</div>
              <div className="inv-kpi-label">Sistemi censiti</div>
              <div className="inv-kpi-sub" style={{ marginBottom: 10 }}>
                {analyzed === total
                  ? <span style={{ color: '#22C55E' }}>Tutti analizzati</span>
                  : `${analyzed} di ${total} analizzati`}
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Tipologia */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--dim)', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 5 }}>Tipologia di tool</div>
                  <div style={{ display: 'flex', gap: 18, fontSize: 16, alignItems: 'baseline' }}>
                    <span>
                      <span style={{ fontWeight: 900, color: '#A5B4FC', fontSize: 22 }}>{providerCount}</span>
                      <span style={{ color: 'var(--muted)', marginLeft: 5 }}>Provider</span>
                    </span>
                    <span style={{ color: 'var(--dim)', fontSize: 14 }}>·</span>
                    <span>
                      <span style={{ fontWeight: 900, color: '#7DD3FC', fontSize: 22 }}>{deployerCount}</span>
                      <span style={{ color: 'var(--muted)', marginLeft: 5 }}>Deployer</span>
                    </span>
                  </div>
                </div>
                {/* Rischio */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--dim)', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 5 }}>Rischio riscontrato</div>
                  <div style={{ display: 'flex', gap: 14, fontSize: 16, flexWrap: 'wrap', alignItems: 'baseline' }}>
                    <span>
                      <span style={{ fontWeight: 900, fontSize: 22, color: riskHighCount > 0 ? '#EF4444' : 'var(--dim)' }}>{riskHighCount}</span>
                      <span style={{ color: 'var(--muted)', marginLeft: 5 }}>Alto</span>
                    </span>
                    <span style={{ color: 'var(--dim)', fontSize: 14 }}>·</span>
                    <span>
                      <span style={{ fontWeight: 900, fontSize: 22, color: riskMedCount > 0 ? '#F97316' : 'var(--dim)' }}>{riskMedCount}</span>
                      <span style={{ color: 'var(--muted)', marginLeft: 5 }}>Medio</span>
                    </span>
                    <span style={{ color: 'var(--dim)', fontSize: 14 }}>·</span>
                    <span>
                      <span style={{ fontWeight: 900, fontSize: 22, color: riskLowCount > 0 ? '#22C55E' : 'var(--dim)' }}>{riskLowCount}</span>
                      <span style={{ color: 'var(--muted)', marginLeft: 5 }}>Basso</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <DynamicWidget systems={systems} />
          </div>
          </div>{/* end inv-stats-content */}
        </div>
      )}

      {/* Empty state */}
      {total === 0 ? (
        <div className="sv-wrap">
          <div className="sv-stage">
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
            <div className="sv-ring sv-r3" /><div className="sv-ring sv-r2" />
            <div className="sv-ring sv-r1"><div className="sv-r1-arc" /></div>
            <div className="sv-core">
              <div className="sv-core-box">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(203,213,225,0.9)" strokeWidth="1.5">
                  <path d="M3 21h18M3 21V7l9-4 9 4v14M9 21v-4h6v4"/>
                  <rect x="9" y="9" width="2" height="2" fill="rgba(203,213,225,0.9)" stroke="none"/>
                  <rect x="13" y="9" width="2" height="2" fill="rgba(203,213,225,0.9)" stroke="none"/>
                </svg>
                <div className="sv-core-divider sv-actify-in" />
                <span className="sv-actify-in" dangerouslySetInnerHTML={{ __html: markSvg(30, 'green') }} />
              </div>
              <div className="sv-core-tag sv-actify-in">AI Act Protected</div>
            </div>
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
          <h2 className="ief-title">Crea il primo AI Passport</h2>
          <p className="ief-desc">
            Censisci i tuoi strumenti AI nell&apos;AI Passports Inventory. Actify costruisce uno scudo di compliance
            che ti protegge da sanzioni, audit e richieste di clienti enterprise.
          </p>
          <div className="ief-pills">
            <span className="ief-pill"><span>🛂</span> AI Passports certificati</span>
            <span className="ief-pill"><span>⊙</span> Compliance check automatico</span>
            <span className="ief-pill"><span>📋</span> Roadmap correttiva</span>
          </div>
          <a href="/dashboard/setup?add=1" className="ief-cta">
            <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 1v13M1 7.5h13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            Aggiungi il primo AI Passport
          </a>
        </div>
      ) : (
        /* ── Passport grid ── */
        <div className="inv-grid">
          {systems.map(sys => {
            const effSt      = effectiveStatus(sys);
            const isDeleting = deletingIds.has(sys.system_id);
            const isChecking = checkingIds.has(sys.system_id);
            const risk       = riskLevel(sys);
            const avColor    = avatarColor(sys.tool_name);
            const avInit     = initials(sys.tool_name);
            const annexCount = (sys.annex_iii_domains ?? []).length;
            const users      = sys.target_users ?? [];
            const dataTypes  = sys.data_types ?? [];
            const { max: exposureAmt } = computeEffectiveExposure(sys);
            const exposureStr = fmtExposure(exposureAmt);

            return (
              <div key={sys.system_id} className="sys-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

                {/* ══ PASSPORT HEADER ══ */}
                <div style={{ background: 'linear-gradient(150deg, rgba(34,197,94,0.14) 0%, #0B1810 38%, #080C09 100%)', padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: 14, borderBottom: '1px solid rgba(34,197,94,0.18)', boxShadow: 'inset 0 -1px 0 rgba(34,197,94,0.05)' }}>
                  {/* Avatar */}
                  <div style={{ width: 52, height: 52, borderRadius: 10, background: avColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: '#fff', flexShrink: 0, border: '2px solid rgba(255,255,255,0.12)', letterSpacing: 0.5 }}>
                    {avInit}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Name */}
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', lineHeight: 1.15, marginBottom: 8, letterSpacing: 0.2 }}>{sys.tool_name}</div>
                    {/* Badges row */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 7 }}>
                      {/* Role — prominente */}
                      <span style={{
                        fontSize: 13, fontWeight: 900, padding: '5px 14px', borderRadius: 6, letterSpacing: 0.5,
                        background: sys.role === 'provider' ? 'rgba(99,102,241,0.35)' : 'rgba(14,165,233,0.35)',
                        color:      sys.role === 'provider' ? '#A5B4FC' : '#7DD3FC',
                        border:     `1px solid ${sys.role === 'provider' ? 'rgba(99,102,241,0.6)' : 'rgba(14,165,233,0.6)'}`,
                      }}>
                        {ROLE_LABEL[sys.role]}
                      </span>
                      {/* Risk */}
                      <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 5, background: risk.bg, color: risk.color, letterSpacing: 1, textTransform: 'uppercase', border: `1px solid ${risk.color}40` }}>
                        {risk.label}
                      </span>
                      {/* Vulnerable groups warning */}
                      {sys.affects_vulnerable_groups && (
                        <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 5, background: 'rgba(234,179,8,0.15)', color: '#FDE68A', letterSpacing: 0.5, border: '1px solid rgba(234,179,8,0.35)' }}>
                          ⚠ Vuln.
                        </span>
                      )}
                    </div>
                    {/* Vendor · Category */}
                    {(sys.vendor || sys.category) && (
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', fontStyle: 'italic' }}>
                        {[sys.vendor, sys.category ? CAT_LABEL[sys.category] ?? sys.category : null].filter(Boolean).join(' · ')}
                      </div>
                    )}
                    {/* Purpose — short description */}
                    {sys.purpose && (
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 5, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {sys.purpose}
                      </div>
                    )}
                  </div>

                  {/* Top-right passport label */}
                  <div style={{ fontSize: 8, fontWeight: 800, color: 'rgba(255,255,255,0.18)', letterSpacing: 2.5, textTransform: 'uppercase', textAlign: 'right', flexShrink: 0, lineHeight: 1.6 }}>
                    AI<br/>PASS<br/>PORT
                  </div>
                </div>

                {/* ══ DATA GRID ══ */}
                <div style={{ padding: '20px 20px 16px', flex: 1, background: '#15151C' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px', marginBottom: 20 }}>

                    {/* SUPERVISIONE */}
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 5 }}>Supervisione</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                        {{ always: 'Sempre', sometimes: 'A volte', never: 'Mai', na: 'N/A' }[sys.human_oversight_level] ?? '—'}
                      </div>
                    </div>

                    {/* DECISIONI AUTONOME */}
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 5 }}>Decisioni Auto.</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: sys.makes_automated_decisions ? '#EF4444' : '#22C55E' }}>
                        {sys.makes_automated_decisions ? '⚠ Sì' : '✓ No'}
                      </div>
                    </div>

                    {/* DATI TRATTATI */}
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 5 }}>Dati Trattati</div>
                      {dataTypes.length > 0 ? (
                        <div>
                          {dataTypes.slice(0, 2).map(d => (
                            <div key={d} style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>{d}</div>
                          ))}
                          {dataTypes.length > 2 && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>+{dataTypes.length - 2} altri</div>}
                        </div>
                      ) : <span style={{ fontSize: 14, color: 'var(--muted)', fontStyle: 'italic' }}>—</span>}
                    </div>

                    {/* OUTPUT */}
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 5 }}>Output</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                        {sys.output_type ? (OUTPUT_LABEL[sys.output_type] ?? sys.output_type) : <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>—</span>}
                      </div>
                    </div>

                    {/* UTENTI TARGET */}
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 5 }}>Utenti Target</div>
                      {users.length > 0 ? (
                        <div>
                          {users.slice(0, 2).map(u => (
                            <div key={u} style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>{u}</div>
                          ))}
                          {users.length > 2 && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>+{users.length - 2} altri</div>}
                          {sys.headcount && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>~{sys.headcount} persone</div>}
                        </div>
                      ) : <span style={{ fontSize: 14, color: 'var(--muted)', fontStyle: 'italic' }}>—</span>}
                    </div>

                    {/* ALLEGATO III */}
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 5 }}>Allegato III</div>
                      {annexCount > 0 ? (
                        <span style={{ display: 'inline-block', fontSize: 13, fontWeight: 700, padding: '3px 10px', borderRadius: 5, background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                          {annexCount} domin{annexCount === 1 ? 'io' : 'i'}
                        </span>
                      ) : (
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#22C55E' }}>Nessuno</span>
                      )}
                    </div>

                    {/* REPARTO */}
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 5 }}>Reparto</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                        {sys.department ? sys.department : <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>—</span>}
                      </div>
                    </div>

                    {/* GRUPPI VULNERABILI */}
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 5 }}>Gruppi Vulnerabili</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: sys.affects_vulnerable_groups ? '#FDE68A' : '#22C55E' }}>
                        {sys.affects_vulnerable_groups ? '⚠ Coinvolti' : '✓ No'}
                      </div>
                    </div>
                  </div>

                  {/* ── Status row ── */}
                  <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className={`compliance-badge ${STATUS_CLASS[effSt]}`} style={{ fontSize: 13, padding: '6px 16px', fontWeight: 800 }}>
                      {effSt === 'checking' && <span className="pulse-dot" />}
                      {STATUS_LABEL[effSt]}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {exposureStr && (
                        <div style={{ fontSize: 20, fontWeight: 900, color: '#EF4444', letterSpacing: 0.2, lineHeight: 1.1 }}>
                          ⚠ {exposureStr}
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: exposureStr ? 2 : 0 }}>
                        {sys.last_check_at
                          ? `Check: ${new Date(sys.last_check_at).toLocaleDateString('it-IT')}`
                          : <em>Mai analizzato</em>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ══ FOOTER ══ */}
                <div style={{ borderTop: '1px solid var(--border)', padding: '12px 20px', display: 'flex', gap: 8, alignItems: 'center' }}>
                  {sys.compliance_status === 'unchecked' && (
                    <button
                      className="sys-check-btn"
                      style={{ flex: 1, fontSize: 12 }}
                      disabled={isChecking}
                      onClick={() => activateCheck(sys.system_id)}
                    >
                      {isChecking ? '⟳ Avvio…' : '▶ Avvia Check'}
                    </button>
                  )}
                  {sys.compliance_status === 'checking' && (
                    <button className="sys-check-btn" style={{ flex: 1, fontSize: 12 }} disabled>⟳ In analisi…</button>
                  )}
                  <button
                    className="sys-detail-btn"
                    style={{ flex: 1, fontSize: 12, padding: '8px 0', fontWeight: 700 }}
                    onClick={() => router.push(`/dashboard/system?id=${sys.system_id}&view=fines`)}
                    title="Vedi esposizione sanzionatoria in FBE"
                  >
                    📈 FBE
                  </button>
                  <button
                    className="sys-detail-btn sys-detail-btn-full"
                    style={{ flex: 2, fontSize: 14, fontWeight: 900, padding: '10px 0', letterSpacing: 0.2 }}
                    onClick={() => router.push(`/dashboard/system?id=${sys.system_id}`)}
                  >
                    Dettaglio →
                  </button>
                  <button
                    className="sys-delete-btn"
                    disabled={isDeleting}
                    onClick={() => deleteSystem(sys.system_id, sys.tool_name)}
                    title="Elimina passaporto"
                  >
                    {isDeleting ? '…' : '🗑'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
