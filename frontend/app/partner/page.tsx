'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { configureAmplify } from '@/lib/amplify';
import { api } from '@/lib/api';
import type { PartnerPMI, Partner } from '@/lib/types';

configureAmplify();

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://official-actify.com';

function defaultAssessmentEmailBody(companyName: string, formUrl: string, studio: string): string {
  return `<p>Gentile team di <strong>${companyName}</strong>,</p>
<p>Il <strong>Regolamento UE sull'Intelligenza Artificiale</strong> (AI Act — Reg. UE 2024/1689) è entrato in vigore ed è già applicabile per le categorie di rischio più elevate. Le scadenze per la piena conformità si avvicinano rapidamente, con <strong>sanzioni fino al 3% del fatturato globale</strong> (Art. 99) per le imprese non adempienti.</p>
<p>Come vostro consulente di riferimento, vi proponiamo un primo strumento gratuito per capire subito dove siete: <strong>Actify Free Assessment</strong>.</p>
<p>In soli <strong>5 minuti</strong>, potrete:</p>
<ul style="padding-left:20px;line-height:2.2;">
  <li>Registrare uno strumento AI in uso nella vostra organizzazione</li>
  <li>Scoprire il suo profilo di rischio secondo l'AI Act</li>
  <li>Ricevere un'anteprima dei potenziali gap normativi e delle sanzioni applicabili</li>
</ul>
<p style="background:rgba(34,197,94,.06);border-left:3px solid #22C55E;padding:12px 16px;border-radius:4px;"><strong>Gratuito, nessuna registrazione richiesta, risultati immediati.</strong></p>
<p><a href="${formUrl}" style="display:inline-block;background:#6C47FF;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">Avvia l'Assessment Gratuito →</a></p>
<p style="font-size:13px;color:#888;">Oppure copia e incolla nel browser:<br/><a href="${formUrl}">${formUrl}</a></p>
<p>Per qualsiasi domanda, rispondete a questa email o contattate direttamente lo studio <strong>${studio}</strong>.</p>`;
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<PartnerPMI['status'], { label: string; color: string; bg: string; border: string }> = {
  todo:        { label: 'Da contattare',               color: 'var(--muted)', bg: 'rgba(100,116,139,.08)', border: 'rgba(100,116,139,.2)' },
  pending:     { label: 'Assessment inviato',           color: '#f97316',      bg: 'rgba(249,115,22,.08)',  border: 'rgba(249,115,22,.25)' },
  completato:  { label: 'Free Assessment completato',   color: '#0ea5e9',      bg: 'rgba(14,165,233,.08)',  border: 'rgba(14,165,233,.25)' },
  onboarding:  { label: 'Onboarding in corso',          color: '#f59e0b',      bg: 'rgba(245,158,11,.08)',  border: 'rgba(245,158,11,.25)' },
  onboarded:   { label: 'Onboarded su Actify',          color: '#16a34a',      bg: 'rgba(34,197,94,.08)',   border: 'rgba(34,197,94,.25)' },
};

function StatusBadge({ status }: { status: PartnerPMI['status'] }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 6, padding: '3px 8px', whiteSpace: 'nowrap' }}>
      {cfg.label}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PartnerDashboard() {
  const router = useRouter();

  const [pmiList, setPmiList]   = useState<PartnerPMI[]>([]);
  const [partner, setPartner]   = useState<Partner | null>(null);
  const [loading, setLoading]   = useState(true);

  // Add PMI
  const [showAdd, setShowAdd]         = useState(false);
  const [addForm, setAddForm]         = useState({ company_name: '', contact_email: '' });
  const [addLoading, setAddLoading]   = useState(false);
  const [addError, setAddError]       = useState('');

  // CSV import
  const csvRef     = useRef<HTMLInputElement>(null);
  const [csvLoading, setCsvLoading] = useState(false);

  // Assessment email modal
  const [emailModal, setEmailModal]     = useState<PartnerPMI | null>(null);
  const [emailBody, setEmailBody]       = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSent, setEmailSent]       = useState(false);

  // Onboarding send state (per pmiId)
  const [sendingOnboarding, setSendingOnboarding] = useState<Set<string>>(new Set());
  const [onboardingSent, setOnboardingSent]       = useState<Set<string>>(new Set());

  // Manual status move (per pmiId)
  const [movingStatus, setMovingStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    Promise.all([
      api.partner.listPMI() as Promise<PartnerPMI[]>,
      api.partner.getMe() as unknown as Promise<Partner>,
    ]).then(([pmi, p]) => {
      setPmiList(pmi);
      setPartner(p);
    }).finally(() => setLoading(false));
  }, []);

  // ─── Add PMI ─────────────────────────────────────────────────────────────────

  async function handleAddPMI(e: React.FormEvent) {
    e.preventDefault();
    setAddError('');
    setAddLoading(true);
    try {
      const item = await api.partner.addPMI(addForm) as unknown as PartnerPMI;
      setPmiList(prev => [item, ...prev]);
      setAddForm({ company_name: '', contact_email: '' });
      setShowAdd(false);
    } catch (err: unknown) {
      setAddError((err as { message?: string }).message ?? 'Errore');
    } finally {
      setAddLoading(false);
    }
  }

  // ─── CSV import ───────────────────────────────────────────────────────────────

  async function handleCSVImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvLoading(true);
    const text = await file.text();
    const rows: { company_name: string; contact_email: string }[] = [];
    for (const line of text.split('\n').filter(Boolean)) {
      const parts = line.split(',');
      const company_name  = parts[0]?.trim();
      const contact_email = parts[1]?.trim();
      if (company_name && contact_email?.includes('@')) rows.push({ company_name, contact_email });
    }
    if (rows.length === 0) { alert('Nessuna riga valida. Formato: Nome Azienda,email@pmi.it'); setCsvLoading(false); return; }
    try {
      const res = await api.partner.importCSV(rows) as { created: number; items: PartnerPMI[] };
      setPmiList(prev => [...res.items, ...prev]);
      alert(`${res.created} PMI importate.`);
    } catch { alert('Errore importazione CSV.'); }
    finally { setCsvLoading(false); if (csvRef.current) csvRef.current.value = ''; }
  }

  // ─── Assessment email ─────────────────────────────────────────────────────────

  function openEmailModal(pmi: PartnerPMI) {
    const formUrl = `${APP_URL}?token=${pmi.form_token}`;
    const studio = partner?.ragione_sociale ?? 'il nostro studio';
    setEmailModal(pmi);
    setEmailBody(defaultAssessmentEmailBody(pmi.company_name, formUrl, studio));
    setEmailSent(false);
  }

  async function handleSendAssessment() {
    if (!emailModal) return;
    setEmailLoading(true);
    try {
      await api.partner.sendAssessment(emailModal.pmi_id, emailBody || undefined);
      setEmailSent(true);
      setPmiList(prev => prev.map(p =>
        p.pmi_id === emailModal.pmi_id ? { ...p, status: 'pending' } : p
      ));
    } catch (err: unknown) {
      alert((err as { message?: string }).message ?? 'Errore invio email.');
    } finally {
      setEmailLoading(false);
    }
  }

  // ─── Onboarding email ─────────────────────────────────────────────────────────

  async function handleSendOnboarding(pmi: PartnerPMI) {
    if (!confirm(`Inviare l'email di onboarding ad Actify a ${pmi.company_name}?\n\nConterrà il link referral con il 20% di sconto.`)) return;
    setSendingOnboarding(prev => new Set(prev).add(pmi.pmi_id));
    try {
      await api.partner.sendOnboarding(pmi.pmi_id);
      setPmiList(prev => prev.map(p =>
        p.pmi_id === pmi.pmi_id ? { ...p, status: 'onboarding' } : p
      ));
      setOnboardingSent(prev => new Set(prev).add(pmi.pmi_id));
    } catch (err: unknown) {
      alert((err as { message?: string }).message ?? 'Errore invio email onboarding.');
    } finally {
      setSendingOnboarding(prev => { const n = new Set(prev); n.delete(pmi.pmi_id); return n; });
    }
  }

  async function handleDeletePMI(pmiId: string) {
    if (!confirm('Eliminare questa PMI?')) return;
    await api.partner.deletePMI(pmiId);
    setPmiList(prev => prev.filter(p => p.pmi_id !== pmiId));
  }

  async function handleMoveStatus(pmi: PartnerPMI, newStatus: PartnerPMI['status']) {
    if (pmi.status === newStatus) return;
    setMovingStatus(prev => ({ ...prev, [pmi.pmi_id]: true }));
    try {
      await api.partner.updateStatus(pmi.pmi_id, newStatus);
      setPmiList(prev => prev.map(p => p.pmi_id === pmi.pmi_id ? { ...p, status: newStatus } : p));
    } catch (err: unknown) {
      alert((err as { message?: string }).message ?? 'Errore aggiornamento status.');
    } finally {
      setMovingStatus(prev => { const n = { ...prev }; delete n[pmi.pmi_id]; return n; });
    }
  }

  // ─── Stats ────────────────────────────────────────────────────────────────────

  const stats = {
    total:      pmiList.length,
    assessed:   pmiList.filter(p => ['completato','onboarding','onboarded'].includes(p.status)).length,
    onboarded:  pmiList.filter(p => p.status === 'onboarded').length,
  };

  const referralCode = partner?.referral_code ?? '';
  // referralUrl is a base — per-PMI links also embed pmi_id so the auto-onboard trigger always fires
  const referralUrl  = referralCode ? `${APP_URL}/register?ref=${referralCode}` : '';

  if (loading) return <div style={{ padding: 48, color: 'var(--muted)' }}>Caricamento…</div>;

  return (
    <>
      <div className="partner-topbar">
        <div>
          <div className="partner-h1">Discovery Dashboard</div>
          <div className="partner-sub">
            {partner?.ragione_sociale ?? 'Account Partner'} — pipeline acquisizione PMI
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input ref={csvRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCSVImport} />
          <button
            onClick={() => setShowAdd(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #059669, #34d399)',
              color: '#fff', fontSize: 14, fontWeight: 700, letterSpacing: '-.1px',
              boxShadow: '0 0 0 1px rgba(34,197,94,.3), 0 4px 16px rgba(5,150,105,.35)',
              transition: 'opacity .15s, transform .15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '.88')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="7.5" y1="2" x2="7.5" y2="13"/><line x1="2" y1="7.5" x2="13" y2="7.5"/>
            </svg>
            Onboarda PMI
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="pmi-stat-row">
        <div className="pmi-stat">
          <div className="pmi-stat-bar" style={{ background: 'rgba(148,163,184,.4)' }} />
          <div className="pmi-stat-val">{stats.total}</div>
          <div className="pmi-stat-label">PMI nel pipeline</div>
        </div>
        <div className="pmi-stat">
          <div className="pmi-stat-bar" style={{ background: '#0ea5e9' }} />
          <div className="pmi-stat-val" style={{ color: '#0ea5e9' }}>{stats.assessed}</div>
          <div className="pmi-stat-label">Assessment completati</div>
        </div>
        <div className="pmi-stat">
          <div className="pmi-stat-bar" style={{ background: '#16a34a' }} />
          <div className="pmi-stat-val" style={{ color: 'var(--green)' }}>{stats.onboarded}</div>
          <div className="pmi-stat-label">Onboarded su Actify</div>
        </div>
      </div>

      {/* Pipeline legend */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--muted)', marginRight: 4 }}>Pipeline:</span>
        {(['todo','pending','completato','onboarding','onboarded'] as PartnerPMI['status'][]).map(s => (
          <span key={s} style={{ ...STATUS_CONFIG[s], fontSize: 11, fontWeight: 500, borderRadius: 6, padding: '2px 8px', border: `1px solid ${STATUS_CONFIG[s].border}` }}>
            {STATUS_CONFIG[s].label} ({pmiList.filter(p => p.status === s).length})
          </span>
        ))}
      </div>

      {/* PMI Grid */}
      {pmiList.length === 0 ? (
        <div className="inv-empty">
          <div className="inv-empty-icon">🏢</div>
          <div className="inv-empty-title">Nessuna PMI ancora</div>
          <div className="inv-empty-sub">Aggiungi la prima PMI manualmente o importa un CSV con le aziende da seguire.</div>
          <button
            onClick={() => setShowAdd(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              margin: '20px auto 0', padding: '11px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #059669, #34d399)',
              color: '#fff', fontSize: 14, fontWeight: 700, letterSpacing: '-.1px',
              boxShadow: '0 0 0 1px rgba(34,197,94,.3), 0 4px 16px rgba(5,150,105,.35)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="7" y1="1.5" x2="7" y2="12.5"/><line x1="1.5" y1="7" x2="12.5" y2="7"/>
            </svg>
            Onboarda la prima PMI
          </button>
        </div>
      ) : (
        <div className="pmi-grid">
          {pmiList.map(pmi => {
            const formUrl = `${APP_URL}?token=${pmi.form_token}`;
            // Always embed pmi_id so registration auto-links the partnerPMI record regardless of email match
            const pmiReferralUrl = referralCode
              ? `${APP_URL}/register?ref=${referralCode}&pmi=${pmi.pmi_id}`
              : `${APP_URL}/register`;
            const isSendingOnboarding = sendingOnboarding.has(pmi.pmi_id);
            const onboardingJustSent  = onboardingSent.has(pmi.pmi_id);

            return (
              <div key={pmi.pmi_id} className="pmi-card">
                <div className="pmi-card-top">
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="pmi-card-name">{pmi.company_name}</div>
                    <div className="pmi-card-email">{pmi.contact_email}</div>
                  </div>
                  <StatusBadge status={pmi.status} />
                </div>

                {/* Status-specific info */}
                {pmi.status === 'completato' && pmi.systems && pmi.systems.length > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                    📋 {pmi.systems.length} strumento{pmi.systems.length !== 1 ? 'i' : ''} AI censit{pmi.systems.length !== 1 ? 'i' : 'o'}
                  </div>
                )}
                {pmi.status === 'onboarded' && (
                  <div style={{ marginBottom: 8 }}>
                    {/* Piano subscription — badge prominente */}
                    {pmi.onboarded_company?.subscription_tier && (() => {
                      const t = pmi.onboarded_company!.subscription_tier;
                      const isTrial = t === 'trial';
                      const label = t.charAt(0).toUpperCase() + t.slice(1);
                      const color  = isTrial ? '#f97316' : t === 'enterprise' ? '#06b6d4' : '#6C47FF';
                      const bg     = isTrial ? 'rgba(249,115,22,.12)' : t === 'enterprise' ? 'rgba(6,182,212,.12)' : 'rgba(108,71,255,.12)';
                      const border = isTrial ? 'rgba(249,115,22,.3)' : t === 'enterprise' ? 'rgba(6,182,212,.3)' : 'rgba(108,71,255,.3)';
                      return (
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          background: bg, border: `1.5px solid ${border}`, borderRadius: 8,
                          padding: '5px 12px', marginBottom: 10,
                        }}>
                          <span style={{ fontSize: 14 }}>{isTrial ? '⏱' : '✦'}</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color, letterSpacing: '0.02em' }}>
                            Piano {label}
                          </span>
                        </div>
                      );
                    })()}

                    <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600, marginBottom: 6 }}>
                      ✅ Registrata su Actify
                      {pmi.onboarded_at && ` · ${new Date(pmi.onboarded_at).toLocaleDateString('it-IT')}`}
                    </div>
                    {pmi.onboarded_company && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', fontSize: 11, color: 'var(--muted)' }}>
                        {pmi.onboarded_company.sector && <span>🏭 {pmi.onboarded_company.sector}</span>}
                        {pmi.onboarded_company.employees_range && <span>👥 {pmi.onboarded_company.employees_range}</span>}
                        {pmi.onboarded_company.country && <span>📍 {pmi.onboarded_company.country}</span>}
                        {(() => {
                          const rev = pmi.company_profile?.annual_revenue_exact ?? pmi.onboarded_company?.annual_revenue_exact;
                          const revRange = pmi.company_profile?.annual_revenue_range ?? pmi.onboarded_company?.annual_revenue_range;
                          if (rev) return <span>💶 {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(rev)}/anno</span>;
                          if (revRange) return <span>💶 {revRange}</span>;
                          return null;
                        })()}
                      </div>
                    )}
                  </div>
                )}
                {pmi.status === 'onboarding' && pmi.onboarding_sent_at && (
                  <div style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 8 }}>
                    Email onboarding inviata il {new Date(pmi.onboarding_sent_at).toLocaleDateString('it-IT')}
                  </div>
                )}
                {pmi.sent_at && pmi.status === 'pending' && (
                  <div style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 8 }}>
                    Assessment inviato il {new Date(pmi.sent_at).toLocaleDateString('it-IT')}
                  </div>
                )}

                {/* Primary actions */}
                <div className="pmi-card-actions">
                  {pmi.status === 'todo' && (<>
                    <button
                      onClick={() => navigator.clipboard.writeText(formUrl).then(() => alert('Link copiato!'))}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8' }}>
                      🔗 Copia link
                    </button>
                    <button
                      onClick={() => openEmailModal(pmi)}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', color: '#f59e0b' }}>
                      ✉️ Invia via Actify
                    </button>
                  </>)}

                  {pmi.status === 'pending' && (<>
                    <button
                      onClick={() => navigator.clipboard.writeText(formUrl).then(() => alert('Link copiato!'))}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8' }}>
                      🔗 Copia link
                    </button>
                    <button
                      onClick={() => openEmailModal(pmi)}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}>
                      ↺ Ri-invia
                    </button>
                  </>)}

                  {pmi.status === 'completato' && (<>
                    <button
                      onClick={() => navigator.clipboard.writeText(pmiReferralUrl).then(() => alert('Link copiato! Include il tuo codice referral e l\'ID della PMI.'))}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8' }}>
                      🔗 Copia link referral
                    </button>
                    <button
                      onClick={() => handleSendOnboarding(pmi)}
                      disabled={isSendingOnboarding}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: isSendingOnboarding ? 'default' : 'pointer', opacity: isSendingOnboarding ? 0.7 : 1, background: onboardingJustSent ? 'rgba(34,197,94,0.15)' : 'linear-gradient(135deg,#059669,#34d399)', border: onboardingJustSent ? '1px solid rgba(34,197,94,0.4)' : 'none', color: '#fff' }}>
                      {isSendingOnboarding ? '⟳ Invio…' : onboardingJustSent ? '✓ Inviata!' : '🚀 Invia onboarding'}
                    </button>
                  </>)}

                  {pmi.status === 'onboarding' && (<>
                    <button
                      onClick={() => navigator.clipboard.writeText(pmiReferralUrl).then(() => alert('Link copiato! Include il tuo codice referral e l\'ID della PMI.'))}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8' }}>
                      🔗 Copia link referral
                    </button>
                    <button
                      onClick={() => handleSendOnboarding(pmi)}
                      disabled={isSendingOnboarding}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: isSendingOnboarding ? 'default' : 'pointer', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}>
                      {isSendingOnboarding ? '⟳ Invio…' : '↺ Ri-invia email'}
                    </button>
                  </>)}

                  {pmi.status === 'onboarded' && pmi.onboarded_company_id && (
                    <button
                      onClick={() => router.push(`/partner/inventory?pmi=${pmi.onboarded_company_id}`)}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e' }}>
                      📊 Vedi AI Inventory →
                    </button>
                  )}

                  <button
                    onClick={() => handleDeletePMI(pmi.pmi_id)}
                    title="Elimina PMI"
                    style={{ flexShrink: 0, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, fontSize: 14, cursor: 'pointer', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', color: '#ef4444' }}>
                    🗑
                  </button>
                </div>

                {/* Manual status strip */}
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--muted)', marginBottom: 6 }}>
                    {movingStatus[pmi.pmi_id] ? 'Aggiornamento…' : 'Sposta manualmente →'}
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {(['todo','pending','completato','onboarding','onboarded'] as PartnerPMI['status'][]).map(s => {
                      const cfg = STATUS_CONFIG[s];
                      const isCurrent = pmi.status === s;
                      return (
                        <button
                          key={s}
                          onClick={() => handleMoveStatus(pmi, s)}
                          disabled={isCurrent || !!movingStatus[pmi.pmi_id]}
                          style={{ fontSize: 10, fontWeight: isCurrent ? 700 : 500, padding: '3px 8px', borderRadius: 5, cursor: isCurrent ? 'default' : 'pointer', transition: 'all .15s', background: isCurrent ? cfg.bg : 'transparent', border: `1px solid ${isCurrent ? cfg.border : 'var(--border)'}`, color: isCurrent ? cfg.color : 'var(--muted)', opacity: movingStatus[pmi.pmi_id] && !isCurrent ? 0.4 : 1 }}>
                          {isCurrent ? '● ' : ''}{cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add PMI Modal */}
      {showAdd && (
        <div className="modal-backdrop" onClick={() => setShowAdd(false)}>
          <div className="modal-box" style={{ width: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">Aggiungi PMI</div>
            </div>
            <form onSubmit={handleAddPMI} style={{ padding: '20px 24px' }}>
              <div className="field">
                <label>Nome Azienda *</label>
                <input type="text" value={addForm.company_name}
                  onChange={e => setAddForm(f => ({ ...f, company_name: e.target.value }))}
                  placeholder="Rossi S.r.l." required />
              </div>
              <div className="field">
                <label>Email di contatto *</label>
                <input type="email" value={addForm.contact_email}
                  onChange={e => setAddForm(f => ({ ...f, contact_email: e.target.value }))}
                  placeholder="info@rossi.it" required />
              </div>
              {addError && <div className="auth-error">{addError}</div>}
              <div className="modal-foot">
                <button type="button" className="btn-ghost" onClick={() => setShowAdd(false)}>Annulla</button>
                <button type="submit" className="inv-btn" disabled={addLoading}>
                  {addLoading ? 'Creando…' : 'Aggiungi PMI'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assessment Email Modal */}
      {emailModal && (
        <div className="modal-backdrop" onClick={() => setEmailModal(null)}>
          <div className="modal-box" style={{ width: 580 }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">✉️ Invia Free Assessment a {emailModal.company_name}</div>
            </div>
            <div style={{ padding: '20px 24px' }}>
              {emailSent ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                  <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Email inviata!</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                    L&apos;assessment gratuito è stato inviato a <strong>{emailModal.contact_email}</strong>
                  </div>
                  <button className="inv-btn" style={{ marginTop: 20 }} onClick={() => setEmailModal(null)}>Chiudi</button>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
                    Verrà inviata un&apos;email a <strong style={{ color: 'var(--text)' }}>{emailModal.contact_email}</strong> con il link al form di free assessment.<br/>
                    <span style={{ color: 'var(--accent)' }}>Il template spiega l&apos;AI Act, le scadenze e le sanzioni, e invita a compilare il questionario gratuito (nessuna registrazione richiesta).</span><br/>
                    Puoi modificare il testo prima di inviare.
                  </p>
                  <div className="email-editor">
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 8 }}>
                      Corpo email HTML — modificabile
                    </label>
                    <textarea
                      value={emailBody}
                      onChange={e => setEmailBody(e.target.value)}
                      rows={12}
                    />
                  </div>
                  <div className="modal-foot" style={{ marginTop: 16 }}>
                    <button className="btn-ghost" onClick={() => setEmailModal(null)}>Annulla</button>
                    <button className="inv-btn" onClick={handleSendAssessment} disabled={emailLoading}>
                      {emailLoading ? 'Invio in corso…' : '✉️ Invia Assessment Gratuito'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
