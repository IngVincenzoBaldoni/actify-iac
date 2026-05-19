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

interface CompanyUser {
  user_id: string; email: string; role: 'admin' | 'member'; status: string; joined_at: string | null;
}

export default function SettingsPage() {
  const [company, setCompany] = useState<Record<string, unknown> | null>(null);
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [myRole, setMyRole] = useState<'admin' | 'member'>('member');
  const [myId, setMyId] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [revenueRange, setRevenueRange] = useState('');
  const [revenueExact, setRevenueExact] = useState('');
  const [savingRevenue, setSavingRevenue] = useState(false);
  const [revenueMsg, setRevenueMsg] = useState('');
  const [sector, setSector] = useState('');
  const [sectorCustom, setSectorCustom] = useState('');
  const [savingSector, setSavingSector] = useState(false);
  const [sectorMsg, setSectorMsg] = useState('');

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
    if (sector === 'Altro - specifica' && !sectorCustom.trim()) {
      setSectorMsg('✗ Specifica il settore nel campo di testo.');
      return;
    }
    if (!sector) { setSectorMsg('✗ Seleziona un settore.'); return; }
    setSavingSector(true);
    setSectorMsg('');
    try {
      const value = sector === 'Altro - specifica' ? sectorCustom.trim() : sector;
      await api.company.update({ sector: value });
      setCompany(prev => prev ? { ...prev, sector: value } : prev);
      setSectorMsg('✓ Settore aggiornato.');
    } catch (err: unknown) {
      setSectorMsg(`✗ ${(err as { message?: string }).message ?? 'Errore'}`);
    } finally {
      setSavingSector(false);
    }
  }

  async function handleSaveRevenue() {
    setSavingRevenue(true);
    setRevenueMsg('');
    const exactNum = revenueExact ? parseFloat(revenueExact.replace(/[^\d.]/g, '')) : null;
    if (revenueExact && (isNaN(exactNum!) || exactNum! <= 0)) {
      setRevenueMsg('✗ Inserisci un importo valido per il fatturato esatto.');
      setSavingRevenue(false);
      return;
    }
    try {
      await api.company.update({
        annual_revenue_range: revenueRange || null,
        annual_revenue_exact: exactNum,
      });
      const src = exactNum ? 'fatturato esatto' : revenueRange ? 'valore mediano del range' : 'stima da dipendenti';
      setRevenueMsg(`✓ Salvato. I prossimi compliance check useranno ${src}.`);
    } catch (err: unknown) {
      setRevenueMsg(`✗ ${(err as { message?: string }).message ?? 'Errore'}`);
    } finally {
      setSavingRevenue(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteMsg('');
    try {
      await api.auth.invite({ email: inviteEmail, role: inviteRole });
      setInviteMsg(`✓ Invito inviato a ${inviteEmail}`);
      setInviteEmail('');
      // Reload users
      const updated = await api.company.getUsers();
      setUsers(updated as CompanyUser[]);
    } catch (err: unknown) {
      setInviteMsg(`✗ ${(err as { message?: string }).message ?? 'Errore durante l\'invito.'}`);
    } finally {
      setInviting(false);
    }
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

  return (
    <div className="inv-page">
      <div className="inv-header">
        <h1 className="inv-title">Impostazioni</h1>
      </div>

      {/* Company Profile */}
      {company && (
        <div className="fcard">
          <h3>Profilo Azienda</h3>
          <div className="settings-grid">
            <div className="rev-row"><span className="rk">Nome</span><span className="rv">{company.name as string}</span></div>
            <div className="rev-row">
              <span className="rk">Settore</span>
              <span className="rv">
                <select
                  className="settings-select"
                  style={{ minWidth: 220 }}
                  value={sector}
                  onChange={e => { setSector(e.target.value); setSectorMsg(''); }}
                >
                  <option value="">— Seleziona —</option>
                  {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {sector === 'Altro - specifica' && (
                  <input
                    type="text"
                    className="settings-input"
                    style={{ marginTop: 8, display: 'block' }}
                    value={sectorCustom}
                    onChange={e => setSectorCustom(e.target.value)}
                    placeholder="Es. Agroalimentare, Moda, Sport..."
                  />
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                  <button
                    className="btn-save-small"
                    onClick={handleSaveSector}
                    disabled={savingSector}
                  >
                    {savingSector ? 'Salvataggio…' : 'Aggiorna settore'}
                  </button>
                  {sectorMsg && (
                    <span style={{ fontSize: 12, color: sectorMsg.startsWith('✓') ? 'var(--green)' : 'var(--red)' }}>
                      {sectorMsg}
                    </span>
                  )}
                </div>
              </span>
            </div>
            <div className="rev-row"><span className="rk">Dipendenti</span><span className="rv">{company.employees_range as string}</span></div>
            <div className="rev-row"><span className="rk">Sede Legale</span><span className="rv">{company.sede_legale as string}</span></div>
            <div className="rev-row"><span className="rk">Ruolo AI Act</span><span className="rv">{company.ai_role as string}</span></div>
            <div className="rev-row"><span className="rk">Piano</span><span className="rv">
              <span className={`tier-badge tier-${company.subscription_tier}`}>{String(company.subscription_tier).toUpperCase()}</span>
            </span></div>
          </div>

          <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
            <div className="field-label-hint">
              <label style={{ fontWeight: 600, fontSize: 14, color: 'var(--text2)' }}>Fatturato annuo — stima sanzionatoria Art. 99</label>
              <span className="hint-small">Più preciso è il dato, più accurata sarà la stima. Il fatturato esatto ha priorità sul range.</span>
            </div>

            {/* Exact revenue */}
            <div style={{ marginTop: 14 }}>
              <div className="rev-input-label">
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>Fatturato esatto (€)</span>
                <span className="rev-accuracy-chip rev-accuracy-best">Stima più precisa</span>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 6, alignItems: 'center' }}>
                <input
                  type="number"
                  className="settings-input"
                  placeholder="Es. 4500000"
                  min="0"
                  value={revenueExact}
                  onChange={e => setRevenueExact(e.target.value)}
                />
                <span style={{ fontSize: 12, color: 'var(--dim)', whiteSpace: 'nowrap' }}>EUR / anno</span>
              </div>
            </div>

            {/* Range */}
            <div style={{ marginTop: 14 }}>
              <div className="rev-input-label">
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>Range fatturato</span>
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
                {revenueExact && (
                  <p style={{ fontSize: 11, color: 'var(--dim)', marginTop: 5 }}>
                    Il range è disabilitato perché hai inserito il fatturato esatto.
                  </p>
                )}
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
              <div className={revenueMsg.startsWith('✓') ? 'auth-success' : 'auth-error'} style={{ marginTop: 10 }}>
                {revenueMsg}
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Management — admin only */}
      {myRole === 'admin' && (
        <>
          <div className="fcard">
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
                    <button className="btn-rm" onClick={() => handleRemoveUser(user.user_id)}>
                      Rimuovi
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="fcard">
            <h3>Invita Collaboratore</h3>
            <form onSubmit={handleInvite} className="invite-form">
              <div className="field-row">
                <div className="field">
                  <label>Email</label>
                  <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                    placeholder="collega@azienda.it" required />
                </div>
                <div className="field">
                  <label>Ruolo</label>
                  <select value={inviteRole} onChange={e => setInviteRole(e.target.value as 'admin'|'member')}>
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              {inviteMsg && (
                <div className={inviteMsg.startsWith('✓') ? 'auth-success' : 'auth-error'}>{inviteMsg}</div>
              )}
              <button type="submit" className="auth-btn" disabled={inviting}>
                {inviting ? 'Invio in corso…' : 'Invia Invito'}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
