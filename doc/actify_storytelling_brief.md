# Actify — Brief per Storytelling Video Dimostrativo

## Contesto e missione

Actify è una piattaforma SaaS italiana di **AI Compliance Management** costruita specificamente attorno al **Regolamento UE 2024/1689 (EU AI Act)** — la prima normativa mondiale sull'intelligenza artificiale, entrata in vigore nel 2024 con scadenze progressive fino al 2026.

Il problema che Actify risolve è brutalmente concreto: le aziende che usano sistemi di intelligenza artificiale nei loro processi rischiano **sanzioni fino al 3% del fatturato globale annuo** (Art. 99) se non dimostrano conformità. Ma la norma è tecnica, complessa, in continua evoluzione — e la maggior parte delle PMI non ha le risorse per un ufficio compliance dedicato.

**Actify fa esattamente questo: trasforma un obbligo normativo complesso in un processo gestibile, tracciabile e documentato, tutto in un'unica piattaforma.**

---

## A chi si rivolge

- **PMI italiane** che usano strumenti AI nei loro processi aziendali (CRM predittivi, chatbot, sistemi HR, scoring finanziario, sistemi di visione, ecc.)
- **Studi di consulenza e commercialisti** che assistono clienti PMI nel percorso di adeguamento normativo (via Partner Portal dedicato)
- **Responsabili compliance, CFO, CTO, Legal** che devono dimostrare controllo e tracciabilità all'autorità di vigilanza

---

## Il piano di riferimento: Professional

Il piano **Professional** a €99,90/mese è il cuore del prodotto — pensato per le aziende che vogliono compliance attiva e non solo una diagnosi. Include tutte le funzionalità core senza limiti sul numero di sistemi AI censiti, team fino a 10 membri e supporto prioritario.

---

## Le funzionalità — descrizione dettagliata

### 1. AIPI — AI Passports Inventory
**"Il registro ufficiale dei tuoi sistemi AI"**

L'azienda censisce ogni strumento di intelligenza artificiale in uso: nome, fornitore, categoria, ruolo (deployer o provider), descrizione dell'uso, settore di applicazione, dati trattati, numero di persone impattate.

Ogni sistema censito genera un **AI Passport** — una scheda identitaria che diventa la base di tutto il processo di compliance. Nel piano Professional, il numero di sistemi censibili è **illimitato**.

Visivamente: una griglia di passport card con colori, icone e indicatori di rischio — il tuo inventario AI a colpo d'occhio.

---

### 2. Gap Analysis — Compliance Check AI-powered
**"In 30 secondi, sai esattamente dove sei rispetto all'AI Act"**

Per ogni sistema censito, l'utente avvia un **Compliance Check**. Actify invia i dati del sistema ad Amazon Bedrock (modello Nova Pro EU) che, arricchito da una **knowledge base normativa** costruita sul testo ufficiale dell'AI Act (RAG su S3 Vectors), analizza il sistema rispetto a tutti gli articoli applicabili.

Il risultato è una **Gap Analysis** completa che include:
- **Classificazione del rischio**: Proibito / Alto / Limitato / Minimale
- **Lista dei gap normativi** per articolo (es. "Art. 13 — Trasparenza: documentazione tecnica assente")
- **Per ogni gap**: descrizione del problema, azione correttiva specifica, scadenza normativa
- **Score di compliance** su 4 dimensioni: Governance, Trasparenza, Documentazione, Monitoraggio
- **Executive summary** in linguaggio naturale per condivisione con il management
- **Link diretto** al testo ufficiale dell'articolo rilevante nell'AI Act Reader integrato

L'analisi è asincrona — l'utente avvia e riceve i risultati in ~30 secondi senza aspettare bloccato. Ogni check è storicizzato: si vede l'evoluzione della compliance nel tempo.

---

### 3. FEB — Fine Estimation Board
**"Quanto rischi in euro, oggi, con i tuoi sistemi AI"**

Il pannello sanzionatorio è il cruscotto finanziario della compliance. Calcola in tempo reale l'**esposizione sanzionatoria stimata** dell'azienda aggregando tutti i gap aperti su tutti i sistemi censiti.

Il calcolo segue la logica dell'Art. 99 e Art. 100 dell'AI Act:
- Prende il fatturato aziendale dichiarato (o stimato per settore)
- Applica le percentuali di legge per tier di gravità (7%, 3%, 1% del fatturato)
- Applica la riduzione PMI (Art. 100) dove applicabile
- Mostra il range min/max dell'esposizione per ogni articolo violato e in aggregato

Il risultato: un numero concreto in euro — non una valutazione astratta di rischio, ma "hai €340.000 di esposizione potenziale, distribuita così tra questi 3 articoli". Con il dettaglio della formula applicata, la fonte del fatturato usata e il disclaimer metodologico.

Man mano che l'azienda risolve i gap, il numero scende in tempo reale.

---

### 4. AI Literacy Tracker — Art. 4
**"Dimostra che il tuo team sa usare l'AI in modo responsabile"**

L'Art. 4 dell'AI Act impone alle aziende di garantire che le persone che usano o sviluppano sistemi AI abbiano un adeguato **livello di alfabetizzazione sull'intelligenza artificiale**.

Actify traduce questo obbligo in un sistema di tracciamento strutturato:
- Per ogni sistema AI censito, si definisce il **profilo di competenze** del team (deployer: utenti operativi + supervisori; provider: team sviluppo + QA + commerciale)
- Si registrano le **evidenze di formazione**: certificazioni, corsi, training interni — con data, numero di persone coperte, ente erogatore, argomenti, link a documenti
- Il sistema calcola automaticamente lo **stato di conformità** per ogni profilo
- È disponibile la **modalità PMI piccola**: profilo unificato per aziende con team non differenziati
- Actify suggerisce le formazioni mancanti via AI (suggerimenti generati da Bedrock basati sul ruolo e sul sistema)

Il tracker genera automaticamente il **Report Art. 4** — un documento PDF formale che attesta lo stato della formazione, pronto per essere esibito in caso di ispezione. Il report viene salvato nel Document Vault.

---

### 5. Document Vault
**"Tutti i documenti di compliance in un posto solo, generati automaticamente"**

La compliance non è solo capire i gap — è produrre la documentazione che lo dimostra. Il Document Vault è la biblioteca dei documenti di compliance, generati da Actify attraverso due pipeline:

**Pipeline automatica AI**: per ogni sistema e ogni categoria documentale, Actify genera automaticamente i documenti richiesti dalla norma:
- Documentazione tecnica del sistema AI
- Informativa sulla trasparenza (Art. 13)
- Registri di monitoraggio e logging (Art. 72)
- Valutazione della conformità
- FRIA — Fundamental Rights Impact Assessment (Art. 27, solo piano Professional)
- Report Art. 4 AI Literacy

I documenti vengono generati via Step Functions (pipeline orchestrata in 5 step: raccolta contesto → generazione slot → validazione → assemblaggio → rendering PDF), convertiti in PDF tramite Chromium headless e archiviati su S3 con URL firmati.

**Visualizzazione**: ogni documento ha stato (Bozza / Pronto / In generazione), data di generazione, sistema di riferimento. Un click scarica il PDF.

---

### 6. NBA — Next Best Action
**"Cosa fare adesso, nell'ordine giusto"**

Disponibile esclusivamente nel piano Professional. Il motore NBA analizza tutti i gap aperti su tutti i sistemi e genera una **lista di azioni prioritizzate** — cosa fare prima, con quale urgenza, quale impatto ha sulla riduzione dell'esposizione sanzionatoria.

Non più un elenco piatto di 30 cose da fare: una roadmap intelligente che guida l'azienda attraverso il percorso di adeguamento nel modo più efficiente possibile.

---

### 7. Audit Trail
**"Un log immutabile di tutto quello che è successo"**

Ogni operazione significativa nella piattaforma — creazione di un sistema, avvio di un compliance check, aggiornamento di un gap, generazione di un documento, modifica del profilo aziendale — viene registrata nell'Audit Trail con timestamp preciso, utente responsabile e dettaglio dell'azione.

Il registro è **immutabile** e **cronologicamente ordinato**. È esportabile in PDF (generato da Bedrock) e serve come prova documentale del percorso di adeguamento in caso di audit da parte dell'autorità di vigilanza.

---

### 8. AI Act Reader integrato
**"La norma sempre a portata di mano, nel contesto giusto"**

Il testo ufficiale dell'EU AI Act è disponibile direttamente nella piattaforma, navigabile per articolo. Ma la feature più potente è il collegamento bidirezionale: dalla Gap Analysis, ogni gap ha un link diretto all'articolo rilevante — si clicca e si legge esattamente il testo di legge che si sta violando, senza uscire dalla piattaforma, senza cercare su Google.

---

### 9. Team collaborativo
**"Compliance è un lavoro di squadra"**

Nel piano Professional, fino a 10 membri del team possono accedere alla piattaforma con ruoli distinti (admin / member). Gli admin gestiscono sistemi e configurazioni; i member consultano i dati e contribuiscono al processo documentale.

---

## Il flusso narrativo ideale per il video

Un percorso dimostrativo naturale potrebbe essere:

1. **"Ho un problema"** — L'azienda usa 3 strumenti AI. Non sa se è a rischio. Entra in Actify.
2. **"Censisco i miei sistemi"** — Compila i passport per ogni tool in 5 minuti. L'inventario è vivo.
3. **"Scopro dove sono"** — Avvia il Compliance Check. In 30 secondi: 4 gap aperti, rischio Alto, €180.000 di esposizione stimata. È il momento di impatto emotivo del video.
4. **"Capisco cosa devo fare"** — NBA mi dice le 3 azioni prioritarie. Gap Analysis mi mostra ogni gap con l'articolo esatto e la scadenza.
5. **"Dimostro che il mio team è preparato"** — Literacy Tracker: registro le certificazioni, genero il report Art. 4.
6. **"Produco i documenti"** — Document Vault: genero la documentazione tecnica e la FRIA in un click. Scarico i PDF.
7. **"Ho il controllo"** — L'esposizione scende da €180.000 a €40.000. Audit Trail: tutto tracciato. Sono pronto per un'ispezione.

---

## Tono e identità

- **Non è uno strumento per avvocati** — è per chi fa impresa
- **Non è una checklist** — è un cruscotto dinamico che risponde in tempo reale
- **Non è "compliance as a burden"** — è "compliance as competitive advantage": chi lo fa prima paga meno, rischia meno, vende meglio
- Il linguaggio è diretto, concreto, orientato al risultato in euro e in tempo
- L'interfaccia è dark, moderna, da strumento professionale — non da software gestionale anni '90

---

## Dati chiave da menzionare

- Sanzioni AI Act: fino al **7% del fatturato globale** per pratiche proibite (Art. 99 comma 3), fino al **3%** per requisiti sistemi ad alto rischio, fino all'**1%** per informazioni inesatte
- Scadenza principale: **agosto 2026** per sistemi ad alto rischio (dopo Digital Omnibus)
- Il Compliance Check impiega circa **30 secondi**
- Piano Professional: **€99,90/mese**, team fino a **10 persone**, sistemi AI **illimitati**
- Riduzione PMI (Art. 100): le PMI beneficiano di sanzioni proporzionate — Actify la calcola automaticamente
