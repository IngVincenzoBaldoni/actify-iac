'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { configureAmplify } from '@/lib/amplify';
import { doSignIn, doSignOut, setSessionCookie } from '@/lib/auth';
import { api } from '@/lib/api';
import { markSvg, logoSvg } from '@/lib/branding';

configureAmplify();

const SECTORS = [
  'Risorse Umane / Recruiting', 'Servizi Finanziari / Banca', 'Assicurazioni',
  'Sanità / Life Sciences', 'Istruzione / EdTech', 'Manifatturiero / Industria',
  'Tecnologia / SaaS', 'Retail / E-commerce', 'Pubblica Amministrazione',
  'Legale / Compliance', 'Marketing / Media', 'Logistica / Supply Chain',
  'Energia / Utilities', 'Altro',
];

const SIZES = [
  { value: '1-10', label: '1–10 (Micro)' },
  { value: '11-50', label: '11–50 (Piccola)' },
  { value: '51-250', label: '51–250 (Media)' },
  { value: '251-1000', label: '251–1.000 (Grande)' },
  { value: '1000+', label: '1.000+ (Enterprise)' },
];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    company_name: '', email: '', password: '', confirm: '',
    sector: '', employees_range: '', country: 'Italia',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Le password non coincidono.'); return; }
    if (form.password.length < 8) { setError('La password deve avere almeno 8 caratteri.'); return; }

    setLoading(true);
    try {
      await api.auth.register({
        email:           form.email,
        password:        form.password,
        company_name:    form.company_name,
        sector:          form.sector,
        employees_range: form.employees_range,
        country:         form.country,
      });
      // Clear any existing session before signing in as the new user
      await doSignOut().catch(() => {});
      const result = await doSignIn(form.email, form.password);
      if (result.isSignedIn) {
        setSessionCookie();
        router.push('/dashboard/setup');
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? 'Errore durante la registrazione.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-wide">
        <div className="auth-logo">
          <span dangerouslySetInnerHTML={{ __html: markSvg(40) }} />
          <span dangerouslySetInnerHTML={{ __html: logoSvg(180, 50) }} />
        </div>
        <h1 className="auth-h1">Registra la tua azienda</h1>
        <p className="auth-sub">Inizia il tuo percorso di AI Act compliance</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label>Nome Azienda *</label>
            <input type="text" value={form.company_name} onChange={e => update('company_name', e.target.value)}
              placeholder="Acme S.r.l." required />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Settore *</label>
              <select value={form.sector} onChange={e => update('sector', e.target.value)} required>
                <option value="">— Seleziona —</option>
                {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Dimensione *</label>
              <select value={form.employees_range} onChange={e => update('employees_range', e.target.value)} required>
                <option value="">— Dipendenti —</option>
                {SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label>Email aziendale *</label>
            <input type="email" value={form.email} onChange={e => update('email', e.target.value)}
              placeholder="mario@azienda.it" required autoComplete="email" />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Password *</label>
              <input type="password" value={form.password} onChange={e => update('password', e.target.value)}
                placeholder="Min. 8 caratteri" required autoComplete="new-password" />
            </div>
            <div className="field">
              <label>Conferma Password *</label>
              <input type="password" value={form.confirm} onChange={e => update('confirm', e.target.value)}
                placeholder="Ripeti la password" required autoComplete="new-password" />
            </div>
          </div>
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Registrazione in corso…' : 'Crea Account'}
          </button>
        </form>
        <p className="auth-link">
          Hai già un account? <a href="/login">Accedi</a>
        </p>
      </div>
    </div>
  );
}
