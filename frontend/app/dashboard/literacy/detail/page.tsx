'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { LiteracyProfile, LiteracyEvidence, CertSuggestion } from '@/lib/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LEVEL_LABEL: Record<string, string> = { beginner: 'Base', intermediate: 'Intermedio', advanced: 'Avanzato' };
const LEVEL_COLOR: Record<string, string> = { beginner: '#16A34A', intermediate: '#CA8A04', advanced: '#DC2626' };

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('it-IT'); } catch { return iso; }
}

function statusColor(pct: number, hc: number) {
  if (hc === 0) return '#94a3b8';
  if (pct >= 80) return '#22C55E';
  if (pct > 0)   return '#CA8A04';
  return '#DC2626';
}

// ─── AddEvidence Modal ────────────────────────────────────────────────────────

function AddEvidenceModal({
  systemId, profileId, profileLabel,
  onSave, onClose,
}: {
  systemId: string; profileId: string; profileLabel: string;
  onSave: () => void; onClose: () => void;
}) {
  const [step, setStep]               = useState<1 | 2>(1);
  const [type, setType]               = useState<'certification' | 'internal_training'>('certification');
  const [title, setTitle]             = useState('');
  const [date, setDate]               = useState('');
  const [people, setPeople]           = useState('');
  const [issuer, setIssuer]           = useState('');
  const [url, setUrl]                 = useState('');
  const [topics, setTopics]           = useState<string[]>([]);
  const [topicInput, setTopicInput]   = useState('');
  const [responsible, setResponsible] = useState('');
  const [notes, setNotes]             = useState('');
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  function addTopic() {
    const t = topicInput.trim();
    if (t && !topics.includes(t) && topics.length < 20) {
      setTopics(prev => [...prev, t]);
      setTopicInput('');
    }
  }

  async function handleSave() {
    if (!title.trim())  { setError('Inserisci il titolo'); return; }
    if (!date)          { setError('Inserisci la data'); return; }
    if (!people || Number(people) < 1) { setError('Inserisci il numero di persone (min 1)'); return; }
    if (type === 'internal_training' && topics.length === 0) { setError('Aggiungi almeno un argomento trattato'); return; }

    setSaving(true);
    try {
      await api.literacy.addEvidence(systemId, profileId, {
        evidence_type: type,
        title:         title.trim(),
        date,
        people_count:  Number(people),
        ...(type === 'certification' ? {
          issuer:    issuer.trim() || undefined,
          url:       url.trim()    || undefined,
        } : {
          topics,
          responsible: responsible.trim() || undefined,
        }),
        notes: notes.trim() || undefined,
      });
      onSave();
    } catch (e: unknown) {
      setError((e as { message?: string }).message ?? 'Errore durante il salvataggio.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Aggiungi Evidenza — {profileLabel}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {step === 1 ? (
            <>
              <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 18, lineHeight: 1.5 }}>
                Scegli il tipo di evidenza da registrare. Entrambe sono valide ai fini Art. 4.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                {([
                  { key: 'certification'     as const, icon: '🎓', title: 'Certificazione esterna', desc: 'Badge, diploma o attestato rilasciato da un ente esterno (Coursera, Google, Microsoft, ecc.)' },
                  { key: 'internal_training' as const, icon: '📋', title: 'Formazione interna', desc: 'Sessione formativa organizzata internamente, con argomenti e responsabile documentati' },
                ] as const).map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setType(opt.key)}
                    style={{ flex: 1, padding: '16px 14px', borderRadius: 10, border: type === opt.key ? '2px solid var(--green)' : '1px solid var(--border)', background: type === opt.key ? 'rgba(34,197,94,0.06)' : 'var(--surface)', cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ fontSize: 22, marginBottom: 8 }}>{opt.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 5 }}>{opt.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{opt.desc}</div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="field">
                <label>Titolo *</label>
                <input type="text" value={title} placeholder={type === 'certification' ? 'Es. Google AI Essentials' : 'Es. Workshop AI Literacy Q2 2026'} onChange={e => setTitle(e.target.value)} />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Data *</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div className="field">
                  <label>N° persone coperte *</label>
                  <input type="number" min={1} value={people} placeholder="Es. 5" onChange={e => setPeople(e.target.value)} />
                </div>
              </div>

              {type === 'certification' ? (
                <>
                  <div className="field">
                    <label>Ente erogatore</label>
                    <input type="text" value={issuer} placeholder="Es. Google, Coursera, Microsoft…" onChange={e => setIssuer(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Link / URL certificato</label>
                    <input type="url" value={url} placeholder="https://…" onChange={e => setUrl(e.target.value)} />
                  </div>
                </>
              ) : (
                <>
                  <div className="field">
                    <label>Argomenti trattati * <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(premi Invio per aggiungere)</span></label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="text" value={topicInput}
                        placeholder="Es. Rischi AI, Bias cognitivo, EU AI Act…"
                        onChange={e => setTopicInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTopic(); } }}
                        style={{ flex: 1 }}
                      />
                      <button type="button" onClick={addTopic} style={{ padding: '0 14px', background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>+</button>
                    </div>
                    {topics.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                        {topics.map(t => (
                          <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', background: 'rgba(99,102,241,0.1)', color: '#6366F1', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                            {t}
                            <button type="button" onClick={() => setTopics(prev => prev.filter(x => x !== t))} style={{ background: 'none', border: 'none', color: '#6366F1', cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1 }}>×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="field">
                    <label>Responsabile / Docente</label>
                    <input type="text" value={responsible} placeholder="Es. Mario Rossi — HR Manager" onChange={e => setResponsible(e.target.value)} />
                  </div>
                </>
              )}

              <div className="field">
                <label>Note aggiuntive</label>
                <textarea rows={2} value={notes} placeholder="Note opzionali…" onChange={e => setNotes(e.target.value)} />
              </div>
              {error && <div className="alert-err show">{error}</div>}
            </>
          )}
        </div>

        <div className="modal-foot">
          <button className="btn-ghost" onClick={step === 1 ? onClose : () => { setStep(1); setError(''); }}>
            {step === 1 ? 'Annulla' : '← Indietro'}
          </button>
          {step === 1
            ? <button className="btn-submit" onClick={() => setStep(2)}>Continua →</button>
            : <button className="btn-submit" onClick={handleSave} disabled={saving}>{saving ? 'Salvataggio…' : 'Registra evidenza'}</button>
          }
        </div>
      </div>
    </div>
  );
}

// ─── Unified Profile Card (PMI mode ON) ───────────────────────────────────────

type EvidenceWithPid = LiteracyEvidence & { _pid: string };

function UnifiedProfileCard({
  primaryProfile, secondaryProfile, systemId, onRefresh,
}: {
  primaryProfile: LiteracyProfile;
  secondaryProfile: LiteracyProfile;
  systemId: string;
  onRefresh: () => void;
}) {
  const [editHc, setEditHc]         = useState(false);
  const [hcInput, setHcInput]       = useState(String(primaryProfile.headcount));
  const [savingHc, setSavingHc]     = useState(false);
  const [showAdd, setShowAdd]       = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [unmerging, setUnmerging]   = useState(false);

  const allEvidences: EvidenceWithPid[] = [
    ...primaryProfile.evidences.map(e => ({ ...e, _pid: primaryProfile.profile_id })),
    ...secondaryProfile.evidences.map(e => ({ ...e, _pid: secondaryProfile.profile_id })),
  ];
  const totalCovered = allEvidences.reduce((s, e) => s + (e.people_count ?? 0), 0);
  const headcount    = primaryProfile.headcount;
  const coveragePct  = headcount > 0 ? Math.min(100, Math.round((totalCovered / headcount) * 100)) : 0;
  const color        = statusColor(coveragePct, headcount);

  async function saveHeadcount() {
    const hc = Number(hcInput);
    if (isNaN(hc) || hc < 0) return;
    setSavingHc(true);
    try {
      await api.literacy.updateProfile(systemId, primaryProfile.profile_id, { headcount: hc });
      setEditHc(false);
      onRefresh();
    } catch { /* silent */ }
    setSavingHc(false);
  }

  async function handleUnmerge() {
    setUnmerging(true);
    try {
      await api.literacy.updateProfile(systemId, secondaryProfile.profile_id, { merged_with: null });
      onRefresh();
    } catch { /* silent */ }
    finally { setUnmerging(false); }
  }

  async function handleDelete(ev: EvidenceWithPid) {
    if (!confirm(`Eliminare l'evidenza "${ev.title}"?`)) return;
    setDeletingId(ev.evidence_id);
    try {
      await api.literacy.deleteEvidence(systemId, ev._pid, ev.evidence_id);
      onRefresh();
    } catch { /* silent */ }
    setDeletingId(null);
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 14, overflow: 'hidden', gridColumn: '1 / -1' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', background: 'rgba(99,102,241,0.05)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 8 }}>
            {primaryProfile.label} + {secondaryProfile.label}
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', background: 'rgba(99,102,241,0.15)', color: '#6366F1', borderRadius: 4 }}>Profilo unificato</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>Una persona copre entrambi i ruoli — Art. 4 PMI piccola</div>
        </div>
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          <div style={{ fontSize: 24, fontWeight: 900, color, lineHeight: 1 }}>
            {headcount === 0 ? '—' : `${coveragePct}%`}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)' }}>copertura combinata</div>
        </div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {/* PMI note */}
        <div style={{ marginBottom: 14, padding: '8px 12px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, fontSize: 12, color: '#6366F1', lineHeight: 1.5 }}>
          Le evidenze qui registrate coprono entrambi i profili ({primaryProfile.label} e {secondaryProfile.label}) ai fini del calcolo Art. 4.
        </div>

        {/* Headcount */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Persone nel ruolo:</span>
          {editHc ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="number" min={0} value={hcInput}
                onChange={e => setHcInput(e.target.value)}
                style={{ width: 80, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 12 }}
                autoFocus
              />
              <button onClick={saveHeadcount} disabled={savingHc} style={{ padding: '4px 10px', background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                {savingHc ? '…' : 'Salva'}
              </button>
              <button onClick={() => { setEditHc(false); setHcInput(String(primaryProfile.headcount)); }} style={{ padding: '4px 8px', background: 'none', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, color: 'var(--muted)', cursor: 'pointer' }}>✕</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: headcount === 0 ? 'var(--muted)' : 'var(--text)' }}>
                {headcount === 0 ? 'Non configurato' : headcount}
              </span>
              <button onClick={() => setEditHc(true)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 5, padding: '2px 7px', fontSize: 10, color: 'var(--muted)', cursor: 'pointer' }}>✎ Modifica</button>
            </div>
          )}
        </div>

        {/* Coverage bar */}
        {headcount > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginBottom: 5 }}>
              <div style={{ height: '100%', width: `${coveragePct}%`, background: color, borderRadius: 3 }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              {totalCovered} / {headcount} persone formate (evidenze combinate)
            </div>
          </div>
        )}

        {/* Evidences */}
        {allEvidences.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {allEvidences.map(ev => (
              <div key={ev.evidence_id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 9 }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>{ev.evidence_type === 'certification' ? '🎓' : '📋'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>{ev.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <span>📅 {fmtDate(ev.date)}</span>
                    <span>👥 {ev.people_count} persone</span>
                    {ev.issuer && <span>🏛 {ev.issuer}</span>}
                    {ev.url && <a href={ev.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--green)', textDecoration: 'none', fontWeight: 600 }}>🔗 Link</a>}
                    {ev.topics?.length ? <span>📌 {ev.topics.slice(0, 3).join(', ')}{ev.topics.length > 3 ? `…+${ev.topics.length - 3}` : ''}</span> : null}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(ev)}
                  disabled={deletingId === ev.evidence_id}
                  style={{ flexShrink: 0, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', color: '#DC2626', borderRadius: 7, padding: '5px 9px', fontSize: 11, cursor: 'pointer' }}>
                  {deletingId === ev.evidence_id ? '…' : '✕'}
                </button>
              </div>
            ))}
          </div>
        )}

        {allEvidences.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', marginBottom: 12 }}>
            Nessuna evidenza registrata. Aggiungi certificazioni o formazione interna per coprire entrambi i profili.
          </p>
        )}

        {/* Un-merge toggle */}
        <button
          type="button"
          onClick={handleUnmerge}
          disabled={unmerging}
          style={{ marginBottom: 14, width: '100%', padding: '10px 14px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 9, display: 'flex', alignItems: 'center', gap: 10, cursor: unmerging ? 'wait' : 'pointer', textAlign: 'left', opacity: unmerging ? 0.7 : 1 }}>
          <span style={{ fontSize: 16, lineHeight: 1 }}>{unmerging ? '⏳' : '✅'}</span>
          <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600, flex: 1 }}>Stessa persona copre entrambi i ruoli</span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>PMI piccola · clicca per separare</span>
        </button>

        <button
          onClick={() => setShowAdd(true)}
          style={{ width: '100%', padding: '9px', background: 'rgba(34,197,94,0.08)', border: '1px dashed rgba(34,197,94,0.4)', color: 'var(--green)', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          + Aggiungi evidenza
        </button>
      </div>

      {showAdd && (
        <AddEvidenceModal
          systemId={systemId}
          profileId={primaryProfile.profile_id}
          profileLabel={`${primaryProfile.label} + ${secondaryProfile.label}`}
          onSave={() => { setShowAdd(false); onRefresh(); }}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}

// ─── Profile Card (PMI mode OFF only) ────────────────────────────────────────

function ProfileCard({
  profile, systemId, allProfiles, onRefresh,
}: {
  profile: LiteracyProfile;
  systemId: string;
  allProfiles: LiteracyProfile[];
  onRefresh: () => void;
}) {
  const [editHc, setEditHc]           = useState(false);
  const [hcInput, setHcInput]         = useState(String(profile.headcount));
  const [savingHc, setSavingHc]       = useState(false);
  const [showAdd, setShowAdd]         = useState(false);
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const [mergeSaving, setMergeSaving] = useState(false);

  const color     = statusColor(profile.coverage_pct, profile.headcount);
  const other     = allProfiles.find(p => p.profile_type !== profile.profile_type);
  const showMerge = profile.system_role === 'deployer' && allProfiles.length === 2;

  async function saveHeadcount() {
    const hc = Number(hcInput);
    if (isNaN(hc) || hc < 0) return;
    setSavingHc(true);
    try {
      await api.literacy.updateProfile(systemId, profile.profile_id, { headcount: hc });
      setEditHc(false);
      onRefresh();
    } catch { /* silent */ }
    setSavingHc(false);
  }

  async function handleMerge() {
    if (mergeSaving || !other) return;
    setMergeSaving(true);
    try {
      // ProfileCard only renders when PMI is OFF → merge THIS card to enable PMI
      await api.literacy.updateProfile(systemId, profile.profile_id, { merged_with: other.profile_type });
      onRefresh();
    } catch { /* silent */ }
    finally { setMergeSaving(false); }
  }

  async function handleDeleteEvidence(ev: LiteracyEvidence) {
    if (!confirm(`Eliminare l'evidenza "${ev.title}"?`)) return;
    setDeletingId(ev.evidence_id);
    try {
      await api.literacy.deleteEvidence(systemId, profile.profile_id, ev.evidence_id);
      onRefresh();
    } catch { /* silent */ }
    setDeletingId(null);
  }

  return (
    <div style={{ background: 'var(--surface)', border: `1px solid ${color}40`, borderRadius: 14, overflow: 'hidden' }}>
      {/* Card header */}
      <div style={{ padding: '14px 20px', background: `${color}0a`, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)', marginBottom: 3 }}>{profile.label}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{profile.description}</div>
        </div>
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          <div style={{ fontSize: 24, fontWeight: 900, color, lineHeight: 1 }}>
            {profile.headcount === 0 ? '—' : `${profile.coverage_pct}%`}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)' }}>copertura</div>
        </div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {/* Headcount row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Persone nel ruolo:</span>
          {editHc ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="number" min={0} value={hcInput}
                onChange={e => setHcInput(e.target.value)}
                style={{ width: 80, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 12 }}
                autoFocus
              />
              <button onClick={saveHeadcount} disabled={savingHc} style={{ padding: '4px 10px', background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                {savingHc ? '…' : 'Salva'}
              </button>
              <button onClick={() => { setEditHc(false); setHcInput(String(profile.headcount)); }} style={{ padding: '4px 8px', background: 'none', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, color: 'var(--muted)', cursor: 'pointer' }}>✕</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: profile.headcount === 0 ? 'var(--muted)' : 'var(--text)' }}>
                {profile.headcount === 0 ? 'Non configurato' : profile.headcount}
              </span>
              <button onClick={() => setEditHc(true)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 5, padding: '2px 7px', fontSize: 10, color: 'var(--muted)', cursor: 'pointer' }}>✎ Modifica</button>
            </div>
          )}
        </div>

        {/* Coverage bar */}
        {profile.headcount > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginBottom: 5 }}>
              <div style={{ height: '100%', width: `${profile.coverage_pct}%`, background: color, borderRadius: 3 }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              {profile.evidences.reduce((s, e) => s + (e.people_count ?? 0), 0)} / {profile.headcount} persone formate
            </div>
          </div>
        )}

        {/* Evidences */}
        {profile.evidences.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {profile.evidences.map(ev => (
              <div key={ev.evidence_id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 9 }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>{ev.evidence_type === 'certification' ? '🎓' : '📋'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>{ev.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <span>📅 {fmtDate(ev.date)}</span>
                    <span>👥 {ev.people_count} persone</span>
                    {ev.issuer && <span>🏛 {ev.issuer}</span>}
                    {ev.url && <a href={ev.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--green)', textDecoration: 'none', fontWeight: 600 }}>🔗 Link</a>}
                    {ev.topics?.length ? <span>📌 {ev.topics.slice(0, 3).join(', ')}{ev.topics.length > 3 ? `…+${ev.topics.length - 3}` : ''}</span> : null}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteEvidence(ev)}
                  disabled={deletingId === ev.evidence_id}
                  style={{ flexShrink: 0, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', color: '#DC2626', borderRadius: 7, padding: '5px 9px', fontSize: 11, cursor: 'pointer' }}>
                  {deletingId === ev.evidence_id ? '…' : '✕'}
                </button>
              </div>
            ))}
          </div>
        )}

        {profile.evidences.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', marginBottom: 12 }}>Nessuna evidenza registrata per questo profilo.</p>
        )}

        {/* Merge toggle — enables PMI mode (⬜ = PMI OFF, this card renders only when PMI is OFF) */}
        {showMerge && (
          <button
            type="button"
            onClick={handleMerge}
            disabled={mergeSaving}
            style={{ marginBottom: 14, width: '100%', padding: '10px 14px', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 9, display: 'flex', alignItems: 'center', gap: 10, cursor: mergeSaving ? 'wait' : 'pointer', textAlign: 'left', opacity: mergeSaving ? 0.7 : 1 }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>{mergeSaving ? '⏳' : '⬜'}</span>
            <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600, flex: 1 }}>Stessa persona copre entrambi i ruoli</span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>PMI piccola</span>
          </button>
        )}

        <button
          onClick={() => setShowAdd(true)}
          style={{ width: '100%', padding: '9px', background: 'rgba(34,197,94,0.08)', border: '1px dashed rgba(34,197,94,0.4)', color: 'var(--green)', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          + Aggiungi evidenza
        </button>
      </div>

      {showAdd && (
        <AddEvidenceModal
          systemId={systemId}
          profileId={profile.profile_id}
          profileLabel={profile.label}
          onSave={() => { setShowAdd(false); onRefresh(); }}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}

// ─── Suggestions panel ────────────────────────────────────────────────────────

function SuggestionsPanel({ systemId, profile }: { systemId: string; profile: LiteracyProfile }) {
  const [open, setOpen]               = useState(false);
  const [suggestions, setSuggestions] = useState<CertSuggestion[]>([]);
  const [loading, setLoading]         = useState(false);
  const [loaded, setLoaded]           = useState(false);

  async function load() {
    if (loaded) { setOpen(o => !o); return; }
    setOpen(true);
    setLoading(true);
    try {
      const r = await api.literacy.getSuggestions(systemId, profile.profile_type);
      setSuggestions((r as { suggestions: CertSuggestion[] }).suggestions);
      setLoaded(true);
    } catch { /* silent */ }
    setLoading(false);
  }

  return (
    <div style={{ border: '1px solid rgba(99,102,241,0.25)', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
      <button
        onClick={load}
        style={{ width: '100%', padding: '12px 18px', background: 'rgba(99,102,241,0.05)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#6366F1', fontWeight: 700, fontSize: 13 }}>
        <span>💡 Certificazioni consigliate — {profile.label}</span>
        <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--muted)' }}>{open ? '▲ Chiudi' : '▼ Mostra'}</span>
      </button>

      {open && (
        <div style={{ padding: '14px 18px' }}>
          {loading && <div style={{ textAlign: 'center', padding: '20px 0' }}><div className="spin" style={{ margin: '0 auto 8px' }} /><p style={{ fontSize: 13, color: 'var(--muted)' }}>Analisi AI in corso…</p></div>}
          {!loading && suggestions.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, padding: '12px 0', borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>{s.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{s.provider} · {s.format}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{s.description}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: `${LEVEL_COLOR[s.level]}22`, color: LEVEL_COLOR[s.level] }}>{LEVEL_LABEL[s.level]}</span>
                <a href={`https://www.google.com/search?q=${encodeURIComponent(s.search_query || `${s.name} ${s.provider}`)}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600, textDecoration: 'none' }}>Cerca →</a>
              </div>
            </div>
          ))}
          {!loading && loaded && (
            <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 12, fontStyle: 'italic', lineHeight: 1.6 }}>
              Queste sono certificazioni suggerite a titolo indicativo. La PMI può valutare qualsiasi altro percorso formativo ritenuto idoneo per il proprio contesto e per la compliance Art. 4.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main detail content ──────────────────────────────────────────────────────

function LiteracyDetailContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const systemId     = searchParams.get('id') ?? '';

  const [profiles, setProfiles]           = useState<LiteracyProfile[]>([]);
  const [system, setSystem]               = useState<Record<string, unknown> | null>(null);
  const [litStatus, setLitStatus]         = useState<string>('not_started');
  const [loading, setLoading]             = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const load = useCallback(async () => {
    if (!systemId) return;
    setLoading(true);
    try {
      const r = await api.literacy.getProfiles(systemId);
      const typed = r as { system: Record<string, unknown>; profiles: LiteracyProfile[]; literacy_status: string };
      setSystem(typed.system);
      setProfiles(typed.profiles ?? []);
      setLitStatus(typed.literacy_status ?? 'not_started');
    } catch { /* silent */ }
    setLoading(false);
  }, [systemId]);

  useEffect(() => { load(); }, [load]);

  async function handleGenerateReport() {
    setGeneratingPdf(true);
    try {
      await api.literacy.generateReport(systemId);
      router.push('/dashboard/documents');
    } catch { /* silent */ }
    setGeneratingPdf(false);
  }

  const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
    not_started: { label: 'Non avviato',  color: '#DC2626', bg: 'rgba(220,38,38,0.08)' },
    in_progress: { label: 'In corso',     color: '#CA8A04', bg: 'rgba(202,138,4,0.08)' },
    compliant:   { label: 'Conforme',     color: '#16A34A', bg: 'rgba(22,163,74,0.08)' },
  };
  const statusCfg = STATUS_MAP[litStatus] ?? STATUS_MAP.not_started;

  if (!systemId) {
    return (
      <div className="inv-page">
        <div className="inv-empty">
          <div className="inv-empty-icon">🎓</div>
          <div className="inv-empty-title">Sistema non trovato</div>
          <button className="btn-submit" onClick={() => router.push('/dashboard/literacy')}>← Torna all&apos;AI Literacy Tracker</button>
        </div>
      </div>
    );
  }

  if (loading) return <div className="db-loading"><div className="spin"></div></div>;

  const toolName   = (system?.tool_name as string) ?? systemId;
  const vendor     = (system?.vendor as string) ?? '';
  const category   = (system?.category as string) ?? '';
  const systemRole = (system?.system_role as string) ?? 'deployer';
  const roleLabel  = systemRole === 'provider' ? 'Provider' : 'Deployer';
  const roleColor  = systemRole === 'provider' ? '#6366F1' : '#0EA5E9';

  // PMI mode: one profile has merged_with set (secondary), the other doesn't (primary)
  const mergedProfile  = profiles.find(p => !!p.merged_with);
  const primaryProfile = profiles.find(p => !p.merged_with);
  const inPMIMode      = !!mergedProfile && !!primaryProfile;

  return (
    <div className="inv-page">
      {/* Back */}
      <button onClick={() => router.push('/dashboard/literacy')} style={{ background: 'none', border: 'none', color: 'var(--green)', cursor: 'pointer', fontSize: 14, fontWeight: 600, marginBottom: 16, padding: 0 }}>
        ← AI Literacy Tracker
      </button>

      {/* Header */}
      <div className="inv-header" style={{ marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 className="inv-title" style={{ marginBottom: 0 }}>{toolName}</h1>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6, background: `${roleColor}18`, color: roleColor }}>{roleLabel}</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6, background: statusCfg.bg, color: statusCfg.color }}>{statusCfg.label}</span>
          </div>
          <p className="inv-sub">
            {[vendor, category].filter(Boolean).join(' · ')}
            {profiles.length > 0 && ` · ${profiles.filter(p => p.coverage_pct >= 80 && p.headcount > 0).length}/${profiles.length} profili conformi`}
          </p>
        </div>
      </div>

      {/* Report Art. 4 section */}
      <div style={{ marginBottom: 24, padding: '16px 20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 5 }}>📄 Report Art. 4 — Evidenze AI Literacy</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, maxWidth: 500 }}>
            Questo documento è <strong>fondamentale in caso di ispezione</strong> da parte delle autorità competenti (Art. 4 EU AI Act).
            Verrà salvato nel <strong>Document Vault</strong> e sarà disponibile per il download e la condivisione con gli ispettori.
          </div>
        </div>
        <button
          onClick={handleGenerateReport}
          disabled={generatingPdf}
          style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: generatingPdf ? 'var(--surface)' : '#0f172a', color: generatingPdf ? 'var(--muted)' : '#fff', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: generatingPdf ? 'default' : 'pointer' }}>
          {generatingPdf
            ? <><span className="spin" style={{ width: 14, height: 14, borderWidth: 2 }} /> Salvataggio…</>
            : '📄 Salva in Document Vault'}
        </button>
      </div>

      {/* Profile cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16, marginBottom: 28 }}>
        {inPMIMode
          ? <UnifiedProfileCard
              primaryProfile={primaryProfile!}
              secondaryProfile={mergedProfile!}
              systemId={systemId}
              onRefresh={load}
            />
          : profiles.map(p => (
              <ProfileCard
                key={p.profile_id}
                profile={p}
                systemId={systemId}
                allProfiles={profiles}
                onRefresh={load}
              />
            ))
        }
      </div>

      {/* Suggestions */}
      {profiles.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Certificazioni consigliate per profilo</div>
          {inPMIMode && primaryProfile
            ? <SuggestionsPanel key={primaryProfile.profile_id} systemId={systemId} profile={primaryProfile} />
            : profiles.map(p => <SuggestionsPanel key={p.profile_id} systemId={systemId} profile={p} />)
          }
        </div>
      )}
    </div>
  );
}

export default function LiteracyDetailPage() {
  return (
    <Suspense fallback={<div className="db-loading"><div className="spin"></div></div>}>
      <LiteracyDetailContent />
    </Suspense>
  );
}
