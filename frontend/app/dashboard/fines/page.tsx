'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

// ── Interfaces ────────────────────────────────────────────────────────────────

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

interface AggPoint {
  ts: number;
  sumMax: number;
  sumMin: number;
  deltaMax: number;
  toolsChanged: string[];
  dominantSource: 'check' | 'document' | 'checklist' | 'initial';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SYS_COLORS = [
  '#6EE7B7', '#93C5FD', '#FCA5A5', '#FDE68A',
  '#C4B5FD', '#A5F3FC', '#FBD38D', '#F9A8D4',
];

function fmtEur(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (n >= 1_000) return `€${Math.round(n / 1_000)}K`;
  return n > 0 ? `€${n.toLocaleString('it-IT')}` : '€0';
}

function niceYTicks(maxVal: number, count = 5): number[] {
  if (maxVal <= 0) return [0, 5000, 10000, 15000, 20000];
  const rough = maxVal / (count - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const nice = [1, 2, 2.5, 5, 10].map(f => f * mag).find(f => f >= rough) ?? rough;
  const ticks: number[] = [];
  for (let i = 0; i * nice <= maxVal * 1.2; i++) ticks.push(i * nice);
  return ticks.slice(0, count + 2);
}

// Same logic as inventory/page.tsx — values perfectly aligned with passport cards
function computeEffectiveExposure(sys: SysWithTimeline): { min: number; max: number } {
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
  } catch { return { min: 0, max: 0 }; }
}

// Aggregate with per-article deduplication across tools
function computeAggExposure(systems: SysWithTimeline[]): { min: number; max: number } {
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

function buildAggTimeline(systems: SysWithTimeline[]): AggPoint[] {
  // Group by calendar day (UTC YYYY-MM-DD) — prevents multiple overlapping points same day
  const allDays = new Set<string>();
  for (const sys of systems) {
    for (const snap of sys.sanction_timeline ?? []) {
      allDays.add(snap.at.slice(0, 10));
    }
  }
  const sortedDays = Array.from(allDays).sort();

  const raw = sortedDays.map(day => {
    const artMap = new Map<string, { min: number; max: number }>();
    const toolsChanged: string[] = [];
    let dominantSource: AggPoint['dominantSource'] = 'initial';

    for (const sys of systems) {
      const tl = [...(sys.sanction_timeline ?? [])].sort((a, b) => a.at.localeCompare(b.at));
      // Latest snap on or before this day
      let last: SanctionSnap | null = null;
      for (const snap of tl) {
        if (snap.at.slice(0, 10) <= day) last = snap;
      }
      if (!last || !sys.last_article_sanctions) continue;

      if (last.at.slice(0, 10) === day) {
        toolsChanged.push(sys.tool_name);
        dominantSource = last.source as AggPoint['dominantSource'];
      }
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

    const vals = Array.from(artMap.values());
    const sumMax = vals.reduce((s, v) => s + v.max, 0);
    const sumMin = vals.reduce((s, v) => s + v.min, 0);
    // UTC noon → always displays as the correct date in IT timezone
    const ts = new Date(day + 'T12:00:00Z').getTime();
    return { ts, sumMax, sumMin, deltaMax: 0, toolsChanged, dominantSource };
  });

  return raw.map((pt, i) => ({
    ...pt,
    deltaMax: i === 0 ? pt.sumMax : pt.sumMax - raw[i - 1].sumMax,
  }));
}

// ── Aggregate step-line chart ─────────────────────────────────────────────────

function AggChart({ aggPts, mode, systems }: { aggPts: AggPoint[]; mode: 'max' | 'min'; systems: SysWithTimeline[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const VW = 900, VH = 320;
  const ML = 72, MR = 28, MT = 52, MB = 44;
  const PW = VW - ML - MR, PH = VH - MT - MB;
  const clipId = 'agg-clip';

  if (aggPts.length === 0) return (
    <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.22)', fontSize: 13, fontStyle: 'italic' }}>
      Nessun dato — esegui un Compliance Check per tracciare l&apos;andamento
    </div>
  );

  // Always use both max and min for yMax so secondary line never overflows
  const absMax = Math.max(...aggPts.map(p => Math.max(p.sumMax, p.sumMin)), 1);
  const yTicks = niceYTicks(absMax);
  const yMax   = (yTicks[yTicks.length - 1] ?? absMax) * 1.0;

  const nowTs  = Date.now();
  const rawMin = aggPts[0].ts;
  const rawMax = Math.max(nowTs, aggPts[aggPts.length - 1].ts);
  const span   = rawMax - rawMin || 86_400_000 * 7;
  const minTs  = rawMin - span * 0.05;
  const maxTs  = rawMax + span * 0.03;

  const sx  = (ts: number) => ML + ((ts - minTs) / (maxTs - minTs)) * PW;
  const sy  = (v: number)  => MT + PH - Math.min(v / yMax, 1) * PH;
  const f   = (n: number)  => n.toFixed(1);

  const maxVals = aggPts.map(p => p.sumMax);
  const minVals = aggPts.map(p => p.sumMin);
  const primVals = mode === 'max' ? maxVals : minVals;
  const secVals  = mode === 'max' ? minVals : maxVals;

  // Straight-line path connecting all event points, then extends flat to today
  function linePath(vals: number[]): string {
    if (vals.length === 0) return '';
    let d = `M ${f(sx(aggPts[0].ts))} ${f(sy(vals[0]))}`;
    for (let i = 1; i < aggPts.length; i++) {
      d += ` L ${f(sx(aggPts[i].ts))} ${f(sy(vals[i]))}`;
    }
    // extend flat to today
    d += ` L ${f(sx(nowTs))} ${f(sy(vals[vals.length - 1]))}`;
    return d;
  }

  const primD = linePath(primVals);
  const secD  = linePath(secVals);

  const firstX = f(sx(aggPts[0].ts));
  const botY   = f(MT + PH);

  // Close the primary area down to zero
  const areaD = primD + ` V ${botY} H ${firstX} Z`;

  // Band polygon (straight lines, extended to today)
  function buildBandPoly(): string {
    const pts: string[] = [];
    for (let i = 0; i < aggPts.length; i++)
      pts.push(`${f(sx(aggPts[i].ts))},${f(sy(maxVals[i]))}`);
    pts.push(`${f(sx(nowTs))},${f(sy(maxVals[maxVals.length - 1]))}`);
    pts.push(`${f(sx(nowTs))},${f(sy(minVals[minVals.length - 1]))}`);
    for (let i = aggPts.length - 1; i >= 0; i--)
      pts.push(`${f(sx(aggPts[i].ts))},${f(sy(minVals[i]))}`);
    return pts.join(' ');
  }

  const lineColor = mode === 'max' ? '#EF4444' : '#22C55E';

  const xTickCount = Math.min(8, aggPts.length + 2);
  const xTicks = Array.from({ length: xTickCount }, (_, i) =>
    minTs + (i / (xTickCount - 1)) * (maxTs - minTs)
  );

  const TW = 240;

  function getDeduplicatedArtsAt(ts: number): Array<{ art: string; min: number; max: number; tools: string[] }> {
    const dayStr = new Date(ts).toISOString().slice(0, 10); // UTC date of this point
    const artMap = new Map<string, { min: number; max: number; tools: string[] }>();
    for (const sys of systems) {
      const tl = sys.sanction_timeline ?? [];
      if (!tl.some(snap => snap.at.slice(0, 10) <= dayStr)) continue;
      if (!sys.last_article_sanctions) continue;
      try {
        const sanctions: Record<string, { min: number; max: number }> = JSON.parse(sys.last_article_sanctions);
        const checklist = sys.compliance_checklist ?? {};
        for (const [art, val] of Object.entries(sanctions)) {
          const entry = checklist[art];
          const st = typeof entry === 'string' ? entry : (entry as { status?: string })?.status;
          if (st !== 'present') {
            const ex = artMap.get(art) ?? { min: 0, max: 0, tools: [] };
            if (val.max > ex.max) { ex.min = val.min; ex.max = val.max; }
            if (!ex.tools.includes(sys.tool_name)) ex.tools.push(sys.tool_name);
            artMap.set(art, ex);
          }
        }
      } catch { /* ignore */ }
    }
    return Array.from(artMap.entries())
      .map(([art, d]) => ({ art, ...d }))
      .sort((a, b) => b.max - a.max);
  }

  function renderTooltip(idx: number) {
    const pt        = aggPts[idx];
    const px        = sx(pt.ts);
    const py        = sy(primVals[idx]);
    const arts      = getDeduplicatedArtsAt(pt.ts);
    const totalMax  = arts.reduce((s, a) => s + a.max, 0);
    const totalMin  = arts.reduce((s, a) => s + a.min, 0);
    const totalDisp = mode === 'max' ? totalMax : totalMin;
    const maxBarVal = mode === 'max'
      ? (arts[0]?.max ?? 1)
      : Math.max(...arts.map(a => a.min), 1);
    const ROW_H     = 22;
    const TH        = 104 + arts.length * ROW_H + 8;
    const toLeft    = px > ML + PW / 2;
    const tx        = toLeft ? px - 14 - TW : px + 14;
    const ty        = Math.max(MT - 4, Math.min(py - TH / 2, MT + PH - TH));
    const dateStr   = new Date(pt.ts).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
    return (
      <g style={{ pointerEvents: 'none' }}>
        <rect x={f(tx)} y={f(ty)} width={TW} height={TH} rx="10"
          fill="#16161a" stroke="rgba(255,255,255,0.18)" strokeWidth="1"/>

        {/* Date */}
        <text x={f(tx + 14)} y={f(ty + 19)} fill="rgba(255,255,255,0.38)" fontSize="10" fontFamily="sans-serif">{dateStr}</text>

        {/* Big article count */}
        <text x={f(tx + 14)} y={f(ty + 52)} fill="#fff" fontSize="32" fontWeight="900" fontFamily="ui-monospace,monospace">{arts.length}</text>
        <text x={f(tx + 14 + (arts.length > 9 ? 38 : 24))} y={f(ty + 51)} fill="rgba(255,255,255,0.45)" fontSize="11" fontFamily="sans-serif">articoli con gap</text>

        {/* Separator */}
        <line x1={f(tx + 14)} y1={f(ty + 66)} x2={f(tx + TW - 14)} y2={f(ty + 66)} stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>

        {/* Total amount */}
        <text x={f(tx + 14)} y={f(ty + 83)} fill="rgba(255,255,255,0.38)" fontSize="10" fontFamily="sans-serif">{mode === 'max' ? 'max' : 'min'} deduplicato:</text>
        <text x={f(tx + TW - 14)} y={f(ty + 83)} fill={lineColor} fontSize="13" fontWeight="800" fontFamily="ui-monospace,monospace" textAnchor="end">{fmtEur(totalDisp)}</text>

        {/* Separator */}
        <line x1={f(tx + 14)} y1={f(ty + 92)} x2={f(tx + TW - 14)} y2={f(ty + 92)} stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>

        {/* Article rows */}
        {arts.map((a, ri) => {
          const rowY    = ty + 104 + ri * ROW_H;
          const dispVal = mode === 'max' ? a.max : a.min;
          const barW    = maxBarVal > 0 ? (dispVal / maxBarVal) * 78 : 0;
          const artLbl  = a.art.replace('Art. ', 'Art. ');
          return (
            <g key={a.art}>
              <text x={f(tx + 14)} y={f(rowY + 13)} fill="rgba(255,255,255,0.65)" fontSize="10" fontWeight="700" fontFamily="ui-monospace,monospace">{artLbl}</text>
              <rect x={f(tx + 74)} y={f(rowY + 3)} width={78} height={10} rx="3" fill="rgba(255,255,255,0.06)"/>
              <rect x={f(tx + 74)} y={f(rowY + 3)} width={f(barW)} height={10} rx="3" fill={lineColor} fillOpacity="0.60"/>
              <text x={f(tx + TW - 14)} y={f(rowY + 13)} fill="rgba(255,255,255,0.80)" fontSize="10" fontWeight="600" fontFamily="ui-monospace,monospace" textAnchor="end">{fmtEur(dispVal)}</text>
            </g>
          );
        })}
      </g>
    );
  }

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <clipPath id={clipId}>
          <rect x={ML} y={MT - 8} width={PW} height={PH + 8}/>
        </clipPath>
        <linearGradient id="agg-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={lineColor} stopOpacity="0.28"/>
          <stop offset="60%"  stopColor={lineColor} stopOpacity="0.07"/>
          <stop offset="100%" stopColor={lineColor} stopOpacity="0.0"/>
        </linearGradient>
        <filter id="ln-glow" x="-10%" y="-200%" width="120%" height="500%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Y grid */}
      {yTicks.map(t => (
        <line key={t} x1={ML} y1={f(sy(t))} x2={ML + PW} y2={f(sy(t))}
          stroke="rgba(255,255,255,0.045)" strokeWidth="1" strokeDasharray="3 7"/>
      ))}
      {/* Axes */}
      <line x1={ML} y1={MT} x2={ML} y2={MT + PH} stroke="rgba(255,255,255,0.09)" strokeWidth="1"/>
      <line x1={ML} y1={MT + PH} x2={ML + PW} y2={MT + PH} stroke="rgba(255,255,255,0.09)" strokeWidth="1"/>

      {/* Y labels */}
      {yTicks.map(t => (
        <text key={t} x={ML - 10} y={f(sy(t) + 4)} textAnchor="end"
          fill="rgba(255,255,255,0.26)" fontSize="10" fontFamily="ui-monospace,monospace">
          {fmtEur(t)}
        </text>
      ))}
      {/* X labels */}
      {xTicks.map((ts, i) => (
        <text key={i} x={f(sx(ts))} y={MT + PH + 18} textAnchor="middle"
          fill="rgba(255,255,255,0.26)" fontSize="10" fontFamily="sans-serif">
          {new Date(ts).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
        </text>
      ))}

      {/* Clipped drawing area */}
      <g clipPath={`url(#${clipId})`}>
        {/* Min/max band */}
        <polygon points={buildBandPoly()} fill={lineColor} fillOpacity="0.06" stroke="none"/>
        {/* Area fill under primary */}
        <path d={areaD} fill="url(#agg-grad)" stroke="none"/>
        {/* Secondary (dashed) line */}
        <path d={secD} fill="none"
          stroke={lineColor} strokeWidth="1.4" strokeOpacity="0.30"
          strokeDasharray="5 4" strokeLinejoin="round"/>
        {/* Primary glow */}
        <path d={primD} fill="none" stroke={lineColor} strokeWidth="9" strokeOpacity="0.10"
          strokeLinejoin="round" filter="url(#ln-glow)"/>
        {/* Primary line */}
        <path d={primD} fill="none" stroke={lineColor} strokeWidth="2.5"
          strokeLinejoin="round" filter="url(#ln-glow)"/>
      </g>

      {aggPts.map((pt, i) => {
        const x     = sx(pt.ts);
        const yVal  = sy(primVals[i]);
        const isHov = hoveredIdx === i;
        return (
          <g key={i}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            style={{ cursor: 'pointer' }}>
            <circle cx={f(x)} cy={f(yVal)} r={18} fill="transparent"/>
            <circle cx={f(x)} cy={f(yVal)} r={isHov ? 13 : 9}
              fill={isHov ? 'rgba(96,165,250,0.20)' : 'rgba(96,165,250,0.10)'}/>
            <circle cx={f(x)} cy={f(yVal)} r={isHov ? 6 : 5}
              fill="#60A5FA" stroke="#0C0C0E" strokeWidth="2"/>
            {pt.toolsChanged.length > 0 && (
              <text x={f(x)} y={f(yVal + 22)} textAnchor="middle"
                fill="rgba(255,255,255,0.40)" fontSize="9" fontFamily="sans-serif">
                {pt.toolsChanged[0].length > 14 ? pt.toolsChanged[0].slice(0, 13) + '…' : pt.toolsChanged[0]}
                {pt.toolsChanged.length > 1 ? ` +${pt.toolsChanged.length - 1}` : ''}
              </text>
            )}
          </g>
        );
      })}

      {hoveredIdx !== null && renderTooltip(hoveredIdx)}
    </svg>
  );
}

// ── Per-system sparkline ──────────────────────────────────────────────────────

function Sparkline({ data, color, sysId }: { data: SanctionSnap[]; color: string; sysId: string }) {
  const W = 260, H = 68, ML = 6, MR = 6, MT = 6, MB = 6;
  const PW = W - ML - MR, PH = H - MT - MB;

  if (data.length < 2) return (
    <div style={{ height: H, display: 'flex', alignItems: 'center', padding: '0 8px', color: 'rgba(255,255,255,0.2)', fontSize: 11, fontStyle: 'italic' }}>
      {data.length === 1 ? '1 rilevazione — avvia un secondo check per vedere il trend' : 'Nessun dato storico'}
    </div>
  );

  const sorted = [...data].sort((a, b) => a.at.localeCompare(b.at));
  const allTs  = sorted.map(p => new Date(p.at).getTime());
  let minTs = Math.min(...allTs), maxTs = Math.max(...allTs);
  const sp = maxTs - minTs || 86_400_000;
  minTs -= sp * 0.04; maxTs += sp * 0.04;

  const yMax = Math.max(...sorted.map(p => p.max)) * 1.25 || 10_000;
  const sx = (ts: number) => ML + ((ts - minTs) / (maxTs - minTs)) * PW;
  const sy = (v: number)  => MT + PH - Math.min(v / yMax, 1) * PH;
  const f  = (n: number)  => n.toFixed(1);

  // Step path for sparkline
  function stepD(vals: number[]): string {
    let d = `M ${f(sx(allTs[0]))} ${f(sy(vals[0]))}`;
    for (let i = 1; i < sorted.length; i++) {
      d += ` H ${f(sx(allTs[i]))} V ${f(sy(vals[i]))}`;
    }
    return d;
  }

  const maxD = stepD(sorted.map(p => p.max));
  const botY = f(MT + PH);
  const areaD = maxD + ` V ${botY} H ${f(sx(allTs[0]))} Z`;
  const gradId = `sp-${sysId.replace(/[^a-z0-9]/gi, '').slice(-8)}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.28"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.0"/>
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} stroke="none"/>
      <path d={maxD} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      {sorted.map((p, i) => {
        const dir = i === 0 ? 'neutral' : sorted[i].max > sorted[i - 1].max ? 'up' : sorted[i].max < sorted[i - 1].max ? 'down' : 'neutral';
        const dotC = dir === 'up' ? '#EF4444' : dir === 'down' ? '#22C55E' : color;
        return (
          <circle key={i} cx={sx(allTs[i])} cy={sy(p.max)} r={3.5}
            fill={dotC} stroke="#0C0C0E" strokeWidth="1.5"/>
        );
      })}
    </svg>
  );
}

// ── Rotating KPI card (like AIPI DynamicWidget) ───────────────────────────────

function RotatingFBECard({ firstCheck, systems, systemsForCards }: {
  firstCheck: { min: number; max: number };
  systems: SysWithTimeline[];
  systemsForCards: SysWithTimeline[];
}) {
  const [slide, setSlide] = useState(0);
  const [fading, setFading] = useState(false);
  const SLIDES = 3;

  useEffect(() => {
    const t = setInterval(() => {
      setFading(true);
      setTimeout(() => { setSlide(s => (s + 1) % SLIDES); setFading(false); }, 350);
    }, 5500);
    return () => clearInterval(t);
  }, []);

  const topTool = useMemo(() => {
    let top: SysWithTimeline | null = null, topMax = 0;
    for (const sys of systemsForCards) {
      const { max } = computeEffectiveExposure(sys);
      if (max > topMax) { topMax = max; top = sys; }
    }
    return top ? { name: top.tool_name, max: topMax } : null;
  }, [systemsForCards]);

  const topArt = useMemo(() => {
    const artMap = new Map<string, { max: number }>();
    for (const sys of systems) {
      if (!sys.last_article_sanctions) continue;
      try {
        const sanctions: Record<string, { min: number; max: number }> = JSON.parse(sys.last_article_sanctions);
        const checklist = sys.compliance_checklist ?? {};
        for (const [art, val] of Object.entries(sanctions)) {
          const entry = checklist[art];
          const st = typeof entry === 'string' ? entry : (entry as { status?: string })?.status;
          if (st !== 'present') {
            const ex = artMap.get(art) ?? { max: 0 };
            ex.max = Math.max(ex.max, val.max);
            artMap.set(art, ex);
          }
        }
      } catch { /* ignore */ }
    }
    let top: { art: string; max: number } | null = null;
    for (const [art, { max }] of Array.from(artMap.entries())) {
      if (!top || max > top.max) top = { art, max };
    }
    return top;
  }, [systems]);

  const anim = { opacity: fading ? 0 : 1, transform: fading ? 'translateY(6px)' : 'translateY(0)', transition: 'opacity .35s ease, transform .35s ease' };
  const lbl  = { fontSize: 10, fontWeight: 700 as const, color: 'var(--dim)', letterSpacing: 1.5, textTransform: 'uppercase' as const, marginBottom: 8 };

  return (
    <div className="inv-kpi-card" style={{ position: 'relative', overflow: 'hidden', paddingBottom: 28 }}>
      <div style={anim}>
        {slide === 0 && (
          <>
            <div style={lbl}>Al primo check</div>
            <div style={{ fontSize: 32, fontWeight: 900, lineHeight: 1, letterSpacing: -1.5, color: firstCheck.max > 0 ? '#EF4444' : 'var(--dim)' }}>
              {firstCheck.max > 0 ? fmtEur(firstCheck.max) : '—'}
            </div>
            {firstCheck.min > 0 && firstCheck.min !== firstCheck.max && (
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>da {fmtEur(firstCheck.min)}</div>
            )}
          </>
        )}
        {slide === 1 && (
          <>
            <div style={lbl}>Tool più esposto</div>
            {topTool ? (
              <>
                <div style={{ fontSize: topTool.name.length > 14 ? 15 : 20, fontWeight: 900, lineHeight: 1.2, color: 'var(--text)', marginBottom: 6 }}>
                  {topTool.name}
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: -1, color: '#EF4444' }}>{fmtEur(topTool.max)}</div>
              </>
            ) : <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--dim)' }}>—</div>}
          </>
        )}
        {slide === 2 && (
          <>
            <div style={lbl}>Articolo più a rischio</div>
            {topArt ? (
              <>
                <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1, letterSpacing: -1, color: 'var(--text)', marginBottom: 8 }}>
                  {topArt.art}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5, color: '#EF4444' }}>{fmtEur(topArt.max)}</div>
              </>
            ) : <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--dim)' }}>—</div>}
          </>
        )}
      </div>
      <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 5 }}>
        {Array.from({ length: SLIDES }, (_, i) => (
          <div key={i} style={{ width: i === slide ? 16 : 5, height: 5, borderRadius: 3, background: i === slide ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.13)', transition: 'all .3s' }}/>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function FineBoardContent() {
  const router = useRouter();
  const [systems, setSystems] = useState<SysWithTimeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartMode, setChartMode] = useState<'max' | 'min'>('max');

  useEffect(() => {
    api.systems.list()
      .then(d => setSystems(d as SysWithTimeline[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const systemsForCards = useMemo(
    () => systems.filter(s => s.last_article_sanctions),
    [systems]
  );
  const systemsWithTimeline = useMemo(
    () => systems.filter(s => (s.sanction_timeline ?? []).length > 0),
    [systems]
  );

  const aggCurrent  = useMemo(() => computeAggExposure(systems), [systems]);
  const aggTimeline = useMemo(() => buildAggTimeline(systemsWithTimeline), [systemsWithTimeline]);

  // Next Best Action: article with fewest tool-violations; tie-break by highest savings
  const nextBestAction = useMemo(() => {
    const artMap = new Map<string, { max: number; min: number; tools: string[] }>();
    for (const sys of systemsForCards) {
      if (!sys.last_article_sanctions) continue;
      try {
        const sanctions = JSON.parse(sys.last_article_sanctions) as Record<string, { min: number; max: number }>;
        const checklist = sys.compliance_checklist ?? {};
        for (const [art, val] of Object.entries(sanctions)) {
          const entry = checklist[art];
          const st = typeof entry === 'string' ? entry : (entry as { status?: string })?.status;
          if (st !== 'present') {
            const ex = artMap.get(art) ?? { max: 0, min: 0, tools: [] };
            if (val.max > ex.max) { ex.max = val.max; ex.min = val.min; }
            if (!ex.tools.includes(sys.tool_name)) ex.tools.push(sys.tool_name);
            artMap.set(art, ex);
          }
        }
      } catch { /* ignore */ }
    }
    if (artMap.size === 0) return null;
    return Array.from(artMap.entries())
      .map(([art, d]) => ({ art, ...d }))
      .sort((a, b) => a.tools.length - b.tools.length || b.max - a.max)[0] ?? null;
  }, [systemsForCards]);

  // First check = aggregate at the very first event, not the sum of each system's first entry
  const firstCheck = useMemo(() => {
    if (aggTimeline.length === 0) return { min: 0, max: 0 };
    return { min: aggTimeline[0].sumMin, max: aggTimeline[0].sumMax };
  }, [aggTimeline]);
  const reduction   = firstCheck.max > 0 ? Math.round(((firstCheck.max - aggCurrent.max) / firstCheck.max) * 100) : 0;
  const saved       = Math.max(0, firstCheck.max - aggCurrent.max);

  const violatedArticles = useMemo(() => {
    const arts = new Set<string>();
    for (const sys of systems) {
      if (!sys.last_article_sanctions) continue;
      try {
        const sanctions = JSON.parse(sys.last_article_sanctions) as Record<string, { min: number; max: number }>;
        const checklist = sys.compliance_checklist ?? {};
        for (const art of Object.keys(sanctions)) {
          const entry = checklist[art];
          const st = typeof entry === 'string' ? entry : (entry as { status?: string })?.status;
          if (st !== 'present') arts.add(art);
        }
      } catch { /* ignore */ }
    }
    return arts.size;
  }, [systems]);

  if (loading) return <div className="db-loading"><div className="spin"/></div>;

  const isEmpty = systemsForCards.length === 0 && systemsWithTimeline.length === 0;

  return (
    <div className="inv-page">
      <div className="inv-header">
        <div>
          <h1 className="inv-title">FBE — Fine Estimation Board</h1>
          <p className="inv-sub">Stima esposizione sanzionatoria AI Act · aggregata e per tool</p>
        </div>
        <a href="/dashboard/inventory" style={{ fontSize: 12, color: 'var(--dim)', fontWeight: 600, textDecoration: 'none', alignSelf: 'center' }}>
          ← AIPI Inventory
        </a>
      </div>

      {isEmpty ? (
        <div className="fines-empty">
          <div className="fines-empty-icon">📈</div>
          <h3>Nessun dato ancora</h3>
          <p>Esegui il primo Compliance Check su un sistema AI per iniziare a tracciare l&apos;andamento sanzionatorio.</p>
          <a href="/dashboard/inventory" className="btn-add-system">Vai all&apos;AI Inventory →</a>
        </div>
      ) : (
        <>
          {/* ── Main: chart left + 2×2 KPI grid right ── */}
          <div className="fbe-overview-panel">
          <div style={{ display: 'grid', gridTemplateColumns: aggTimeline.length > 0 ? '1fr 296px' : '1fr', gap: 12 }}>

            {/* Chart column */}
            {aggTimeline.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,.09)', borderTop: '1px solid rgba(255,255,255,.14)', borderRadius: 16, padding: '18px 22px', boxShadow: '0 0 0 1px rgba(255,255,255,.02) inset, 0 4px 16px rgba(0,0,0,.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', letterSpacing: -0.5 }}>Andamento aggregato — portafoglio AI</div>
                    <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 3 }}>
                      <span style={{ color: chartMode === 'max' ? '#EF4444' : '#22C55E', fontWeight: 700 }}>●</span>{' '}
                      hover punto per gap · linea tratteggiata = stima {chartMode === 'max' ? 'minima' : 'massima'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 3, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, padding: 3, flexShrink: 0 }}>
                    <button onClick={() => setChartMode('max')} style={{
                      fontSize: 11, fontWeight: 800, padding: '5px 13px', borderRadius: 7, border: 'none',
                      cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 0.6, transition: 'all .18s',
                      background: chartMode === 'max' ? '#EF4444' : 'transparent',
                      color: chartMode === 'max' ? '#fff' : 'var(--dim)',
                    }}>MAX</button>
                    <button onClick={() => setChartMode('min')} style={{
                      fontSize: 11, fontWeight: 800, padding: '5px 13px', borderRadius: 7, border: 'none',
                      cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 0.6, transition: 'all .18s',
                      background: chartMode === 'min' ? '#22C55E' : 'transparent',
                      color: chartMode === 'min' ? '#052e16' : 'var(--dim)',
                    }}>MIN</button>
                  </div>
                </div>

                <AggChart aggPts={aggTimeline} mode={chartMode} systems={systems}/>

                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', paddingTop: 10, borderTop: '1px solid rgba(255,255,255,.05)', marginTop: 2 }}>
                  {systemsWithTimeline.map((s, i) => (
                    <span key={s.system_id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'rgba(255,255,255,0.40)' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: SYS_COLORS[i % SYS_COLORS.length], display: 'inline-block' }}/>
                      {s.tool_name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 2×2 KPI grid */}
            <div style={{ display: 'grid', gridTemplateColumns: aggTimeline.length > 0 ? '1fr 1fr' : 'repeat(4, 1fr)', gridTemplateRows: aggTimeline.length > 0 ? '1fr 1fr' : undefined, gap: 12 }}>

              {/* Card 1: Esposizione attuale */}
              <div className="inv-kpi-card">
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--dim)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>Esposizione attuale</div>
                <div style={{ fontSize: 32, fontWeight: 900, lineHeight: 1, letterSpacing: -1.5, color: aggCurrent.max > 0 ? '#EF4444' : '#22C55E' }}>
                  {fmtEur(aggCurrent.max)}
                </div>
                {aggCurrent.min > 0 && aggCurrent.min !== aggCurrent.max && (
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
                    min <strong style={{ color: 'var(--text2)' }}>{fmtEur(aggCurrent.min)}</strong>
                    <span style={{ margin: '0 4px', color: 'var(--dim)' }}>—</span>
                    max <strong style={{ color: '#EF4444' }}>{fmtEur(aggCurrent.max)}</strong>
                  </div>
                )}
                {aggCurrent.max === 0 && <div style={{ fontSize: 11, color: '#22C55E', marginTop: 8, fontWeight: 600 }}>✓ Nessuna violazione</div>}
                <div style={{ fontSize: 9, color: 'var(--dim)', marginTop: 6, letterSpacing: 0.3 }}>Art. 99–101 AI Act</div>
              </div>

              {/* Card 2: Riduzione ottenuta */}
              <div className="inv-kpi-card">
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--dim)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>Riduzione</div>
                <div style={{ fontSize: 32, fontWeight: 900, lineHeight: 1, letterSpacing: -1.5, color: reduction > 0 ? '#22C55E' : 'var(--dim)' }}>
                  {reduction > 0 ? `-${reduction}%` : '—'}
                </div>
                {saved > 0
                  ? <div style={{ fontSize: 11, color: '#22C55E', marginTop: 8, fontWeight: 600 }}>{fmtEur(saved)} salvati</div>
                  : <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 8 }}>nessuna riduzione ancora</div>
                }
              </div>

              {/* Card 3: Articoli violati */}
              <div className="inv-kpi-card">
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--dim)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>Articoli violati</div>
                <div style={{ fontSize: 32, fontWeight: 900, lineHeight: 1, letterSpacing: -1.5, color: violatedArticles > 0 ? 'var(--text)' : '#22C55E' }}>
                  {violatedArticles}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
                  {violatedArticles > 0 ? `su ${systemsForCards.length} tool analizzat${systemsForCards.length !== 1 ? 'i' : 'o'}` : 'nessuna violazione'}
                </div>
              </div>

              {/* Card 4: Rotating */}
              <RotatingFBECard firstCheck={firstCheck} systems={systems} systemsForCards={systemsForCards}/>
            </div>
          </div>

          {/* ── Next Best Action ── */}
          {nextBestAction && (
            <div style={{ marginTop: 12, padding: '20px 26px', borderRadius: 16, background: 'linear-gradient(145deg,rgba(28,28,42,0.98) 0%,rgba(18,18,28,1) 100%)', border: '1px solid rgba(255,255,255,.12)', borderTop: '1px solid rgba(255,255,255,.19)', boxShadow: '0 0 0 1px rgba(255,255,255,.04) inset,0 8px 24px rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
              {/* Icon */}
              <div style={{ flexShrink: 0, width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                🎯
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5, color: 'var(--text)' }}>Next Best Action</span>
                  <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 6, background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)', fontWeight: 600, border: '1px solid rgba(255,255,255,0.10)' }}>
                    {nextBestAction.tools.length === 1 ? '1 occorrenza' : `${nextBestAction.tools.length} occorrenze`}
                  </span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 5 }}>
                  Risolvi il gap su <span style={{ color: 'rgba(255,255,255,0.90)', fontWeight: 900 }}>{nextBestAction.art}</span>
                  {nextBestAction.tools.length === 1
                    ? <> in <span style={{ color: 'rgba(255,255,255,0.65)' }}>{nextBestAction.tools[0]}</span></>
                    : <> su {nextBestAction.tools.length} tool ({nextBestAction.tools.slice(0, 2).join(', ')}{nextBestAction.tools.length > 2 ? ` +${nextBestAction.tools.length - 2}` : ''})</>
                  }
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
                  {nextBestAction.tools.length === 1
                    ? `Questo articolo è violato da un solo tool — chiudendo questo gap elimini completamente il suo contributo all'esposizione aggregata.`
                    : `Questo articolo ha il minor numero di occorrenze tra i tool. Risolvendolo riduci l'esposizione aggregata in modo efficiente.`
                  }
                </div>
              </div>

              {/* Savings */}
              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 6 }}>Risparmio potenziale</div>
                <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: -1.5, color: '#EF4444', lineHeight: 1 }}>{fmtEur(nextBestAction.max)}</div>
                {nextBestAction.min > 0 && nextBestAction.min !== nextBestAction.max && (
                  <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>min {fmtEur(nextBestAction.min)}</div>
                )}
              </div>
            </div>
          )}
          </div>{/* /fbe-overview-panel */}

          {/* ── Disclaimer ── */}
          <div style={{ marginBottom: 28, padding: '12px 18px', background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.13)', borderRadius: 10, fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>
            <strong style={{ color: 'rgba(251,191,36,0.75)', marginRight: 6 }}>⚠ Nota metodologica —</strong>
            L&apos;esposizione aggregata può essere <strong style={{ color: 'rgba(255,255,255,0.65)' }}>inferiore alla somma delle singole esposizioni tool</strong>:
            quando più sistemi violano lo stesso articolo dell&apos;AI Act, la sanzione per quell&apos;articolo si applica <strong style={{ color: 'rgba(255,255,255,0.65)' }}>una sola volta</strong>,
            pari al valore massimo tra i tool coinvolti. Il grafico mostra la somma per sistema; il totale in alto usa la stima corretta deduplicata.
          </div>

          {/* ── Per-tool cards ── */}
          {systemsForCards.length > 0 && (
            <>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.2, marginBottom: 16 }}>Esposizione per tool</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
                {systemsForCards.map((sys, i) => {
                  const curExp = computeEffectiveExposure(sys);
                  const tl     = [...(sys.sanction_timeline ?? [])].sort((a, b) => a.at.localeCompare(b.at));
                  const firstSnap = tl[0];
                  const red = firstSnap?.max > 0 && curExp.max < firstSnap.max
                    ? Math.round(((firstSnap.max - curExp.max) / firstSnap.max) * 100) : 0;
                  const color   = SYS_COLORS[i % SYS_COLORS.length];
                  const hasGap  = curExp.max > 0;

                  const violatedArts: Array<{ art: string; min: number; max: number }> = [];
                  if (sys.last_article_sanctions) {
                    try {
                      const sanctions = JSON.parse(sys.last_article_sanctions) as Record<string, { min: number; max: number }>;
                      const checklist = sys.compliance_checklist ?? {};
                      for (const [art, val] of Object.entries(sanctions)) {
                        const entry = checklist[art];
                        const st = typeof entry === 'string' ? entry : (entry as { status?: string })?.status;
                        if (st !== 'present') violatedArts.push({ art, ...val });
                      }
                      violatedArts.sort((a, b) => b.max - a.max);
                    } catch { /* ignore */ }
                  }

                  return (
                    <div key={sys.system_id} style={{ background: 'linear-gradient(145deg,rgba(28,28,42,0.98) 0%,rgba(18,18,28,1) 100%)', border: '1px solid rgba(255,255,255,.12)', borderTop: '1px solid rgba(255,255,255,.19)', borderRadius: 18, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 0 0 1px rgba(255,255,255,.04) inset,0 16px 40px rgba(0,0,0,.65),0 4px 12px rgba(0,0,0,.4)' }}>
                      {/* Header */}
                      <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>{sys.tool_name}</div>
                            {sys.vendor && <div style={{ fontSize: 12, color: 'var(--dim)' }}>{sys.vendor}</div>}
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: -1, lineHeight: 1, color: hasGap ? color : '#22C55E' }}>
                              {fmtEur(curExp.max)}
                            </div>
                            {curExp.min > 0 && curExp.min !== curExp.max && (
                              <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2 }}>min {fmtEur(curExp.min)}</div>
                            )}
                            {red > 0 && <div style={{ fontSize: 11, color: '#22C55E', fontWeight: 700, marginTop: 2 }}>−{red}% riduzione</div>}
                          </div>
                        </div>
                        <div style={{ marginTop: 10 }}>
                          {violatedArts.length === 0
                            ? <span style={{ fontSize: 11, color: '#22C55E', fontWeight: 600 }}>✓ Nessuna violazione attiva</span>
                            : violatedArts.length <= 4
                              ? (
                                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                  {violatedArts.map(a => (
                                    <span key={a.art} style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.60)', border: '1px solid rgba(255,255,255,0.10)', whiteSpace: 'nowrap' }}>
                                      {a.art} · {fmtEur(a.max)}
                                    </span>
                                  ))}
                                </div>
                              )
                              : (
                                <div className="art-ticker" style={{ '--ticker-dur': `${Math.max(10, violatedArts.length * 2.2)}s` } as React.CSSProperties}>
                                  <div className="art-ticker-inner">
                                    {[...violatedArts, ...violatedArts].map((a, idx) => (
                                      <span key={idx} style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.60)', border: '1px solid rgba(255,255,255,0.10)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                        {a.art} · {fmtEur(a.max)}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )
                            }
                        </div>
                      </div>

                      {/* Sparkline */}
                      <div style={{ padding: '10px 14px 6px', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                        <Sparkline data={tl} color={color} sysId={sys.system_id}/>
                        {tl.length > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                            <span style={{ fontSize: 10, color: 'var(--dim)' }}>{tl.length} rilevazion{tl.length !== 1 ? 'i' : 'e'}</span>
                            {firstSnap && <span style={{ fontSize: 10, color: 'var(--dim)' }}>Primo check · <span style={{ color: 'var(--muted)' }}>{fmtEur(firstSnap.max)}</span></span>}
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div style={{ padding: '12px 16px', marginTop: 'auto', display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => router.push(`/dashboard/system?id=${sys.system_id}&view=fines`)}
                          style={{ flex: 1, fontSize: 12, fontWeight: 700, padding: '9px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,0.09)', cursor: 'pointer', fontFamily: 'inherit', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.65)', transition: 'all .15s' }}
                          onMouseEnter={e => { const b = e.target as HTMLButtonElement; b.style.background = 'rgba(255,255,255,0.10)'; b.style.color = '#fff'; }}
                          onMouseLeave={e => { const b = e.target as HTMLButtonElement; b.style.background = 'rgba(255,255,255,0.05)'; b.style.color = 'rgba(255,255,255,0.65)'; }}
                        >
                          Dettaglio tool →
                        </button>
                        <button
                          onClick={() => router.push(`/dashboard/system?id=${sys.system_id}`)}
                          title="Apri in AIPI Inventory"
                          style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(96,165,250,0.22)', cursor: 'pointer', fontFamily: 'inherit', background: 'rgba(96,165,250,0.07)', color: '#60A5FA', transition: 'all .15s', lineHeight: 1, display: 'flex', alignItems: 'center', gap: 5 }}
                          onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'rgba(96,165,250,0.18)'; }}
                          onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'rgba(96,165,250,0.07)'; }}
                        >
                          🛂 AIPI
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function FineBoardPage() {
  return (
    <Suspense fallback={<div className="db-loading"><div className="spin"/></div>}>
      <FineBoardContent />
    </Suspense>
  );
}
