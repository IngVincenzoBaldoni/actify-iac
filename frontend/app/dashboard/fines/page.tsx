'use client';

import { Suspense, useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

// ── Interfaces ────────────────────────────────────────────────────────────────

interface SanctionSnap {
  at: string;
  min: number;
  max: number;
  source: 'check' | 'document' | 'checklist';
  articles_in_gap?: Record<string, { min: number; max: number }>;
}

interface SysWithTimeline {
  system_id: string;
  tool_name: string;
  vendor?: string;
  sanction_timeline?: SanctionSnap[];
  compliance_checklist?: Record<string, { status?: string } | string>;
  last_article_sanctions?: string;
}

// ── Turnover estimation (mirrors sanctions.ts) ───────────────────────────────

const EMP_TURNOVER: Record<string, number> = {
  '1-10': 300_000, '11-50': 2_000_000, '51-250': 10_000_000,
  '251-1000': 50_000_000, '1000+': 200_000_000,
};
const REV_MIDPOINTS: Record<string, number> = {
  under_100k: 50_000, '100k_500k': 300_000, '500k_1m': 750_000,
  '1m_3m': 2_000_000, '3m_10m': 6_500_000, '10m_30m': 20_000_000,
  '30m_100m': 65_000_000, '100m_500m': 300_000_000, '500m_1b': 750_000_000,
  over_1b: 3_000_000_000, under_500k: 250_000, '500k_2m': 1_250_000,
  '2m_10m': 6_000_000, '10m_50m': 30_000_000, '50m_250m': 150_000_000,
  over_250m: 500_000_000,
};
const SECTOR_MULT: Record<string, number> = {
  finance: 3, fintech: 3, banking: 3, healthcare: 1.5, tech: 2, legal: 1.5,
  hr: 1, operations: 1, marketing: 0.8,
};
function estimateTurnoverFE(company: Record<string, unknown>): number {
  if (typeof company.annual_revenue_exact === 'number' && company.annual_revenue_exact > 0)
    return company.annual_revenue_exact;
  const range = company.annual_revenue_range as string | undefined;
  if (range && REV_MIDPOINTS[range]) return REV_MIDPOINTS[range];
  const base = EMP_TURNOVER[(company.employees_range as string) ?? ''] ?? 2_000_000;
  const mult = SECTOR_MULT[((company.sector as string) ?? '').toLowerCase()] ?? 1;
  return base * mult;
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
  // Keep generating until the last tick strictly exceeds maxVal so yMax always
  // accommodates the data (avoids dots being capped at the chart top).
  let i = 0;
  while (ticks.length === 0 || ticks[ticks.length - 1] <= maxVal) {
    ticks.push(i++ * nice);
  }
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

// Reconstruct the per-article gap state for a legacy snapshot (one without articles_in_gap).
// Uses the nearest preceding check snapshot as baseline, then removes resolved articles using:
//   - Full-ISO addressed_at: exact comparison (resolved ≤ snapAt → excluded)
//   - Date-only addressed_at: positional ordering (alphabetical tiebreak) — one removal per
//     same-day step-down snapshot, so intermediate points show the correct decreasing count.
function reconstructArticlesInGap(
  sys: SysWithTimeline,
  snapAt: string,
): Record<string, { min: number; max: number }> | null {
  const tl = [...(sys.sanction_timeline ?? [])].sort((a, b) => a.at.localeCompare(b.at));

  const checkSnap = [...tl].reverse().find(
    s => s.source === 'check' && s.articles_in_gap !== undefined && s.at <= snapAt,
  );
  if (!checkSnap?.articles_in_gap) return null;

  const baseline = checkSnap.articles_in_gap;
  const checklist = (sys.compliance_checklist ?? {}) as Record<string, unknown>;

  const resolved: Array<{ art: string; addressed_at: string }> = [];
  for (const [art, entry] of Object.entries(checklist)) {
    if (!entry) continue;
    const e = typeof entry === 'string' ? { status: entry } : entry as { status?: string; addressed_at?: string };
    if (e?.status === 'present') resolved.push({ art, addressed_at: (e as { addressed_at?: string }).addressed_at ?? '' });
  }

  const snapDay = snapAt.slice(0, 10);
  const excluded = new Set<string>();

  for (const r of resolved) {
    if (r.addressed_at.length > 10) {
      if (r.addressed_at <= snapAt) excluded.add(r.art);
    } else if (r.addressed_at.slice(0, 10) < snapDay) {
      excluded.add(r.art);
    }
  }

  const sameDayDateOnly = resolved
    .filter(r => r.addressed_at.length <= 10 && r.addressed_at.slice(0, 10) === snapDay)
    .sort((a, b) => a.art.localeCompare(b.art));

  if (sameDayDateOnly.length > 0) {
    const position = tl.filter(s =>
      s.articles_in_gap === undefined && s.at.slice(0, 10) === snapDay && s.at <= snapAt,
    ).length;
    for (const r of sameDayDateOnly.slice(0, position)) excluded.add(r.art);
  }

  const result: Record<string, { min: number; max: number }> = {};
  for (const [art, val] of Object.entries(baseline)) {
    if (!excluded.has(art)) result[art] = val;
  }
  return result;
}

function buildAggTimeline(systems: SysWithTimeline[]): AggPoint[] {
  // Include every snapshot timestamp so that all remediation steps
  // (e.g. 8→7→6→5) appear as distinct chart points.
  const allTimestamps = new Set<string>();
  for (const sys of systems) {
    for (const snap of sys.sanction_timeline ?? []) {
      allTimestamps.add(snap.at);
    }
  }
  const sortedTs = Array.from(allTimestamps).sort();

  const raw = sortedTs.map(isoTs => {
    const artMap = new Map<string, { min: number; max: number }>();
    const toolsChanged: string[] = [];
    let dominantSource: AggPoint['dominantSource'] = 'initial';

    for (const sys of systems) {
      const tl = [...(sys.sanction_timeline ?? [])].sort((a, b) => a.at.localeCompare(b.at));
      // Latest snap at or before this exact timestamp (ISO string compare is chronologically correct)
      let last: SanctionSnap | null = null;
      for (const snap of tl) {
        if (snap.at <= isoTs) last = snap;
      }
      if (!last) continue;

      if (last.at === isoTs) {
        toolsChanged.push(sys.tool_name);
        dominantSource = last.source as AggPoint['dominantSource'];
      }

      if (last.articles_in_gap !== undefined) {
        // New-format snapshot: use stored per-article breakdown (immutable after write).
        for (const [art, val] of Object.entries(last.articles_in_gap)) {
          const ex = artMap.get(art) ?? { min: 0, max: 0 };
          ex.min = Math.max(ex.min, val.min);
          ex.max = Math.max(ex.max, val.max);
          artMap.set(art, ex);
        }
      } else {
        // Legacy snapshot (no articles_in_gap): use stored min/max directly.
        // Reconstruction via current compliance_checklist is not stable — adding
        // a new same-day resolution shifts the positional-alphabetical inference
        // and retroactively changes older historical points. Immutability wins.
        artMap.set(`__legacy_${sys.system_id}`, { min: last.min, max: last.max });
      }
    }

    const vals = Array.from(artMap.values());
    const sumMax = vals.reduce((s, v) => s + v.max, 0);
    const sumMin = vals.reduce((s, v) => s + v.min, 0);
    const ts = new Date(isoTs).getTime();
    return { ts, sumMax, sumMin, deltaMax: 0, toolsChanged, dominantSource };
  });

  // Append the current aggregate state so the chart always ends at the
  // correct current exposure, even when gap resolutions haven't yet
  // produced a sanction_timeline snapshot with articles_in_gap.
  const nowAgg = computeAggExposure(systems);
  const lastRaw = raw.length > 0 ? raw[raw.length - 1] : null;
  if (!lastRaw || Math.abs(lastRaw.sumMax - nowAgg.max) > 1) {
    raw.push({
      ts: Date.now(),
      sumMax: nowAgg.max,
      sumMin: nowAgg.min,
      deltaMax: 0,
      toolsChanged: [],
      dominantSource: 'checklist' as AggPoint['dominantSource'],
    });
  }

  return raw.map((pt, i) => ({
    ...pt,
    deltaMax: i === 0 ? pt.sumMax : pt.sumMax - raw[i - 1].sumMax,
  }));
}

// ── Aggregate step-line chart ─────────────────────────────────────────────────

function AggChart({ aggPts, mode, systems, yAxisMax }: { aggPts: AggPoint[]; mode: 'max' | 'min'; systems: SysWithTimeline[]; yAxisMax?: number }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [panOffset, setPanOffset] = useState(0);
  const dragRef        = useRef<{ startX: number; startOffset: number } | null>(null);
  const svgRef         = useRef<SVGSVGElement>(null);
  const scrollAccRef   = useRef(0);
  const needsWindowRef = useRef(false);
  const totalNRef      = useRef(0);
  const WINDOW = 16;

  // Non-passive wheel handler — lets us preventDefault so page doesn't also scroll
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!needsWindowRef.current) return;
      e.preventDefault();
      // Prefer horizontal delta (trackpad swipe); fall back to vertical (mouse wheel)
      const rawDelta = Math.abs(e.deltaX) >= Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const pixPerStep = 800 / Math.max(1, WINDOW - 1);
      scrollAccRef.current += rawDelta / pixPerStep;
      const steps = Math.round(scrollAccRef.current);
      if (steps !== 0) {
        scrollAccRef.current -= steps;
        setPanOffset(o => Math.max(0, Math.min(Math.max(0, totalNRef.current - WINDOW), o + steps)));
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const VW = 900, VH = 320;
  const ML = 72, MR = 28, MT = 52, MB = 44;
  const PW = VW - ML - MR, PH = VH - MT - MB;
  const clipId = 'agg-clip';

  if (aggPts.length === 0) return (
    <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.22)', fontSize: 13, fontStyle: 'italic' }}>
      Nessun dato — esegui un Compliance Check per tracciare l&apos;andamento
    </div>
  );

  // ── Windowing: max 16 points visible; drag, scroll or buttons to pan ──────
  const totalN = aggPts.length;
  const needsWindow = totalN > WINDOW;
  needsWindowRef.current = needsWindow;
  totalNRef.current = totalN;
  const safeOffset  = Math.min(panOffset, Math.max(0, totalN - WINDOW));
  const wEnd        = needsWindow ? Math.max(WINDOW, totalN - safeOffset) : totalN;
  const wStart      = needsWindow ? Math.max(0, wEnd - WINDOW) : 0;
  const visiblePts  = needsWindow ? aggPts.slice(wStart, Math.min(wEnd, totalN)) : aggPts;
  const canScrollLeft  = needsWindow && wStart > 0;
  const canScrollRight = needsWindow && wEnd < totalN;

  const scroll = (dir: -1 | 1) => {
    setHoveredIdx(null);
    setPanOffset(o => Math.max(0, Math.min(Math.max(0, totalN - WINDOW), o + dir * Math.ceil(WINDOW / 2))));
  };

  function onSvgMouseDown(e: React.MouseEvent) {
    if (!needsWindow) return;
    dragRef.current = { startX: e.clientX, startOffset: safeOffset };
  }
  function onSvgMouseMove(e: React.MouseEvent) {
    if (!dragRef.current) return;
    setHoveredIdx(null);
    const pixPerPoint = PW / Math.max(1, visiblePts.length - 1);
    const delta = Math.round(-(e.clientX - dragRef.current.startX) / pixPerPoint);
    setPanOffset(Math.max(0, Math.min(Math.max(0, totalN - WINDOW), dragRef.current.startOffset + delta)));
  }
  function onSvgEnd() { dragRef.current = null; }

  // Y-axis ceiling: 35% of turnover (passed from page) or data max as fallback
  const dataMax = Math.max(...aggPts.map(p => Math.max(p.sumMax, p.sumMin)), 1);
  const absMax  = yAxisMax ? Math.max(yAxisMax, dataMax) : dataMax;
  const yTicks = niceYTicks(absMax);
  const yMax   = (yTicks[yTicks.length - 1] ?? absMax) * 1.0;

  const sy  = (v: number) => MT + PH - Math.min(v / yMax, 1) * PH;
  const f   = (n: number) => n.toFixed(1);

  // Index-based x: each event gets its own evenly-spaced slot regardless of wall-clock distance.
  const N = visiblePts.length;
  const xi = (i: number) => N <= 1 ? ML + PW / 2 : ML + (i / (N - 1)) * PW;

  const maxVals  = visiblePts.map(p => p.sumMax);
  const minVals  = visiblePts.map(p => p.sumMin);
  const primVals = mode === 'max' ? maxVals : minVals;
  const secVals  = mode === 'max' ? minVals : maxVals;

  function linePath(vals: number[]): string {
    if (vals.length === 0) return '';
    let d = `M ${f(xi(0))} ${f(sy(vals[0]))}`;
    for (let i = 1; i < N; i++) {
      d += ` L ${f(xi(i))} ${f(sy(vals[i]))}`;
    }
    d += ` H ${ML + PW}`;
    return d;
  }

  const primD = linePath(primVals);
  const secD  = linePath(secVals);
  const botY  = f(MT + PH);
  const areaD = primD + ` V ${botY} H ${f(ML)} Z`;

  function buildBandPoly(): string {
    const re = ML + PW;
    const pts: string[] = [];
    for (let i = 0; i < N; i++) pts.push(`${f(xi(i))},${f(sy(maxVals[i]))}`);
    pts.push(`${re},${f(sy(maxVals[N - 1]))}`);
    pts.push(`${re},${f(sy(minVals[N - 1]))}`);
    for (let i = N - 1; i >= 0; i--) pts.push(`${f(xi(i))},${f(sy(minVals[i]))}`);
    return pts.join(' ');
  }

  const lineColor = mode === 'max' ? '#EF4444' : '#22C55E';

  // X-axis: show date label at each event slot, skip if label would overlap previous
  const xLabels: Array<{ i: number; label: string }> = [];
  {
    let lastX = -Infinity;
    // count events per day to decide whether to include time
    const dayCount = new Map<string, number>();
    for (const pt of visiblePts) {
      const d = new Date(pt.ts).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
      dayCount.set(d, (dayCount.get(d) ?? 0) + 1);
    }
    for (let i = 0; i < N; i++) {
      const x = xi(i);
      const dt = new Date(visiblePts[i].ts);
      const dayStr = dt.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
      const label = (dayCount.get(dayStr) ?? 1) > 1
        ? `${dayStr} ${dt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`
        : dayStr;
      if (x - lastX > 54) { xLabels.push({ i, label }); lastX = x; }
    }
  }

  const TW = 210;

  function getDeduplicatedArtsAt(ts: number): { arts: Array<{ art: string; min: number; max: number; tools: string[] }>; hasLegacy: boolean } {
    const isoStr = new Date(ts).toISOString();
    const artMap = new Map<string, { min: number; max: number; tools: string[] }>();
    let hasLegacy = false;
    for (const sys of systems) {
      const tl = [...(sys.sanction_timeline ?? [])].sort((a, b) => a.at.localeCompare(b.at));
      let last: SanctionSnap | null = null;
      for (const snap of tl) {
        if (snap.at <= isoStr) last = snap;
      }
      if (!last) continue;
      if (last.articles_in_gap !== undefined) {
        // Stored articles_in_gap is immutable — it reflects the state at write time.
        // Do NOT filter by current compliance_checklist: that would erase historical
        // articles from old snapshots whenever a gap is resolved later.
        for (const [art, val] of Object.entries(last.articles_in_gap)) {
          const ex = artMap.get(art) ?? { min: 0, max: 0, tools: [] };
          if (val.max > ex.max) { ex.min = val.min; ex.max = val.max; }
          if (!ex.tools.includes(sys.tool_name)) ex.tools.push(sys.tool_name);
          artMap.set(art, ex);
        }
      } else {
        // Legacy snapshot (no articles_in_gap): mark as legacy — same-day positional
        // reconstruction is not stable and would change historical points retroactively.
        hasLegacy = true;
      }
    }
    return {
      arts: Array.from(artMap.entries()).map(([art, d]) => ({ art, ...d })).sort((a, b) => b.max - a.max),
      hasLegacy,
    };
  }

  function renderTooltip(idx: number) {
    const pt  = visiblePts[idx];
    const px  = xi(idx);
    const py  = sy(primVals[idx]);
    const { arts, hasLegacy } = getDeduplicatedArtsAt(pt.ts);

    // Articles resolved at this check vs. the previous point
    const prevGlobalIdx = wStart + idx - 1;
    const prevArts = prevGlobalIdx >= 0 ? getDeduplicatedArtsAt(aggPts[prevGlobalIdx].ts).arts : [];
    const resolvedArts = prevArts.filter(pa => !arts.find(a => a.art === pa.art));
    const resolvedRows = Math.min(resolvedArts.length, 3) + (resolvedArts.length > 3 ? 1 : 0);
    const resolvedH = resolvedArts.length > 0 ? 14 + resolvedRows * 15 : 0;

    const totalDisp  = mode === 'max' ? pt.sumMax : pt.sumMin;
    const maxBarVal  = mode === 'max' ? (arts[0]?.max ?? 1) : Math.max(...arts.map(a => a.min), 1);
    const ROW_H      = 18;
    const legacyOnly = hasLegacy && arts.length === 0;
    const TH         = legacyOnly
      ? 104
      : 86 + arts.length * ROW_H + (hasLegacy ? 18 : 4) + resolvedH + 4;
    const toLeft = px > ML + PW / 2;
    const tx     = toLeft ? px - 12 - TW : px + 12;
    const ty     = Math.max(MT - 4, Math.min(py - TH / 2, MT + PH - TH));
    const dateStr = new Date(pt.ts).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
    return (
      <g style={{ pointerEvents: 'none' }}>
        <rect x={f(tx)} y={f(ty)} width={TW} height={TH} rx="9"
          fill="#16161a" stroke="rgba(255,255,255,0.18)" strokeWidth="1"/>

        {/* Date */}
        <text x={f(tx + 12)} y={f(ty + 15)} fill="rgba(255,255,255,0.35)" fontSize="9" fontFamily="sans-serif">{dateStr}</text>

        {legacyOnly ? (
          <>
            <text x={f(tx + 12)} y={f(ty + 42)} fill="rgba(255,255,255,0.28)" fontSize="9.5" fontFamily="sans-serif" fontStyle="italic">snapshot storico</text>
            <line x1={f(tx + 12)} y1={f(ty + 52)} x2={f(tx + TW - 12)} y2={f(ty + 52)} stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
            <text x={f(tx + 12)} y={f(ty + 66)} fill="rgba(255,255,255,0.38)" fontSize="9.5" fontFamily="sans-serif">{mode === 'max' ? 'max' : 'min'} stimato:</text>
            <text x={f(tx + TW - 12)} y={f(ty + 66)} fill={lineColor} fontSize="12" fontWeight="800" fontFamily="ui-monospace,monospace" textAnchor="end">{fmtEur(totalDisp)}</text>
            <text x={f(tx + 12)} y={f(ty + 90)} fill="rgba(255,255,255,0.18)" fontSize="8.5" fontFamily="sans-serif" fontStyle="italic">esegui un nuovo check per il dettaglio articoli</text>
          </>
        ) : (
          <>
            {/* Big article count */}
            <text x={f(tx + 12)} y={f(ty + 44)} fill="#fff" fontSize="28" fontWeight="900" fontFamily="ui-monospace,monospace">{arts.length}</text>
            <text x={f(tx + 12 + (arts.length > 9 ? 34 : 22))} y={f(ty + 43)} fill="rgba(255,255,255,0.45)" fontSize="10" fontFamily="sans-serif">articoli con gap</text>

            {/* Separator */}
            <line x1={f(tx + 12)} y1={f(ty + 56)} x2={f(tx + TW - 12)} y2={f(ty + 56)} stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>

            {/* Total amount */}
            <text x={f(tx + 12)} y={f(ty + 70)} fill="rgba(255,255,255,0.38)" fontSize="9.5" fontFamily="sans-serif">{mode === 'max' ? 'max' : 'min'} deduplicato:</text>
            <text x={f(tx + TW - 12)} y={f(ty + 70)} fill={lineColor} fontSize="12" fontWeight="800" fontFamily="ui-monospace,monospace" textAnchor="end">{fmtEur(totalDisp)}</text>

            {/* Separator */}
            <line x1={f(tx + 12)} y1={f(ty + 78)} x2={f(tx + TW - 12)} y2={f(ty + 78)} stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>

            {/* Article rows */}
            {arts.map((a, ri) => {
              const rowY    = ty + 86 + ri * ROW_H;
              const dispVal = mode === 'max' ? a.max : a.min;
              const barW    = maxBarVal > 0 ? (dispVal / maxBarVal) * 64 : 0;
              return (
                <g key={a.art}>
                  <text x={f(tx + 12)} y={f(rowY + 12)} fill="rgba(255,255,255,0.65)" fontSize="9.5" fontWeight="700" fontFamily="ui-monospace,monospace">{a.art}</text>
                  <rect x={f(tx + 60)} y={f(rowY + 2)} width={64} height={9} rx="2.5" fill="rgba(255,255,255,0.06)"/>
                  <rect x={f(tx + 60)} y={f(rowY + 2)} width={f(barW)} height={9} rx="2.5" fill={lineColor} fillOpacity="0.60"/>
                  <text x={f(tx + TW - 12)} y={f(rowY + 12)} fill="rgba(255,255,255,0.80)" fontSize="9.5" fontWeight="600" fontFamily="ui-monospace,monospace" textAnchor="end">{fmtEur(dispVal)}</text>
                </g>
              );
            })}

            {hasLegacy && (
              <text x={f(tx + 12)} y={f(ty + 86 + arts.length * ROW_H + 13)} fill="rgba(255,255,255,0.22)" fontSize="8" fontFamily="sans-serif" fontStyle="italic">
                + dati storici senza dettaglio articoli
              </text>
            )}

            {/* Resolved at this check */}
            {resolvedArts.length > 0 && (() => {
              const baseY = ty + 86 + arts.length * ROW_H + (hasLegacy ? 20 : 6);
              return (
                <>
                  <text x={f(tx + 12)} y={f(baseY + 10)} fill="#22C55E" fontSize="8.5" fontWeight="700" fontFamily="sans-serif">✓ risolto in questo check</text>
                  {resolvedArts.slice(0, 3).map((a, ri) => (
                    <text key={a.art} x={f(tx + 14)} y={f(baseY + 23 + ri * 15)} fill="rgba(34,197,94,0.60)" fontSize="9" fontFamily="ui-monospace,monospace">{a.art}</text>
                  ))}
                  {resolvedArts.length > 3 && (
                    <text x={f(tx + 14)} y={f(baseY + 23 + 3 * 15)} fill="rgba(34,197,94,0.40)" fontSize="8" fontFamily="sans-serif" fontStyle="italic">+{resolvedArts.length - 3} altri</text>
                  )}
                </>
              );
            })()}
          </>
        )}
      </g>
    );
  }

  return (
    <div>
      <svg viewBox={`0 0 ${VW} ${VH}`} width="100%"
        ref={svgRef}
        style={{ display: 'block', overflow: 'visible', cursor: needsWindow ? 'grab' : 'default', userSelect: 'none' }}
        onMouseDown={onSvgMouseDown}
        onMouseMove={onSvgMouseMove}
        onMouseUp={onSvgEnd}
        onMouseLeave={() => { onSvgEnd(); setHoveredIdx(null); }}>
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
          <linearGradient id="left-fade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#0C0C0E" stopOpacity="0.82"/>
            <stop offset="100%" stopColor="#0C0C0E" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="right-fade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#0C0C0E" stopOpacity="0"/>
            <stop offset="100%" stopColor="#0C0C0E" stopOpacity="0.82"/>
          </linearGradient>
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
        {/* X labels — one per event slot, with time when multiple events on same day */}
        {xLabels.map(({ i, label }) => (
          <text key={i} x={f(xi(i))} y={MT + PH + 18} textAnchor="middle"
            fill="rgba(255,255,255,0.26)" fontSize="9" fontFamily="sans-serif">
            {label}
          </text>
        ))}

        {/* Clipped drawing area */}
        <g clipPath={`url(#${clipId})`}>
          <polygon points={buildBandPoly()} fill={lineColor} fillOpacity="0.06" stroke="none"/>
          <path d={areaD} fill="url(#agg-grad)" stroke="none"/>
          <path d={secD} fill="none"
            stroke={lineColor} strokeWidth="1.4" strokeOpacity="0.30"
            strokeDasharray="5 4" strokeLinejoin="round"/>
          <path d={primD} fill="none" stroke={lineColor} strokeWidth="9" strokeOpacity="0.10"
            strokeLinejoin="round" filter="url(#ln-glow)"/>
          <path d={primD} fill="none" stroke={lineColor} strokeWidth="2.5"
            strokeLinejoin="round" filter="url(#ln-glow)"/>
          {/* Edge fades when scrollable */}
          {canScrollLeft  && <rect x={ML}           y={MT - 8} width={60} height={PH + 8} fill="url(#left-fade)"  style={{ pointerEvents: 'none' }}/>}
          {canScrollRight && <rect x={ML + PW - 60} y={MT - 8} width={60} height={PH + 8} fill="url(#right-fade)" style={{ pointerEvents: 'none' }}/>}
        </g>

        {/* Dots — white, neutral */}
        {visiblePts.map((pt, i) => {
          const x     = xi(i);
          const yVal  = sy(primVals[i]);
          const isHov = hoveredIdx === i;
          return (
            <g key={i}
              onMouseEnter={() => { if (!dragRef.current) setHoveredIdx(i); }}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{ cursor: 'pointer' }}>
              <circle cx={f(x)} cy={f(yVal)} r={18} fill="transparent"/>
              <circle cx={f(x)} cy={f(yVal)} r={isHov ? 13 : 9}
                fill={isHov ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)'}/>
              <circle cx={f(x)} cy={f(yVal)} r={isHov ? 6 : 4.5}
                fill="rgba(255,255,255,0.88)" stroke="#0C0C0E" strokeWidth="1.8"/>
              {!isHov && (
                <text x={f(x)} y={f(yVal - 13)} textAnchor="middle"
                  fill="rgba(255,255,255,0.48)" fontSize="9" fontFamily="ui-monospace,monospace" fontWeight="700">
                  {fmtEur(primVals[i])}
                </text>
              )}
            </g>
          );
        })}

        {hoveredIdx !== null && renderTooltip(hoveredIdx)}
      </svg>

      {/* ── Scroll controls (only when > WINDOW points) ── */}
      {needsWindow && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4,
          paddingLeft: `${((ML / VW) * 100).toFixed(1)}%`,
          paddingRight: `${((MR / VW) * 100).toFixed(1)}%` }}>
          <button onClick={() => scroll(1)} disabled={!canScrollLeft} style={{
            flexShrink: 0, fontSize: 11, fontWeight: 700, padding: '4px 11px', borderRadius: 6,
            border: `1px solid ${canScrollLeft ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.05)'}`,
            background: canScrollLeft ? 'rgba(255,255,255,0.07)' : 'transparent',
            color: canScrollLeft ? 'rgba(255,255,255,0.60)' : 'rgba(255,255,255,0.15)',
            cursor: canScrollLeft ? 'pointer' : 'default', fontFamily: 'inherit',
          }}>← più vecchi</button>

          <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute',
              left: `${((wStart / totalN) * 100).toFixed(1)}%`,
              width: `${(((Math.min(wEnd, totalN) - wStart) / totalN) * 100).toFixed(1)}%`,
              height: '100%', background: lineColor, borderRadius: 2, opacity: 0.50,
              transition: 'left 0.08s, width 0.08s',
            }}/>
          </div>

          <span style={{ flexShrink: 0, fontSize: 10, color: 'rgba(255,255,255,0.22)', fontFamily: 'ui-monospace,monospace' }}>
            {wStart + 1}–{Math.min(wEnd, totalN)}/{totalN}
          </span>

          <button onClick={() => scroll(-1)} disabled={!canScrollRight} style={{
            flexShrink: 0, fontSize: 11, fontWeight: 700, padding: '4px 11px', borderRadius: 6,
            border: `1px solid ${canScrollRight ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.05)'}`,
            background: canScrollRight ? 'rgba(255,255,255,0.07)' : 'transparent',
            color: canScrollRight ? 'rgba(255,255,255,0.60)' : 'rgba(255,255,255,0.15)',
            cursor: canScrollRight ? 'pointer' : 'default', fontFamily: 'inherit',
          }}>più recenti →</button>
        </div>
      )}
    </div>
  );
}

// ── Per-system sparkline ──────────────────────────────────────────────────────

function Sparkline({ data, color, sysId, currentMax, currentMin }: {
  data: SanctionSnap[];
  color: string;
  sysId: string;
  currentMax: number;
  currentMin: number;
}) {
  const W = 260, H = 104, ML = 8, MR = 8, MT = 10, MB = 22;
  const PW = W - ML - MR, PH = H - MT - MB;

  const sorted = [...data].sort((a, b) => a.at.localeCompare(b.at));

  const pts: Array<{ max: number; min: number; isCurrent?: boolean }> = sorted.map(s => ({ max: s.max, min: s.min }));
  const lastMax = pts[pts.length - 1]?.max ?? -1;
  if (Math.abs(lastMax - currentMax) > 1) {
    pts.push({ max: currentMax, min: currentMin, isCurrent: true });
  }

  if (pts.length < 2) return (
    <div style={{ height: H + 26, display: 'flex', alignItems: 'center', padding: '0 8px', color: 'rgba(255,255,255,0.2)', fontSize: 11, fontStyle: 'italic' }}>
      {pts.length === 1 ? '1 rilevazione — avvia un secondo check per vedere il trend' : 'Nessun dato storico'}
    </div>
  );

  const N = pts.length;
  const xi = (i: number) => N <= 1 ? ML + PW / 2 : ML + (i / (N - 1)) * PW;
  const yMax = Math.max(...pts.map(p => p.max), 1) * 1.18;
  const sy = (v: number) => MT + PH - Math.min(v / yMax, 1) * PH;
  const f  = (n: number) => n.toFixed(1);

  let lineD = `M ${f(xi(0))} ${f(sy(pts[0].max))}`;
  for (let i = 1; i < N; i++) lineD += ` L ${f(xi(i))} ${f(sy(pts[i].max))}`;
  const areaD = lineD + ` V ${f(MT + PH)} H ${f(xi(0))} Z`;
  const gradId = `sp-${sysId.replace(/[^a-z0-9]/gi, '').slice(-8)}`;

  const tickVals = [0, Math.round(yMax / 2), Math.round(yMax)];

  // Overall trend: first vs last exposure
  const trendPct = pts[0].max > 0 ? Math.round(((pts[pts.length - 1].max - pts[0].max) / pts[0].max) * 100) : 0;
  const trendDir = trendPct < -1 ? 'down' : trendPct > 1 ? 'up' : 'flat';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7, minHeight: 22 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.30)', letterSpacing: 1.2, textTransform: 'uppercase' }}>Andamento storico</span>
        {trendDir !== 'flat' ? (
          <span style={{ fontSize: 12, fontWeight: 800, padding: '2px 9px', borderRadius: 6,
            background: trendDir === 'down' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
            color: trendDir === 'down' ? '#22C55E' : '#EF4444',
            border: `1px solid ${trendDir === 'down' ? 'rgba(34,197,94,0.28)' : 'rgba(239,68,68,0.28)'}` }}>
            {trendDir === 'down' ? '▼' : '▲'} {Math.abs(trendPct)}%
          </span>
        ) : (
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.28)' }}>→ stabile</span>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.45"/>
            <stop offset="100%" stopColor={color} stopOpacity="0.0"/>
          </linearGradient>
        </defs>

        {tickVals.map(t => (
          <line key={t} x1={ML} y1={f(sy(t))} x2={ML + PW} y2={f(sy(t))}
            stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>
        ))}

        <path d={areaD} fill={`url(#${gradId})`} stroke="none"/>
        <path d={lineD} fill="none" stroke={color} strokeWidth="2.4"
          strokeLinecap="round" strokeLinejoin="round"/>

        {pts[pts.length - 1]?.isCurrent && N >= 2 && (
          <line
            x1={f(xi(N - 2))} y1={f(sy(pts[N - 2].max))}
            x2={f(xi(N - 1))} y2={f(sy(pts[N - 1].max))}
            stroke={color} strokeWidth="1.8" strokeDasharray="4 3" strokeOpacity="0.55"/>
        )}

        {pts.map((p, i) => {
          const isUp = i > 0 && p.max > pts[i - 1].max;
          const dotC = p.isCurrent ? '#60A5FA' : isUp ? '#EF4444' : color;
          return (
            <circle key={i} cx={f(xi(i))} cy={f(sy(p.max))} r={p.isCurrent ? 4.5 : 3.5}
              fill={dotC} stroke="#0C0C0E" strokeWidth="1.5"/>
          );
        })}

        <text x={f(xi(0))} y={H - 5} textAnchor="start"
          fill="rgba(255,255,255,0.30)" fontSize="8" fontFamily="sans-serif">
          {sorted.length > 0 ? new Date(sorted[0].at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }) : ''}
        </text>
        <text x={f(xi(N - 1))} y={H - 5} textAnchor="end"
          fill={pts[pts.length - 1]?.isCurrent ? '#60A5FA' : 'rgba(255,255,255,0.30)'} fontSize="8" fontFamily="sans-serif">
          {pts[pts.length - 1]?.isCurrent ? 'ora' : sorted.length > 0 ? new Date(sorted[sorted.length - 1].at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }) : ''}
        </text>
      </svg>
    </div>
  );
}

// ── Rotating Reduction card ───────────────────────────────────────────────────

function ViolatedArticlesCard({ current, peak, toolCount, totalResolved }: { current: number; peak: number; toolCount: number; totalResolved: number }) {
  const [slide, setSlide] = useState(0);
  const [fading, setFading] = useState(false);
  const SLIDES = 2;

  useEffect(() => {
    const t = setInterval(() => {
      setFading(true);
      setTimeout(() => { setSlide(s => (s + 1) % SLIDES); setFading(false); }, 350);
    }, 5500);
    return () => clearInterval(t);
  }, []);

  const anim = { opacity: fading ? 0 : 1, transform: fading ? 'translateY(6px)' : 'translateY(0)', transition: 'opacity .35s ease, transform .35s ease' };
  const lbl  = { fontSize: 10, fontWeight: 700 as const, color: 'var(--dim)', letterSpacing: 1.5, textTransform: 'uppercase' as const, marginBottom: 8 };

  return (
    <div className="inv-kpi-card" style={{ position: 'relative', overflow: 'hidden', paddingBottom: 28 }}>
      <div style={anim}>
        {slide === 0 && (
          <>
            <div style={lbl}>Articoli violati attuali</div>
            <div style={{ fontSize: 32, fontWeight: 900, lineHeight: 1, letterSpacing: -1.5, color: current > 0 ? 'var(--text)' : '#22C55E' }}>
              {current}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
              {current > 0 ? `su ${toolCount} tool analizzat${toolCount !== 1 ? 'i' : 'o'}` : 'nessuna violazione'}
            </div>
          </>
        )}
        {slide === 1 && (
          <>
            <div style={lbl}>Picco storico articoli</div>
            <div style={{ fontSize: 32, fontWeight: 900, lineHeight: 1, letterSpacing: -1.5, color: peak > 0 ? '#EF4444' : 'var(--dim)' }}>
              {peak > 0 ? peak : '—'}
            </div>
            {totalResolved > 0 && (
              <div style={{ fontSize: 11, color: '#22C55E', marginTop: 8, fontWeight: 600 }}>
                {totalResolved} gap risolti in totale
              </div>
            )}
            {totalResolved === 0 && peak > 0 && (
              <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 8 }}>nessun gap risolto ancora</div>
            )}
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

function RotatingReductionCard({ reduction, saved, firstCheck }: {
  reduction: number;
  saved: number;
  firstCheck: { min: number; max: number };
}) {
  const [slide, setSlide] = useState(0);
  const [fading, setFading] = useState(false);
  const SLIDES = 2;

  useEffect(() => {
    const t = setInterval(() => {
      setFading(true);
      setTimeout(() => { setSlide(s => (s + 1) % SLIDES); setFading(false); }, 350);
    }, 5500);
    return () => clearInterval(t);
  }, []);

  const anim = { opacity: fading ? 0 : 1, transform: fading ? 'translateY(6px)' : 'translateY(0)', transition: 'opacity .35s ease, transform .35s ease' };
  const lbl  = { fontSize: 10, fontWeight: 700 as const, color: 'var(--dim)', letterSpacing: 1.5, textTransform: 'uppercase' as const, marginBottom: 8 };

  return (
    <div className="inv-kpi-card" style={{ position: 'relative', overflow: 'hidden', paddingBottom: 28 }}>
      <div style={anim}>
        {slide === 0 && (
          <>
            <div style={lbl}>Riduzione attuale</div>
            <div style={{ fontSize: 32, fontWeight: 900, lineHeight: 1, letterSpacing: -1.5, color: reduction > 0 ? '#22C55E' : 'var(--dim)' }}>
              {reduction > 0 ? `-${reduction}%` : '—'}
            </div>
            {saved > 0
              ? <div style={{ fontSize: 11, color: '#22C55E', marginTop: 8, fontWeight: 600 }}>{fmtEur(saved)} salvati</div>
              : <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 8 }}>nessuna riduzione ancora</div>
            }
            <div style={{ fontSize: 9, color: 'var(--dim)', marginTop: 4, letterSpacing: 0.2 }}>vs. picco max stimato</div>
          </>
        )}
        {slide === 1 && (
          <>
            <div style={lbl}>Picco massimo stimato</div>
            <div style={{ fontSize: firstCheck.max >= 1_000_000 ? 26 : 32, fontWeight: 900, lineHeight: 1, letterSpacing: -1.5, color: firstCheck.max > 0 ? '#EF4444' : 'var(--dim)' }}>
              {firstCheck.max > 0 ? fmtEur(firstCheck.max) : '—'}
            </div>
            {firstCheck.min > 0 && firstCheck.min !== firstCheck.max && (
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>min {fmtEur(firstCheck.min)}</div>
            )}
            {firstCheck.max > 0 && (
              <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 6, letterSpacing: 0.3 }}>al primo compliance check</div>
            )}
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

// ── Rotating KPI card (like AIPI DynamicWidget) ───────────────────────────────

function RotatingFBECard({ systems, systemsForCards }: {
  systems: SysWithTimeline[];
  systemsForCards: SysWithTimeline[];
}) {
  const [slide, setSlide] = useState(0);
  const [fading, setFading] = useState(false);
  const SLIDES = 2;

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
    const artMap = new Map<string, { max: number; toolCount: number }>();
    for (const sys of systems) {
      if (!sys.last_article_sanctions) continue;
      try {
        const sanctions: Record<string, { min: number; max: number }> = JSON.parse(sys.last_article_sanctions);
        const checklist = sys.compliance_checklist ?? {};
        for (const [art, val] of Object.entries(sanctions)) {
          const entry = checklist[art];
          const st = typeof entry === 'string' ? entry : (entry as { status?: string })?.status;
          if (st !== 'present') {
            const ex = artMap.get(art) ?? { max: 0, toolCount: 0 };
            ex.max = Math.max(ex.max, val.max);
            ex.toolCount++;
            artMap.set(art, ex);
          }
        }
      } catch { /* ignore */ }
    }
    let top: { art: string; max: number; toolCount: number } | null = null;
    for (const [art, d] of Array.from(artMap.entries())) {
      if (!top || d.max > top.max) top = { art, ...d };
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
        {slide === 1 && (
          <>
            <div style={lbl}>Articolo con + esposizione</div>
            {topArt ? (
              <>
                <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1, letterSpacing: -1, color: 'var(--text)', marginBottom: 8 }}>
                  {topArt.art}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5, color: '#EF4444' }}>{fmtEur(topArt.max)}</div>
                <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 6 }}>
                  {topArt.toolCount} {topArt.toolCount === 1 ? 'tool lo viola' : 'tool lo violano'}
                </div>
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
  const [company, setCompany] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const isPremium = ['premium', 'enterprise'].includes((company.subscription_tier as string) ?? '');
  const [chartMode, setChartMode] = useState<'max' | 'min'>('max');

  useEffect(() => {
    Promise.all([
      api.systems.list(),
      api.company.get(),
    ])
      .then(([d, c]) => { setSystems(d as SysWithTimeline[]); setCompany(c as Record<string, unknown>); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const chartYAxisMax = useMemo(() => {
    const t = estimateTurnoverFE(company);
    return t > 0 ? t * 0.35 : undefined;
  }, [company]);

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
    const artMap = new Map<string, { max: number; min: number; tools: string[]; systemIds: string[] }>();
    for (const sys of systemsForCards) {
      if (!sys.last_article_sanctions) continue;
      try {
        const sanctions = JSON.parse(sys.last_article_sanctions) as Record<string, { min: number; max: number }>;
        const checklist = sys.compliance_checklist ?? {};
        for (const [art, val] of Object.entries(sanctions)) {
          const entry = checklist[art];
          const st = typeof entry === 'string' ? entry : (entry as { status?: string })?.status;
          if (st !== 'present') {
            const ex = artMap.get(art) ?? { max: 0, min: 0, tools: [], systemIds: [] };
            if (val.max > ex.max) { ex.max = val.max; ex.min = val.min; }
            if (!ex.tools.includes(sys.tool_name)) { ex.tools.push(sys.tool_name); ex.systemIds.push(sys.system_id); }
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

  // Peak = highest aggregate exposure ever seen across the entire timeline
  const peakAgg = useMemo(() => {
    if (aggTimeline.length === 0) return { min: 0, max: 0 };
    return aggTimeline.reduce(
      (pk, pt) => ({ min: Math.max(pk.min, pt.sumMin), max: Math.max(pk.max, pt.sumMax) }),
      { min: 0, max: 0 },
    );
  }, [aggTimeline]);
  const reduction   = peakAgg.max > 0 ? Math.round(((peakAgg.max - aggCurrent.max) / peakAgg.max) * 100) : 0;
  const saved       = Math.max(0, peakAgg.max - aggCurrent.max);

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

  // Total gaps resolved = article/tool pairs that were ever in gap but are no longer
  const totalGapsResolved = useMemo(() => {
    let total = 0;
    for (const sys of systems) {
      const everInGap = new Set<string>();
      for (const snap of (sys.sanction_timeline ?? [])) {
        if (snap.articles_in_gap) {
          for (const art of Object.keys(snap.articles_in_gap)) everInGap.add(art);
        }
      }
      const currentInGap = new Set<string>();
      if (sys.last_article_sanctions) {
        try {
          const sanctions = JSON.parse(sys.last_article_sanctions) as Record<string, { min: number; max: number }>;
          const checklist = sys.compliance_checklist ?? {};
          for (const art of Object.keys(sanctions)) {
            const entry = checklist[art];
            const st = typeof entry === 'string' ? entry : (entry as { status?: string })?.status;
            if (st !== 'present') currentInGap.add(art);
          }
        } catch { /* ignore */ }
      }
      Array.from(everInGap).forEach(art => { if (!currentInGap.has(art)) total++; });
    }
    return total;
  }, [systems]);

  // Peak = max unique articles simultaneously in violation across the entire history
  const peakArticlesViolated = useMemo(() => {
    let peak = violatedArticles;
    for (const pt of aggTimeline) {
      const isoStr = new Date(pt.ts).toISOString();
      const arts = new Set<string>();
      for (const sys of systemsWithTimeline) {
        const tl = [...(sys.sanction_timeline ?? [])].sort((a, b) => a.at.localeCompare(b.at));
        let last: SanctionSnap | null = null;
        for (const snap of tl) { if (snap.at <= isoStr) last = snap; }
        if (!last?.articles_in_gap) continue;
        for (const art of Object.keys(last.articles_in_gap)) arts.add(art);
      }
      if (arts.size > peak) peak = arts.size;
    }
    return peak;
  }, [aggTimeline, systemsWithTimeline, violatedArticles]);

  // Trend: last two aggTimeline points comparison
  const trendData = useMemo(() => {
    if (aggTimeline.length < 2) return null;
    const last = aggTimeline[aggTimeline.length - 1];
    const prev = aggTimeline[aggTimeline.length - 2];
    if (prev.sumMax === 0) return null;
    const pct = Math.round(((last.sumMax - prev.sumMax) / prev.sumMax) * 100);
    return { pct, dir: pct > 0 ? 'up' as const : pct < 0 ? 'down' as const : 'flat' as const };
  }, [aggTimeline]);

  // Last compliance check timestamp (most recent check-sourced snap)
  const lastUpdate = useMemo(() => {
    let latest: Date | null = null;
    for (const sys of systems) {
      for (const snap of sys.sanction_timeline ?? []) {
        if (snap.source === 'check') {
          const d = new Date(snap.at);
          if (!latest || d > latest) latest = d;
        }
      }
    }
    return latest;
  }, [systems]);

  // Tier breakdown: deduplicated exposure by AI Act article tier
  const tierBreakdown = useMemo(() => {
    const art5Map = new Map<string, number>();
    const art8Map = new Map<string, number>();
    const otherMap = new Map<string, number>();
    for (const sys of systems) {
      if (!sys.last_article_sanctions) continue;
      try {
        const sanctions = JSON.parse(sys.last_article_sanctions) as Record<string, { min: number; max: number }>;
        const checklist = sys.compliance_checklist ?? {};
        for (const [art, val] of Object.entries(sanctions)) {
          const entry = checklist[art];
          const st = typeof entry === 'string' ? entry : (entry as { status?: string })?.status;
          if (st !== 'present') {
            if (/^Art\.?\s*5(\s|$|[.,;])/i.test(art)) {
              art5Map.set(art, Math.max(art5Map.get(art) ?? 0, val.max));
            } else if (/^Art\.?\s*(8|9|1[0-5]|1[6-9]|2[0-7]|49|50)(\s|$|[.,;])/i.test(art)) {
              art8Map.set(art, Math.max(art8Map.get(art) ?? 0, val.max));
            } else {
              otherMap.set(art, Math.max(otherMap.get(art) ?? 0, val.max));
            }
          }
        }
      } catch { /* ignore */ }
    }
    return {
      art5:   Array.from(art5Map.values()).reduce((s, v) => s + v, 0),
      art8_27: Array.from(art8Map.values()).reduce((s, v) => s + v, 0),
      other:  Array.from(otherMap.values()).reduce((s, v) => s + v, 0),
    };
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
          {/* ── Main: chart full width ── */}
          <div className="fbe-overview-panel">

            {/* Chart — full width */}
            {aggTimeline.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,.09)', borderTop: '1px solid rgba(255,255,255,.14)', borderRadius: 16, padding: '18px 22px 18px 14px', boxShadow: '0 0 0 1px rgba(255,255,255,.02) inset, 0 4px 16px rgba(0,0,0,.3)', position: 'relative', zIndex: 10 }}>
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

                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  {/* Chart — grows to fill available width */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <AggChart aggPts={aggTimeline} mode={chartMode} systems={systems} yAxisMax={chartYAxisMax}/>
                  </div>

                  {/* Right sidebar: 3 info cards */}
                  <div style={{ width: 176, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 9, paddingTop: 6 }}>
                    {/* Trend card */}
                    <div style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--dim)', letterSpacing: 1.3, textTransform: 'uppercase', marginBottom: 8 }}>Tendenza</div>
                      {trendData ? (
                        <>
                          <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1, color: trendData.dir === 'up' ? '#EF4444' : trendData.dir === 'down' ? '#22C55E' : 'var(--dim)' }}>
                            {trendData.dir === 'up' ? '↑' : trendData.dir === 'down' ? '↓' : '→'} {Math.abs(trendData.pct)}%
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 6 }}>vs. check precedente</div>
                        </>
                      ) : (
                        <div style={{ fontSize: 13, color: 'var(--dim)', fontWeight: 700 }}>—</div>
                      )}
                    </div>

                    {/* Last update card */}
                    <div style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--dim)', letterSpacing: 1.3, textTransform: 'uppercase', marginBottom: 8 }}>Ultimo check</div>
                      {lastUpdate ? (
                        <>
                          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', lineHeight: 1.2 }}>
                            {lastUpdate.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 3 }}>
                            {lastUpdate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: 13, color: 'var(--dim)', fontWeight: 700 }}>—</div>
                      )}
                    </div>

                    {/* Tier breakdown card */}
                    <div style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--dim)', letterSpacing: 1.3, textTransform: 'uppercase', marginBottom: 10 }}>Composizione rischio</div>
                      {(() => {
                        const total = tierBreakdown.art5 + tierBreakdown.art8_27 + tierBreakdown.other;
                        if (total === 0) return <div style={{ fontSize: 13, color: 'var(--dim)', fontWeight: 700 }}>—</div>;
                        const p5 = (tierBreakdown.art5 / total) * 100;
                        const p8 = (tierBreakdown.art8_27 / total) * 100;
                        const pO = 100 - p5 - p8;
                        return (
                          <>
                            <div style={{ display: 'flex', height: 9, borderRadius: 5, overflow: 'hidden', gap: 1.5 }}>
                              {tierBreakdown.art5   > 0 && <div style={{ flex: p5, background: '#EF4444', minWidth: 1 }}/>}
                              {tierBreakdown.art8_27 > 0 && <div style={{ flex: p8, background: '#F59E0B', minWidth: 1 }}/>}
                              {tierBreakdown.other  > 0 && <div style={{ flex: pO, background: '#6EE7B7', opacity: 0.75, minWidth: 1 }}/>}
                            </div>
                            <div style={{ marginTop: 9, display: 'flex', flexDirection: 'column', gap: 5 }}>
                              {tierBreakdown.art5 > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <div style={{ width: 7, height: 7, borderRadius: 2, background: '#EF4444', flexShrink: 0 }}/>
                                  <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.50)', lineHeight: 1.2 }}>Art. 5 · {fmtEur(tierBreakdown.art5)}</span>
                                </div>
                              )}
                              {tierBreakdown.art8_27 > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <div style={{ width: 7, height: 7, borderRadius: 2, background: '#F59E0B', flexShrink: 0 }}/>
                                  <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.50)', lineHeight: 1.2 }}>Art. 8-27 · {fmtEur(tierBreakdown.art8_27)}</span>
                                </div>
                              )}
                              {tierBreakdown.other > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <div style={{ width: 7, height: 7, borderRadius: 2, background: '#6EE7B7', flexShrink: 0 }}/>
                                  <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.50)', lineHeight: 1.2 }}>Altri · {fmtEur(tierBreakdown.other)}</span>
                                </div>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

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

            {/* ── KPI cards + NBA row ── */}
            <div style={{ display: 'grid', gridTemplateColumns: nextBestAction ? '1fr 1fr' : '1fr', gap: 12, marginTop: 12 }}>

              {/* Left: 2×2 KPI grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

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

                {/* Card 2: Riduzione + picco massimo (rotating) */}
                <RotatingReductionCard reduction={reduction} saved={saved} firstCheck={peakAgg}/>

                {/* Card 3: Articoli violati (sliding: attuali / picco storico) */}
                <ViolatedArticlesCard current={violatedArticles} peak={peakArticlesViolated} toolCount={systemsForCards.length} totalResolved={totalGapsResolved}/>

                {/* Card 4: Rotating */}
                <RotatingFBECard systems={systems} systemsForCards={systemsForCards}/>
              </div>

              {/* Right: NBA compact vertical */}
              {(isPremium ? !!nextBestAction : true) && (
                <div style={{ padding: '20px 22px', borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: `1px solid ${isPremium ? 'rgba(34,197,94,0.30)' : 'rgba(255,255,255,0.08)'}`, borderTop: `1px solid ${isPremium ? 'rgba(34,197,94,0.50)' : 'rgba(255,255,255,0.14)'}`, boxShadow: isPremium ? '0 0 0 1px rgba(34,197,94,0.04) inset, 0 4px 24px rgba(34,197,94,0.06)' : 'none', display: 'flex', flexDirection: 'column', gap: 14, position: 'relative', overflow: 'hidden', minHeight: 180 }}>
                  {!isPremium ? (
                    <>
                      {/* Blurred preview background */}
                      <div style={{ filter: 'blur(6px)', opacity: 0.25, userSelect: 'none', pointerEvents: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                          <div style={{ width: 42, height: 42, borderRadius: 11, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎯</div>
                          <div><div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>Next Best Action</div><div style={{ fontSize: 14, fontWeight: 800, marginTop: 4 }}>Risolvi il gap su Art. 13 — risparmia fino a €5.000.000</div></div>
                        </div>
                        <div style={{ fontSize: 30, fontWeight: 900, color: '#22C55E' }}>€5.000.000</div>
                      </div>
                      {/* Lock overlay */}
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'rgba(8,10,18,0.70)', backdropFilter: 'blur(2px)', borderRadius: 16 }}>
                        <div style={{ fontSize: 26 }}>🔒</div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginBottom: 5 }}>Next Best Action</div>
                          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 14 }}>Disponibile nel piano Professional</div>
                          <a href="/plan" style={{ display: 'inline-block', fontSize: 12, fontWeight: 700, padding: '8px 18px', borderRadius: 8, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.40)', color: '#22C55E', textDecoration: 'none' }}>
                            Passa a Professional →
                          </a>
                        </div>
                      </div>
                    </>
                  ) : nextBestAction && (
                    <>
                      {/* Icon + title + badge */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ flexShrink: 0, width: 42, height: 42, borderRadius: 11, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                          🎯
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                            <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: -0.5, color: 'var(--text)' }}>Next Best Action</span>
                            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'rgba(34,197,94,0.10)', color: 'rgba(34,197,94,0.70)', fontWeight: 600, border: '1px solid rgba(34,197,94,0.20)', flexShrink: 0 }}>
                              {nextBestAction.tools.length === 1 ? '1 occorrenza' : `${nextBestAction.tools.length} occorrenze`}
                            </span>
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', lineHeight: 1.4 }}>
                            Risolvi il gap su <span style={{ color: '#22C55E', fontWeight: 900 }}>{nextBestAction.art}</span>
                            {nextBestAction.tools.length === 1
                              ? <> in <span style={{ color: 'rgba(255,255,255,0.65)' }}>{nextBestAction.tools[0]}</span></>
                              : <> su {nextBestAction.tools.length} tool ({nextBestAction.tools.slice(0, 2).join(', ')}{nextBestAction.tools.length > 2 ? ` +${nextBestAction.tools.length - 2}` : ''})</>
                            }
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', lineHeight: 1.65 }}>
                        {nextBestAction.tools.length === 1
                          ? `Tra tutti i gap aperti, questo è il più efficiente da chiudere: un solo tool lo viola, quindi risolvere questa lacuna elimina completamente il suo contributo all'esposizione totale — senza dover intervenire su altri sistemi.`
                          : `Con il minor numero di tool coinvolti tra tutti i gap aperti, questo è il punto di leva più efficace: risolvendolo ottieni la riduzione d'esposizione maggiore per il minore sforzo operativo.`
                        }
                      </div>

                      {/* Savings + CTA */}
                      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 'auto' }}>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 4 }}>Risparmio potenziale</div>
                          <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: -1.5, color: '#22C55E', lineHeight: 1 }}>{fmtEur(nextBestAction.max)}</div>
                          {nextBestAction.min > 0 && nextBestAction.min !== nextBestAction.max && (
                            <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 3 }}>min {fmtEur(nextBestAction.min)}</div>
                          )}
                        </div>
                        <button
                          onClick={() => router.push(`/dashboard/system?id=${nextBestAction.systemIds[0]}`)}
                          style={{ fontSize: 13, fontWeight: 800, padding: '13px 18px', borderRadius: 12, border: '1px solid rgba(34,197,94,0.40)', cursor: 'pointer', fontFamily: 'inherit', background: 'rgba(34,197,94,0.12)', color: '#22C55E', transition: 'all .18s', lineHeight: 1.35, textAlign: 'center' }}
                          onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'rgba(34,197,94,0.22)'; b.style.borderColor = 'rgba(34,197,94,0.65)'; b.style.boxShadow = '0 0 16px rgba(34,197,94,0.15)'; }}
                          onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'rgba(34,197,94,0.12)'; b.style.borderColor = 'rgba(34,197,94,0.40)'; b.style.boxShadow = 'none'; }}
                        >
                          Vai al dettaglio AIPI<br/>
                          <span style={{ fontWeight: 600, opacity: 0.75, fontSize: 11 }}>di {nextBestAction.tools[0]}</span>
                          {' →'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>{/* /fbe-overview-panel */}

          {/* ── Disclaimer ── */}
          <div style={{ marginBottom: 28, padding: '18px 24px', background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.25)', borderTop: '2px solid rgba(251,191,36,0.40)', borderRadius: 12, fontSize: 13.5, color: 'rgba(255,255,255,0.70)', lineHeight: 1.75 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: 'rgba(251,191,36,1)', marginBottom: 8, letterSpacing: 0.2 }}>⚠ Nota metodologica importante</div>
            L&apos;esposizione aggregata può essere <strong style={{ color: '#fff' }}>inferiore alla somma delle singole esposizioni tool</strong>:
            quando più sistemi violano lo stesso articolo dell&apos;AI Act, la sanzione per quell&apos;articolo si applica <strong style={{ color: '#fff' }}>una sola volta</strong>,
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
                                    <span key={a.art} style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 5, background: 'rgba(239,68,68,0.10)', color: 'rgba(239,68,68,0.90)', border: '1px solid rgba(239,68,68,0.28)', whiteSpace: 'nowrap' }}>
                                      {a.art} · {fmtEur(a.max)}
                                    </span>
                                  ))}
                                </div>
                              )
                              : (
                                <div className="art-ticker" style={{ '--ticker-dur': `${Math.max(10, violatedArts.length * 2.2)}s` } as React.CSSProperties}>
                                  <div className="art-ticker-inner">
                                    {[...violatedArts, ...violatedArts].map((a, idx) => (
                                      <span key={idx} style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 5, background: 'rgba(239,68,68,0.10)', color: 'rgba(239,68,68,0.90)', border: '1px solid rgba(239,68,68,0.28)', whiteSpace: 'nowrap', flexShrink: 0 }}>
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
                        <Sparkline data={tl} color={color} sysId={sys.system_id} currentMax={curExp.max} currentMin={curExp.min}/>
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
