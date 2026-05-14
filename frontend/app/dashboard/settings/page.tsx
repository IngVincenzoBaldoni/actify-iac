'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getAuthClaims } from '@/lib/auth';

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
  const [savingRevenue, setSavingRevenue] = useState(false);
  const [revenueMsg, setRevenueMsg] = useState('');

  useEffect(() => {
    async function load() {
      const [companyData, usersData, claims] = await Promise.allSettled([
        api.company.get(),
        api.company.getUsers(),
        getAuthClaims(),
      ]);
      if (companyData.status === 'fulfilled') {
        setCompany(companyData.value);
        setRevenueRange((companyData.value.annual_revenue_range as string) ?? '');
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

  async function handleSaveRevenue() {
    setSavingRevenue(true);
    setRevenueMsg('');
    try {
      await api.company.update({ annual_revenue_range: revenueRange || null });
      setRevenueMsg('✓ Fatturato aggiornato. I prossimi compliance check useranno questo valore.');
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
            <div className="rev-row"><span className="rk">Settore</span><span className="rv">{company.sector as string}</span></div>
            <div className="rev-row"><span className="rk">Dipendenti</span><span className="rv">{company.employees_range as string}</span></div>
            <div className="rev-row"><span className="rk">Sede Legale</span><span className="rv">{company.sede_legale as string}</span></div>
            <div className="rev-row"><span className="rk">Ruolo AI Act</span><span className="rv">{company.ai_role as string}</span></div>
            <div className="rev-row"><span className="rk">Piano</span><span className="rv">
              <span className={`tier-badge tier-${company.subscription_tier}`}>{String(company.subscription_tier).toUpperCase()}</span>
            </span></div>
          </div>

          <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
            <div className="field-label-hint">
              <label style={{ fontWeight: 600, fontSize: 14, color: 'var(--text2)' }}>Fatturato annuo (range) — opzionale</label>
              <span className="hint-small">Migliora la precisione della stima sanzionatoria Art. 99 AI Act</span>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <select className="settings-select" value={revenueRange} onChange={e => setRevenueRange(e.target.value)}>
                <option value="">— Non specificato (stima da dipendenti) —</option>
                <option value="under_500k">Meno di €500K</option>
                <option value="500k_2m">€500K – €2M</option>
                <option value="2m_10m">€2M – €10M</option>
                <option value="10m_50m">€10M – €50M</option>
                <option value="50m_250m">€50M – €250M</option>
                <option value="over_250m">Oltre €250M</option>
              </select>
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
