---
name: feedback-session-rules
description: Come Vince lavora con Claude su questo progetto — regole di comportamento stabilite nelle sessioni passate
metadata:
  type: feedback
---

## Risposte brevi e dirette

Non riassumere quello che si è appena fatto. Non fare intro prolisse. Non elencare i passi che si stanno per fare — fare e basta, poi riportare il risultato.

**Why:** Vince legge i diff, non ha bisogno che gli si spieghi cosa fa il codice che ha scritto Claude.

**How to apply:** Una frase di stato prima di un blocco di tool calls. Una frase di risultato dopo. Niente bullet list con "Ecco cosa ho fatto".

---

## Operare autonomamente quando il percorso è chiaro

Se la direzione è stabilita (es. "implementa X"), procedere fino in fondo senza chiedere conferma ad ogni step. Chiedere solo se si incontra un bivio reale non previsto.

**Why:** Vince lavora su sessioni lunghe con molti task concatenati. Le interruzioni frequenti rompono il flusso.

**How to apply:** Build → deploy → test → riporta risultato. Non chiedere "vuoi che faccia anche il deploy?" dopo aver fixato il codice.

---

## UI in italiano

Tutto il testo visibile all'utente nell'app (label, messaggi, placeholder, badge) è in italiano. Non introdurre mai testo in inglese nell'UI.

**Why:** Il prodotto è destinato al mercato italiano (PMI, studi legali, consulenti).

**How to apply:** Quando si scrive codice frontend, tutti i literal string user-facing vanno in italiano.

---

## Non mostrare il pannello sanzionatorio nel dettaglio sistema

Il componente `SanctionOverview` (o simili pannelli con esposizione multa) va mostrato **solo** nella pagina `/dashboard/fines`, NON nel dettaglio del singolo sistema AI Inventory.

**Why:** Mostrare la multa nel dettaglio sistema confonde l'utente e lo distrae dall'analisi del sistema specifico.

**How to apply:** Se si aggiunge roba nella pagina dettaglio sistema, non aggiungere sanction panel. Se c'è già, rimuoverlo.

---

## TypeScript check prima di ogni deploy

Fare sempre `npx tsc --noEmit` su lambda-api, lambda-pdf e frontend prima di buildare. Riportare eventuali errori e fixarli prima di procedere al deploy.

**Why:** Evita di deployare codice rotto in production. Il build TypeScript non sempre cattura tutti gli errori che tsc rileva.

**How to apply:** Fare i check in parallelo su tutti e tre i package.

---

## Commit solo quando esplicitamente richiesto

Non creare commit a meno che Vince non lo chieda esplicitamente.

**Why:** Vince decide quando il lavoro è pronto per essere committato.

**How to apply:** Al termine di un task, non fare git add/commit automaticamente. Se sembra opportuno farlo, chiedere.

---

## Aggiornare CLAUDE.md dopo sessioni significative

Se una sessione aggiunge feature, cambia schema DynamoDB, modifica routing API o scopre gotcha nuovi, aggiornare la sezione corrispondente in CLAUDE.md.

**Why:** CLAUDE.md è il riferimento operativo. Se invecchia, le sessioni future partono con informazioni sbagliate.

**How to apply:** Alla fine di ogni sessione con modifiche significative, aggiornare CLAUDE.md e questa memoria (sezione "Ultimo aggiornamento" in project_actify_core.md).
