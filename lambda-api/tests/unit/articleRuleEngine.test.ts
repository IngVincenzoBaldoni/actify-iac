import { determineApplicableArticles } from '../../services/articleRuleEngine';
import type { AISystem } from '../../types/aiSystem';
import type { Company } from '../../types/company';

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const baseSystem = (overrides: Partial<AISystem> = {}): AISystem => ({
  system_id:                 'sys-test',
  tool_name:                 'Test AI Tool',
  vendor:                    'OpenAI',
  category:                  'operations',
  role:                      'deployer',
  purpose:                   'Automazione processi interni',
  makes_automated_decisions:  false,
  human_oversight_level:     'always',
  affects_vulnerable_groups:  false,
  target_users:              ['employees'],
  decision_domains:          [],
  data_types:                [],
  annex_iii_domains:         [],
  is_safety_component:       false,
  ...overrides,
} as unknown as AISystem);

const baseCompany = (overrides: Partial<Company> = {}): Company => ({
  company_id:      'company-test',
  name:            'Test SRL',
  sector:          'tech',
  employees_range: '51-250',
  ai_role:         'deployer',
  ...overrides,
} as unknown as Company);

// ─── Universali ───────────────────────────────────────────────────────────────

describe('Rule Engine — articoli universali', () => {
  it('Art. 4 e Art. 5 sono sempre presenti', () => {
    const { applicableKeys } = determineApplicableArticles(baseSystem(), baseCompany());
    expect(applicableKeys).toContain('art_4');
    expect(applicableKeys).toContain('art_5_p1');
  });
});

// ─── Pratiche vietate (Art. 5) ────────────────────────────────────────────────

describe('Rule Engine — pratiche vietate (Art. 5)', () => {
  it('emotion recognition in workplace → isProhibited = true', () => {
    const system = baseSystem({
      annex_iii_domains: ['emotion_recognition'],
      target_users: ['employees'],
    });
    const { isProhibited, reasoning } = determineApplicableArticles(system, baseCompany());
    expect(isProhibited).toBe(true);
    expect(reasoning.some(r => /5\(1\)\(f\)/i.test(r))).toBe(true);
  });

  it('emotion recognition su general_public NON è proibito', () => {
    const system = baseSystem({
      annex_iii_domains: ['emotion_recognition'],
      target_users: ['general_public'],
    });
    const { isProhibited } = determineApplicableArticles(system, baseCompany());
    expect(isProhibited).toBe(false);
  });

  it('biometria + general_public + law enforcement → proibito (Art. 5(1)(d))', () => {
    const system = baseSystem({
      annex_iii_domains: ['biometric_identification', 'law_enforcement_risk'],
      target_users: ['general_public'],
    });
    const { isProhibited } = determineApplicableArticles(system, baseCompany());
    expect(isProhibited).toBe(true);
  });

  it('biometria + general_public SENZA law enforcement → alto rischio, NON proibito', () => {
    const system = baseSystem({
      annex_iii_domains: ['biometric_identification'],
      target_users: ['general_public'],
    });
    const { isProhibited, isHighRisk } = determineApplicableArticles(system, baseCompany());
    expect(isProhibited).toBe(false);
    expect(isHighRisk).toBe(true);
  });
});

// ─── Classificazione alto rischio ────────────────────────────────────────────

describe('Rule Engine — classificazione alto rischio', () => {
  it('sistema con is_safety_component = true → isHighRisk', () => {
    const system = baseSystem({ is_safety_component: true });
    const { isHighRisk, applicableKeys } = determineApplicableArticles(system, baseCompany());
    expect(isHighRisk).toBe(true);
    expect(applicableKeys).toContain('art_6_classification');
  });

  it('sistema con annex_iii_domains recruitment → isHighRisk', () => {
    const system = baseSystem({ annex_iii_domains: ['recruitment'] });
    const { isHighRisk, applicableKeys } = determineApplicableArticles(system, baseCompany());
    expect(isHighRisk).toBe(true);
    expect(applicableKeys).toContain('annex_iii_p1');
  });

  it('sistema senza annex domains e non safety component → isHighRisk = false', () => {
    const { isHighRisk } = determineApplicableArticles(baseSystem(), baseCompany());
    expect(isHighRisk).toBe(false);
  });
});

// ─── Obblighi provider vs deployer ───────────────────────────────────────────

describe('Rule Engine — obblighi provider vs deployer', () => {
  it('provider alto rischio → include art_9, art_11 (provider-only)', () => {
    const system = baseSystem({ role: 'provider', annex_iii_domains: ['recruitment'] });
    const { applicableKeys } = determineApplicableArticles(system, baseCompany({ ai_role: 'provider' }));
    expect(applicableKeys).toContain('art_9');
    expect(applicableKeys).toContain('art_11');
  });

  it('deployer puro alto rischio → NON include art_9, art_11', () => {
    const system = baseSystem({ role: 'deployer', annex_iii_domains: ['recruitment'] });
    const { applicableKeys } = determineApplicableArticles(system, baseCompany({ ai_role: 'deployer' }));
    expect(applicableKeys).not.toContain('art_9');
    expect(applicableKeys).not.toContain('art_11');
  });

  it('deployer puro alto rischio → include art_12, art_14 (obblighi tecnici deployer)', () => {
    const system = baseSystem({ role: 'deployer', annex_iii_domains: ['recruitment'] });
    const { applicableKeys } = determineApplicableArticles(system, baseCompany({ ai_role: 'deployer' }));
    expect(applicableKeys).toContain('art_12');
    expect(applicableKeys).toContain('art_14');
  });

  it('provider alto rischio → include art_49 (registrazione EU database)', () => {
    const system = baseSystem({ role: 'provider', annex_iii_domains: ['recruitment'] });
    const { applicableKeys } = determineApplicableArticles(system, baseCompany({ ai_role: 'provider' }));
    expect(applicableKeys).toContain('art_49');
  });

  it('deployer puro (non infrastruttura critica) → NON include art_49', () => {
    const system = baseSystem({ role: 'deployer', annex_iii_domains: ['recruitment'] });
    const { applicableKeys } = determineApplicableArticles(system, baseCompany({ ai_role: 'deployer' }));
    expect(applicableKeys).not.toContain('art_49');
  });
});

// ─── GPAI ────────────────────────────────────────────────────────────────────

describe('Rule Engine — GPAI / modelli fondazionali', () => {
  it('categoria llm → isGpai = true', () => {
    const system = baseSystem({ category: 'llm' });
    const { isGpai } = determineApplicableArticles(system, baseCompany());
    expect(isGpai).toBe(true);
  });

  it('categoria operations → isGpai = false', () => {
    const { isGpai } = determineApplicableArticles(baseSystem(), baseCompany());
    expect(isGpai).toBe(false);
  });
});
