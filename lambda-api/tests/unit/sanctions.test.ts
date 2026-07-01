import { estimateTurnover, computeSanctions } from '../../services/sanctions';
import type { Company } from '../../types/company';
import type { ComplianceResultParsed } from '../../services/complianceOutputSchema';

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const baseCompany = (overrides: Partial<Company> = {}): Company => ({
  company_id:      'test-company-id',
  name:            'Test SRL',
  sector:          'tech',
  employees_range: '51-250',
  ai_role:         'deployer',
  ...overrides,
} as unknown as Company);

const baseResult = (gaps: Partial<ComplianceResultParsed['compliance_gaps'][number]>[] = []): ComplianceResultParsed => ({
  risk_classification: 'high',
  applicable_articles: ['Art. 9', 'Art. 13'],
  compliance_gaps: gaps.map((g, i) => ({
    gap_id:             `gap-${i}`,
    article:            'Art. 13',
    requirement:        'Trasparenza',
    status:             'missing',
    deadline:           null,
    urgency:            'high',
    description:        'Gap description',
    what_to_do:         'Do something',
    can_actify_automate: false,
    automation_type:    null,
    source_chunks:      [],
    ...g,
  })),
  score: { governance: 5, transparency: 3, documentation: 4, monitoring: 6 },
  compliance_summary: { compliant_count: 0, non_compliant_count: 1, monitoring_count: 0, most_urgent_deadline: null, months_to_urgency: null },
  priority_actions: [],
  executive_summary: 'Test summary',
});

// ─── estimateTurnover ──────────────────────────────────────────────────────────

describe('estimateTurnover', () => {
  it('usa fatturato esatto quando disponibile (source: exact)', () => {
    const company = baseCompany({ annual_revenue_exact: 5_000_000 } as unknown as Company);
    const { turnover, source } = estimateTurnover(company);
    expect(turnover).toBe(5_000_000);
    expect(source).toBe('exact');
  });

  it('usa il midpoint del range dichiarato (source: declared)', () => {
    const company = baseCompany({ annual_revenue_range: '1m_3m' } as unknown as Company);
    const { turnover, source } = estimateTurnover(company);
    expect(turnover).toBe(2_000_000);
    expect(source).toBe('declared');
  });

  it('stima da dipendenti quando mancano dati fatturato (source: estimated)', () => {
    const company = baseCompany({ employees_range: '51-250', sector: 'tech' });
    const { turnover, source } = estimateTurnover(company);
    // 10M (employees midpoint) × 2 (tech multiplier) = 20M
    expect(turnover).toBe(20_000_000);
    expect(source).toBe('estimated');
  });

  it('applica sector_multiplier finance (x3) sulla stima da dipendenti', () => {
    const company = baseCompany({ employees_range: '11-50', sector: 'finance' });
    const { turnover } = estimateTurnover(company);
    expect(turnover).toBe(2_000_000 * 3); // 6M
  });

  it('fatturato esatto ha precedenza su range dichiarato', () => {
    const company = baseCompany({
      annual_revenue_exact: 999_999,
      annual_revenue_range: 'over_1b',
    } as unknown as Company);
    const { turnover, source } = estimateTurnover(company);
    expect(turnover).toBe(999_999);
    expect(source).toBe('exact');
  });
});

// ─── computeSanctions — SME reduction ────────────────────────────────────────

describe('computeSanctions — SME reduction (Art. 100)', () => {
  it('applica riduzione 50% per PMI (1-10 dipendenti)', () => {
    const company = baseCompany({ employees_range: '1-10', annual_revenue_exact: 10_000_000 });
    const result = baseResult([{ article: 'Art. 13', status: 'missing' }]);
    const sanctions = computeSanctions(result, company);
    const gap = sanctions.compliance_gaps[0];
    // Art. 13 → tier 3% / €15M. 3% di 10M = 300k < 15M → max_raw = 300k → SME: 150k
    expect(gap.estimated_sanction_max).toBe(150_000);
  });

  it('NON applica riduzione SME per grandi aziende (251-1000)', () => {
    const company = baseCompany({ employees_range: '251-1000', annual_revenue_exact: 10_000_000 });
    const result = baseResult([{ article: 'Art. 13', status: 'missing' }]);
    const sanctions = computeSanctions(result, company);
    const gap = sanctions.compliance_gaps[0];
    expect(gap.estimated_sanction_max).toBe(300_000); // no SME reduction
  });
});

// ─── computeSanctions — tier sanzioni ────────────────────────────────────────

describe('computeSanctions — tier sanzioni per articolo', () => {
  it('Art. 5 → tier €35M / 7% (sanzione massima)', () => {
    const company = baseCompany({ annual_revenue_exact: 1_000_000_000, employees_range: '1000+' });
    const result = baseResult([{ article: 'Art. 5', status: 'missing' }]);
    const sanctions = computeSanctions(result, company);
    const gap = sanctions.compliance_gaps[0];
    // 7% di 1B = 70M > cap 35M → max = 35M
    expect(gap.estimated_sanction_max).toBe(35_000_000);
    expect(gap.tier_info?.tier_cap).toBe(35_000_000);
    expect(gap.tier_info?.tier_pct).toBe(0.07);
  });

  it('Art. 9 → tier €15M / 3%', () => {
    const company = baseCompany({ annual_revenue_exact: 1_000_000_000, employees_range: '1000+' });
    const result = baseResult([{ article: 'Art. 9', status: 'missing' }]);
    const sanctions = computeSanctions(result, company);
    const gap = sanctions.compliance_gaps[0];
    expect(gap.estimated_sanction_max).toBe(15_000_000);
    expect(gap.tier_info?.tier_cap).toBe(15_000_000);
  });

  it('Art. 99 → tier default €7.5M / 1%', () => {
    const company = baseCompany({ annual_revenue_exact: 1_000_000_000, employees_range: '1000+' });
    const result = baseResult([{ article: 'Art. 99', status: 'missing' }]);
    const sanctions = computeSanctions(result, company);
    const gap = sanctions.compliance_gaps[0];
    expect(gap.estimated_sanction_max).toBe(7_500_000);
  });

  it('gap compliant → esposizione zero', () => {
    const company = baseCompany({ annual_revenue_exact: 5_000_000 });
    const result = baseResult([{ article: 'Art. 13', status: 'compliant' }]);
    const sanctions = computeSanctions(result, company);
    const gap = sanctions.compliance_gaps[0];
    expect(gap.estimated_sanction_min).toBe(0);
    expect(gap.estimated_sanction_max).toBe(0);
  });
});

// ─── computeSanctions — total_exposure_estimate ───────────────────────────────

describe('computeSanctions — total_exposure_estimate', () => {
  it('total exposure max è la somma dei gap non-compliant', () => {
    const company = baseCompany({ annual_revenue_exact: 100_000_000, employees_range: '1000+' });
    const result = baseResult([
      { article: 'Art. 5',  status: 'missing' },
      { article: 'Art. 13', status: 'missing' },
      { article: 'Art. 26', status: 'compliant' },
    ]);
    const sanctions = computeSanctions(result, company);
    const { total_exposure_estimate } = sanctions;
    expect(total_exposure_estimate.max).toBeGreaterThan(0);
    expect(total_exposure_estimate.currency).toBe('EUR');
    // Gap compliant non contribuisce all'esposizione
    const gapCompliant = sanctions.compliance_gaps.find(g => g.article === 'Art. 26');
    expect(gapCompliant?.estimated_sanction_max).toBe(0);
  });

  it('turnover_source è "exact" quando annual_revenue_exact è impostato', () => {
    const company = baseCompany({ annual_revenue_exact: 2_000_000 });
    const result = baseResult([]);
    const { total_exposure_estimate } = computeSanctions(result, company);
    expect(total_exposure_estimate.turnover_source).toBe('exact');
    expect(total_exposure_estimate.turnover_used).toBe(2_000_000);
  });
});
