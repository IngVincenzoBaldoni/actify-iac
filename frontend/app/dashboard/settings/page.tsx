'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getAuthClaims } from '@/lib/auth';

const SECTORS = [
  'Risorse Umane / Recruiting', 'Servizi Finanziari / Banca', 'Assicurazioni',
  'Sanità / Life Sciences', 'Istruzione / EdTech', 'Manifatturiero / Industria',
  'Tecnologia / SaaS', 'Retail / E-commerce', 'Pubblica Amministrazione',
  'Legale / Compliance', 'Marketing / Media', 'Logistica / Supply Chain',
  'Energia / Utilities', 'Immobiliare / PropTech', 'Trasporti / Mobilità',
  'Costruzioni / Edilizia', 'Turismo / Hospitality', 'Telecomunicazioni',
  'Agricoltura / Agritech', 'Altro - specifica',
];
const PREDEFINED = SECTORS.filter(s => s !== 'Altro - specifica');

const PLAN_META: Record<string, {
  label: string;
  tagline: string;
  gradient: string;
  glow: string;
  borderTop: string;
  features: string[];
  checkColor: string;
}> = {
  trial: {
    label: 'Trial',
    tagline: 'Account di prova — scegli un piano per sbloccare tutte le funzionalità',
    gradient: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #64748b 100%)',
    glow: '0 0 0 1px rgba(255,255,255,.06) inset, 0 8px 40px rgba(0,0,0,.6), 0 2px 8px rgba(0,0,0,.4)',
    borderTop: 'rgba(255,255,255,.30)',
    features: [],
    checkColor: '#94a3b8',
  },
  base: {
    label: 'Starter',
    tagline: 'Le funzionalità essenziali per avviare la tua compliance AI Act',
    gradient: 'linear-gradient(135deg, #1e40af 0%, #2563eb 45%, #60a5fa 100%)',
    glow: '0 0 0 1px rgba(96,165,250,.15) inset, 0 8px 48px rgba(37,99,235,.45), 0 2px 8px rgba(0,0,0,.5)',
    borderTop: 'rgba(147,197,253,.70)',
    features: [
      'AIPI (fino a 10 tool)', 'Gap Analysis', 'FEB (Fine Board Estimation)',
      'AI Literacy Tracker', 'Document Vault (5 categorie)', 'Audit Trail',
      'Supporto email standard',
    ],
    checkColor: '#93c5fd',
  },
  premium: {
    label: 'Professional',
    tagline: 'Tutte le funzionalità Actify con supporto prioritario dedicato',
    gradient: 'linear-gradient(135deg, #2e0080 0%, #6C47FF 48%, #a78bfa 100%)',
    glow: '0 0 0 1px rgba(167,139,250,.18) inset, 0 8px 48px rgba(108,71,255,.50), 0 2px 8px rgba(0,0,0,.5)',
    borderTop: 'rgba(196,181,253,.75)',
    features: [
      'AIPI illimitata', 'Gap Analysis', 'FEB (Fine Board Estimation)', 'NBA (Next Best Action)',
      'AI Literacy Tracker', 'Document Vault (tutte le categorie + FRIA)',
      'Audit Trail', 'Testo AI Act ufficiale', 'Supporto prioritario',
    ],
    checkColor: '#c4b5fd',
  },
  enterprise: {
    label: 'Enterprise',
    tagline: 'Soluzione completa con funzionalità avanzate e supporto dedicato',
    gradient: 'linear-gradient(135deg, #064e3b 0%, #059669 48%, #34d399 100%)',
    glow: '0 0 0 1px rgba(52,211,153,.15) inset, 0 8px 48px rgba(5,150,105,.45), 0 2px 8px rgba(0,0,0,.5)',
    borderTop: 'rgba(110,231,183,.70)',
    features: [
      'AIPI illimitata', 'Document Vault (tutte le categorie + FRIA)',
      'Testo AI Act ufficiale', 'Supporto prioritario',
      'Vendor Hub / DPA tracker', 'Regulatory Feed avanzato',
    ],
    checkColor: '#6ee7b7',
  },
};

const ELEVATED_CARD: React.CSSProperties = {
  background: 'linear-gradient(145deg, rgba(255,255,255,.055) 0%, rgba(255,255,255,.018) 100%)',
  border: '1px solid rgba(255,255,255,.09)',
  borderTop: '1.5px solid rgba(255,255,255,.22)',
  boxShadow: '0 0 0 1px rgba(255,255,255,.03) inset, 0 6px 24px rgba(0,0,0,.42)',
};

interface CompanyUser {
  user_id: string; email: string; role: 'admin' | 'member'; status: string; joined_at: string | null;
}

function ReferringPartnerCard(p: Record<string, unknown> | undefined) {
  if (!p) return null;
  return (
    <div className="fcard" style={ELEVATED_CARD}>
      <h3>Studio di Riferimento</h3>
      <p style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 14 }}>
        Il tuo account è gestito tramite questo studio consulente. Per aggiornamenti normativi o assistenza sulla compliance AI Act, contatta direttamente il tuo referente.
      </p>
      <div className="settings-grid">
        <div className="rev-row"><span className="rk">Studio</span><span className="rv" style={{ fontWeight: 600 }}>{String(p.ragione_sociale ?? '')}</span></div>
        {!!p.tipo_studio && <div className="rev-row"><span className="rk">Tipo</span><span className="rv">{String(p.tipo_studio)}</span></div>}
        <div className="rev-row">
          <span className="rk">Contatto</span>
          <span className="rv">
            <a href={`mailto:${String(p.contact_email ?? '')}`} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
              {String(p.contact_email ?? '')}
            </a>
          </span>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [company, setCompany]         = useState<Record<string, unknown> | null>(null);
  const [users, setUsers]             = useState<CompanyUser[]>([]);
  const [myRole, setMyRole]           = useState<'admin' | 'member' | 'partner'>('member');
  const [myId, setMyId]               = useState('');
  const [loading, setLoading]         = useState(true);
  const [revenueRange, setRevenueRange] = useState('');
  const [revenueExact, setRevenueExact] = useState('');
  const [savingRevenue, setSavingRevenue] = useState(false);
  const [revenueMsg, setRevenueMsg]   = useState('');
  const [sector, setSector]           = useState('');
  const [sectorCustom, setSectorCustom] = useState('');
  const [savingSector, setSavingSector] = useState(false);
  const [sectorMsg, setSectorMsg]     = useState('');

  useEffect(() => {
    async function load() {
      const [companyData, usersData, claims] = await Promise.allSettled([
        api.company.get(),
        api.company.getUsers(),
        getAuthClaims(),
      ]);
      if (companyData.status === 'fulfilled') {
        setCompany(companyData.value);
        const NEW_RANGES = ['under_100k','100k_500k','500k_1m','1m_3m','3m_10m','10m_30m','30m_100m','100m_500m','500m_1b','over_1b'];
        const storedRange = (companyData.value.annual_revenue_range as string) ?? '';
        setRevenueRange(NEW_RANGES.includes(storedRange) ? storedRange : '');
        const exact = companyData.value.annual_revenue_exact as number | undefined;
        setRevenueExact(exact ? String(exact) : '');
        const storedSector = (companyData.value.sector as string) ?? '';
        if (PREDEFINED.includes(storedSector)) {
          setSector(storedSector);
        } else if (storedSector) {
          setSector('Altro - specifica');
          setSectorCustom(storedSector);
        }
      }
      if (usersData.status === 'fulfilled') setUsers(usersData.value as CompanyUser[]);
      if (claims.status === 'fulfilled' && claims.value) {
        setMyRole(claims.value.role);
        setMyId(claims.value.userId);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSaveSector() {
    if (sector === 'Altro - specifica' && !sectorCustom.trim()) { setSectorMsg('✗ Specifica il settore.'); return; }
    if (!sector) { setSectorMsg('✗ Seleziona un settore.'); return; }
    setSavingSector(true); setSectorMsg('');
    try {
      const value = sector === 'Altro - specifica' ? sectorCustom.trim() : sector;
      await api.company.update({ sector: value });
      setCompany(prev => prev ? { ...prev, sector: value } : prev);
      setSectorMsg('✓ Settore aggiornato.');
    } catch (err: unknown) {
      setSectorMsg(`✗ ${(err as { message?: string }).message ?? 'Errore'}`);
    } finally { setSavingSector(false); }
  }

  async function handleSaveRevenue() {
    setSavingRevenue(true); setRevenueMsg('');
    const exactNum = revenueExact ? parseFloat(revenueExact.replace(/[^\d.]/g, '')) : null;
    if (revenueExact && (isNaN(exactNum!) || exactNum! <= 0)) {
      setRevenueMsg('✗ Inserisci un importo valido.'); setSavingRevenue(false); return;
    }
    try {
      await api.company.update({ annual_revenue_range: revenueRange || null, annual_revenue_exact: exactNum });
      const src = exactNum ? 'fatturato esatto' : revenueRange ? 'valore mediano del range' : 'stima da dipendenti';
      setRevenueMsg(`✓ Salvato. I prossimi compliance check useranno ${src}.`);
    } catch (err: unknown) {
      setRevenueMsg(`✗ ${(err as { message?: string }).message ?? 'Errore'}`);
    } finally { setSavingRevenue(false); }
  }

  async function handleRemoveUser(userId: string) {
    if (!confirm('Rimuovere questo utente?')) return;
    try {
      await api.company.deleteUser(userId);
      setUsers(prev => prev.filter(u => u.user_id !== userId));
    } catch (err: unknown) {
      alert((err as { message?: string }).message ?? 'Errore');
    }
  }

  if (loading) return <div className="db-loading"><div className="spin"></div></div>;

  const tier = String(company?.subscription_tier ?? 'trial');
  const plan = PLAN_META[tier] ?? PLAN_META.trial;

  return (
    <div style={{ padding: '0 28px 60px' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-.4px' }}>Impostazioni</h1>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Gestisci il profilo aziendale e il tuo piano Actify</div>
      </div>

      {/* ── PIANO HERO ─────────────────────────────────────────────────── */}
      {company && (
        <div style={{
          background: plan.gradient,
          borderRadius: 20,
          padding: '32px 36px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 28,
          flexWrap: 'wrap',
          boxShadow: plan.glow,
          border: '1px solid rgba(255,255,255,.14)',
          borderTop: `1.5px solid ${plan.borderTop}`,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Subtle inner highlight */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'linear-gradient(180deg, rgba(255,255,255,.07) 0%, transparent 55%)',
            borderRadius: 20,
          }} />
          <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.65)', textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 8 }}>
              Piano attivo
            </div>
            <div style={{ fontSize: 42, fontWeight: 900, color: '#fff', letterSpacing: '-1.5px', lineHeight: 1, marginBottom: 8, textShadow: '0 2px 12px rgba(0,0,0,.35)' }}>
              {plan.label}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.80)', marginBottom: plan.features.length > 0 ? 20 : 0 }}>
              {plan.tagline}
            </div>
            {plan.features.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 8px' }}>
                {plan.features.map(f => (
                  <span key={f} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.95)',
                    background: 'rgba(0,0,0,.22)', border: '1px solid rgba(255,255,255,.22)',
                    borderRadius: 6, padding: '3px 9px',
                    backdropFilter: 'blur(4px)',
                  }}>
                    <span style={{ color: plan.checkColor, fontSize: 10, fontWeight: 900 }}>✓</span> {f}
                  </span>
                ))}
              </div>
            )}
          </div>
          <a href="/plan" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '13px 26px',
            background: 'rgba(0,0,0,.28)',
            border: '1.5px solid rgba(255,255,255,.30)',
            backdropFilter: 'blur(8px)',
            color: '#fff', textDecoration: 'none',
            borderRadius: 12, fontWeight: 700, fontSize: 14,
            whiteSpace: 'nowrap', flexShrink: 0,
            position: 'relative',
            boxShadow: '0 2px 8px rgba(0,0,0,.3)',
          }}>
            {tier === 'trial' ? 'Scegli un piano' : 'Cambia piano'} →
          </a>
        </div>
      )}

      {/* ── PROFILO AZIENDA ────────────────────────────────────────────── */}
      {company && (
        <div className="fcard" style={ELEVATED_CARD}>
          <h3>Profilo Azienda</h3>
          <div className="settings-grid">
            <div className="rev-row"><span className="rk">Nome</span><span className="rv">{company.name as string}</span></div>
            <div className="rev-row">
              <span className="rk">Settore</span>
              <span className="rv">
                <select className="settings-select" style={{ minWidth: 220 }} value={sector}
                  onChange={e => { setSector(e.target.value); setSectorMsg(''); }}>
                  <option value="">— Seleziona —</option>
                  {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {sector === 'Altro - specifica' && (
                  <input type="text" className="settings-input" style={{ marginTop: 8, display: 'block' }}
                    value={sectorCustom} onChange={e => setSectorCustom(e.target.value)}
                    placeholder="Es. Agroalimentare, Moda, Sport..." />
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                  <button className="btn-save-small" onClick={handleSaveSector} disabled={savingSector}>
                    {savingSector ? 'Salvataggio…' : 'Aggiorna settore'}
                  </button>
                  {sectorMsg && <span style={{ fontSize: 13, color: sectorMsg.startsWith('✓') ? 'var(--green)' : 'var(--red)' }}>{sectorMsg}</span>}
                </div>
              </span>
            </div>
            <div className="rev-row"><span className="rk">Dipendenti</span><span className="rv">{company.employees_range as string}</span></div>
            <div className="rev-row"><span className="rk">Sede Legale</span><span className="rv">{company.sede_legale as string}</span></div>
            <div className="rev-row"><span className="rk">Ruolo AI Act</span><span className="rv">{company.ai_role as string}</span></div>
          </div>

          {/* Fatturato */}
          <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
            <div className="field-label-hint">
              <label style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Fatturato annuo — stima sanzionatoria Art. 99</label>
              <span className="hint-small">Più preciso è il dato, più accurata sarà la stima. Il fatturato esatto ha priorità sul range.</span>
            </div>
            <div style={{ marginTop: 14 }}>
              <div className="rev-input-label">
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)' }}>Fatturato esatto (€)</span>
                <span className="rev-accuracy-chip rev-accuracy-best">Stima più precisa</span>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 6, alignItems: 'center' }}>
                <input type="number" className="settings-input" placeholder="Es. 4500000" min="0"
                  value={revenueExact} onChange={e => setRevenueExact(e.target.value)} />
                <span style={{ fontSize: 13, color: 'var(--dim)', whiteSpace: 'nowrap' }}>EUR / anno</span>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <div className="rev-input-label">
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)' }}>Range fatturato</span>
                <span className="rev-accuracy-chip rev-accuracy-mid">Usa il valore mediano del range</span>
              </div>
              <div style={{ marginTop: 6 }}>
                <select className="settings-select" value={revenueRange} onChange={e => setRevenueRange(e.target.value)}
                  disabled={!!revenueExact} style={{ opacity: revenueExact ? 0.45 : 1 }}>
                  <option value="">— Non specificato (stima da dipendenti) —</option>
                  <option value="under_100k">Meno di €100K</option>
                  <option value="100k_500k">€100K – €500K</option>
                  <option value="500k_1m">€500K – €1M</option>
                  <option value="1m_3m">€1M – €3M</option>
                  <option value="3m_10m">€3M – €10M</option>
                  <option value="10m_30m">€10M – €30M</option>
                  <option value="30m_100m">€30M – €100M</option>
                  <option value="100m_500m">€100M – €500M</option>
                  <option value="500m_1b">€500M – €1B</option>
                  <option value="over_1b">Oltre €1B</option>
                </select>
                {revenueExact && <p style={{ fontSize: 13, color: 'var(--dim)', marginTop: 5 }}>Il range è disabilitato perché hai inserito il fatturato esatto.</p>}
              </div>
            </div>
            <div className="rev-disclaimer">
              ℹ️ Il range usa il <strong>valore mediano</strong> come base di calcolo (es. €3M–€10M → €6,5M). Per una stima ancora più accurata inserisci il fatturato esatto. Nessun dato viene condiviso con terze parti.
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center' }}>
              <button className="btn-save-small" onClick={handleSaveRevenue} disabled={savingRevenue}>
                {savingRevenue ? 'Salvataggio…' : 'Salva'}
              </button>
            </div>
            {revenueMsg && (
              <div className={revenueMsg.startsWith('✓') ? 'auth-success' : 'auth-error'} style={{ marginTop: 10 }}>{revenueMsg}</div>
            )}
          </div>
        </div>
      )}

      {/* Studio di Riferimento */}
      {ReferringPartnerCard(company?.referring_partner as Record<string, unknown> | undefined)}

      {/* Team — solo lista, no invite */}
      {myRole === 'admin' && (
        <div className="fcard" style={ELEVATED_CARD}>
          <h3>Team ({users.length} utenti)</h3>
          <div className="users-list">
            {users.map(user => (
              <div key={user.user_id} className="user-row">
                <div className="user-info">
                  <span className="user-email">{user.email}</span>
                  <span className={`user-role ${user.role}`}>{user.role}</span>
                  <span className={`user-status ${user.status}`}>{user.status}</span>
                </div>
                {user.user_id !== myId && (
                  <button className="btn-rm" onClick={() => handleRemoveUser(user.user_id)}>Rimuovi</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
