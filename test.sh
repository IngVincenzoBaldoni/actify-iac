#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
#  Actify Platform — Test Suite
#  Esegue unit test (Jest) + integration test (live API)
#
#  Utilizzo:
#    ./test.sh --email tuo@email.com --password tuaPassword
#    oppure:
#    TEST_EMAIL=tuo@email.com TEST_PASSWORD=tuaPassword ./test.sh
#
#  Flag opzionali:
#    --slow    Include compliance check async (attende fino a 90s)
#    --unit    Solo unit test (senza chiamate live all'API)
# ═══════════════════════════════════════════════════════════════════════════════

set -uo pipefail   # no -e: gestiamo gli errori manualmente

# ── Colori e helpers ───────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

PASS=0; FAIL=0; SKIP=0
FAILED_TESTS=()

pass()  { echo -e "  ${GREEN}✅ PASS${NC}  $1"; PASS=$((PASS + 1)); }
fail()  { echo -e "  ${RED}❌ FAIL${NC}  $1 — $2"; FAIL=$((FAIL + 1)); FAILED_TESTS+=("$1"); }
skip()  { echo -e "  ${YELLOW}⏭  SKIP${NC}  $1"; SKIP=$((SKIP + 1)); }
info()  { echo -e "  ${CYAN}ℹ${NC}  $1"; }
section() {
  echo ""
  echo -e "${BLUE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}${BOLD}  ▶ $1${NC}"
  echo -e "${BLUE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# check_status: mai chiamare in subshell $() — aggiorna PASS/FAIL nel parent
# Uso: check_status "nome test" "200" "$resp"
check_status() {
  local name="$1" expected="$2" response="$3"
  local status
  status=$(echo "$response" | tail -n 1)
  if [ "$status" = "$expected" ]; then
    pass "$name (HTTP $status)"
  else
    local body
    body=$(echo "$response" | sed '$d' | head -c 200)
    fail "$name" "atteso HTTP $expected, ricevuto HTTP $status — body: $body"
  fi
}

# Estrai il body JSON dalla risposta di api()
# sed '$d' rimuove l'ultima riga (lo status code) — compatibile macOS e Linux
get_body()   { echo "$1" | sed '$d'; }
get_status() { echo "$1" | tail -n 1; }

# ── Argomenti ─────────────────────────────────────────────────────────────────
EMAIL="${TEST_EMAIL:-}"
PASSWORD="${TEST_PASSWORD:-}"
RUN_SLOW=false
UNIT_ONLY=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --email)    EMAIL="$2";    shift 2 ;;
    --password) PASSWORD="$2"; shift 2 ;;
    --slow)     RUN_SLOW=true; shift ;;
    --unit)     UNIT_ONLY=true; shift ;;
    *) echo "Argomento sconosciuto: $1"; exit 1 ;;
  esac
done

# ── Configurazione ────────────────────────────────────────────────────────────
API_URL="https://lql1qfmdua.execute-api.eu-central-1.amazonaws.com"
COGNITO_CLIENT_ID="2v3ggh33m5b4ap7kj96ufcqhmg"
REGION="eu-central-1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_SYSTEM_ID=""

# ── Banner ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║      Actify Platform — Suite di Test             ║${NC}"
echo -e "${BOLD}║      $(date '+%Y-%m-%d %H:%M:%S')                       ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# ── Verifica dipendenze ───────────────────────────────────────────────────────
for cmd in curl jq aws node; do
  if ! command -v $cmd &>/dev/null; then
    echo -e "${RED}Dipendenza mancante: $cmd${NC}"; exit 1
  fi
done

# ═══════════════════════════════════════════════════════════════════════════════
#  FASE 1 — UNIT TEST (Jest)
# ═══════════════════════════════════════════════════════════════════════════════
section "FASE 1 — Unit Test (Jest)"
echo ""

cd "$SCRIPT_DIR/lambda-api"
if npm test -- --no-coverage 2>&1; then
  pass "Jest unit test suite (40 test)"
else
  fail "Jest unit test suite" "uno o più test falliti — vedi output sopra"
fi
cd "$SCRIPT_DIR"

if [ "$UNIT_ONLY" = true ]; then
  echo ""
  echo -e "${YELLOW}Flag --unit attivo: salto i test di integrazione live.${NC}"
  echo ""
  echo -e "${BOLD}━━━━ RISULTATI ━━━━${NC}"
  echo -e "  ${GREEN}✅ Pass:${NC} $PASS  ${RED}❌ Fail:${NC} $FAIL  ${YELLOW}⏭ Skip:${NC} $SKIP"
  echo ""
  [ $FAIL -eq 0 ] && echo -e "${GREEN}${BOLD}🎉 Tutti i test passati.${NC}" && exit 0
  echo -e "${RED}${BOLD}⚠️  $FAIL test falliti.${NC}"; exit 1
fi

# ═══════════════════════════════════════════════════════════════════════════════
#  FASE 2 — AUTENTICAZIONE COGNITO
# ═══════════════════════════════════════════════════════════════════════════════
section "FASE 2 — Autenticazione"

if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ]; then
  echo -e "${RED}Email e password richieste per i test di integrazione.${NC}"
  echo -e "Usa: ${CYAN}./test.sh --email tuo@email.com --password tuaPassword${NC}"
  echo -e "oppure imposta le variabili d'ambiente TEST_EMAIL e TEST_PASSWORD"
  exit 1
fi

info "Login come: $EMAIL"
AUTH_RESPONSE=$(aws cognito-idp initiate-auth \
  --region "$REGION" \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id "$COGNITO_CLIENT_ID" \
  --auth-parameters USERNAME="$EMAIL",PASSWORD="$PASSWORD" \
  --output json 2>&1) || true

TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.AuthenticationResult.IdToken // empty' 2>/dev/null || echo "")
if [ -z "$TOKEN" ]; then
  fail "Autenticazione Cognito" "token non ricevuto — credenziali errate o utente non esiste"
  echo ""
  echo -e "${RED}${BOLD}⚠️  Autenticazione fallita — impossibile continuare.${NC}"
  exit 1
fi
pass "Autenticazione Cognito — token ricevuto"

# Helper per le chiamate API
api() {
  local method="$1" path="$2" data="${3:-}"
  if [ -n "$data" ]; then
    curl -s -w "\n%{http_code}" -X "$method" "$API_URL$path" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data"
  else
    curl -s -w "\n%{http_code}" -X "$method" "$API_URL$path" \
      -H "Authorization: Bearer $TOKEN"
  fi
}

api_unauth() {
  local method="$1" path="$2"
  curl -s -w "\n%{http_code}" -X "$method" "$API_URL$path"
}

# ═══════════════════════════════════════════════════════════════════════════════
#  FASE 3 — SICUREZZA: ENDPOINT SENZA TOKEN
# ═══════════════════════════════════════════════════════════════════════════════
section "FASE 3 — Sicurezza: richieste non autenticate"

for path in "/api/company" "/api/systems" "/api/audit-trail" "/api/literacy" "/api/company/users"; do
  resp=$(api_unauth "GET" "$path")
  status=$(get_status "$resp")
  if [ "$status" = "401" ] || [ "$status" = "403" ]; then
    pass "GET $path senza token → $status (accesso negato)"
  else
    fail "GET $path senza token" "atteso 401/403, ricevuto $status"
  fi
done

# Route pubblica assessment deve essere accessibile senza token
resp=$(api_unauth "GET" "/api/assessment/token-inesistente")
status=$(get_status "$resp")
if [ "$status" != "401" ] && [ "$status" != "403" ]; then
  pass "GET /api/assessment/[token] (pubblica) → accessibile senza token ($status)"
else
  fail "GET /api/assessment/[token] (pubblica)" "route pubblica ha risposto $status — dovrebbe essere accessibile senza auth"
fi

# ═══════════════════════════════════════════════════════════════════════════════
#  FASE 4 — COMPANY
# ═══════════════════════════════════════════════════════════════════════════════
section "FASE 4 — Company"

resp=$(api GET "/api/company")
check_status "GET /api/company" "200" "$resp"
COMPANY_NAME=$(get_body "$resp" | jq -r '.name // "N/A"' 2>/dev/null || echo "N/A")
info "Azienda: $COMPANY_NAME"

# PUT company — aggiorna e ripristina
ORIGINAL_NOTES=$(get_body "$resp" | jq -r '.context_notes // ""' 2>/dev/null || echo "")
resp=$(api PUT "/api/company" '{"context_notes":"[ACTIFY TEST RUNNER — cancella se vedi questo]"}')
check_status "PUT /api/company (aggiornamento context_notes)" "200" "$resp"

RESTORE_PAYLOAD=$(jq -n --arg n "$ORIGINAL_NOTES" '{"context_notes":$n}')
resp=$(api PUT "/api/company" "$RESTORE_PAYLOAD")
check_status "PUT /api/company (ripristino context_notes)" "200" "$resp"

# GET company/users
resp=$(api GET "/api/company/users")
check_status "GET /api/company/users" "200" "$resp"

# ═══════════════════════════════════════════════════════════════════════════════
#  FASE 5 — AI SYSTEMS (CRUD completo)
# ═══════════════════════════════════════════════════════════════════════════════
section "FASE 5 — AI Systems (CRUD)"

resp=$(api GET "/api/systems")
check_status "GET /api/systems" "200" "$resp"
SYSTEM_COUNT=$(get_body "$resp" | jq 'length // 0' 2>/dev/null || echo "0")
info "Sistemi esistenti: $SYSTEM_COUNT"

# Crea sistema di test (nome univoco per evitare conflitti con run precedenti)
RUN_TS=$(date +%s)
TEST_SYSTEM_PAYLOAD=$(jq -n --arg name "[TEST] Actify Test Runner $RUN_TS" '{
  tool_name: $name,
  vendor: "Test Vendor",
  category: "operations",
  role: "deployer",
  purpose: "Sistema creato dal test runner di Actify. Da eliminare.",
  makes_automated_decisions: false,
  human_oversight_level: "always",
  affects_vulnerable_groups: false,
  target_users: ["employees"],
  decision_domains: [],
  data_types: [],
  annex_iii_domains: [],
  is_safety_component: false
}')

resp=$(api POST "/api/systems" "$TEST_SYSTEM_PAYLOAD")
# API restituisce 200 o 201 a seconda della versione
POST_STATUS=$(get_status "$resp")
if [ "$POST_STATUS" = "200" ] || [ "$POST_STATUS" = "201" ]; then
  pass "POST /api/systems (creazione sistema test) (HTTP $POST_STATUS)"
else
  fail "POST /api/systems (creazione sistema test)" "atteso HTTP 200/201, ricevuto HTTP $POST_STATUS — body: $(get_body "$resp" | head -c 200)"
fi
TEST_SYSTEM_ID=$(get_body "$resp" | jq -r '.system_id // .id // empty' 2>/dev/null || echo "")

if [ -z "$TEST_SYSTEM_ID" ]; then
  fail "Estrazione system_id dalla risposta POST /api/systems" "system_id non trovato nel body"
else
  info "Sistema test creato: $TEST_SYSTEM_ID"

  # GET sistema singolo
  resp=$(api GET "/api/systems/$TEST_SYSTEM_ID")
  check_status "GET /api/systems/$TEST_SYSTEM_ID" "200" "$resp"

  # PUT sistema (aggiornamento vendor)
  resp=$(api PUT "/api/systems/$TEST_SYSTEM_ID" '{"vendor":"Updated Vendor"}')
  check_status "PUT /api/systems/$TEST_SYSTEM_ID (aggiornamento vendor)" "200" "$resp"

  # Verifica che l'aggiornamento sia persistito
  resp=$(api GET "/api/systems/$TEST_SYSTEM_ID")
  check_status "GET /api/systems/$TEST_SYSTEM_ID (post-aggiornamento)" "200" "$resp"
  UPDATED_VENDOR=$(get_body "$resp" | jq -r '.vendor // empty' 2>/dev/null || echo "")
  if [ "$UPDATED_VENDOR" = "Updated Vendor" ]; then
    pass "Aggiornamento vendor persistito correttamente"
  else
    fail "Persistenza aggiornamento vendor" "atteso 'Updated Vendor', ricevuto '$UPDATED_VENDOR'"
  fi

  # Lista sistemi: count deve essere aumentato di 1
  resp=$(api GET "/api/systems")
  check_status "GET /api/systems (post-creazione)" "200" "$resp"
  NEW_COUNT=$(get_body "$resp" | jq 'length // 0' 2>/dev/null || echo "0")
  EXPECTED_COUNT=$((SYSTEM_COUNT + 1))
  if [ "$NEW_COUNT" -eq "$EXPECTED_COUNT" ]; then
    pass "Lista sistemi aggiornata ($SYSTEM_COUNT → $NEW_COUNT)"
  else
    fail "Conteggio sistemi post-creazione" "atteso $EXPECTED_COUNT, trovato $NEW_COUNT"
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════════
#  FASE 6 — COMPLIANCE CHECK
# ═══════════════════════════════════════════════════════════════════════════════
section "FASE 6 — Compliance Check"

if [ -n "$TEST_SYSTEM_ID" ]; then
  resp=$(api POST "/api/systems/$TEST_SYSTEM_ID/compliance-check" '{}')
  status=$(get_status "$resp")
  if [ "$status" = "202" ] || [ "$status" = "200" ]; then
    pass "POST compliance-check avviato (HTTP $status)"
  else
    fail "POST compliance-check" "atteso 202, ricevuto $status"
  fi

  if [ "$RUN_SLOW" = true ]; then
    info "Attendo completamento compliance check (max 90s)..."
    COMPLETED=false
    for i in $(seq 1 9); do
      sleep 10
      resp=$(api GET "/api/systems/$TEST_SYSTEM_ID/compliance-checks/latest")
      status=$(get_status "$resp")
      if [ "$status" = "200" ]; then
        check_status_val=$(get_body "$resp" | jq -r '.status // "done"' 2>/dev/null || echo "done")
        pass "GET compliance-checks/latest → completato (status: $check_status_val)"
        BODY=$(get_body "$resp")
        # compliance_gaps e score sono annidati dentro result: { status, result: { compliance_gaps, score } }
        has_gaps=$(echo "$BODY" | jq 'has("result") and (.result | has("compliance_gaps"))' 2>/dev/null || echo "false")
        has_score=$(echo "$BODY" | jq 'has("result") and (.result | has("score"))' 2>/dev/null || echo "false")
        [ "$has_gaps" = "true" ] && pass "Risposta result.compliance_gaps presente" \
                                  || fail "Struttura risposta compliance check" "result.compliance_gaps mancante"
        [ "$has_score" = "true" ] && pass "Risposta result.score presente" \
                                  || fail "Struttura risposta compliance check" "result.score mancante"
        COMPLETED=true
        break
      fi
      info "Tentativo $i/9 — status HTTP: $status (in corso...)"
    done
    [ "$COMPLETED" = false ] && fail "Completamento compliance check entro 90s" "timeout"
  else
    resp=$(api GET "/api/systems/$TEST_SYSTEM_ID/compliance-checks/latest")
    status=$(get_status "$resp")
    if [ "$status" = "200" ] || [ "$status" = "404" ]; then
      pass "GET compliance-checks/latest → $status (200=completato, 404=in corso)"
    else
      fail "GET compliance-checks/latest" "atteso 200 o 404, ricevuto $status"
    fi
    skip "Attesa completamento compliance check (usa --slow per abilitare)"
  fi
else
  skip "Compliance check (sistema test non creato)"
fi

# ═══════════════════════════════════════════════════════════════════════════════
#  FASE 7 — AI LITERACY
# ═══════════════════════════════════════════════════════════════════════════════
section "FASE 7 — AI Literacy"

resp=$(api GET "/api/literacy")
check_status "GET /api/literacy (lista sistemi)" "200" "$resp"
LITERACY_COUNT=$(get_body "$resp" | jq 'length // 0' 2>/dev/null || echo "0")
info "Sistemi in literacy tracker: $LITERACY_COUNT"

if [ -n "$TEST_SYSTEM_ID" ]; then
  resp=$(api GET "/api/literacy/$TEST_SYSTEM_ID/profiles")
  status=$(get_status "$resp")
  if [ "$status" = "200" ] || [ "$status" = "404" ]; then
    pass "GET /api/literacy/$TEST_SYSTEM_ID/profiles → $status"
  else
    fail "GET /api/literacy profiles" "atteso 200 o 404, ricevuto $status"
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════════
#  FASE 8 — DOCUMENT VAULT
# ═══════════════════════════════════════════════════════════════════════════════
section "FASE 8 — Document Vault"

resp=$(api GET "/api/company/documents")
check_status "GET /api/company/documents" "200" "$resp"
DOC_COUNT=$(get_body "$resp" | jq 'length // 0' 2>/dev/null || echo "0")
info "Documenti in vault: $DOC_COUNT"

resp=$(api GET "/api/company/document-generations")
check_status "GET /api/company/document-generations" "200" "$resp"

# ═══════════════════════════════════════════════════════════════════════════════
#  FASE 9 — AUDIT TRAIL
# ═══════════════════════════════════════════════════════════════════════════════
section "FASE 9 — Audit Trail"

resp=$(api GET "/api/audit-trail")
check_status "GET /api/audit-trail" "200" "$resp"
AUDIT_BODY=$(get_body "$resp")
AUDIT_COUNT=$(echo "$AUDIT_BODY" | jq 'length // 0' 2>/dev/null || true)
AUDIT_COUNT=${AUDIT_COUNT:-0}
info "Eventi in audit trail: $AUDIT_COUNT"

# Verifica struttura primo evento (se presente)
if [ "${AUDIT_COUNT:-0}" -gt 0 ] 2>/dev/null; then
  FIRST_EVENT=$(echo "$AUDIT_BODY" | jq '.[0]' 2>/dev/null || echo "{}")
  has_type=$(echo "$FIRST_EVENT"  | jq 'has("event_type")'  2>/dev/null || echo "false")
  has_ts=$(echo "$FIRST_EVENT"    | jq 'has("timestamp")'   2>/dev/null || echo "false")
  has_label=$(echo "$FIRST_EVENT" | jq 'has("event_label")' 2>/dev/null || echo "false")
  if [ "$has_type" = "true" ] && [ "$has_ts" = "true" ] && [ "$has_label" = "true" ]; then
    pass "Struttura eventi audit trail corretta (event_type, timestamp, event_label)"
  else
    fail "Struttura eventi audit trail" "campi mancanti nel primo evento: type=$has_type ts=$has_ts label=$has_label"
  fi
fi

# Filtro per data
TODAY=$(date -u +%Y-%m-%d)
resp=$(api GET "/api/audit-trail?from=$TODAY&to=$TODAY")
check_status "GET /api/audit-trail con filtro data (oggi)" "200" "$resp"

# ═══════════════════════════════════════════════════════════════════════════════
#  FASE 10 — ISOLAMENTO TENANT (sicurezza critica)
# ═══════════════════════════════════════════════════════════════════════════════
section "FASE 10 — Isolamento tenant"

FAKE_DOC_ID="00000000-0000-0000-0000-000000000000"
resp=$(api GET "/api/documents/$FAKE_DOC_ID")
status=$(get_status "$resp")
if [ "$status" = "404" ] || [ "$status" = "403" ]; then
  pass "GET /api/documents/[id-altro-tenant] → $status (accesso negato o not found)"
else
  fail "Isolamento tenant documenti" "atteso 403/404, ricevuto $status — possibile leak cross-tenant"
fi

FAKE_SYS_ID="00000000-0000-0000-0000-000000000001"
resp=$(api GET "/api/systems/$FAKE_SYS_ID")
status=$(get_status "$resp")
if [ "$status" = "404" ] || [ "$status" = "403" ]; then
  pass "GET /api/systems/[id-altro-tenant] → $status (accesso negato o not found)"
else
  fail "Isolamento tenant sistemi" "atteso 403/404, ricevuto $status — possibile leak cross-tenant"
fi

# ═══════════════════════════════════════════════════════════════════════════════
#  FASE 11 — CLEANUP
# ═══════════════════════════════════════════════════════════════════════════════
section "FASE 11 — Cleanup"

if [ -n "$TEST_SYSTEM_ID" ]; then
  resp=$(api DELETE "/api/systems/$TEST_SYSTEM_ID")
  check_status "DELETE /api/systems/$TEST_SYSTEM_ID (cleanup sistema test)" "200" "$resp"

  # Verifica che il sistema sia stato eliminato
  resp=$(api GET "/api/systems/$TEST_SYSTEM_ID")
  status=$(get_status "$resp")
  if [ "$status" = "404" ]; then
    pass "Sistema test eliminato correttamente (GET → 404)"
  else
    fail "Verifica eliminazione sistema test" "atteso 404 dopo DELETE, ricevuto $status"
  fi
else
  skip "Cleanup sistema test (non era stato creato)"
fi

# ═══════════════════════════════════════════════════════════════════════════════
#  RIEPILOGO FINALE
# ═══════════════════════════════════════════════════════════════════════════════
TOTAL=$((PASS + FAIL + SKIP))
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║               RIEPILOGO RISULTATI               ║${NC}"
echo -e "${BOLD}╠══════════════════════════════════════════════════╣${NC}"
echo -e "${BOLD}║  ${GREEN}✅ Pass:  $PASS / $TOTAL${NC}$(printf '%*s' $((32 - ${#PASS} - ${#TOTAL})) '')${BOLD}║${NC}"
echo -e "${BOLD}║  ${RED}❌ Fail:  $FAIL${NC}$(printf '%*s' $((40 - ${#FAIL})) '')${BOLD}║${NC}"
echo -e "${BOLD}║  ${YELLOW}⏭  Skip:  $SKIP${NC}$(printf '%*s' $((40 - ${#SKIP})) '')${BOLD}║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════╝${NC}"

if [ ${#FAILED_TESTS[@]} -gt 0 ]; then
  echo ""
  echo -e "${RED}${BOLD}Test falliti:${NC}"
  for t in "${FAILED_TESTS[@]}"; do
    echo -e "  ${RED}•${NC} $t"
  done
fi

echo ""
if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}${BOLD}🎉 Tutti i test passati — piattaforma operativa.${NC}"
  exit 0
else
  echo -e "${RED}${BOLD}⚠️  $FAIL test falliti — verifica i log sopra.${NC}"
  exit 1
fi
