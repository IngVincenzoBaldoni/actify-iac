'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface SanctionSnap {
  at: string;
  min: number;
  max: number;
  source: 'check' | 'document' | 'checklist';
}

interface SysWithTimeline {
  system_id: string;
  tool_name: string;
  vendor?: string;
  sanction_timeline?: SanctionSnap[];
  compliance_checklist?: Record<string, { status?: string } | string>;
  last_article_sanctions?: string;
}

const COLORS = ['#6EE7B7', '#93C5FD', '#FCA5A5', '#FDE68A', '#C4B5FD', '#A5F3FC', '#FBD38D'];

function fmtEur(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (n >= 1_000) return `€${(n / 1_000).toFixed(0)}K`;
  return `€${n.toLocaleString('it-IT')}`;
}

function niceYTicks(maxVal: number, count = 5): number[] {
  if (maxVal === 0) return [0, 5000, 10000, 15000, 20000];
  const rough = maxVal / (count - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const nice = [1, 2, 2.5, 5, 10].map(f => f * mag).find(f => f >= rough) ?? rough;
  const ticks: number[] = [];
  for (let i = 0; i * nice <= maxVal * 1.15; i++) ticks.push(i * nice);
  return ticks.slice(0, count + 1);
}

// ─── SVG Chart ────────────────────────────────────────────────────────────────

interface ChartSeries { label: string; color: string; data: SanctionSnap[] }

function SanctionChart({ series, compact = false }: { series: ChartSeries[]; compact?: boolean }) {
  const VH = compact ? 200 : 280;
  const VW = 900;
  const ML = 65, MR = 16, MT = 20, MB = 40;
  const PW = VW - ML - MR;
  const PH = VH - MT - MB;

  const allPts = series.flatMap(s => s.data);
  if (allPts.length === 0) return (
    <div className="fines-chart-empty">Nessun dato — esegui un Compliance Check per iniziare a tracciare.</div>
  );

  const allTs = allPts.map(p => new Date(p.at).getTime());
  const allMaxes = allPts.map(p => p.max);
  let minTs = Math.min(...allTs), maxTs = Math.max(...allTs);
  const tsSpan = maxTs - minTs || 86_400_000 * 7;
  minTs -= tsSpan * 0.06;
  maxTs += tsSpan * 0.06;

  const yMax = Math.max(...allMaxes) * 1.15 || 20000;
  const yTicks = niceYTicks(Math.max(...allMaxes));

  const sx = (ts: number) => ML + ((ts - minTs) / (maxTs - minTs)) * PW;
  const sy = (v: number) => MT + PH - (v / yMax) * PH;

  // X ticks: up to 6
  const xTickCount = Math.min(6, Math.max(2, allPts.length + 1));
  const xTicks = Array.from({ length: xTickCount }, (_, i) =>
    minTs + (i / (xTickCount - 1)) * (maxTs - minTs)
  );

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" style={{ overflow: 'visible', display: 'block' }}>
      {/* Grid */}
      {yTicks.map(t => (
        <line key={t} x1={ML} y1={sy(t)} x2={ML + PW} y2={sy(t)}
          stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4 4" />
      ))}
      {/* Y axis */}
      <line x1={ML} y1={MT} x2={ML} y2={MT + PH} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      {yTicks.map(t => (
        <text key={t} x={ML - 8} y={sy(t) + 4} textAnchor="end"
          fill="rgba(255,255,255,0.4)" fontSize="10" fontFamily="ui-monospace,monospace">
          {fmtEur(t)}
        </text>
      ))}
      {/* X axis */}
      <line x1={ML} y1={MT + PH} x2={ML + PW} y2={MT + PH} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      {xTicks.map((ts, i) => {
        const x = sx(ts);
        const lbl = new Date(ts).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
        return (
          <g key={i}>
            <line x1={x} y1={MT + PH} x2={x} y2={MT + PH + 4} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            <text x={x} y={MT + PH + 16} textAnchor="middle"
              fill="rgba(255,255,255,0.35)" fontSize="10" fontFamily="sans-serif">{lbl}</text>
          </g>
        );
      })}
      {/* Series */}
      {series.map(s => {
        if (!s.data.length) return null;
        const sorted = [...s.data].sort((a, b) => a.at.localeCompare(b.at));
        const topPts = sorted.map(p => `${sx(new Date(p.at).getTime())},${sy(p.max)}`).join(' ');
        const botPts = [...sorted].reverse().map(p => `${sx(new Date(p.at).getTime())},${sy(p.min)}`).join(' ');
        const lineD = sorted.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(new Date(p.at).getTime())} ${sy(p.max)}`).join(' ');
        return (
          <g key={s.label}>
            <polygon points={`${topPts} ${botPts}`} fill={s.color} fillOpacity={0.1} stroke="none" />
            <path d={lineD} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {sorted.map(p => {
              const x = sx(new Date(p.at).getTime());
              const yp = sy(p.max);
              const ym = sy(p.min);
              return (
                <g key={p.at}>
                  {p.min !== p.max && <line x1={x} y1={ym} x2={x} y2={yp} stroke={s.color} strokeWidth="1.5" strokeOpacity="0.4" />}
                  <circle cx={x} cy={yp} r={4} fill={s.color} />
                  {p.min !== p.max && <circle cx={x} cy={ym} r={2.5} fill={s.color} fillOpacity={0.5} />}
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function FineBoardContent() {
  const router = useRouter();
  const [systems, setSystems] = useState<SysWithTimeline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.systems.list()
      .then(d => setSystems(d as SysWithTimeline[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const systemsWithData = useMemo(
    () => systems.filter(s => (s.sanction_timeline ?? []).length > 0),
    [systems]
  );

  const series = useMemo(
    () => systemsWithData.map((s, i) => ({
      label: s.tool_name,
      color: COLORS[i % COLORS.length],
      data: s.sanction_timeline ?? [],
    })),
    [systemsWithData]
  );

  // Summary stats
  const { initialMax, currentMax, initialMin, currentMin } = useMemo(() => {
    let initMax = 0, curMax = 0, initMin = 0, curMin = 0;
    for (const s of systemsWithData) {
      const tl = [...(s.sanction_timeline ?? [])].sort((a, b) => a.at.localeCompare(b.at));
      if (tl.length > 0) {
        initMax += tl[0].max;
        initMin += tl[0].min;
        curMax += tl[tl.length - 1].max;
        curMin += tl[tl.length - 1].min;
      }
    }
    return { initialMax: initMax, currentMax: curMax, initialMin: initMin, currentMin: curMin };
  }, [systemsWithData]);

  const reduction = initialMax > 0 ? Math.round(((initialMax - currentMax) / initialMax) * 100) : 0;
  const savedMax = initialMax - currentMax;

  if (loading) return <div className="db-loading"><div className="spin" /></div>;

  const isEmpty = systemsWithData.length === 0;

  return (
    <div className="inv-page">
      <div className="inv-header">
        <div>
          <h1 className="inv-title">Fine Estimation Board</h1>
          <p className="inv-sub">Storico dell&apos;esposizione sanzionatoria nel tempo</p>
        </div>
      </div>

      {isEmpty ? (
        <div className="fines-empty">
          <div className="fines-empty-icon">📈</div>
          <h3>Nessun dato ancora</h3>
          <p>Esegui il primo Compliance Check su un sistema AI per iniziare a tracciare l&apos;andamento delle sanzioni nel tempo.</p>
          <a href="/dashboard/inventory" className="btn-add-system">Vai all&apos;AI Inventory →</a>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="fines-summary">
            <div className="fines-stat">
              <div className="fines-stat-label">Al primo check</div>
              <div className="fines-stat-val fines-stat-danger">{fmtEur(initialMax)}</div>
              <div className="fines-stat-sub">da {fmtEur(initialMin)}</div>
            </div>
            <div className="fines-stat">
              <div className="fines-stat-label">Esposizione attuale</div>
              <div className={`fines-stat-val ${currentMax === 0 ? 'fines-stat-ok' : 'fines-stat-warn'}`}>{fmtEur(currentMax)}</div>
              <div className="fines-stat-sub">da {fmtEur(currentMin)}</div>
            </div>
            <div className="fines-stat">
              <div className="fines-stat-label">Riduzione ottenuta</div>
              <div className={`fines-stat-val ${reduction > 0 ? 'fines-stat-ok' : 'fines-stat-dim'}`}>
                {reduction > 0 ? `-${reduction}%` : '—'}
              </div>
              {savedMax > 0 && <div className="fines-stat-sub">{fmtEur(savedMax)} risparmio stimato</div>}
            </div>
          </div>

          {/* Aggregate chart */}
          <div className="fines-section">
            <div className="fines-section-head">
              <h2 className="fines-section-title">📊 Andamento aggregato — tutti i sistemi</h2>
            </div>
            <div className="fines-chart-wrap">
              <SanctionChart series={series} />
            </div>
            <div className="fines-legend">
              {series.map(s => (
                <span key={s.label} className="fines-legend-item">
                  <span className="fines-legend-dot" style={{ background: s.color }} />
                  {s.label}
                </span>
              ))}
              <span className="fines-legend-sep" />
              <span className="fines-legend-source">🔍 check iniziale</span>
              <span className="fines-legend-source">📄 documento generato</span>
              <span className="fines-legend-source">☑ dichiarazione</span>
            </div>
          </div>

          {/* Per-system charts */}
          <div className="fines-section">
            <h2 className="fines-section-title">Sistemi AI — timeline individuale</h2>
            <div className="fines-sys-grid">
              {systemsWithData.map((s, i) => {
                const tl = [...(s.sanction_timeline ?? [])].sort((a, b) => a.at.localeCompare(b.at));
                const first = tl[0];
                const last = tl[tl.length - 1];
                const red = first?.max > 0 ? Math.round(((first.max - last.max) / first.max) * 100) : 0;
                const color = COLORS[i % COLORS.length];
                return (
                  <div key={s.system_id} className="fines-sys-card">
                    <div className="fines-sys-card-head">
                      <div>
                        <div className="fines-sys-name">{s.tool_name}</div>
                        {s.vendor && <div className="fines-sys-vendor">{s.vendor}</div>}
                      </div>
                      <div className="fines-sys-stats">
                        <span className="fines-sys-cur" style={{ color }}>
                          {fmtEur(last.max)}
                        </span>
                        {red > 0 && (
                          <span className="fines-sys-red">-{red}%</span>
                        )}
                      </div>
                    </div>
                    <SanctionChart
                      series={[{ label: s.tool_name, color, data: s.sanction_timeline ?? [] }]}
                      compact
                    />
                    <div className="fines-sys-card-foot">
                      <span>{tl.length} evento{tl.length !== 1 ? 'i' : 'o'}</span>
                      <button
                        className="fines-sys-link"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                        onClick={() => router.push(`/dashboard/system?id=${s.system_id}&view=fines`)}
                      >
                        Dettaglio →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

    </div>
  );
}

export default function FineBoardPage() {
  return (
    <Suspense fallback={<div className="db-loading"><div className="spin" /></div>}>
      <FineBoardContent />
    </Suspense>
  );
}
