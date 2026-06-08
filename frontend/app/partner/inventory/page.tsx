'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import PMIInventoryDetailPage from './[pmiId]/_content';
import PartnerSystemDetailPage from './[pmiId]/[systemId]/_content';

// ─── Overview ─────────────────────────────────────────────────────────────────

interface PMISummary {
  pmi_id: string;
  company_name: string;
  contact_email: string;
  system_count: number;
  total_exposure_max: number;
  compliance_counts: { unchecked: number; checking: number; gap_found: number; compliant: number };
}

function fmtEur(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (n >= 1_000)     return `€${(n / 1_000).toFixed(0)}K`;
  if (n === 0)        return '—';
  return `€${n.toLocaleString('it-IT')}`;
}

function pmiStatus(p: PMISummary): 'unchecked' | 'checking' | 'gap_found' | 'compliant' {
  const c = p.compliance_counts;
  if (c.checking  > 0) return 'checking';
  if (c.gap_found > 0) return 'gap_found';
  if (c.compliant > 0 && c.unchecked === 0) return 'compliant';
  return 'unchecked';
}
const STATUS_LABEL: Record<string, string> = { unchecked: 'Non analizzato', checking: 'Analisi in corso…', gap_found: 'Gap trovati', compliant: 'Conforme' };
const STATUS_CLASS: Record<string, string> = { unchecked: 'status-unchecked', checking: 'status-checking', gap_found: 'status-gap', compliant: 'status-ok' };

function OverviewPage() {
  const router = useRouter();
  const [pmiList, setPmiList] = useState<PMISummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.partnerInventory.getOverview()
      .then(data => setPmiList(data as unknown as PMISummary[]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="db-loading"><div className="spin"></div></div>;

  const pmiWithSystems = pmiList.filter(p => p.system_count > 0);
  const totals = pmiWithSystems.reduce((acc, p) => ({
    systems:   acc.systems   + p.system_count,
    gaps:      acc.gaps      + p.compliance_counts.gap_found,
    compliant: acc.compliant + p.compliance_counts.compliant,
    exposure:  acc.exposure  + p.total_exposure_max,
  }), { systems: 0, gaps: 0, compliant: 0, exposure: 0 });

  if (pmiWithSystems.length === 0) {
    return (
      <div className="inv-page">
        <div className="inv-header"><div><h1 className="inv-title">AI Inventory</h1><p className="inv-sub">Nessuna PMI ha ancora configurato i propri sistemi AI</p></div></div>
        <div className="inv-empty">
          <div className="empty-icon">📊</div>
          <h3>In attesa di setup</h3>
          <p>Vai alla <strong>Discovery Dashboard</strong> per condividere il tuo link referral con le PMI. Una volta che si registrano e censiscono i loro sistemi AI, li vedrai qui.</p>
        </div>
      </div>
    );
  }

  const analyzed = totals.compliant + totals.gaps;
  const score    = analyzed > 0 ? Math.round((totals.compliant / totals.systems) * 100) : null;

  return (
    <div className="inv-page">
      <div className="inv-header">
        <div>
          <h1 className="inv-title">AI Inventory</h1>
          <p className="inv-sub">{pmiWithSystems.length} PMI referralizzate · {totals.systems} sistemi AI · sola lettura</p>
        </div>
      </div>

      <div className="inv-stats">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon stat-icon-blue"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg></div>
            <div className="stat-num">{pmiWithSystems.length}</div>
            <div className="stat-label">PMI con sistemi AI</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-blue"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></div>
            <div className="stat-num">{totals.systems}</div>
            <div className="stat-label">Sistemi AI totali</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-green"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg></div>
            <div className="stat-num stat-green">{totals.compliant}</div>
            <div className="stat-label">Conformi</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-red"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
            <div className="stat-num stat-red">{totals.gaps}</div>
            <div className="stat-label">Gap trovati</div>
          </div>
          <div className="stat-card stat-card-score">
            <div className="stat-icon stat-icon-orange"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg></div>
            {score !== null ? (
              <><div className={`stat-num ${score >= 70 ? 'stat-green' : score >= 40 ? 'stat-orange' : 'stat-red'}`}>{score}%</div><div className="stat-label">Tasso conformità</div></>
            ) : (
              <><div className="stat-num stat-dim">—</div><div className="stat-label">Tasso conformità</div></>
            )}
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-red"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/></svg></div>
            <div className={`stat-num ${totals.exposure > 0 ? 'stat-red' : 'stat-dim'}`}>{fmtEur(totals.exposure)}</div>
            <div className="stat-label">Esposizione totale</div>
          </div>
        </div>
      </div>

      {/* PMI cards — same inv-grid + sys-card format as tool cards */}
      <div className="inv-grid">
        {pmiWithSystems.map(pmi => {
          const st      = pmiStatus(pmi);
          const checked = pmi.compliance_counts.compliant + pmi.compliance_counts.gap_found;

          return (
            <div key={pmi.pmi_id} className="sys-card" style={{ cursor: 'pointer' }}
              onClick={() => router.push(`/partner/inventory?pmi=${pmi.pmi_id}`)}>
              <div className="sys-card-head">
                <div style={{ minWidth: 0 }}>
                  <div className="sys-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pmi.company_name}</div>
                  <div className="sys-vendor" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pmi.contact_email}</div>
                </div>
                <div className="sys-badges"><span className="cat-badge">{pmi.system_count} tool</span></div>
              </div>
              <div className="sys-card-body">
                <div className={`compliance-badge ${STATUS_CLASS[st]}`}>
                  {st === 'checking' && <span className="pulse-dot"></span>}
                  {STATUS_LABEL[st]}
                </div>
                {pmi.total_exposure_max > 0 && (
                  <div className="sys-exposure">
                    <span className="sys-exp-label">⚖️ Esposizione max:</span>
                    <span className="sys-exp-val">{fmtEur(pmi.total_exposure_max)}</span>
                  </div>
                )}
                <div className="sys-meta" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {pmi.compliance_counts.compliant > 0 && <span style={{ fontSize: 11, color: 'var(--green)' }}>✓ {pmi.compliance_counts.compliant} conformi</span>}
                    {pmi.compliance_counts.gap_found > 0 && <span style={{ fontSize: 11, color: 'var(--red)' }}>✗ {pmi.compliance_counts.gap_found} gap</span>}
                    {pmi.compliance_counts.checking  > 0 && <span style={{ fontSize: 11, color: 'var(--yellow)' }}>⟳ {pmi.compliance_counts.checking} in corso</span>}
                    {pmi.compliance_counts.unchecked > 0 && <span style={{ fontSize: 11, color: 'var(--dim)' }}>◯ {pmi.compliance_counts.unchecked} non analizzati</span>}
                  </div>
                  {checked > 0 && (
                    <div style={{ width: '100%', height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden', marginTop: 2 }}>
                      <div style={{ height: '100%', width: `${Math.round((checked / pmi.system_count) * 100)}%`, background: pmi.compliance_counts.gap_found > 0 ? 'var(--orange)' : 'var(--green)', borderRadius: 2 }} />
                    </div>
                  )}
                </div>
              </div>
              <div className="sys-card-footer">
                <button className="sys-detail-btn sys-detail-btn-full"
                  onClick={e => { e.stopPropagation(); router.push(`/partner/inventory?pmi=${pmi.pmi_id}`); }}>
                  Apri Inventory →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Router — reads ?pmi= and ?system= query params ───────────────────────────

function InventoryRouter() {
  const searchParams = useSearchParams();
  const pmiId    = searchParams.get('pmi')    ?? '';
  const systemId = searchParams.get('system') ?? '';

  if (pmiId && systemId) return <PartnerSystemDetailPage pmiId={pmiId} systemId={systemId} />;
  if (pmiId)             return <PMIInventoryDetailPage  pmiId={pmiId} />;
  return <OverviewPage />;
}

export default function PartnerInventoryPage() {
  return (
    <Suspense fallback={<div className="db-loading"><div className="spin"></div></div>}>
      <InventoryRouter />
    </Suspense>
  );
}
