'use client';

import { Suspense } from 'react';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { ComplianceCheck, ComplianceGap, ComplianceResult, ChecklistEntry, ActifyDocument, DocGeneration } from '@/lib/types';
import { normalizeEntry } from '@/lib/types';
import { SanctionOverview } from '@/components/SanctionOverview';

const AUTO_LABELS: Record<string, string> = {
  document_generation: 'Generazione Documento',
  policy_template:     'Policy Template',
  transparency_notice: 'Notice Trasparenza',
  risk_assessment:     'Risk Assessment',
  monitoring_plan:     'Piano di Monitoraggio',
  conformity_declaration: 'Dichiarazione di Conformità',
};

// ─── Document Preview Modal ───────────────────────────────────────────────────

function DocumentPreviewModal({ doc, onFinalize, onClose }: {
  doc:        ActifyDocument;
  onFinalize: () => void;
  onClose:    () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-badge">Bozza</div>
            <h2 className="modal-title">{doc.title}</h2>
            <p className="modal-meta">{doc.article} · Generato il {new Date(doc.generated_at).toLocaleDateString('it-IT')}</p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <iframe src={doc.preview_url} className="pdf-preview-frame" title="Anteprima documento" />
          <p className="modal-disclaimer">
            ⚠ Verifica il documento prima di salvarlo. Dopo la finalizzazione il gap verrà marcato come risolto.
          </p>
        </div>
        <div className="modal-footer">
          <a href={doc.preview_url} target="_blank" rel="noopener noreferrer" className="btn-doc-download">
            ⬇ Scarica PDF
          </a>
          <button className="btn-doc-finalize" onClick={onFinalize}>
            ✓ Salva nel Vault — segna gap come risolto
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Gap Generate Block ───────────────────────────────────────────────────────

const GEN_STATUS_LABELS: Record<string, string> = {
  QUEUED:           'In coda…',
  RUNNING:          'Generazione in corso (~60s)…',
  DRAFT_READY:      'Bozza pronta',
  REVIEW_REQUIRED:  'Revisione richiesta',
  FAILED:           'Generazione fallita',
};

function GapGenerateBlock({ gap, doc, gen, generating, onGenerate, onFinalize, onRegenerate, onOpenPreview, onSanctionUpdate }: {
  gap:                ComplianceGap;
  doc?:               ActifyDocument;
  gen?:               DocGeneration;
  generating:         boolean;
  onGenerate:         () => void;
  onFinalize:         (docId: string) => void;
  onRegenerate:       (docId: string) => void;
  onOpenPreview:      (doc: ActifyDocument) => void;
  onSanctionUpdate?:  () => void;
}) {
  const typeLabel = AUTO_LABELS[gap.automation_type!] ?? (gap.automation_type ?? '').replace(/_/g, ' ');

  // Pipeline states take priority over legacy doc states
  if (gen?.status === 'QUEUED' || gen?.status === 'RUNNING') {
    return (
      <div className="gap-gen-block">
        <div className="gap-gen-type">{typeLabel}</div>
        <div className="gap-gen-running">
          <span className="spin-sm" /> {GEN_STATUS_LABELS[gen.status]}
        </div>
      </div>
    );
  }

  if (gen?.status === 'FAILED') {
    return (
      <div className="gap-gen-block">
        <div className="gap-gen-type">{typeLabel}</div>
        <div className="gap-gen-error">
          ⚠ {gen.errorMessage ?? 'Errore nella generazione del documento'}
        </div>
        <button className="btn-generate" onClick={onGenerate} disabled={generating}>
          <span>↻</span> Riprova
        </button>
      </div>
    );
  }

  if (gen?.status === 'REVIEW_REQUIRED') {
    return (
      <div className="gap-gen-block">
        <div className="gap-gen-type">{typeLabel}</div>
        <div className="gap-gen-error" style={{ background: 'rgba(251,191,36,0.1)', borderColor: 'rgba(251,191,36,0.3)', color: '#f59e0b' }}>
          ⚠ Validazione non superata — revisione manuale richiesta
          {gen.errorMessage && <p style={{ marginTop: 4, fontSize: 12, opacity: 0.8 }}>{gen.errorMessage}</p>}
        </div>
        <button className="btn-generate" onClick={onGenerate} disabled={generating}>
          <span>↻</span> Rigenera
        </button>
      </div>
    );
  }

  // Legacy doc-based rendering (includes DRAFT_READY with linked doc)
  if (!doc || doc.status === 'error') {
    return (
      <div className="gap-gen-block">
        <div className="gap-gen-type">{typeLabel}</div>
        {doc?.status === 'error' && (
          <div className="gap-gen-error">⚠ Errore nella generazione: {doc.error_message ?? 'errore sconosciuto'}</div>
        )}
        <button className="btn-generate" onClick={onGenerate} disabled={generating}>
          {generating ? <><span className="spin-sm" /> Avvio generazione…</> : <><span>⚡</span> Genera con Actify</>}
        </button>
      </div>
    );
  }

  if (doc.status === 'generating') {
    return (
      <div className="gap-gen-block">
        <div className="gap-gen-type">{typeLabel}</div>
        <div className="gap-gen-running"><span className="spin-sm" /> Generazione in corso (~60s)…</div>
      </div>
    );
  }

  if (doc.status === 'draft') {
    return (
      <div className="gap-gen-block gap-gen-draft">
        <div className="gap-gen-type">{typeLabel}</div>
        <div className="gap-gen-doc-row">
          <span className="gap-gen-doc-title">📄 {doc.title}</span>
          <span className="badge-draft">Bozza</span>
        </div>
        <div className="gap-gen-actions">
          <button className="btn-doc-preview" onClick={() => onOpenPreview(doc)}>👁 Anteprima</button>
          <button className="btn-doc-save" onClick={() => onFinalize(doc.document_id)}>✓ Salva nel Vault</button>
          <button className="btn-doc-regen" onClick={() => onRegenerate(doc.document_id)}>↻ Rigenera</button>
        </div>
      </div>
    );
  }

  // final
  return (
    <div className="gap-gen-block gap-gen-final">
      <div className="gap-gen-done-row">
        <span className="gap-gen-done-badge">✓ Documento nel Vault</span>
        <span className="gap-gen-doc-title">{doc.title}</span>
      </div>
      <div className="gap-gen-actions">
        {doc.preview_url && (
          <a href={doc.preview_url} target="_blank" rel="noopener noreferrer" className="btn-doc-open">📄 Apri</a>
        )}
        <button className="btn-doc-regen" onClick={() => onRegenerate(doc.document_id)}>↻ Rigenera</button>
        {onSanctionUpdate && (
          <button className="btn-sanction-sync" onClick={onSanctionUpdate} title="Aggiorna la stima sanzionatoria">
            ⚖️ Aggiorna stima
          </button>
        )}
      </div>
    </div>
  );
}

// ─── HYBRID gap action panel (document ready, operational action pending) ─────

function HybridActionPanel({ gap, doc, onCloseGap }: {
  gap:        ComplianceGap;
  doc?:       ActifyDocument;
  onCloseGap: (gapId: string, evidenceNote?: string, proofFile?: File) => Promise<void>;
}) {
  const [note, setNote]           = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [closing, setClosing]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  async function handleClose() {
    setClosing(true);
    setError(null);
    try {
      await onCloseGap(gap.gap_id, note || undefined, proofFile || undefined);
    } catch (e: unknown) {
      setError((e as { message?: string }).message ?? 'Errore nel salvataggio');
      setClosing(false);
    }
  }

  return (
    <div className="hybrid-action-panel">
      <div className="hybrid-action-banner">
        <span className="hybrid-action-icon">⚡</span>
        <div>
          <strong>Azione operativa richiesta</strong>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--dim)' }}>
            Il documento è pronto nel Vault. Implementa il requisito operativamente, poi dichiara la conformità.
          </p>
        </div>
      </div>

      {doc?.preview_url && (
        <a href={doc.preview_url} target="_blank" rel="noopener noreferrer" className="btn-doc-open" style={{ display: 'inline-flex', marginBottom: 10 }}>
          📄 Apri documento nel Vault
        </a>
      )}

      <p style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 10 }}>
        <strong>Cosa fare:</strong> {gap.what_to_do}
      </p>

      <label style={{ display: 'block', fontSize: 12, color: 'var(--dim)', marginBottom: 4 }}>
        📎 Carica prova (PDF/immagine, opzionale)
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          style={{ display: 'block', marginTop: 4, fontSize: 12 }}
          onChange={e => setProofFile(e.target.files?.[0] ?? null)}
        />
      </label>
      {proofFile && (
        <div style={{ fontSize: 11, color: 'var(--primary)', marginBottom: 8 }}>✓ {proofFile.name}</div>
      )}

      <textarea
        className="cl-evidence-input"
        placeholder="Nota facoltativa (data implementazione, link documento interno…)"
        maxLength={500}
        rows={2}
        value={note}
        onChange={e => setNote(e.target.value)}
        style={{ marginTop: 6, marginBottom: 10 }}
      />

      {error && <div style={{ color: '#EF4444', fontSize: 12, marginBottom: 8 }}>⚠ {error}</div>}

      <button className="btn-hybrid-close" onClick={handleClose} disabled={closing}>
        {closing ? <><span className="spin-sm" /> Salvataggio…</> : '✓ Dichiara conforme — chiudi gap'}
      </button>
    </div>
  );
}

// ─── FIX-12: Interactive compliance checklist — 3 states + evidence note ──────

function ComplianceChecklist({
  gaps,
  checklist,
  onSetEntry,
  saving,
  documents,
  docGenerations,
  generatingGapId,
  onGenerate,
  onFinalize,
  onRegenerate,
  onSanctionUpdate,
  onCloseGap,
}: {
  gaps:               ComplianceGap[];
  checklist:          Record<string, ChecklistEntry>;
  onSetEntry:         (article: string, entry: ChecklistEntry | null) => void;
  saving:             boolean;
  documents:          Record<string, ActifyDocument>;
  docGenerations:     Record<string, DocGeneration>;
  generatingGapId:    string | null;
  onGenerate:         (gapId: string) => void;
  onFinalize:         (docId: string) => void;
  onRegenerate:       (docId: string) => void;
  onSanctionUpdate:   () => void;
  onCloseGap:         (gapId: string, evidenceNote?: string, proofFile?: File) => Promise<void>;
}) {
  const [previewDoc, setPreviewDoc] = useState<ActifyDocument | null>(null);
  // Local note drafts — synced to parent on blur (prevents a save on every keystroke)
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  const getStatus = (article: string) => normalizeEntry(checklist[article]).status;

  const llmCompliant   = gaps.filter(g => g.status === 'compliant' && !checklist[g.article]);
  const userPresent    = gaps.filter(g => g.status !== 'compliant' && getStatus(g.article) === 'present');
  const userPartial    = gaps.filter(g => g.status !== 'compliant' && getStatus(g.article) === 'partial');
  const documentReady  = gaps.filter(g => g.status !== 'compliant' && getStatus(g.article) === 'document_ready');
  const stillMissing   = gaps.filter(g => g.status !== 'compliant' && getStatus(g.article) === 'missing');

  function handleMark(article: string, status: 'present' | 'partial') {
    const existing = checklist[article] ?? {};
    const entry: ChecklistEntry = {
      ...(typeof existing === 'object' ? existing : {}),
      status,
      ...(status === 'present' ? { addressed_at: new Date().toISOString().split('T')[0] } : {}),
    };
    onSetEntry(article, entry);
    setNoteDrafts(prev => ({ ...prev, [article]: (existing as ChecklistEntry).evidence_note ?? '' }));
  }

  function handleUnmark(article: string) {
    onSetEntry(article, null);
    setNoteDrafts(prev => { const n = { ...prev }; delete n[article]; return n; });
  }

  function handleNoteBlur(article: string) {
    const note = (noteDrafts[article] ?? '').trim();
    const existing = checklist[article];
    if (!existing) return;
    const entry = normalizeEntry(existing);
    onSetEntry(article, { ...entry, evidence_note: note || undefined });
  }

  const GapActions = ({ gap }: { gap: ComplianceGap }) => {
    const st = getStatus(gap.article);
    return (
      <div className="cl-gap-actions">
        <button
          className={`ci-mark-btn ci-mark-present${st === 'present' ? ' active' : ''}`}
          onClick={() => st === 'present' ? handleUnmark(gap.article) : handleMark(gap.article, 'present')}>
          ✓ Ho già questo
        </button>
        <button
          className={`ci-mark-btn ci-mark-partial${st === 'partial' ? ' active' : ''}`}
          onClick={() => st === 'partial' ? handleUnmark(gap.article) : handleMark(gap.article, 'partial')}>
          ⟳ In lavorazione
        </button>
        {(st === 'present' || st === 'partial') && (
          <button className="ci-mark-btn ci-mark-missing" onClick={() => handleUnmark(gap.article)}>
            ✗ Annulla
          </button>
        )}
      </div>
    );
  };

  const EvidenceInput = ({ gap }: { gap: ComplianceGap }) => (
    <div className="cl-evidence-wrap">
      <textarea
        className="cl-evidence-input"
        placeholder="Opzionale: link a documento, data completamento, descrizione azione… (max 300 caratteri)"
        maxLength={300}
        rows={2}
        value={noteDrafts[gap.article] ?? normalizeEntry(checklist[gap.article]).evidence_note ?? ''}
        onChange={e => setNoteDrafts(prev => ({ ...prev, [gap.article]: e.target.value }))}
        onBlur={() => handleNoteBlur(gap.article)}
      />
    </div>
  );

  return (
    <div className="fcard">
      <div className="cl-header-row">
        <h3>Stato Compliance AI Act</h3>
        {saving && <span className="cl-saving-indicator">Salvataggio…</span>}
      </div>
      <div className="cl-hint">
        Dichiara quali requisiti hai già implementato: il calcolo sanzionatorio si aggiorna in tempo reale.
        Al prossimo Compliance Check gli articoli dichiarati verranno esclusi dall'analisi AI.
      </div>
      <div className="cl-counts">
        <span className="cl-count-ok">✓ {llmCompliant.length + userPresent.length} conformi</span>
        {documentReady.length > 0 && (
          <span className="cl-count-hybrid">⚡ {documentReady.length} azione richiesta</span>
        )}
        {userPartial.length > 0 && (
          <span className="cl-count-partial">⟳ {userPartial.length} in lavorazione</span>
        )}
        <span className="cl-count-miss">✗ {stillMissing.length} da completare</span>
        {userPresent.length > 0 && (
          <span className="cl-count-user">☑ {userPresent.length} dichiarati da te</span>
        )}
      </div>

      {/* User-declared present */}
      {userPresent.length > 0 && (
        <div className="cl-section">
          <div className="cl-section-title cl-user-title">☑ Già implementati (dichiarato da te)</div>
          {userPresent.map(gap => {
            const entry = normalizeEntry(checklist[gap.article]);
            return (
              <div key={gap.gap_id} className="cl-item cl-item-user">
                <div className="cl-item-head">
                  <span className="cl-art">{gap.article}</span>
                  <span className="cl-req">{gap.requirement}</span>
                  <span className="cl-status-user">Già implementato</span>
                </div>
                {entry.addressed_at && (
                  <div className="cl-addressed-date">📅 Addressato il {entry.addressed_at}</div>
                )}
                {entry.evidence_note && (
                  <div className="cl-evidence-note">📎 {entry.evidence_note}</div>
                )}
                <EvidenceInput gap={gap} />
                <div className="cl-user-row">
                  <span className="cl-user-note">Escluso dal calcolo sanzionatorio</span>
                  <button className="cl-undo-btn" onClick={() => handleUnmark(gap.article)}>Annulla</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* User-partial */}
      {userPartial.length > 0 && (
        <div className="cl-section">
          <div className="cl-section-title cl-partial-title">⟳ In lavorazione</div>
          {userPartial.map(gap => {
            const entry = normalizeEntry(checklist[gap.article]);
            return (
              <div key={gap.gap_id} className="cl-item cl-item-partial">
                <div className="cl-item-head">
                  <span className="cl-art">{gap.article}</span>
                  <span className="cl-req">{gap.requirement}</span>
                  <span className="cl-status-partial">In lavorazione</span>
                </div>
                {entry.evidence_note && (
                  <div className="cl-evidence-note">📎 {entry.evidence_note}</div>
                )}
                <EvidenceInput gap={gap} />
                <GapActions gap={gap} />
              </div>
            );
          })}
        </div>
      )}

      {/* LLM-compliant */}
      {llmCompliant.length > 0 && (
        <div className="cl-section">
          <div className="cl-section-title cl-ok-title">✓ Già presenti (analisi AI)</div>
          {llmCompliant.map(gap => (
            <div key={gap.gap_id} className="cl-item cl-item-ok">
              <span className="cl-art">{gap.article}</span>
              <span className="cl-req">{gap.requirement}</span>
              <span className="cl-status-ok">Conforme</span>
            </div>
          ))}
        </div>
      )}

      {/* HYBRID — document in Vault, operational action pending */}
      {documentReady.length > 0 && (
        <div className="cl-section">
          <div className="cl-section-title cl-hybrid-title">⚡ Azione richiesta (documento pronto)</div>
          {documentReady.map(gap => (
            <div key={gap.gap_id} className="cl-item cl-item-hybrid">
              <div className="cl-item-head">
                <span className="cl-art">{gap.article}</span>
                <span className="cl-req">{gap.requirement}</span>
                <span className="cl-status-hybrid">Parzialmente risolto</span>
              </div>
              <p className="cl-desc">{gap.description}</p>
              <HybridActionPanel
                gap={gap}
                doc={documents[gap.gap_id]}
                onCloseGap={onCloseGap}
              />
            </div>
          ))}
        </div>
      )}

      {/* Still missing */}
      {stillMissing.length > 0 && (
        <div className="cl-section">
          <div className="cl-section-title cl-miss-title">✗ Da completare</div>
          {stillMissing.map(gap => (
            <div key={gap.gap_id} className="cl-item cl-item-miss">
              <div className="cl-item-head">
                <span className="cl-art">{gap.article}</span>
                <span className="cl-req">{gap.requirement}</span>
                <span className={`cl-status-miss${gap.status === 'partial' ? ' cl-partial' : ''}`}>
                  {gap.status === 'partial' ? 'Parziale' : 'Mancante'}
                </span>
                {gap.ungrounded && (
                  <span className="cl-ungrounded-badge" title="Nessun chunk normativo supporta questo articolo — verificare manualmente">
                    ⚠ Da verificare
                  </span>
                )}
              </div>
              <p className="cl-desc">{gap.description}</p>
              <GapActions gap={gap} />
              {gap.can_actify_automate && gap.automation_type ? (
                <GapGenerateBlock
                  gap={gap}
                  doc={documents[gap.gap_id]}
                  gen={docGenerations[gap.gap_id]}
                  generating={generatingGapId === gap.gap_id}
                  onGenerate={() => onGenerate(gap.gap_id)}
                  onFinalize={onFinalize}
                  onRegenerate={onRegenerate}
                  onOpenPreview={(d: ActifyDocument) => setPreviewDoc(d)}
                  onSanctionUpdate={onSanctionUpdate}
                />
              ) : (
                <div className="cl-manual-card">
                  <div className="cl-manual-header">
                    <span className="cl-manual-icon">📋</span>
                    <strong>Procedura manuale richiesta</strong>
                  </div>
                  <p className="cl-manual-steps">{gap.what_to_do}</p>
                  {gap.deadline && (
                    <div className="cl-deadline">📅 Scadenza: <strong>{gap.deadline}</strong></div>
                  )}
                  {/^Art\.?\s*4$/i.test(gap.article) && (
                    <a
                      href="/dashboard/literacy"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, padding: '7px 14px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, color: '#6366F1', fontSize: 13, fontWeight: 700, textDecoration: 'none', cursor: 'pointer' }}>
                      🎓 Gestisci in AI Literacy →
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {previewDoc && (
        <DocumentPreviewModal
          doc={previewDoc}
          onClose={() => setPreviewDoc(null)}
          onFinalize={async () => {
            await onFinalize(previewDoc.document_id);
            setPreviewDoc(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function SystemDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const systemId = searchParams.get('id') ?? '';
  const viewFines = searchParams.get('view') === 'fines';

  const [system, setSystem]   = useState<Record<string, unknown> | null>(null);
  const [check, setCheck]     = useState<ComplianceCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  // FIX-12: checklist state — supports enriched ChecklistEntry
  const [checklist, setChecklist] = useState<Record<string, ChecklistEntry>>({});
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Document Vault state: keyed by gap_id
  const [documents, setDocuments] = useState<Record<string, ActifyDocument>>({});
  const [generatingGapId, setGeneratingGapId] = useState<string | null>(null);
  const docPollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Step Functions pipeline state: keyed by gap_id
  const [docGenerations, setDocGenerations] = useState<Record<string, DocGeneration>>({});
  const genPollTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const pollDocGeneration = useCallback((generationId: string, gapId: string) => {
    if (genPollTimers.current[gapId]) clearTimeout(genPollTimers.current[gapId]);
    genPollTimers.current[gapId] = setTimeout(async () => {
      try {
        const gen = await api.docPipeline.getStatus(generationId);
        setDocGenerations(prev => ({ ...prev, [gapId]: gen }));
        if (gen.status === 'QUEUED' || gen.status === 'RUNNING') {
          pollDocGeneration(generationId, gapId);
        } else if (gen.status === 'DRAFT_READY' && gen.documentId) {
          const doc = await api.documents.get(gen.documentId) as unknown as ActifyDocument;
          setDocuments(prev => ({ ...prev, [gapId]: doc }));
        }
      } catch {
        // silent — leave gen state as-is
      }
    }, 5000);
  }, []);

  const load = useCallback(async () => {
    if (!systemId) return;
    try {
      const [sysData, latestCheck, docsData, gensData] = await Promise.allSettled([
        api.systems.get(systemId),
        api.compliance.getLatest(systemId),
        api.documents.listBySystem(systemId),
        api.docPipeline.listBySystem(systemId),
      ]);
      if (sysData.status === 'fulfilled') setSystem(sysData.value);
      if (latestCheck.status === 'fulfilled') setCheck(latestCheck.value as unknown as ComplianceCheck);
      if (docsData.status === 'fulfilled') {
        const docMap: Record<string, ActifyDocument> = {};
        for (const d of (docsData.value.documents ?? []) as ActifyDocument[]) {
          docMap[d.gap_id] = d;
        }
        setDocuments(docMap);
      }
      if (gensData.status === 'fulfilled') {
        const genMap: Record<string, DocGeneration> = {};
        for (const gen of (gensData.value.generations ?? [])) {
          const existing = genMap[gen.gapId];
          if (!existing || gen.createdAt > existing.createdAt) genMap[gen.gapId] = gen;
        }
        setDocGenerations(genMap);
        // Resume polling for active generations
        for (const [gapId, gen] of Object.entries(genMap)) {
          if (gen.status === 'QUEUED' || gen.status === 'RUNNING') {
            pollDocGeneration(gen.generationId, gapId);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  }, [systemId, pollDocGeneration]);

  useEffect(() => { load(); }, [load]);

  // Initialize checklist from persisted system data — normalize legacy string values
  useEffect(() => {
    if (system) {
      const raw = system.compliance_checklist as Record<string, ChecklistEntry | 'present' | 'missing'> | undefined;
      if (!raw) { setChecklist({}); return; }
      const normalized: Record<string, ChecklistEntry> = {};
      for (const [k, v] of Object.entries(raw)) {
        normalized[k] = normalizeEntry(v);
      }
      setChecklist(normalized);
    }
  }, [system]);

  useEffect(() => {
    if (check?.status === 'running') {
      const t = setTimeout(load, 4000);
      return () => clearTimeout(t);
    }
  }, [check, load]);

  const result = check?.result;
  const gaps   = result?.compliance_gaps ?? [];

  // Derive effective gaps: user-present articles → compliant + 0 sanctions
  const effectiveGaps = useMemo((): ComplianceGap[] => {
    return gaps.map(g => {
      const entry = checklist[g.article];
      if (entry?.status === 'present') {
        return { ...g, status: 'compliant' as const, estimated_sanction_max: 0, estimated_sanction_min: 0 };
      }
      return g;
    });
  }, [gaps, checklist]);

  const effectiveResult = useMemo((): ComplianceResult | undefined => {
    if (!result) return undefined;
    const nonCompliant = effectiveGaps.filter(g => g.status !== 'compliant');
    const newMax = nonCompliant.reduce((s, g) => s + (g.estimated_sanction_max ?? 0), 0);
    const newMin = nonCompliant.reduce((s, g) => s + (g.estimated_sanction_min ?? 0), 0);
    return {
      ...result,
      compliance_gaps: effectiveGaps,
      total_exposure_estimate: result.total_exposure_estimate
        ? { ...result.total_exposure_estimate, max: newMax, min: newMin }
        : undefined,
    };
  }, [result, effectiveGaps]);

  // FIX-12: set or remove a checklist entry, debounced save
  function handleSetEntry(article: string, entry: ChecklistEntry | null) {
    const next = { ...checklist };
    if (entry === null) {
      delete next[article];
    } else {
      next[article] = entry;
    }
    setChecklist(next);
    setSaving(true);

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const updatePayload: Record<string, unknown> = { compliance_checklist: next };
        if (gaps.length > 0) {
          const effectiveGapsNow = gaps.map(g => {
            const e = next[g.article];
            if (e?.status === 'present') {
              return { ...g, status: 'compliant' as const, estimated_sanction_max: 0, estimated_sanction_min: 0 };
            }
            return g;
          });
          const nonCompliant = effectiveGapsNow.filter(g => g.status !== 'compliant');
          const newMax = nonCompliant.reduce((s, g) => s + (g.estimated_sanction_max ?? 0), 0);
          const newMin = nonCompliant.reduce((s, g) => s + (g.estimated_sanction_min ?? 0), 0);
          updatePayload.last_exposure_min = newMin;
          updatePayload.last_exposure_max = newMax;
          updatePayload.compliance_status = newMax === 0 ? 'compliant' : 'gap_found';
        }
        await api.systems.update(systemId, updatePayload);
      } catch {
        // silent — state resets on next page load
      } finally {
        setSaving(false);
      }
    }, 600);
  }

  async function handleSanctionUpdate() {
    try {
      const freshCheck = await api.compliance.getLatest(systemId) as unknown as ComplianceCheck;
      if (freshCheck?.result) {
        const freshGaps = (freshCheck.result.compliance_gaps ?? []) as ComplianceGap[];
        // Apply current checklist overrides (same logic as effectiveGaps useMemo)
        const effectiveGapsNow = freshGaps.map(g => {
          const entry = checklist[g.article];
          if (entry?.status === 'present') {
            return { ...g, status: 'compliant' as const, estimated_sanction_max: 0, estimated_sanction_min: 0 };
          }
          return g;
        });
        const nonCompliant = effectiveGapsNow.filter(g => g.status !== 'compliant');
        const newMax = nonCompliant.reduce((s, g) => s + (g.estimated_sanction_max ?? 0), 0);
        const newMin = nonCompliant.reduce((s, g) => s + (g.estimated_sanction_min ?? 0), 0);
        await api.systems.update(systemId, {
          last_exposure_min:  newMin,
          last_exposure_max:  newMax,
          compliance_status:  newMax === 0 ? 'compliant' : 'gap_found',
          updated_at:         new Date().toISOString(),
        });
      }
    } catch {
      // silent — UI still refreshes
    }
    await load();
  }

  async function handleTrigger() {
    setTriggering(true);
    try {
      await api.compliance.trigger(systemId);
      setCheck(prev => prev ? { ...prev, status: 'running' } : null);
      setTimeout(load, 4000);
    } catch (err: unknown) {
      alert((err as { message?: string }).message ?? 'Errore');
    } finally {
      setTriggering(false);
    }
  }

  // ── Document generation handlers ─────────────────────────────────────────

  async function handleGenerate(gapId: string) {
    setGeneratingGapId(gapId);
    try {
      const idempotencyKey = `${systemId}-${gapId}-${Date.now()}`;
      const { generationId } = await api.docPipeline.start(systemId, gapId, idempotencyKey);
      setGeneratingGapId(null);
      pollDocGeneration(generationId, gapId);
    } catch (err: unknown) {
      alert((err as { message?: string }).message ?? 'Errore nella generazione');
      setGeneratingGapId(null);
    }
  }

  function pollDocument(documentId: string, gapId: string) {
    if (docPollTimer.current) clearTimeout(docPollTimer.current);
    docPollTimer.current = setTimeout(async () => {
      try {
        const doc = await api.documents.get(documentId) as unknown as ActifyDocument;
        setDocuments(prev => ({ ...prev, [gapId]: doc }));
        if (doc.status === 'generating') {
          pollDocument(documentId, gapId);
        } else {
          setGeneratingGapId(null);
          if (doc.status === 'final') {
            // Reload system to pick up the document_ready checklist status.
            // Sanctions are NOT auto-updated — the PMI must explicitly confirm via closeGap().
            await load();
          }
        }
      } catch {
        setGeneratingGapId(null);
      }
    }, 4000);
  }

  async function handleFinalize(documentId: string) {
    try {
      await api.documents.finalize(documentId);
      // Reload: checklist + documents updated
      await load();
    } catch (err: unknown) {
      alert((err as { message?: string }).message ?? 'Errore nella finalizzazione');
    }
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleCloseGap(gapId: string, evidenceNote?: string, proofFile?: File) {
    let proof_base64: string | undefined;
    let proof_filename: string | undefined;
    if (proofFile) {
      proof_base64 = await fileToBase64(proofFile);
      proof_filename = proofFile.name;
    }
    await api.gaps.close(systemId, gapId, { evidence_note: evidenceNote, proof_base64, proof_filename });
    await load();
  }

  async function handleRegenerate(documentId: string) {
    try {
      const old = Object.values(documents).find(d => d.document_id === documentId);
      const { document_id: newId } = await api.documents.regenerate(documentId);
      if (old) {
        setGeneratingGapId(old.gap_id);
        pollDocument(newId, old.gap_id);
      }
    } catch (err: unknown) {
      alert((err as { message?: string }).message ?? 'Errore nella rigenerazione');
    }
  }

  if (!systemId) return <div className="inv-page"><p>ID sistema mancante.</p></div>;
  if (loading)   return <div className="db-loading"><div className="spin"></div></div>;
  if (!system)   return <div className="inv-page"><p>Sistema non trovato.</p></div>;

  // ── Fine board view: only sanction estimation ────────────────────────────
  if (viewFines) {
    return (
      <div className="inv-page">
        <div className="inv-header">
          <div>
            <button className="btn-back-link" onClick={() => router.push('/dashboard/fines')}>
              ← Fine Estimation Board
            </button>
            <h1 className="inv-title">⚖️ {system.tool_name as string}</h1>
            <p className="inv-sub">{system.vendor as string} · Esposizione sanzionatoria stimata</p>
          </div>
        </div>
        {effectiveResult ? (
          <SanctionOverview result={effectiveResult} />
        ) : (
          <div className="inv-empty">
            <div className="empty-icon">⚖️</div>
            <h3>Nessun dato sanzionatorio</h3>
            <p>Esegui un Compliance Check per calcolare l&apos;esposizione sanzionatoria.</p>
          </div>
        )}
      </div>
    );
  }

  // ── Inventory view: gap analysis ─────────────────────────────────────────
  return (
    <div className="inv-page">
      <div className="inv-header">
        <div>
          <button className="btn-back-link" onClick={() => router.push('/dashboard/inventory')}>
            ← AI Inventory
          </button>
          <h1 className="inv-title">{system.tool_name as string}</h1>
          <p className="inv-sub">{system.vendor as string} · {system.category as string} · {system.role as string}</p>
        </div>
        <button className="sys-check-btn lg"
          disabled={check?.status === 'running' || triggering}
          onClick={handleTrigger}>
          {check?.status === 'running' || triggering ? '⟳ Analisi in corso…' : '▶ Avvia Compliance Check'}
        </button>
      </div>

      {check?.status === 'running' && (
        <div className="check-running">
          <div className="spin" style={{ width: 32, height: 32 }}></div>
          <div>
            <strong>Analisi in corso…</strong>
            <p>Bedrock sta analizzando il sistema rispetto all'AI Act. ~30 secondi.</p>
          </div>
        </div>
      )}

      {effectiveResult && (
        <>
          {effectiveResult.rag_metadata && !effectiveResult.rag_metadata.rag_used && (
            <div className="rag-fallback-banner">
              <span className="rag-fallback-icon">⚠</span>
              <div className="rag-fallback-body">
                <strong>Analisi basata su contesto semplificato</strong>
                <p>La knowledge base normativa non era disponibile al momento dell&apos;analisi. I gap identificati potrebbero essere incompleti.</p>
                {effectiveResult.rag_metadata.rag_fallback_reason && (
                  <span className="rag-fallback-reason">{effectiveResult.rag_metadata.rag_fallback_reason}</span>
                )}
              </div>
              <button className="rag-fallback-cta" onClick={handleTrigger} disabled={triggering}>
                {triggering ? '⟳' : 'Rianalizza ora'}
              </button>
            </div>
          )}
          <div className={`risk-banner risk-${effectiveResult.risk_classification}`}>
            <div className="risk-label">Classificazione Rischio</div>
            <div className="risk-value">{effectiveResult.risk_classification.toUpperCase()}</div>
            <div className="risk-summary">{effectiveResult.executive_summary}</div>
          </div>
          <ComplianceChecklist
            gaps={gaps}
            checklist={checklist}
            onSetEntry={handleSetEntry}
            saving={saving}
            documents={documents}
            docGenerations={docGenerations}
            generatingGapId={generatingGapId}
            onGenerate={handleGenerate}
            onFinalize={handleFinalize}
            onRegenerate={handleRegenerate}
            onSanctionUpdate={handleSanctionUpdate}
            onCloseGap={handleCloseGap}
          />
        </>
      )}

      {!effectiveResult && check?.status === 'failed' && (
        <div className="inv-empty" style={{ borderColor: '#EF4444' }}>
          <div className="empty-icon">⚠️</div>
          <h3 style={{ color: '#EF4444' }}>Analisi fallita</h3>
          <p>Si è verificato un errore durante l'analisi. Riprova avviando un nuovo check.</p>
          {(check as unknown as { error?: string }).error && (
            <p style={{ fontSize: 12, color: '#6B7280', marginTop: 8, fontFamily: 'monospace' }}>
              {(check as unknown as { error?: string }).error}
            </p>
          )}
        </div>
      )}

      {!effectiveResult && check?.status !== 'running' && check?.status !== 'failed' && (
        <div className="inv-empty">
          <div className="empty-icon">📋</div>
          <h3>Nessun check eseguito</h3>
          <p>Avvia un Compliance Check per analizzare questo sistema rispetto all'AI Act.</p>
        </div>
      )}
    </div>
  );
}

export default function SystemDetailPage() {
  return (
    <Suspense fallback={<div className="db-loading"><div className="spin"></div></div>}>
      <SystemDetailContent />
    </Suspense>
  );
}
