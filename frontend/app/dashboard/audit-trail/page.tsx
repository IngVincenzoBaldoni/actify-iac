'use client';

import { useEffect, useRef, useState } from 'react';
import { configureAmplify } from '@/lib/amplify';
import { api } from '@/lib/api';
import type { AuditEvent } from '@/lib/types';

configureAmplify();

const EVENT_CONFIG: Record<string, { icon: string; color: string; bg: string; category: string }> = {
  account_created:            { icon: '🏢', color: '#6C47FF', bg: 'rgba(108,71,255,.1)',  category: 'Account' },
  setup_completed:            { icon: '✅', color: '#16a34a', bg: 'rgba(22,163,74,.1)',   category: 'Account' },
  company_updated:            { icon: '⚙️', color: '#0ea5e9', bg: 'rgba(14,165,233,.1)', category: 'Account' },
  system_created:             { icon: '➕', color: '#6C47FF', bg: 'rgba(108,71,255,.1)',  category: 'AI Inventory' },
  system_updated:             { icon: '✏️', color: '#f59e0b', bg: 'rgba(245,158,11,.1)', category: 'AI Inventory' },
  system_deleted:             { icon: '🗑️', color: '#ef4444', bg: 'rgba(239,68,68,.1)',  category: 'AI Inventory' },
  compliance_check_started:   { icon: '🔍', color: '#0ea5e9', bg: 'rgba(14,165,233,.1)', category: 'Compliance' },
  compliance_check_completed: { icon: '📋', color: '#16a34a', bg: 'rgba(22,163,74,.1)',   category: 'Compliance' },
  compliance_check_failed:    { icon: '⚠️', color: '#ef4444', bg: 'rgba(239,68,68,.1)',  category: 'Compliance' },
  document_generated:         { icon: '📄', color: '#6C47FF', bg: 'rgba(108,71,255,.1)',  category: 'Documenti' },
  document_finalized:         { icon: '📌', color: '#16a34a', bg: 'rgba(22,163,74,.1)',   category: 'Documenti' },
  document_deleted:           { icon: '🗑️', color: '#ef4444', bg: 'rgba(239,68,68,.1)',  category: 'Documenti' },
  literacy_dept_created:      { icon: '🎓', color: '#0ea5e9', bg: 'rgba(14,165,233,.1)', category: 'AI Literacy' },
  literacy_dept_deleted:      { icon: '🗑️', color: '#ef4444', bg: 'rgba(239,68,68,.1)',  category: 'AI Literacy' },
  literacy_cert_added:        { icon: '🏆', color: '#f59e0b', bg: 'rgba(245,158,11,.1)', category: 'AI Literacy' },
  literacy_cert_deleted:      { icon: '🗑️', color: '#ef4444', bg: 'rgba(239,68,68,.1)',  category: 'AI Literacy' },
  user_invited:               { icon: '👤', color: '#6C47FF', bg: 'rgba(108,71,255,.1)',  category: 'Utenti' },
  user_deleted:               { icon: '👤', color: '#ef4444', bg: 'rgba(239,68,68,.1)',  category: 'Utenti' },
};

const CATEGORIES = ['Tutti', 'Account', 'AI Inventory', 'Compliance', 'Documenti', 'AI Literacy', 'Utenti'];

function getConfig(eventType: string) {
  return EVENT_CONFIG[eventType] ?? { icon: '📝', color: '#64748b', bg: 'rgba(100,116,139,.1)', category: 'Altro' };
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatFull(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('it-IT', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZoneName: 'short',
  });
}

function DetailChip({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined || value === '') return null;
  const display = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 6, padding: '2px 8px', fontSize: 11, color: 'var(--muted)',
    }}>
      <span style={{ color: 'var(--text)', fontWeight: 600 }}>{label}:</span> {display}
    </span>
  );
}

function EventRow({ event, isLast }: { event: AuditEvent; isLast: boolean }) {
  const [open, setOpen] = useState(false);
  const cfg = getConfig(event.event_type);
  const details = event.details ?? {};

  const primaryDetail = (details.system_name ?? details.tool_name ?? details.name ?? details.certification_name ?? details.company_name) as string | undefined;
  const riskLevel = details.risk_level as string | undefined;
  const status = details.status as string | undefined;

  return (
    <div style={{ display: 'flex', gap: 0, position: 'relative' }}>
      {/* Timeline line */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 40, flexShrink: 0 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: cfg.bg, border: `2px solid ${cfg.color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, flexShrink: 0, zIndex: 1,
        }}>
          {cfg.icon}
        </div>
        {!isLast && (
          <div style={{ width: 2, flex: 1, background: 'var(--border)', minHeight: 20, margin: '4px 0' }} />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, paddingLeft: 12, paddingBottom: isLast ? 0 : 20 }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            width: '100%', textAlign: 'left', background: 'none', border: 'none',
            cursor: 'pointer', padding: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                <span style={{
                  fontSize: 14, fontWeight: 700, color: 'var(--text)',
                }}>
                  {event.event_label}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 600, color: cfg.color,
                  background: cfg.bg, border: `1px solid ${cfg.color}40`,
                  borderRadius: 5, padding: '1px 7px',
                }}>
                  {cfg.category}
                </span>
                {riskLevel && (
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: riskLevel === 'high' || riskLevel === 'unacceptable' ? '#ef4444' : riskLevel === 'limited' ? '#f59e0b' : '#16a34a',
                    background: riskLevel === 'high' || riskLevel === 'unacceptable' ? 'rgba(239,68,68,.1)' : riskLevel === 'limited' ? 'rgba(245,158,11,.1)' : 'rgba(22,163,74,.1)',
                    borderRadius: 5, padding: '1px 7px',
                  }}>
                    Rischio {riskLevel}
                  </span>
                )}
                {status === 'compliant' && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#16a34a', background: 'rgba(22,163,74,.1)', borderRadius: 5, padding: '1px 7px' }}>
                    ✓ Conforme
                  </span>
                )}
                {status === 'gap_found' && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#f59e0b', background: 'rgba(245,158,11,.1)', borderRadius: 5, padding: '1px 7px' }}>
                    Gap rilevati
                  </span>
                )}
              </div>
              {primaryDetail && (
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 2 }}>
                  {primaryDetail}
                </div>
              )}
              {event.actor_email && (
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  da {event.actor_email}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{formatDate(event.timestamp)}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>{formatTime(event.timestamp)}</div>
            </div>
          </div>
        </button>

        {open && (
          <div style={{
            marginTop: 10, padding: '12px 14px',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10,
          }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Dettagli evento
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {Object.entries(details).map(([k, v]) => (
                <DetailChip key={k} label={k} value={v} />
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
              <span style={{ fontWeight: 600, color: 'var(--text)' }}>Timestamp esatto:</span> {formatFull(event.timestamp)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace', marginTop: 4 }}>
              <span style={{ fontWeight: 600, color: 'var(--text)' }}>Event ID:</span> {event.event_id}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MultiSysSelect({
  selected, onChange, activeSysNames, deletedSysNames, allSystemNames, compact = false,
}: {
  selected: string[];
  onChange: (v: string[]) => void;
  activeSysNames: string[];
  deletedSysNames: string[];
  allSystemNames: string[];
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  function toggle(name: string) {
    onChange(selected.includes(name) ? selected.filter(n => n !== name) : [...selected, name]);
  }

  const label = selected.length === 0
    ? 'Tutti i sistemi'
    : selected.length === 1 ? selected[0] : `${selected.length} sistemi`;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          padding: compact ? '6px 10px' : '9px 12px',
          background: 'var(--bg)',
          border: `1px solid ${selected.length > 0 ? '#6C47FF' : 'var(--border)'}`,
          borderRadius: compact ? 7 : 8,
          fontSize: compact ? 12 : 13,
          color: 'var(--text)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
          width: compact ? undefined : '100%',
          justifyContent: 'space-between',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: compact ? 160 : 280 }}>{label}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {selected.length > 0 && (
            <span style={{ background: '#6C47FF', color: '#fff', borderRadius: 10, fontSize: 9, fontWeight: 700, padding: '1px 6px' }}>
              {selected.length}
            </span>
          )}
          <span style={{ color: 'var(--muted)', fontSize: 9 }}>▼</span>
        </span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 200,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 10, minWidth: 220, maxWidth: 320,
          boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
          maxHeight: 320, overflowY: 'auto',
        }}>
          {/* Quick actions */}
          <div style={{ display: 'flex', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
            <button onClick={() => onChange(allSystemNames)} style={{ fontSize: 11, color: '#6C47FF', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, padding: 0 }}>Tutti</button>
            <span style={{ color: 'var(--muted)' }}>·</span>
            <button onClick={() => onChange([])} style={{ fontSize: 11, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Nessuno</button>
          </div>

          {activeSysNames.length > 0 && (
            <>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.7, padding: '8px 12px 4px' }}>Attivi</div>
              {activeSysNames.map(name => (
                <label key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px', cursor: 'pointer', fontSize: 12, color: 'var(--text)' }}>
                  <input type="checkbox" checked={selected.includes(name)} onChange={() => toggle(name)} style={{ accentColor: '#6C47FF', flexShrink: 0 }} />
                  {name}
                </label>
              ))}
            </>
          )}

          {deletedSysNames.length > 0 && (
            <>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: 0.7, padding: '8px 12px 4px', borderTop: activeSysNames.length > 0 ? '1px solid var(--border)' : undefined }}>
                ⛔ Eliminati
              </div>
              {deletedSysNames.map(name => (
                <label key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px', cursor: 'pointer', fontSize: 12, color: '#ef4444' }}>
                  <input type="checkbox" checked={selected.includes(name)} onChange={() => toggle(name)} style={{ accentColor: '#ef4444', flexShrink: 0 }} />
                  🔴 {name}
                </label>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function AuditTrailPage() {
  const [events, setEvents]         = useState<AuditEvent[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState('Tutti');
  const [search, setSearch]         = useState('');
  const [fromDate, setFromDate]     = useState('');
  const [toDate, setToDate]         = useState('');
  const [systemFilter, setSystemFilter] = useState<string[]>([]);
  const [activeSystemNames, setActiveSystemNames] = useState<Set<string>>(new Set());

  // Export modal state
  const [showModal, setShowModal]       = useState(false);
  const [modalFrom, setModalFrom]       = useState('');
  const [modalTo, setModalTo]           = useState('');
  const [modalSystems, setModalSystems] = useState<string[]>([]);
  const [exporting, setExporting]       = useState(false);

  function loadEvents(from?: string, to?: string) {
    setLoading(true);
    api.auditTrail.list({ from: from || undefined, to: to || undefined })
      .then(data => setEvents(Array.isArray(data) ? data : []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadEvents();
    api.systems.list()
      .then((systems: unknown[]) => {
        const names = new Set(
          systems
            .map(s => String((s as Record<string, unknown>).tool_name ?? ''))
            .filter(n => n.length > 0)
        );
        setActiveSystemNames(names);
      })
      .catch(() => { /* ignore */ });
  }, []);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await api.auditTrail.export({
        from:        modalFrom                    || undefined,
        to:          modalTo                      || undefined,
        systemNames: modalSystems.length > 0 ? modalSystems : undefined,
      });
      const bytes = Uint8Array.from(atob(res.pdfBase64), c => c.charCodeAt(0));
      const blob  = new Blob([bytes], { type: 'application/pdf' });
      const url   = URL.createObjectURL(blob);
      const a     = document.createElement('a');
      a.href      = url;
      a.download  = res.filename;
      a.click();
      URL.revokeObjectURL(url);
      setShowModal(false);
    } catch {
      alert('Errore durante la generazione del PDF. Riprova.');
    } finally {
      setExporting(false);
    }
  }

  function handleApplyFilters() {
    loadEvents(fromDate || undefined, toDate || undefined);
  }

  // All unique system names from audit events
  const allSystemNames = Array.from(
    new Set(
      events
        .map(e => String(e.details?.system_name ?? e.details?.tool_name ?? ''))
        .filter(n => n.length > 0)
    )
  ).sort();

  const activeLoaded = activeSystemNames.size > 0;
  const activeSysNames  = activeLoaded ? allSystemNames.filter(n =>  activeSystemNames.has(n)) : allSystemNames;
  const deletedSysNames = activeLoaded ? allSystemNames.filter(n => !activeSystemNames.has(n)) : [];

  const filtered = events.filter(e => {
    const cfg = getConfig(e.event_type);
    const matchCat    = filter === 'Tutti' || cfg.category === filter;
    const matchSearch = !search || e.event_label.toLowerCase().includes(search.toLowerCase()) ||
      (e.actor_email ?? '').toLowerCase().includes(search.toLowerCase()) ||
      JSON.stringify(e.details).toLowerCase().includes(search.toLowerCase());
    const evName = String(e.details?.system_name ?? e.details?.tool_name ?? '');
    const matchSystem = systemFilter.length === 0 || systemFilter.includes(evName);
    return matchCat && matchSearch && matchSystem;
  });

  // Group by date
  const grouped: { date: string; items: AuditEvent[] }[] = [];
  for (const ev of filtered) {
    const date = formatDate(ev.timestamp);
    if (grouped.length === 0 || grouped[grouped.length - 1].date !== date) {
      grouped.push({ date, items: [ev] });
    } else {
      grouped[grouped.length - 1].items.push(ev);
    }
  }

  return (
    <div style={{ padding: '0 28px 60px' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'rgba(108,71,255,.12)', border: '1.5px solid rgba(108,71,255,.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          }}>🔒</div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: 0 }}>Audit Trail Immutabile</h1>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
              Registro in sola lettura di tutte le azioni eseguite su Actify
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
            <div style={{
              background: 'rgba(22,163,74,.1)', border: '1px solid rgba(22,163,74,.3)',
              borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 700, color: '#16a34a',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <span>●</span> Sola lettura
            </div>
            {!loading && events.length > 0 && (
              <button
                onClick={() => setShowModal(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: '#6C47FF', color: '#fff',
                  border: 'none', borderRadius: 10, padding: '10px 20px',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(108,71,255,.35)',
                }}
              >
                📄 Genera Report PDF
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Legal disclaimer */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(108,71,255,.06), rgba(14,165,233,.04))',
        border: '1.5px solid rgba(108,71,255,.2)',
        borderRadius: 14, padding: '20px 24px', marginBottom: 28,
      }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 28, flexShrink: 0, marginTop: 2 }}>⚖️</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)', marginBottom: 8 }}>
              Perché l&apos;Audit Trail vale oro in caso di ispezione
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.75, margin: '0 0 10px' }}>
              Il valore strategico dell&apos;Audit Trail non risiede nell&apos;utilizzo ordinario, ma si manifesta
              nel momento in cui l&apos;impresa è soggetta a un&apos;ispezione da parte dell&apos;Autorità Nazionale
              competente o a una contestazione formale da parte delle autorità di vigilanza. In tale contesto, il
              registro costituisce evidenza documentale che l&apos;organizzazione ha{' '}
              <strong style={{ color: 'var(--text)' }}>adottato le misure previste dalla normativa</strong>,
              ha <strong style={{ color: 'var(--text)' }}>condotto le valutazioni di conformità nei tempi stabiliti</strong>{' '}
              e ha <strong style={{ color: 'var(--text)' }}>implementato i provvedimenti tecnici e organizzativi richiesti</strong>,
              con indicazione precisa delle date.
            </p>
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.75, margin: 0 }}>
              Nel diritto amministrativo e penale, la <strong style={{ color: '#6C47FF' }}>buona fede</strong> e la{' '}
              <strong style={{ color: '#6C47FF' }}>diligenza dimostrata</strong> costituiscono fattori attenuanti
              di rilievo nell&apos;applicazione delle sanzioni. L&apos;Audit Trail fornisce la prova documentale
              di tale diligenza:{' '}
              <strong style={{ color: 'var(--text)' }}>
                la disponibilità di un registro immutabile e certificato può determinare la differenza sostanziale
                tra l&apos;applicazione della sanzione massima (Art. 99 — fino a 35 milioni €) e quella minima.
              </strong>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
          {[
            { icon: '🛡️', text: 'Prova di diligenza documentale' },
            { icon: '📅', text: 'Timestamp certificati per ogni azione' },
            { icon: '🔍', text: 'Traccia audit-ready per le autorità' },
            { icon: '⚡', text: 'Riduce il rischio di sanzioni massime' },
          ].map(item => (
            <div key={item.text} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '6px 12px', fontSize: 12,
            }}>
              <span>{item.icon}</span>
              <span style={{ color: 'var(--text)', fontWeight: 600 }}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      {!loading && events.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'Eventi totali', value: events.length, color: '#6C47FF' },
            { label: 'Compliance check', value: events.filter(e => e.event_type === 'compliance_check_completed').length, color: '#16a34a' },
            { label: 'Sistemi AI censiti', value: events.filter(e => e.event_type === 'system_created').length, color: '#0ea5e9' },
            { label: 'Documenti generati', value: events.filter(e => e.event_type === 'document_generated').length, color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} style={{
              flex: 1, minWidth: 120,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '12px 16px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Period + system filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center', padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8, flexShrink: 0 }}>Filtri</div>
        <input
          type="date"
          value={fromDate}
          onChange={e => setFromDate(e.target.value)}
          style={{ padding: '6px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12, color: 'var(--text)', cursor: 'pointer' }}
        />
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>→</span>
        <input
          type="date"
          value={toDate}
          onChange={e => setToDate(e.target.value)}
          style={{ padding: '6px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12, color: 'var(--text)', cursor: 'pointer' }}
        />
        {allSystemNames.length > 0 && (
          <MultiSysSelect
            selected={systemFilter}
            onChange={setSystemFilter}
            activeSysNames={activeSysNames}
            deletedSysNames={deletedSysNames}
            allSystemNames={allSystemNames}
            compact
          />
        )}
        <button
          onClick={handleApplyFilters}
          style={{ padding: '6px 14px', background: '#6C47FF', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
        >
          Applica
        </button>
        {(fromDate || toDate || systemFilter.length > 0) && (
          <button
            onClick={() => { setFromDate(''); setToDate(''); setSystemFilter([]); loadEvents(); }}
            style={{ padding: '6px 10px', background: 'none', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12, cursor: 'pointer' }}
          >
            Reset
          </button>
        )}
      </div>

      {/* ── Export PDF modal ── */}
      {showModal && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
        >
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
            width: '100%', maxWidth: 520, padding: '32px 32px 28px', position: 'relative',
          }}>
            {/* Close */}
            <button
              onClick={() => setShowModal(false)}
              style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--muted)', lineHeight: 1 }}
            >×</button>

            {/* Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(108,71,255,.12)', border: '1.5px solid rgba(108,71,255,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>📄</div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Genera Report PDF</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Documento ufficiale con valore legale</div>
              </div>
            </div>

            {/* What the PDF contains */}
            <div style={{ background: 'rgba(108,71,255,.06)', border: '1px solid rgba(108,71,255,.18)', borderRadius: 10, padding: '12px 14px', marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Il PDF include</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {[
                  '📋 Panoramica sistemi AI con stato compliance ed esposizione',
                  '⚖️ Disclaimer legale Art. 99 AI Act',
                  '📅 Registro completo degli eventi filtrati con timestamp CET',
                  '🔒 Hash SHA-256 per verificare l\'immutabilità del documento',
                ].map(t => (
                  <div key={t} style={{ fontSize: 12, color: 'var(--text2)' }}>{t}</div>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Periodo</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="date"
                    value={modalFrom}
                    onChange={e => setModalFrom(e.target.value)}
                    style={{ flex: 1, padding: '9px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text)' }}
                  />
                  <span style={{ color: 'var(--muted)', fontSize: 12 }}>→</span>
                  <input
                    type="date"
                    value={modalTo}
                    onChange={e => setModalTo(e.target.value)}
                    style={{ flex: 1, padding: '9px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text)' }}
                  />
                </div>
                {!modalFrom && !modalTo && (
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Nessun filtro = tutti gli eventi disponibili</div>
                )}
              </div>

              {allSystemNames.length > 0 && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>
                    Sistemi AI (opzionale)
                  </label>
                  <MultiSysSelect
                    selected={modalSystems}
                    onChange={setModalSystems}
                    activeSysNames={activeSysNames}
                    deletedSysNames={deletedSysNames}
                    allSystemNames={allSystemNames}
                  />
                </div>
              )}
            </div>

            {/* CTA */}
            <button
              onClick={handleExport}
              disabled={exporting}
              style={{
                width: '100%', padding: '14px', borderRadius: 10, border: 'none',
                background: exporting ? 'var(--border)' : '#6C47FF', color: '#fff',
                fontSize: 15, fontWeight: 800, cursor: exporting ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {exporting
                ? <><span className="plan-cta-spin" style={{ width: 16, height: 16, borderWidth: 2 }} /> Generazione in corso…</>
                : '📄 Genera e Scarica PDF'
              }
            </button>
          </div>
        </div>
      )}

      {/* Category filters + search */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Cerca nel registro…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: 180, padding: '8px 12px',
            background: 'var(--input-bg)', border: '1px solid var(--border)',
            borderRadius: 8, fontSize: 13, color: 'var(--text)',
          }}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: filter === cat ? '#6C47FF' : 'var(--surface)',
                color: filter === cat ? '#fff' : 'var(--muted)',
                border: `1px solid ${filter === cat ? '#6C47FF' : 'var(--border)'}`,
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      {loading ? (
        <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--muted)' }}>
          <div className="spin" style={{ margin: '0 auto 12px' }} />
          Caricamento registro…
        </div>
      ) : events.length === 0 ? (
        <div style={{
          padding: '48px 24px', textAlign: 'center',
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
          <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Nessun evento registrato ancora</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            Le azioni che esegui su Actify appariranno qui man mano che le esegui.
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
          Nessun evento trovato per il filtro selezionato.
        </div>
      ) : (
        <div>
          {grouped.map(group => (
            <div key={group.date} style={{ marginBottom: 28 }}>
              <div style={{
                fontSize: 12, fontWeight: 700, color: 'var(--muted)',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                marginBottom: 16, paddingBottom: 8,
                borderBottom: '1px solid var(--border)',
              }}>
                {group.date}
              </div>
              <div>
                {group.items.map((ev, idx) => (
                  <EventRow
                    key={ev.event_id}
                    event={ev}
                    isLast={idx === group.items.length - 1}
                  />
                ))}
              </div>
            </div>
          ))}

          <div style={{
            marginTop: 32, padding: '14px 18px',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, fontSize: 12, color: 'var(--muted)', textAlign: 'center',
          }}>
            🔒 Questo registro è in sola lettura e non può essere modificato o cancellato.
            Ogni evento è identificato da un timestamp e un ID univoco.
          </div>
        </div>
      )}
    </div>
  );
}
