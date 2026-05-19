import type { IntakePayload } from "../types/intake";

// ── Turnover estimation ────────────────────────────────────────────────────────

const EMPLOYEE_TURNOVER: Record<string, number> = {
  "1-10":     300_000,
  "11-50":    2_000_000,
  "51-250":   10_000_000,
  "251-1000": 50_000_000,
  "1000+":    200_000_000,
};

const REVENUE_MIDPOINTS: Record<string, number> = {
  under_100k:  50_000,
  "100k_500k": 300_000,
  "500k_1m":   750_000,
  "1m_3m":     2_000_000,
  "3m_10m":    6_500_000,
  "10m_30m":   20_000_000,
  "30m_100m":  65_000_000,
  "100m_500m": 300_000_000,
  "500m_1b":   750_000_000,
  over_1b:     3_000_000_000,
};

const SECTOR_MULTIPLIER: Record<string, number> = {
  finanza: 3, banca: 3, assicurazioni: 2.5, fintech: 3,
  sanità: 1.5, healthcare: 1.5,
  tecnologia: 2, saas: 2, legale: 1.5, compliance: 1.5,
};

const SME_EMPLOYEES = new Set(["1-10", "11-50", "51-250"]);
const SME_REDUCTION = 0.5; // Art. 100 alleggerimento PMI

// ── Art. 99 AI Act sanction tiers ─────────────────────────────────────────────

const TIERS: Array<{ label: string; articles: string; cap: number; pct: number; test: (a: string) => boolean }> = [
  {
    label: "Art. 5 — Pratiche vietate",
    articles: "Art. 5",
    cap: 35_000_000,
    pct: 0.07,
    test: (a) => /^Art\.?\s*5(\s|$|[.,;])/i.test(a),
  },
  {
    label: "Art. 6–27, 49, 50 — Sistemi ad alto rischio e obblighi",
    articles: "Art. 6–27, 49, 50",
    cap: 15_000_000,
    pct: 0.03,
    test: (a) => /^Art\.?\s*(8|9|1[0-5]|1[6-9]|2[0-7]|49|50)(\s|$|[.,;])/i.test(a),
  },
  {
    label: "Informazioni false / altri articoli",
    articles: "altri Art.",
    cap: 7_500_000,
    pct: 0.01,
    test: () => true,
  },
];

// ── Types ──────────────────────────────────────────────────────────────────────

export type RevenueSource = "exact" | "declared" | "estimated";

export interface RevenueEstimate {
  amount: number;
  source: RevenueSource;
  label: string;
}

export interface SanctionTierResult {
  label: string;
  articles: string;
  cap_absolute: number;
  pct_label: string;
  turnover_pct_amount: number;
  max_before_sme: number;
  estimated_max: number;
  estimated_min: number;
  is_sme_reduced: boolean;
}

export interface SanctionsReport {
  revenue: RevenueEstimate;
  is_sme: boolean;
  tiers: SanctionTierResult[];
  total_min: number;
  total_max: number;
  disclaimer: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function estimateRevenue(payload: IntakePayload): RevenueEstimate {
  const c = payload.company;
  if (c.annual_revenue_exact && c.annual_revenue_exact > 0) {
    return { amount: c.annual_revenue_exact, source: "exact", label: "Fatturato esatto dichiarato" };
  }
  if (c.annual_revenue_range && REVENUE_MIDPOINTS[c.annual_revenue_range]) {
    return {
      amount: REVENUE_MIDPOINTS[c.annual_revenue_range],
      source: "declared",
      label: "Valore mediano del range dichiarato",
    };
  }
  const base = EMPLOYEE_TURNOVER[c.employees_range] ?? 2_000_000;
  const key = (c.sector ?? "").toLowerCase();
  const mult = Object.entries(SECTOR_MULTIPLIER).find(([k]) => key.includes(k))?.[1] ?? 1;
  return {
    amount: base * mult,
    source: "estimated",
    label: "Stima da dimensione aziendale e settore",
  };
}

const MIN_FACTOR: Record<RevenueSource, number> = {
  exact: 0.50,
  declared: 0.30,
  estimated: 0.08,
};

export function computeSanctionsReport(payload: IntakePayload): SanctionsReport {
  const revenue = estimateRevenue(payload);
  const isSme = SME_EMPLOYEES.has(payload.company.employees_range);

  let totalMin = 0;
  let totalMax = 0;

  const tiers: SanctionTierResult[] = TIERS.map((tier) => {
    const pctAmount = Math.round(revenue.amount * tier.pct);
    const maxBeforeSme = Math.min(tier.cap, pctAmount);
    const estMax = Math.round(maxBeforeSme * (isSme ? SME_REDUCTION : 1));
    const estMin = Math.round(estMax * MIN_FACTOR[revenue.source]);
    totalMin += estMin;
    totalMax += estMax;
    return {
      label: tier.label,
      articles: tier.articles,
      cap_absolute: tier.cap,
      pct_label: `${(tier.pct * 100).toFixed(1)}%`,
      turnover_pct_amount: pctAmount,
      max_before_sme: maxBeforeSme,
      estimated_max: estMax,
      estimated_min: estMin,
      is_sme_reduced: isSme,
    };
  });

  const disclaimers: Record<RevenueSource, string> = {
    exact: "Stima basata sul fatturato esatto dichiarato e sui massimali Art. 99 Reg. UE 2024/1689. Non costituisce parere legale; le autorità raramente applicano il massimo sanzionatorio.",
    declared: "Stima basata sul valore mediano del range di fatturato dichiarato e sui massimali Art. 99. Inserisci il fatturato esatto per maggiore precisione. Non costituisce parere legale.",
    estimated: "Stima basata su fatturato inferito da dimensione aziendale e settore. Precisione limitata: inserisci il fatturato reale per una valutazione più accurata. Non costituisce parere legale.",
  };

  return { revenue, is_sme: isSme, tiers, total_min: totalMin, total_max: totalMax, disclaimer: disclaimers[revenue.source] };
}

// ── Formatting helpers ─────────────────────────────────────────────────────────

export function formatEur(amount: number): string {
  if (amount >= 1_000_000) return `€${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `€${Math.round(amount / 1_000)}K`;
  return `€${amount.toLocaleString("it-IT")}`;
}
