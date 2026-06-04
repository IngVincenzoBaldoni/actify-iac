'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { LiteracyDepartment, LiteracyCertification, CertSuggestion } from '@/lib/types';

// ─── Add Department Modal ──────────────────────────────────────────────────────

function AddDeptModal({
  systems,
  onSave,
  onClose,
}: {
  systems: Array<{ system_id: string; tool_name: string }>;
  onSave: () => void;
  onClose: () => void;
}) {
  const [name, setName]           = useState('');
  const [headcount, setHeadcount] = useState('');
  const [sysIds, setSysIds]       = useState<string[]>([]);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  async function handleSave() {
    if (!name.trim()) { setError('Inserisci il nome del dipartimento'); return; }
    if (!headcount || Number(headcount) < 1) { setError('Inserisci il numero di persone'); return; }
    if (sysIds.length === 0) { setError('Seleziona almeno un tool AI'); return; }
    setSaving(true);
    try {
      await api.literacy.createDept({ name: name.trim(), headcount: Number(headcount), system_ids: sysIds });
      onSave();
    } catch (e: unknown) {
      setError((e as { message?: string }).message ?? 'Errore durante il salvataggio.');
    } finally {
      setSaving(false);
    }
  }

  function toggleSys(id: string) {
    setSysIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Aggiungi Dipartimento</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>Nome Dipartimento *</label>
            <input type="text" value={name} placeholder="Es. HR, Finance, Operations…" onChange={e => setName(e.target.value)} />
          </div>
          <div className="field">
            <label>N° persone nel dipartimento *</label>
            <input type="number" min={1} value={headcount} placeholder="Es. 12" onChange={e => setHeadcount(e.target.value)} />
          </div>
          <div className="field">
            <label>Tool AI collegati *</label>
            <div className="check-list">
              {systems.map(s => (
                <label key={s.system_id} className="check-row">
                  <input type="checkbox" checked={sysIds.includes(s.system_id)} onChange={() => toggleSys(s.system_id)} />
                  <span>{s.tool_name}</span>
                </label>
              ))}
              {systems.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 13 }}>Nessun tool AI censito. Aggiungi sistemi AI nell&apos;AI Inventory prima.</p>}
            </div>
          </div>
          {error && <div className="alert-err show">{error}</div>}
        </div>
        <div className="modal-foot">
          <button className="btn-ghost" onClick={onClose}>Annulla</button>
          <button className="btn-submit" onClick={handleSave} disabled={saving}>{saving ? 'Salvataggio…' : 'Aggiungi'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Suggest Modal ────────────────────────────────────────────────────────────

function SuggestModal({ dept, onClose }: { dept: LiteracyDepartment; onClose: () => void }) {
  const [suggestions, setSuggestions] = useState<CertSuggestion[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');

  useEffect(() => {
    api.literacy.suggest(dept.dept_id)
      .then(r => setSuggestions((r as { suggestions: CertSuggestion[] }).suggestions))
      .catch(e => setError((e as { message?: string }).message ?? 'Errore'))
      .finally(() => setLoading(false));
  }, [dept.dept_id]);

  const levelLabel: Record<string, string> = { beginner: 'Base', intermediate: 'Intermedio', advanced: 'Avanzato' };
  const levelColor: Record<string, string> = { beginner: '#16A34A', intermediate: '#CA8A04', advanced: '#DC2626' };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Certificazioni consigliate — {dept.name}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div className="spin" style={{ margin: '0 auto 12px' }}></div>
              <p style={{ color: 'var(--muted)', fontSize: 14 }}>Analisi in corso con AI…</p>
            </div>
          )}
          {error && <div className="alert-err show">{error}</div>}
          {!loading && !error && suggestions.map((s, i) => (
            <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px', marginBottom: 12, background: 'var(--surface)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>{s.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>{s.provider} · {s.format}</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{s.description}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: `${levelColor[s.level]}22`, color: levelColor[s.level] }}>{levelLabel[s.level] ?? s.level}</span>
                  {s.url && <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600, textDecoration: 'none' }}>Apri →</a>}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="modal-foot">
          <button className="btn-ghost" onClick={onClose}>Chiudi</button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Cert Modal ───────────────────────────────────────────────────────────

function AddCertModal({ deptId, onSave, onClose }: { deptId: string; onSave: () => void; onClose: () => void }) {
  const [certName, setCertName]     = useState('');
  const [issuedDate, setIssuedDate] = useState('');
  const [url, setUrl]               = useState('');
  const [people, setPeople]         = useState('');
  const [notes, setNotes]           = useState('');
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  async function handleSave() {
    if (!certName.trim()) { setError('Inserisci il nome della certificazione'); return; }
    if (!issuedDate) { setError('Inserisci la data di emissione'); return; }
    setSaving(true);
    try {
      await api.literacy.addCert(deptId, {
        certification_name: certName.trim(),
        issued_date:        issuedDate,
        ...(url.trim() ? { url: url.trim() } : {}),
        ...(people ? { people_count: Number(people) } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
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
      <div className="modal-box" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Registra Certificazione</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>Nome Certificazione *</label>
            <input type="text" value={certName} placeholder="Es. AI Literacy Badge, Responsible AI Certificate…" onChange={e => setCertName(e.target.value)} />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Data di emissione *</label>
              <input type="date" value={issuedDate} onChange={e => setIssuedDate(e.target.value)} />
            </div>
            <div className="field">
              <label>N° persone che l&apos;hanno presa</label>
              <input type="number" min={1} value={people} placeholder="Es. 5" onChange={e => setPeople(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Link / URL</label>
            <input type="url" value={url} placeholder="https://…" onChange={e => setUrl(e.target.value)} />
          </div>
          <div className="field">
            <label>Note aggiuntive</label>
            <textarea rows={2} value={notes} placeholder="Es. completato online, superato con esame finale…" onChange={e => setNotes(e.target.value)} />
          </div>
          {error && <div className="alert-err show">{error}</div>}
        </div>
        <div className="modal-foot">
          <button className="btn-ghost" onClick={onClose}>Annulla</button>
          <button className="btn-submit" onClick={handleSave} disabled={saving}>{saving ? 'Salvataggio…' : 'Registra'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Department Detail View ───────────────────────────────────────────────────

function DeptDetail({
  deptId,
  departments,
  onBack,
}: {
  deptId: string;
  departments: LiteracyDepartment[];
  onBack: () => void;
}) {
  const [certs, setCerts]     = useState<LiteracyCertification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const dept = departments.find(d => d.dept_id === deptId);

  async function load() {
    setLoading(true);
    try {
      const r = await api.literacy.listCerts(deptId);
      setCerts((r as { certifications: LiteracyCertification[] }).certifications);
    } catch { /* silent */ }
    setLoading(false);
  }

  useEffect(() => { load(); }, [deptId]);

  async function handleDeleteCert(cert: LiteracyCertification) {
    if (!confirm(`Eliminare la certificazione "${cert.certification_name}"?`)) return;
    await api.literacy.deleteCert(deptId, cert.cert_id);
    load();
  }

  const coveredPeople = certs.reduce((s, c) => s + (c.people_count ?? 0), 0);
  const hc = dept?.headcount ?? 0;

  return (
    <div className="inv-page">
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--green)', cursor: 'pointer', fontSize: 14, fontWeight: 600, marginBottom: 16, padding: 0 }}>
        ← AI Literacy Tracker
      </button>

      {loading ? (
        <div className="db-loading"><div className="spin"></div></div>
      ) : (
        <>
          <div className="inv-header" style={{ marginBottom: 24 }}>
            <div>
              <h1 className="inv-title">{dept?.name ?? deptId}</h1>
              <p className="inv-sub">{hc} persone · {certs.length} certificazion{certs.length === 1 ? 'e' : 'i'} registrate</p>
            </div>
            <button className="btn-submit" onClick={() => setShowAdd(true)}>+ Registra Certificazione</button>
          </div>

          {hc > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 22px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, color: coveredPeople >= hc ? '#22C55E' : '#CA8A04' }}>
                  {Math.min(Math.round(coveredPeople / hc * 100), 100)}%
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Copertura stimata</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(Math.round(coveredPeople / hc * 100), 100)}%`, background: coveredPeople >= hc ? '#22C55E' : '#CA8A04', borderRadius: 4 }} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>{coveredPeople} / {hc} persone con almeno una certificazione</div>
              </div>
            </div>
          )}

          {certs.length === 0 && (
            <div className="inv-empty">
              <div className="inv-empty-icon">📋</div>
              <div className="inv-empty-title">Nessuna certificazione registrata</div>
              <div className="inv-empty-sub">Registra le certificazioni ottenute dal team o torna al tracker per suggerimenti personalizzati.</div>
              <button className="btn-submit" onClick={() => setShowAdd(true)}>+ Registra Certificazione</button>
            </div>
          )}

          {certs.map(cert => (
            <div key={cert.cert_id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>{cert.certification_name}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <span>📅 {new Date(cert.issued_date).toLocaleDateString('it-IT')}</span>
                  {cert.people_count && <span>👥 {cert.people_count} persone</span>}
                  {cert.url && <a href={cert.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--green)', fontWeight: 600, textDecoration: 'none' }}>🔗 Apri link</a>}
                </div>
                {cert.notes && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, fontStyle: 'italic' }}>{cert.notes}</div>}
              </div>
              <button onClick={() => handleDeleteCert(cert)} style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', color: '#DC2626', borderRadius: 8, padding: '6px 10px', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>✕</button>
            </div>
          ))}
        </>
      )}

      {showAdd && <AddCertModal deptId={deptId} onSave={() => { setShowAdd(false); load(); }} onClose={() => setShowAdd(false)} />}
    </div>
  );
}

// ─── Main List View ───────────────────────────────────────────────────────────

function LiteracyContent() {
  const router      = useRouter();
  const params      = useSearchParams();
  const activeDept  = params.get('dept');

  const [departments, setDepartments] = useState<LiteracyDepartment[]>([]);
  const [systems, setSystems]         = useState<Array<{ system_id: string; tool_name: string }>>([]);
  const [loading, setLoading]         = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [suggestDept, setSuggestDept]   = useState<LiteracyDepartment | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await api.literacy.list();
      setDepartments((r as { departments: LiteracyDepartment[] }).departments);
      setSystems((r as { systems: Array<{ system_id: string; tool_name: string }> }).systems);
    } catch { /* silent */ }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(dept: LiteracyDepartment) {
    if (dept.source !== 'manual') return;
    if (!confirm(`Eliminare il dipartimento "${dept.name}"?`)) return;
    await api.literacy.deleteDept(dept.dept_id);
    load();
  }

  // Show dept detail if ?dept= param is set
  if (activeDept && !loading) {
    return (
      <DeptDetail
        deptId={activeDept}
        departments={departments}
        onBack={() => router.push('/dashboard/literacy')}
      />
    );
  }

  const totalPeople  = departments.reduce((s, d) => s + (d.headcount ?? 0), 0);
  const totalCerts   = departments.reduce((s, d) => s + (d.cert_count ?? 0), 0);
  const coveredDepts = departments.filter(d => (d.cert_count ?? 0) > 0).length;

  return (
    <div className="inv-page">
      <div className="inv-header">
        <div>
          <h1 className="inv-title">AI Literacy Tracker</h1>
          <p className="inv-sub">Gestisci la formazione AI del tuo team — obbligo Art. 4 EU AI Act</p>
        </div>
        <button className="btn-submit" style={{ whiteSpace: 'nowrap' }} onClick={() => setShowAddModal(true)}>
          + Aggiungi Dipartimento
        </button>
      </div>

      {!loading && departments.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Dipartimenti', value: departments.length, color: '#6366F1' },
            { label: 'Persone coinvolte', value: totalPeople, color: '#0EA5E9' },
            { label: 'Certificazioni registrate', value: totalCerts, color: '#22C55E' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Art. 4 banner */}
      <div style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.3)', borderLeft: '4px solid #CA8A04', borderRadius: '0 10px 10px 0', padding: '14px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 18 }}>⚠</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#CA8A04', marginBottom: 2 }}>Art. 4 EU AI Act — Alfabetizzazione AI</div>
          <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>
            I deployer e provider devono garantire che il personale che utilizza sistemi AI abbia un adeguato livello di competenza AI.
            {departments.length > 0 && coveredDepts < departments.length && (
              <strong style={{ color: '#CA8A04' }}> {departments.length - coveredDepts} dipartiment{departments.length - coveredDepts === 1 ? 'o' : 'i'} senza certificazioni.</strong>
            )}
          </div>
        </div>
      </div>

      {loading && <div className="db-loading"><div className="spin"></div></div>}

      {!loading && departments.length === 0 && (
        <div className="inv-empty">
          <div className="inv-empty-icon">🎓</div>
          <div className="inv-empty-title">Nessun dipartimento ancora</div>
          <div className="inv-empty-sub">Aggiungi i dipartimenti che usano strumenti AI. Si auto-popolano anche dai tool censiti nell&apos;AI Inventory se hai specificato il dipartimento.</div>
          <button className="btn-submit" onClick={() => setShowAddModal(true)}>+ Aggiungi Dipartimento</button>
        </div>
      )}

      {!loading && departments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {departments.map(dept => (
            <div key={dept.dept_id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: (dept.cert_count ?? 0) > 0 ? '#22C55E' : '#CA8A04' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{dept.name}</span>
                  {dept.source === 'inventory' && (
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: 'rgba(99,102,241,0.12)', color: '#6366F1' }}>AI Inventory</span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                  {dept.headcount} persone ·{' '}
                  <span style={{ color: (dept.cert_count ?? 0) > 0 ? '#22C55E' : '#CA8A04', fontWeight: 600 }}>
                    {dept.cert_count ?? 0} certificazion{(dept.cert_count ?? 0) === 1 ? 'e' : 'i'}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={() => setSuggestDept(dept)} style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', color: '#6366F1', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  💡 Consigliami certificazioni
                </button>
                <button onClick={() => router.push(`/dashboard/literacy?dept=${dept.dept_id}`)} style={{ background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Dettaglio →
                </button>
                {dept.source === 'manual' && (
                  <button onClick={() => handleDelete(dept)} style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', color: '#DC2626', borderRadius: 8, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>✕</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <AddDeptModal
          systems={systems}
          onSave={() => { setShowAddModal(false); load(); }}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {suggestDept && <SuggestModal dept={suggestDept} onClose={() => setSuggestDept(null)} />}
    </div>
  );
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function LiteracyPage() {
  return (
    <Suspense fallback={<div className="db-loading"><div className="spin"></div></div>}>
      <LiteracyContent />
    </Suspense>
  );
}
