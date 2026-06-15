---
name: feedback-sanction-overview-placement
description: Non mostrare il pannello sanzionatorio nel dettaglio sistema AI Inventory, solo nella fines page
metadata:
  type: feedback
---

Il componente che mostra l'esposizione sanzionatoria (multa Art. 99-100 EU AI Act) va mostrato **solo** nella pagina `/dashboard/fines`.

NON mostrarlo in:
- `/dashboard/system/[systemId]` (dettaglio sistema)
- `/dashboard/inventory` (lista sistemi)
- Nessuna altra pagina

**Why:** Mostrare la multa nel contesto del singolo sistema distrae l'utente e crea ansia non contestualizzata. La multa aggregata ha senso solo in un contesto dedicato (la fines page).

**How to apply:** Se si lavora sulla pagina dettaglio sistema e si è tentati di aggiungere un summary sanzionatorio "per completezza", non farlo. Se c'è già, rimuoverlo.
