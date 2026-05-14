import type { Company } from '../types/company';
import type { ComplianceResultParsed } from './complianceOutputSchema';

// ── Turnover estimation ────────────────────────────────────────────────────────

const EMPLOYEE_TURNOVER: Record<string, number> = {
  '1-10':     300_000,
  '11-50':    2_000_000,
  '51-250':   10_000_000,
  '251-1000': 50_000_000,
  '1000+':    200_000_000,
};

const REVENUE_MIDPOINTS: Record<string, number> = {
  'under_500k': 250_000,
  '500k_2m':    1_250_000,
  '2m_10m':     6_000_000,
  '10m_50m':    30_000_000,
  '50m_250m':   150_000_000,
  'over_250m':  500_000_000,
};

const SECTOR_MULTIPLIER: Record<string, number> = {
  finance: 3, fintech: 3, banking: 3,
  healthcare: 1.5,
  tech: 2, legal: 1.5,
  hr: 1, operations: 1, marketing: 0.8,
  altro: 1,
};

// ── Art. 99 AI Act sanction tiers ─────────────────────────────────────────────

const TIERS = [
  // Art. 5 — pratiche vietate: €35M o 7% fatturato globale
  { test: (a: string) => /^Art\.?\s*5(\s|$|[.,;])/i.test(a), cap: 35_000_000, pct: 0.07 },
  // Art. 8-15, 16-27, 49, 50 — requisiti e obblighi: €15M o 3%
  { test: (a: string) => /^Art\.?\s*(8|9|1[0-5]|1[6-9]|2[0-7]|49|50)(\s|$|[.,;])/i.test(a), cap: 15_000_000, pct: 0.03 },
  // Default / informazioni errate: €7.5M o 1%
  { test: (_: string) => true, cap: 7_500_000, pct: 0.01 },
];

const SME_EMPLOYEES = new Set(['1-10', '11-50', '51-250']);
const SME_REDUCTION = 0.5;    // Art. 100 — alleggerimento PMI
const MIN_FACTOR    = 0.05;   // autorità raramente applicano il 100% del massimo

// ── Public helpers ─────────────────────────────────────────────────────────────

export interface TotalExposure {
  min: number;
  max: number;
  currency: 'EUR';
  disclaimer: string;
  turnover_used: number;
  turnover_source: 'declared' | 'estimated';
}

export interface ComplianceResultWithSanctions extends ComplianceResultParsed {
  compliance_gaps: Array<ComplianceResultParsed['compliance_gaps'][number] & {
    estimated_sanction_min: number;
    estimated_sanction_max: number;
  }>;
  total_exposure_estimate: TotalExposure;
}

export function estimateTurnover(company: Company): { turnover: number; source: 'declared' | 'estimated' } {
  const declared = (company as Company & { annual_revenue_range?: string }).annual_revenue_range;
  if (declared && REVENUE_MIDPOINTS[declared]) {
    return { turnover: REVENUE_MIDPOINTS[declared], source: 'declared' };
  }
  const base = EMPLOYEE_TURNOVER[company.employees_range] ?? 2_000_000;
  const mult = SECTOR_MULTIPLIER[(company.sector ?? '').toLowerCase()] ?? 1;
  return { turnover: base * mult, source: 'estimated' };
}

function tierFor(article: string) {
  return TIERS.find(t => t.test(article)) ?? TIERS[TIERS.length - 1];
}

function gapExposure(article: string, turnover: number, isSme: boolean) {
  const tier = tierFor(article);
  const raw  = Math.min(tier.cap, turnover * tier.pct);
  const max  = Math.round(raw * (isSme ? SME_REDUCTION : 1));
  const min  = Math.round(max * MIN_FACTOR);
  return { min, max };
}

export function computeSanctions(
  result: ComplianceResultParsed,
  company: Company,
): ComplianceResultWithSanctions {
  const { turnover, source } = estimateTurnover(company);
  const isSme = SME_EMPLOYEES.has(company.employees_range);

  // Per-gap enrichment
  const enrichedGaps = result.compliance_gaps.map(gap => {
    if (gap.status === 'compliant') {
      return { ...gap, estimated_sanction_min: 0, estimated_sanction_max: 0 };
    }
    const { min, max } = gapExposure(gap.article, turnover, isSme);
    return { ...gap, estimated_sanction_min: min, estimated_sanction_max: max };
  });

  // Deduplicate by article: stesso articolo → una sola sanzione (prendi la più alta)
  const byArticle = new Map<string, { min: number; max: number }>();
  for (const gap of enrichedGaps) {
    if (gap.status === 'compliant') continue;
    const existing = byArticle.get(gap.article);
    if (!existing || gap.estimated_sanction_max > existing.max) {
      byArticle.set(gap.article, {
        min: gap.estimated_sanction_min,
        max: gap.estimated_sanction_max,
      });
    }
  }

  let totalMin = 0, totalMax = 0;
  for (const v of byArticle.values()) { totalMin += v.min; totalMax += v.max; }

  const disclaimer = source === 'declared'
    ? 'Stima basata sui massimali Art. 99 AI Act e fatturato dichiarato. Non è parere legale. Le autorità raramente applicano il massimo sanzionatorio.'
    : 'Stima basata sui massimali Art. 99 AI Act e fatturato stimato dai dipendenti dichiarati. Inserisci il fatturato reale nelle impostazioni per maggiore precisione. Non è parere legale.';

  return {
    ...result,
    compliance_gaps: enrichedGaps,
    total_exposure_estimate: { min: totalMin, max: totalMax, currency: 'EUR', disclaimer, turnover_used: turnover, turnover_source: source },
  };
}
