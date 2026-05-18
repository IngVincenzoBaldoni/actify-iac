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
  'under_100k':  50_000,
  '100k_500k':   300_000,
  '500k_1m':     750_000,
  '1m_3m':       2_000_000,
  '3m_10m':      6_500_000,
  '10m_30m':     20_000_000,
  '30m_100m':    65_000_000,
  '100m_500m':   300_000_000,
  '500m_1b':     750_000_000,
  'over_1b':     3_000_000_000,
  // legacy ranges (backward compat for existing DynamoDB records)
  'under_500k':  250_000,
  '500k_2m':     1_250_000,
  '2m_10m':      6_000_000,
  '10m_50m':     30_000_000,
  '50m_250m':    150_000_000,
  'over_250m':   500_000_000,
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

// Fraction of max used as minimum sanction.
// Higher = tighter range. Grows with data precision.
const MIN_FACTOR: Record<'exact' | 'declared' | 'estimated', number> = {
  exact:     0.50,   // fatturato esatto → range stretto (50–100% del max)
  declared:  0.30,   // valore mediano range → range medio (30–100%)
  estimated: 0.08,   // stima da dipendenti → range ampio (8–100%)
};

// ── Public helpers ─────────────────────────────────────────────────────────────

export interface SanctionMethodology {
  is_sme: boolean;
  sme_reduction: number;       // 0.5 or 1.0
  min_factor: number;          // e.g. 0.50
  turnover_source_label: string;
}

export interface GapTierInfo {
  tier_label: string;          // e.g. "Art. 8-27 — requisiti e obblighi"
  tier_cap: number;            // e.g. 15_000_000
  tier_pct: number;            // e.g. 0.03
  theoretical_pct_amount: number;  // turnover × pct (before cap)
  theoretical_max: number;        // min(cap, pct_amount), before SME
}

export interface TotalExposure {
  min: number;
  max: number;
  currency: 'EUR';
  disclaimer: string;
  turnover_used: number;
  turnover_source: 'exact' | 'declared' | 'estimated';
  methodology: SanctionMethodology;
}

export interface ComplianceResultWithSanctions extends ComplianceResultParsed {
  compliance_gaps: Array<ComplianceResultParsed['compliance_gaps'][number] & {
    estimated_sanction_min: number;
    estimated_sanction_max: number;
    tier_info?: GapTierInfo;
  }>;
  total_exposure_estimate: TotalExposure;
  // Per-article breakdown (normalised key → sanctions). Used for cross-system deduplication in the inventory.
  article_sanctions: Record<string, { min: number; max: number }>;
}

type CompanyWithRevenue = Company & { annual_revenue_range?: string; annual_revenue_exact?: number };

export function estimateTurnover(company: Company): { turnover: number; source: 'exact' | 'declared' | 'estimated' } {
  const c = company as CompanyWithRevenue;
  if (c.annual_revenue_exact && c.annual_revenue_exact > 0) {
    return { turnover: c.annual_revenue_exact, source: 'exact' };
  }
  if (c.annual_revenue_range && REVENUE_MIDPOINTS[c.annual_revenue_range]) {
    return { turnover: REVENUE_MIDPOINTS[c.annual_revenue_range], source: 'declared' };
  }
  const base = EMPLOYEE_TURNOVER[company.employees_range] ?? 2_000_000;
  const mult = SECTOR_MULTIPLIER[(company.sector ?? '').toLowerCase()] ?? 1;
  return { turnover: base * mult, source: 'estimated' };
}

// Normalise "Art. 13, comma 1" / "Articolo 22 AI Act" / "Art.5(1)(a)" → "Art. 13" / "Art. 22" / "Art. 5"
// so that multiple gaps citing the same article deduplicate correctly regardless of how Bedrock phrases it.
function normalizeArticle(article: string): string {
  const match = article.match(/art(?:icolo|\.?)[\s.]*(\d+)/i);
  return match ? `Art. ${match[1]}` : article.trim().toLowerCase();
}

function tierFor(article: string) {
  return TIERS.find(t => t.test(article)) ?? TIERS[TIERS.length - 1];
}

const TIER_LABELS = [
  'Art. 5 — pratiche vietate',
  'Art. 8-27, 49, 50 — requisiti e obblighi',
  'Informazioni errate / altri articoli',
];

function gapExposure(article: string, turnover: number, isSme: boolean, source: 'exact' | 'declared' | 'estimated') {
  const tierIdx = TIERS.findIndex(t => t.test(article));
  const tier = TIERS[tierIdx] ?? TIERS[TIERS.length - 1];
  const labelIdx = tierIdx >= 0 ? tierIdx : TIERS.length - 1;
  const pctAmount = turnover * tier.pct;
  const theoretical_max = Math.min(tier.cap, pctAmount);
  const raw = theoretical_max;
  const max = Math.round(raw * (isSme ? SME_REDUCTION : 1));
  const min = Math.round(max * MIN_FACTOR[source]);
  const tier_info: GapTierInfo = {
    tier_label:            TIER_LABELS[labelIdx],
    tier_cap:              tier.cap,
    tier_pct:              tier.pct,
    theoretical_pct_amount: Math.round(pctAmount),
    theoretical_max:       Math.round(theoretical_max),
  };
  return { min, max, tier_info };
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
      return { ...gap, estimated_sanction_min: 0, estimated_sanction_max: 0, tier_info: undefined };
    }
    const { min, max, tier_info } = gapExposure(gap.article, turnover, isSme, source);
    return { ...gap, estimated_sanction_min: min, estimated_sanction_max: max, tier_info };
  });

  // Deduplicate by normalised article key: stesso articolo → una sola sanzione (prendi la più alta).
  // Uses normalizeArticle() so "Art. 13 comma 1" and "Art. 13" collapse to the same key.
  const byArticle = new Map<string, { min: number; max: number }>();
  for (const gap of enrichedGaps) {
    if (gap.status === 'compliant') continue;
    const key = normalizeArticle(gap.article);
    const existing = byArticle.get(key);
    if (!existing || gap.estimated_sanction_max > existing.max) {
      byArticle.set(key, {
        min: gap.estimated_sanction_min,
        max: gap.estimated_sanction_max,
      });
    }
  }

  let totalMin = 0, totalMax = 0;
  for (const v of byArticle.values()) { totalMin += v.min; totalMax += v.max; }

  const disclaimer =
    source === 'exact'
      ? 'Stima basata sui massimali Art. 99 AI Act e fatturato esatto dichiarato. Non è parere legale. Le autorità raramente applicano il massimo sanzionatorio.'
      : source === 'declared'
        ? 'Stima basata sui massimali Art. 99 AI Act e valore mediano del range di fatturato dichiarato. Per una stima più precisa inserisci il fatturato esatto nelle impostazioni. Non è parere legale.'
        : 'Stima basata sui massimali Art. 99 AI Act e fatturato stimato dai dipendenti dichiarati. Inserisci il fatturato reale nelle impostazioni per maggiore precisione. Non è parere legale.';

  const sourceLabels: Record<string, string> = {
    exact:     'Fatturato esatto dichiarato',
    declared:  'Valore mediano del range dichiarato',
    estimated: 'Fatturato stimato da dipendenti e settore',
  };

  const methodology: SanctionMethodology = {
    is_sme:               isSme,
    sme_reduction:        isSme ? SME_REDUCTION : 1,
    min_factor:           MIN_FACTOR[source],
    turnover_source_label: sourceLabels[source],
  };

  // Convert byArticle map to plain object for serialisation
  const article_sanctions: Record<string, { min: number; max: number }> = {};
  for (const [k, v] of byArticle.entries()) article_sanctions[k] = v;

  return {
    ...result,
    compliance_gaps: enrichedGaps,
    article_sanctions,
    total_exposure_estimate: {
      min: totalMin, max: totalMax, currency: 'EUR',
      disclaimer, turnover_used: turnover, turnover_source: source, methodology,
    },
  };
}
