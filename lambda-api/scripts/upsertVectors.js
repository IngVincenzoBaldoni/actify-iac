/**
 * Script to upsert/fix broken and missing vector entries in S3 Vectors.
 * Run from lambda-api/: node scripts/upsertVectors.js
 *
 * Texts are extracted verbatim from:
 *   Regolamento UE 2024/1689 (AI Act) — version EUR-Lex IT
 */

const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { S3VectorsClient, PutVectorsCommand } = require('@aws-sdk/client-s3vectors');

const bedrock = new BedrockRuntimeClient({ region: 'eu-central-1' });
const s3v = new S3VectorsClient({ region: 'eu-central-1' });

async function embedText(text) {
  const r = await bedrock.send(new InvokeModelCommand({
    modelId: 'amazon.titan-embed-text-v2:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: Buffer.from(JSON.stringify({ inputText: text.slice(0, 8000), dimensions: 1024, normalize: true })),
  }));
  return JSON.parse(Buffer.from(r.body).toString()).embedding;
}

async function upsertVector(key, text, metadata) {
  const vec = await embedText(text);
  await s3v.send(new PutVectorsCommand({
    vectorBucketName: 'actify-saas-ai-act-knowledge-base',
    indexName: 'ai-act-it',
    vectors: [{ key, data: { float32: vec }, metadata: { text, ...metadata } }],
  }));
  console.log('Upserted:', key);
}

// ─── Texts extracted verbatim from PDF ────────────────────────────────────────

const ART_6_TEXT = `Articolo 6 — Regole di classificazione per i sistemi di IA ad alto rischio

1. A prescindere dal fatto che sia immesso sul mercato o messo in servizio indipendentemente dai prodotti di cui alle lettere a) e b), un sistema di IA è considerato ad alto rischio se sono soddisfatte entrambe le condizioni seguenti:
a) il sistema di IA è destinato a essere utilizzato come componente di sicurezza di un prodotto, o il sistema di IA è esso stesso un prodotto, disciplinato dalla normativa di armonizzazione dell'Unione elencata nell'allegato I;
b) il prodotto, il cui componente di sicurezza a norma della lettera a) è il sistema di IA, è soggetto a una valutazione della conformità da parte di terzi.

2. Oltre ai sistemi di IA ad alto rischio di cui al paragrafo 1, sono considerati ad alto rischio anche i sistemi di IA di cui all'allegato III.

3. In deroga al paragrafo 2, un sistema di IA di cui all'allegato III non è considerato ad alto rischio se non presenta un rischio significativo di danno per la salute, la sicurezza o i diritti fondamentali delle persone fisiche, anche nel senso di non influenzare materialmente il risultato del processo decisionale. Un sistema di IA di cui all'allegato III è sempre considerato ad alto rischio qualora esso effettui profilazione di persone fisiche.`;

const ART_99_TEXT = `Articolo 99 — Sanzioni (Regolamento UE 2024/1689 AI Act)

§3: La non conformità al divieto delle pratiche di IA di cui all'articolo 5 è soggetta a sanzioni amministrative pecuniarie fino a 35 000 000 EUR o, se l'autore del reato è un'impresa, fino al 7 % del fatturato mondiale totale annuo dell'esercizio precedente, se superiore.

§4: La non conformità agli obblighi di fornitori (Art. 16), rappresentanti autorizzati (Art. 22), importatori (Art. 23), distributori (Art. 24), deployer (Art. 26), organismi notificati, e obblighi di trasparenza (Art. 50) è soggetta a sanzioni fino a 15 000 000 EUR o al 3 % del fatturato mondiale totale annuo dell'esercizio precedente, se superiore.

§5: La fornitura di informazioni inesatte, incomplete o fuorvianti agli organismi notificati o alle autorità nazionali competenti è soggetta a sanzioni fino a 7 500 000 EUR o all'1 % del fatturato mondiale totale annuo dell'esercizio precedente, se superiore.

§6: Nel caso delle PMI, comprese le start-up, ciascuna sanzione pecuniaria è pari al massimo alle percentuali o all'importo di cui ai paragrafi 3, 4 e 5, se inferiore.

§1: Le sanzioni previste sono effettive, proporzionate e dissuasive. Esse tengono conto degli interessi delle PMI, comprese le start-up, e della loro sostenibilità economica.`;

const ANNEX_III_CAT1_TEXT = `Allegato III — Sistemi di IA ad alto rischio di cui all'articolo 6, paragrafo 2
Categoria 1: Biometria

I sistemi di IA ad alto rischio a norma dell'articolo 6, paragrafo 2, nel settore della biometria, nella misura in cui il pertinente diritto dell'Unione o nazionale ne permette l'uso:
a) i sistemi di identificazione biometrica remota. Non vi rientrano i sistemi di IA destinati a essere utilizzati per la verifica biometrica la cui unica finalità è confermare che una determinata persona fisica è la persona che dice di essere;
b) i sistemi di IA destinati a essere utilizzati per la categorizzazione biometrica in base ad attributi o caratteristiche sensibili protetti basati sulla deduzione di tali attributi o caratteristiche;
c) i sistemi di IA destinati a essere utilizzati per il riconoscimento delle emozioni.`;

const ANNEX_III_CAT2_TEXT = `Allegato III — Sistemi di IA ad alto rischio di cui all'articolo 6, paragrafo 2
Categoria 2: Infrastrutture critiche

I sistemi di IA ad alto rischio a norma dell'articolo 6, paragrafo 2, nel settore delle infrastrutture critiche:
i sistemi di IA destinati a essere utilizzati come componenti di sicurezza nella gestione e nel funzionamento delle infrastrutture digitali critiche, del traffico stradale o nella fornitura di acqua, gas, riscaldamento o elettricità.`;

const ANNEX_III_CAT3_TEXT = `Allegato III — Sistemi di IA ad alto rischio di cui all'articolo 6, paragrafo 2
Categoria 3: Istruzione e formazione professionale

I sistemi di IA ad alto rischio a norma dell'articolo 6, paragrafo 2, nel settore dell'istruzione e formazione professionale:
a) i sistemi di IA destinati a essere utilizzati per determinare l'accesso, l'ammissione o l'assegnazione di persone fisiche agli istituti di istruzione e formazione professionale a tutti i livelli;
b) i sistemi di IA destinati a essere utilizzati per valutare i risultati dell'apprendimento, anche nei casi in cui tali risultati sono utilizzati per orientare il processo di apprendimento di persone fisiche in istituti di istruzione o formazione professionale a tutti i livelli;
c) i sistemi di IA destinati a essere utilizzati per valutare il livello di istruzione adeguato che una persona riceverà o a cui potrà accedere, nel contesto o all'interno di istituti di istruzione o formazione professionale a tutti i livelli;
d) i sistemi di IA destinati a essere utilizzati per monitorare e rilevare comportamenti vietati degli studenti durante le prove nel contesto o all'interno di istituti di istruzione e formazione professionale a tutti i livelli.`;

const ANNEX_III_CAT5_TEXT = `Allegato III — Sistemi di IA ad alto rischio di cui all'articolo 6, paragrafo 2
Categoria 5: Accesso a servizi privati essenziali e a prestazioni e servizi pubblici essenziali e fruizione degli stessi

I sistemi di IA ad alto rischio a norma dell'articolo 6, paragrafo 2, nel settore dell'accesso a servizi essenziali:
a) i sistemi di IA destinati a essere utilizzati dalle autorità pubbliche o per conto di autorità pubbliche per valutare l'ammissibilità delle persone fisiche alle prestazioni e ai servizi di assistenza pubblica essenziali, compresi i servizi di assistenza sanitaria, nonché per concedere, ridurre, revocare o recuperare tali prestazioni e servizi;
b) i sistemi di IA destinati a essere utilizzati per valutare l'affidabilità creditizia delle persone fisiche o per stabilire il loro merito di credito, a eccezione dei sistemi di IA utilizzati allo scopo di individuare frodi finanziarie;
c) i sistemi di IA destinati a essere utilizzati per la valutazione dei rischi e la determinazione dei prezzi in relazione a persone fisiche nel caso di assicurazioni sulla vita e assicurazioni sanitarie;
d) i sistemi di IA destinati a essere utilizzati per valutare e classificare le chiamate di emergenza effettuate da persone fisiche o per inviare servizi di emergenza di primo soccorso o per stabilire priorità in merito all'invio di tali servizi, compresi polizia, vigili del fuoco e assistenza medica, nonché per i sistemi di selezione dei pazienti per quanto concerne l'assistenza sanitaria di emergenza.`;

const ANNEX_III_CAT7_TEXT = `Allegato III — Sistemi di IA ad alto rischio di cui all'articolo 6, paragrafo 2
Categoria 7: Migrazione, asilo e gestione del controllo delle frontiere

I sistemi di IA ad alto rischio a norma dell'articolo 6, paragrafo 2, nel settore della migrazione, asilo e gestione del controllo delle frontiere, nella misura in cui il pertinente diritto dell'Unione o nazionale ne permette l'uso:
a) i sistemi di IA destinati a essere utilizzati dalle autorità pubbliche competenti, o per loro conto, o da istituzioni, organi e organismi dell'Unione, come poligrafi o strumenti analoghi;
b) i sistemi di IA destinati a essere utilizzati dalle autorità pubbliche competenti o per loro conto, oppure da istituzioni, organi e organismi dell'Unione, per valutare un rischio (compresi un rischio per la sicurezza, un rischio di migrazione irregolare o un rischio per la salute) posto da una persona fisica che intende entrare o è entrata nel territorio di uno Stato membro;
c) i sistemi di IA destinati a essere usati dalle autorità pubbliche competenti o per loro conto, oppure da istituzioni, organi e organismi dell'Unione, per assistere le autorità pubbliche competenti nell'esame delle domande di asilo, di visto o di permesso di soggiorno e per i relativi reclami per quanto riguarda l'ammissibilità delle persone fisiche che richiedono tale status, compresa le valutazioni correlate dell'affidabilità degli elementi probatori;
d) i sistemi di IA destinati a essere usati dalle autorità pubbliche competenti o per loro conto, o da istituzioni, organi e organismi dell'Unione, nel contesto della migrazione, dell'asilo o della gestione del controllo delle frontiere, al fine di individuare, riconoscere o identificare persone fisiche, a eccezione della verifica dei documenti di viaggio.`;

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const entries = [
    {
      key: 'art_6_classification',
      text: ART_6_TEXT,
      metadata: {
        chunk_type: 'article',
        article_number: 6,
        article_title: 'Regole di classificazione per i sistemi di IA ad alto rischio',
        applies_to: ['provider', 'deployer'],
      },
    },
    {
      key: 'art_99_sanctions',
      text: ART_99_TEXT,
      metadata: {
        chunk_type: 'article',
        article_number: 99,
        article_title: 'Sanzioni',
        applies_to: ['provider', 'deployer'],
      },
    },
    // annex_iii_cat1..7 already upserted in previous run; re-included for idempotency
    {
      key: 'annex_iii_cat1',
      text: ANNEX_III_CAT1_TEXT,
      metadata: {
        chunk_type: 'annex',
        annex_reference: ['III'],
        article_title: 'Allegato III — Categoria 1: Biometria',
        applies_to: ['provider', 'deployer'],
      },
    },
    {
      key: 'annex_iii_cat2',
      text: ANNEX_III_CAT2_TEXT,
      metadata: {
        chunk_type: 'annex',
        annex_reference: ['III'],
        article_title: 'Allegato III — Categoria 2: Infrastruttura critica',
        applies_to: ['provider', 'deployer'],
      },
    },
    {
      key: 'annex_iii_cat3',
      text: ANNEX_III_CAT3_TEXT,
      metadata: {
        chunk_type: 'annex',
        annex_reference: ['III'],
        article_title: 'Allegato III — Categoria 3: Istruzione e formazione professionale',
        applies_to: ['provider', 'deployer'],
      },
    },
    {
      key: 'annex_iii_cat5',
      text: ANNEX_III_CAT5_TEXT,
      metadata: {
        chunk_type: 'annex',
        annex_reference: ['III'],
        article_title: 'Allegato III — Categoria 5: Accesso a servizi essenziali',
        applies_to: ['provider', 'deployer'],
      },
    },
    {
      key: 'annex_iii_cat7',
      text: ANNEX_III_CAT7_TEXT,
      metadata: {
        chunk_type: 'annex',
        annex_reference: ['III'],
        article_title: 'Allegato III — Categoria 7: Migrazione, asilo e gestione del controllo delle frontiere',
        applies_to: ['provider', 'deployer'],
      },
    },
  ];

  for (const entry of entries) {
    try {
      await upsertVector(entry.key, entry.text, entry.metadata);
    } catch (err) {
      console.error('Error upserting', entry.key, ':', err.message);
    }
  }

  console.log('Done — all vectors upserted.');
}

main().catch(console.error);
